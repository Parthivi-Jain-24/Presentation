from datetime import datetime, timedelta, timezone
from collections import Counter
import re

import httpx
from celery.utils.log import get_task_logger

from app.config import get_settings
from app.content import SIMULATION_VERSION, draft_from_text, extract_document, extract_source_images, safe_pdf_title, upgrade_legacy_math_simulations
from app.database import SessionLocal
from app.models import AuthSession, CurriculumOutcome, Lesson, ProcessingJob, SyllabusDocument
from app.reference_corpus import GLOBAL_REFERENCE_WORKSPACE_ID
from app.queue import celery_app
from app.storage import delete_object, get_bytes, put_bytes
from sqlalchemy import delete, or_, select

logger = get_task_logger(__name__)
settings = get_settings()


def _syllabus_guidance(db, lesson: Lesson, source_pages: list[dict]) -> list[dict]:
    references = db.scalars(select(SyllabusDocument).where(
        or_(SyllabusDocument.workspace_id == lesson.workspace_id,
            SyllabusDocument.workspace_id == GLOBAL_REFERENCE_WORKSPACE_ID),
        or_(SyllabusDocument.board == lesson.board, SyllabusDocument.board == "All boards"),
        or_(SyllabusDocument.grade == lesson.grade, SyllabusDocument.grade == "All classes"),
        or_(SyllabusDocument.subject == lesson.subject, SyllabusDocument.subject == "All subjects"),
    ).order_by(SyllabusDocument.created_at.desc()).limit(250)).all()
    if not references:
        return []

    stop_words = {"and", "the", "that", "this", "with", "from", "into", "when", "where", "what", "which", "their",
                  "there", "these", "those", "have", "will", "would", "could", "should", "about", "than", "then",
                  "also", "each", "some", "such", "class", "chapter", "subject", "lesson", "page", "pages"}

    def terms(value: str) -> Counter:
        return Counter(word for word in re.findall(r"[a-zA-Z][a-zA-Z0-9'-]{2,}", value.lower()) if word not in stop_words)

    source_terms = Counter()
    for page in source_pages:
        source_terms.update(terms(str(page.get("text") or "")))
    candidates = []
    for reference in references:
        for page in reference.page_texts or []:
            text = str(page.get("text") or "").strip()
            if len(text) < 30:
                continue
            page_terms = terms(text)
            overlap = set(page_terms).intersection(source_terms)
            score = sum(min(page_terms[word], 3) * min(source_terms[word], 3) for word in overlap)
            if score:
                candidates.append((score, reference, page, text))
    candidates.sort(key=lambda item: item[0], reverse=True)
    selected = []
    total_chars = 0
    seen = set()
    for _, reference, page, text in candidates:
        key = (reference.id, int(page.get("number") or 0))
        if key in seen:
            continue
        excerpt = text[:600]
        if total_chars + len(excerpt) > 1800:
            continue
        selected.append({"sourceName": reference.source_name, "page": key[1], "text": excerpt})
        seen.add(key)
        total_chars += len(excerpt)
        if len(selected) >= 3:
            break
    return selected


def _curriculum_candidates(db, lesson: Lesson, content: dict) -> dict:
    from difflib import SequenceMatcher
    import re

    outcomes = db.scalars(select(CurriculumOutcome).where(CurriculumOutcome.is_active.is_(True),
      CurriculumOutcome.board == lesson.board, CurriculumOutcome.grade == lesson.grade,
      CurriculumOutcome.subject == lesson.subject)).all()
    if not outcomes:
        return {"status": "unverified", "matchedOutcomes": [], "reason": "No curated, licensed outcome mapping is loaded for this board, grade and subject."}
    slides = content.get("slides", [])
    claim_text = " ".join(str(slide.get(key, "")) for slide in slides for key in ("title", "body", "detail", "bullets"))
    normalize = lambda value: " ".join(re.findall(r"[a-z0-9]+", value.lower()))
    claim = normalize(claim_text)
    claim_words = set(claim.split())
    matches = []
    for outcome in outcomes:
        target = normalize(f"{outcome.title} {outcome.description}")
        target_words = set(target.split())
        overlap = len(claim_words & target_words)
        score = (2 * overlap / max(1, len(claim_words) + len(target_words))) * SequenceMatcher(None, claim, target).ratio()
        if overlap >= 2 and score >= settings.curriculum_match_threshold:
            matches.append({"code": outcome.code, "title": outcome.title, "confidence": round(score, 3), "source": outcome.source_name,
                            "sourceUrl": outcome.source_url, "license": outcome.license, "version": outcome.version})
    matches.sort(key=lambda item: item["confidence"], reverse=True)
    return {"status": "candidate_matches" if matches else "no_match", "matchedOutcomes": matches[:10],
            "reason": "Automated matches are suggestions for teacher review, not proof of board approval."}


def _touch(job: ProcessingJob, state: str, stage: str, progress: int, error: str | None = None):
    job.state = state
    job.stage = stage
    job.progress = progress
    job.error_message = error
    job.updated_at = datetime.now(timezone.utc)


@celery_app.task(bind=True, name="app.tasks.generate_lesson", max_retries=2)
def generate_lesson(self, lesson_id: str, job_id: str):
    db = SessionLocal()
    try:
        lesson = db.get(Lesson, lesson_id)
        job = db.get(ProcessingJob, job_id)
        if not lesson or not job:
            return
        job.task_id = self.request.id
        job.attempts = self.request.retries + 1
        lesson.status = "processing"
        _touch(job, "processing", "extracting", 10)
        db.commit()

        pdf_bytes = get_bytes(lesson.source_key)
        text, page_texts, pages, scanned = extract_document(pdf_bytes)
        logger.info("Extracted %s pages from %s for local lesson generation", pages, lesson.source_name)
        lesson.page_count = pages
        curriculum_context = _syllabus_guidance(db, lesson, page_texts)
        _touch(job, "processing", "drafting slides with the local model", 45)
        db.commit()

        def update_generation_progress(current_section: int, section_count: int):
            progress = 45 + int(35 * current_section / max(1, section_count))
            _touch(job, "processing", "drafting chapter sections", progress)
            db.commit()

        content = draft_from_text(text, page_texts, safe_pdf_title(lesson.source_name, page_texts), lesson.board,
                                  lesson.grade, lesson.subject, lesson.language, pages,
                                  progress_callback=update_generation_progress, curriculum_context=curriculum_context)
        content["ocrAttempted"] = scanned
        content["textExtracted"] = bool(text.strip())
        content["chapterCoverage"]["ocrAttempted"] = scanned
        content["curriculumAlignment"] = _curriculum_candidates(db, lesson, content)
        # Model requests are split by source pages, so the worker retains full chapter coverage.
        content["sourceTextTruncated"] = False
        lesson.title = content["title"]
        lesson.content = content
        lesson.curriculum_status = content["curriculumAlignment"]["status"]
        lesson.status = "ready"
        _touch(job, "succeeded", "complete", 100)
        export_job = ProcessingJob(lesson_id=lesson.id, kind="export", state="queued", stage="queued", progress=0)
        db.add(export_job)
        db.commit()
        db.refresh(export_job)
        logger.info("Created lesson %s with %s slides from %s", lesson.id, len(content["slides"]), lesson.source_name)
        try:
            result = export_lesson.apply_async(args=[lesson.id, export_job.id, {"mass": 2, "speed": 1}], task_id=export_job.id)
            export_job.task_id = result.id
            db.commit()
            logger.info("Queued PowerPoint export %s for lesson %s", export_job.id, lesson.id)
        except Exception:
            db.rollback()
            export_job = db.get(ProcessingJob, export_job.id)
            if export_job:
                _touch(export_job, "failed", "failed", 100, "The rendering queue is unavailable. Choose Export PPTX to retry.")
                db.commit()
            logger.exception("Could not queue PowerPoint export for lesson %s", lesson.id)
        return {"lesson_id": lesson.id, "slide_count": len(content["slides"])}
    except ValueError as exc:
        db.rollback()
        lesson = db.get(Lesson, lesson_id)
        job = db.get(ProcessingJob, job_id)
        safe_error = str(exc) if str(exc).startswith("Local model ") or str(exc) in {
            "This PDF is password protected. Remove the password and try again.",
            "Upload one chapter at a time (maximum 300 pages).",
            "No readable chapter text was extracted from this PDF. Upload a searchable or clearer PDF and try again.",
        } else "This PDF could not be processed. Check that it is a valid PDF and try again."
        if job:
            _touch(job, "failed", "failed", 100, safe_error)
        if lesson:
            lesson.status = "failed"
        db.commit()
        return {"error": safe_error}
    except Exception as exc:
        db.rollback()
        logger.exception("Lesson generation failed for %s", lesson_id)
        lesson = db.get(Lesson, lesson_id)
        job = db.get(ProcessingJob, job_id)
        if job:
            job.attempts = self.request.retries + 1
            if self.request.retries < self.max_retries:
                _touch(job, "retrying", "retrying", max(5, 20 - self.request.retries * 5), "A temporary processing error occurred. Retrying.")
                if lesson:
                    lesson.status = "queued"
                db.commit()
                raise self.retry(exc=exc, countdown=min(10 * (self.request.retries + 1), 60))
            _touch(job, "failed", "failed", 100, "The PDF could not be processed. Check that it is a valid PDF and try again.")
        if lesson:
            lesson.status = "failed"
        db.commit()
        raise
    finally:
        db.close()


@celery_app.task(bind=True, name="app.tasks.export_lesson", max_retries=2)
def export_lesson(self, lesson_id: str, job_id: str, params: dict | None = None):
    db = SessionLocal()
    try:
        lesson = db.get(Lesson, lesson_id)
        job = db.get(ProcessingJob, job_id)
        if not lesson or not job or not lesson.content:
            raise ValueError("Lesson content is not available for export")
        job.task_id = self.request.id
        job.attempts = self.request.retries + 1
        _touch(job, "processing", "rendering", 15)
        db.commit()
        pdf_bytes = get_bytes(lesson.source_key)
        if (lesson.subject.strip().lower() in {"mathematics", "math", "maths"}
                and int((lesson.content or {}).get("simulationVersion") or 0) < SIMULATION_VERSION):
            _, page_texts, _, _ = extract_document(pdf_bytes)
            upgraded, changed = upgrade_legacy_math_simulations(lesson.content, page_texts)
            if changed:
                lesson.content = upgraded
                db.commit()
        export_content = dict(lesson.content)
        export_content["sourceImages"] = extract_source_images(pdf_bytes, export_content.get("slides", []))
        response = httpx.post(f"{settings.exporter_url}/v1/export", json={"lesson": export_content, "params": params or {}}, timeout=600)
        response.raise_for_status()
        _touch(job, "processing", "storing", 85)
        db.commit()
        key = f"workspaces/{lesson.workspace_id}/exports/{lesson.id}/{job.id}.pptx"
        put_bytes(key, response.content, "application/vnd.openxmlformats-officedocument.presentationml.presentation")
        job.result_key = key
        saved_content = dict(lesson.content or {})
        saved_content["exportedSimulationVersion"] = saved_content.get("simulationVersion", 0)
        saved_content["exportedChapterDetailVersion"] = saved_content.get("chapterDetailVersion", 0)
        lesson.content = saved_content
        _touch(job, "succeeded", "complete", 100)
        db.commit()
        return {"lesson_id": lesson.id, "download_ready": True}
    except Exception as exc:
        db.rollback()
        logger.exception("PPTX export failed for %s", lesson_id)
        job = db.get(ProcessingJob, job_id)
        if job:
            job.attempts = self.request.retries + 1
            if self.request.retries < self.max_retries:
                _touch(job, "retrying", "retrying", 20, "The PowerPoint is being retried.")
                db.commit()
                raise self.retry(exc=exc, countdown=min(10 * (self.request.retries + 1), 60))
            _touch(job, "failed", "failed", 100, "The PowerPoint could not be rendered. Try again later.")
            db.commit()
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.purge_expired_uploads")
def purge_expired_uploads():
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.upload_retention_days)
    db = SessionLocal()
    removed = 0
    exports_removed = 0
    try:
        lessons = db.scalars(select(Lesson).where(Lesson.source_key != "", Lesson.created_at < cutoff, Lesson.status.in_(["ready", "failed"]))).all()
        for lesson in lessons:
            key = lesson.source_key
            try:
                delete_object(key)
                lesson.source_key = ""
                removed += 1
            except Exception:
                logger.exception("Could not remove expired source PDF for lesson %s", lesson.id)
        exports = db.scalars(select(ProcessingJob).where(ProcessingJob.kind == "export", ProcessingJob.result_key.is_not(None), ProcessingJob.created_at < cutoff)).all()
        for job in exports:
            try:
                delete_object(job.result_key)
                job.result_key = None
                exports_removed += 1
            except Exception:
                logger.exception("Could not remove expired PPTX for job %s", job.id)
        session_cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        db.execute(delete(AuthSession).where(or_(AuthSession.expires_at < session_cutoff, AuthSession.revoked_at < session_cutoff)))
        db.commit()
        return {"source_pdfs_removed": removed, "powerpoints_removed": exports_removed}
    finally:
        db.close()
