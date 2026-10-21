import hashlib
import logging
import re
import uuid
from secrets import compare_digest
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

import jwt
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from redis import Redis

from app.config import get_settings
from app.database import get_db
from app.models import AuthSession, CurriculumOutcome, Lesson, LessonFeedback, ProcessingJob, SyllabusDocument, User, Workspace, WorkspaceMembership
from app.reference_corpus import GLOBAL_REFERENCE_WORKSPACE_ID
from app.content import GENERATION_VERSION, SIMULATION_VERSION, extract_document, extract_source_images, model_generation_status, upgrade_legacy_math_simulations
from app.queue import celery_app
from app.security import decode_access_token, hash_password, make_token, new_refresh_token, token_hash, verify_password
from app.storage import delete_object, ensure_bucket, get_bytes, put_bytes, put_stream
from app.tasks import export_lesson, generate_lesson

settings = get_settings()
logger = logging.getLogger(__name__)
_DUMMY_PASSWORD_HASH = hash_password("classroom-studio-dummy-password")
app = FastAPI(title="Classroom Studio API", version="1.0.0", docs_url="/api/docs" if settings.app_env != "production" else None,
              redoc_url=None, openapi_url="/api/openapi.json" if settings.app_env != "production" else None)
app.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_credentials=True, allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Curriculum-Import-Key", "X-Feedback-Admin-Key"])
bearer = HTTPBearer(auto_error=False)


class RegisterBody(BaseModel):
    email: EmailStr
    displayName: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=12, max_length=256)
    workspaceName: str = Field(default="My classroom", min_length=1, max_length=160)


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class LessonUpdate(BaseModel):
    content: dict


class SimulationParams(BaseModel):
    speed: float = Field(default=1, ge=0.5, le=2)
    mass: float = Field(default=2, ge=1, le=5)


class ExportBody(BaseModel):
    params: SimulationParams = Field(default_factory=SimulationParams)


class CurriculumRecord(BaseModel):
    code: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=600)
    description: str = Field(default="", max_length=4000)


class CurriculumImportBody(BaseModel):
    board: str = Field(min_length=1, max_length=64)
    grade: str = Field(min_length=1, max_length=32)
    subject: str = Field(min_length=1, max_length=80)
    sourceName: str = Field(min_length=1, max_length=240)
    sourceUrl: str = Field(min_length=8, max_length=1000)
    license: str = Field(min_length=2, max_length=240)
    version: str = Field(min_length=1, max_length=80)
    outcomes: list[CurriculumRecord] = Field(min_length=1, max_length=5000)


class FeedbackBody(BaseModel):
    lessonId: str | None = Field(default=None, max_length=36)
    lessonTitle: str = Field(min_length=1, max_length=240)
    slideIndex: int | None = Field(default=None, ge=0, le=59)
    category: Literal["accuracy", "source", "simulation", "other"] = "other"
    details: str = Field(min_length=1, max_length=2000)


def _user_payload(user: User, workspace: Workspace):
    return {"id": user.id, "email": user.email, "displayName": user.display_name, "workspace": {"id": workspace.id, "name": workspace.name}}


def _lesson_payload(lesson: Lesson):
    return {"id": lesson.id, "title": lesson.title, "sourceName": lesson.source_name, "board": lesson.board, "grade": lesson.grade,
            "subject": lesson.subject, "language": lesson.language, "pages": lesson.page_count, "status": lesson.status,
            "curriculumStatus": lesson.curriculum_status, "content": lesson.content, "createdAt": lesson.created_at.isoformat(), "updatedAt": lesson.updated_at.isoformat()}


def _upgrade_math_lesson_if_needed(lesson: Lesson, db: Session) -> None:
    content = lesson.content if isinstance(lesson.content, dict) else {}
    if (not content or not lesson.source_key or lesson.subject.strip().lower() not in {"mathematics", "math", "maths"}
            or int(content.get("simulationVersion") or 0) >= SIMULATION_VERSION):
        return
    try:
        pdf_bytes = get_bytes(lesson.source_key)
        _, page_texts, _, _ = extract_document(pdf_bytes)
        upgraded, changed = upgrade_legacy_math_simulations(content, page_texts)
        if changed:
            lesson.content = upgraded
            lesson.updated_at = datetime.now(timezone.utc)
            db.commit()
    except Exception:
        db.rollback()
        logger.exception("Could not upgrade legacy math simulations for lesson %s", lesson.id)


def _syllabus_payload(item: SyllabusDocument):
    return {"id": item.id, "sourceName": item.source_name, "board": item.board, "grade": item.grade,
            "subject": item.subject, "pages": item.page_count, "createdAt": item.created_at.isoformat()}


def _job_payload(job: ProcessingJob):
    return {"id": job.id, "lessonId": job.lesson_id, "kind": job.kind, "state": job.state, "stage": job.stage,
            "progress": job.progress, "error": job.error_message, "createdAt": job.created_at.isoformat()}


_JOB_STALE_AFTER = timedelta(minutes=22)


def _reconcile_stale_job(db: Session, job: ProcessingJob) -> bool:
    """Turn abandoned active jobs into a visible failure instead of polling forever."""
    if job.state not in {"queued", "processing", "retrying"}:
        return False
    updated_at = job.updated_at
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    if now - updated_at <= _JOB_STALE_AFTER:
        return False
    job.state = "failed"
    job.stage = "failed"
    job.progress = 100
    job.error_message = (
        "The local model stopped responding before this lesson was ready. Retry the lesson to continue."
        if job.kind == "lesson" else
        "PowerPoint rendering stopped before the file was saved. Choose Export PPTX to try again."
    )
    if job.kind == "lesson":
        lesson = db.get(Lesson, job.lesson_id)
        if lesson and lesson.status in {"queued", "processing"}:
            lesson.status = "failed"
    return True


def _default_workspace(db: Session, user: User) -> Workspace:
    membership = db.scalar(select(WorkspaceMembership).where(WorkspaceMembership.user_id == user.id, WorkspaceMembership.role == "owner"))
    if not membership:
        raise HTTPException(status_code=403, detail="No workspace is available for this account")
    return db.get(Workspace, membership.workspace_id)


def current_user(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)], db: Annotated[Session, Depends(get_db)]) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Sign in to continue", headers={"WWW-Authenticate": "Bearer"})
    try:
        user_id = decode_access_token(credentials.credentials)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Your session expired. Sign in again.", headers={"WWW-Authenticate": "Bearer"})
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="This account is unavailable")
    return user


def _accessible_lesson(db: Session, user: User, lesson_id: str) -> Lesson:
    workspace = _default_workspace(db, user)
    lesson = db.scalar(select(Lesson).where(Lesson.id == lesson_id, Lesson.workspace_id == workspace.id, Lesson.deleted_at.is_(None)))
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


def _verify_browser_origin(request: Request):
    origin = request.headers.get("origin")
    if origin and origin not in settings.origins:
        raise HTTPException(status_code=403, detail="Request origin is not allowed")


@app.on_event("startup")
def prepare_storage():
    try:
        ensure_bucket()
    except Exception:
        if settings.app_env == "production":
            raise


@app.get("/health/live")
def live():
    return {"status": "ok"}


@app.get("/health/ready")
def ready(db: Annotated[Session, Depends(get_db)]):
    db.execute(text("SELECT 1"))
    redis = Redis.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2)
    try:
        redis.ping()
    finally:
        redis.close()
    return {"status": "ready"}


def _auth_response(response: Response, db: Session, user: User, workspace: Workspace):
    session_id, refresh_token, expires_at = new_refresh_token(user.id)
    db.add(AuthSession(id=session_id, user_id=user.id, refresh_hash=token_hash(refresh_token), expires_at=expires_at))
    db.commit()
    response.set_cookie("classroom_refresh", refresh_token, httponly=True, secure=settings.app_env == "production", samesite="strict",
                        path="/api/v1/auth", max_age=settings.refresh_token_days * 24 * 60 * 60)
    return {"user": _user_payload(user, workspace), "accessToken": make_token(user.id), "tokenType": "bearer"}


@app.post("/api/v1/auth/register", status_code=201)
def register(body: RegisterBody, response: Response, db: Annotated[Session, Depends(get_db)]):
    email = body.email.lower().strip()
    if not body.displayName.strip() or not body.workspaceName.strip():
        raise HTTPException(status_code=422, detail="Name and workspace must contain at least one non-space character")
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = User(email=email, display_name=body.displayName.strip(), password_hash=hash_password(body.password))
    workspace = Workspace(name=body.workspaceName.strip())
    db.add_all([user, workspace])
    try:
        db.flush()
        db.add(WorkspaceMembership(user_id=user.id, workspace_id=workspace.id, role="owner"))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    return _auth_response(response, db, user, workspace)


@app.post("/api/v1/auth/login")
def login(body: LoginBody, response: Response, db: Annotated[Session, Depends(get_db)]):
    user = db.scalar(select(User).where(User.email == body.email.lower().strip()))
    # Perform the same Argon2 work for missing and existing accounts.
    password_hash = user.password_hash if user else _DUMMY_PASSWORD_HASH
    password_valid = verify_password(password_hash, body.password)
    if not user or not user.is_active or not password_valid:
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    workspace = _default_workspace(db, user)
    return _auth_response(response, db, user, workspace)


@app.post("/api/v1/auth/refresh")
def refresh(request: Request, response: Response, db: Annotated[Session, Depends(get_db)]):
    _verify_browser_origin(request)
    try:
        token = request.cookies.get("classroom_refresh")
        if not token:
            raise jwt.InvalidTokenError("Missing refresh token")
        payload = jwt.decode(token, settings.app_secret, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise jwt.InvalidTokenError("Wrong token type")
        user = db.get(User, payload.get("sub"))
        session = db.get(AuthSession, payload.get("sid"))
        if not user or not user.is_active or not session or session.revoked_at or not compare_digest(session.refresh_hash, token_hash(token)) or session.expires_at <= datetime.now(timezone.utc):
            raise jwt.InvalidTokenError("User unavailable")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Refresh token expired. Sign in again.")
    session.revoked_at = datetime.now(timezone.utc)
    db.commit()
    workspace = _default_workspace(db, user)
    return _auth_response(response, db, user, workspace)


@app.post("/api/v1/auth/logout", status_code=204)
def logout(request: Request, response: Response, db: Annotated[Session, Depends(get_db)]):
    _verify_browser_origin(request)
    token = request.cookies.get("classroom_refresh")
    if token:
        try:
            payload = jwt.decode(token, settings.app_secret, algorithms=["HS256"])
            session = db.get(AuthSession, payload.get("sid"))
            if session and not session.revoked_at:
                session.revoked_at = datetime.now(timezone.utc)
                db.commit()
        except jwt.InvalidTokenError:
            pass
    response.delete_cookie("classroom_refresh", path="/api/v1/auth", secure=settings.app_env == "production", httponly=True, samesite="strict")
    response.status_code = 204
    return response


@app.get("/api/v1/auth/me")
def me(user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)]):
    return _user_payload(user, _default_workspace(db, user))


@app.get("/api/v1/catalog")
def catalog(user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)]):
    return {"boards": ["CBSE", "ICSE", "State board", "IB"], "grades": [f"Class {n}" for n in range(1, 13)],
            "subjects": ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Social studies", "Robotics"],
            "languages": ["English"], "curriculumMappingAvailable": db.scalar(select(CurriculumOutcome.id).limit(1)) is not None}


@app.get("/api/v1/curriculum/outcomes")
def curriculum_outcomes(user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)], board: str, grade: str, subject: str):
    outcomes = db.scalars(select(CurriculumOutcome).where(CurriculumOutcome.is_active.is_(True), CurriculumOutcome.board == board,
                             CurriculumOutcome.grade == grade, CurriculumOutcome.subject == subject).order_by(CurriculumOutcome.code)).all()
    return {"items": [{"code": x.code, "title": x.title, "description": x.description, "source": x.source_name,
                       "sourceUrl": x.source_url, "license": x.license, "version": x.version} for x in outcomes]}


@app.post("/api/v1/feedback", status_code=201)
def submit_feedback(body: FeedbackBody, user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)]):
    details = body.details.strip()
    title = body.lessonTitle.strip()
    if not details or not title:
        raise HTTPException(status_code=422, detail="Please include a lesson title and feedback details")
    workspace = _default_workspace(db, user)
    lesson_id = None
    if body.lessonId:
        lesson = _accessible_lesson(db, user, body.lessonId)
        lesson_id = lesson.id
        if body.slideIndex is not None and body.slideIndex >= len((lesson.content or {}).get("slides", [])):
            raise HTTPException(status_code=422, detail="The reported slide is outside this lesson")
    feedback = LessonFeedback(workspace_id=workspace.id, user_id=user.id, lesson_id=lesson_id, lesson_title=title,
                              slide_index=body.slideIndex, category=body.category, details=details)
    db.add(feedback)
    db.commit()
    return {"id": feedback.id, "status": "received"}


@app.get("/api/v1/admin/feedback")
def list_feedback(db: Annotated[Session, Depends(get_db)], admin_key: Annotated[str | None, Header(alias="X-Feedback-Admin-Key")] = None,
                  limit: int = 50, offset: int = 0):
    expected = settings.feedback_admin_token
    if not expected or not admin_key or not compare_digest(expected, admin_key):
        raise HTTPException(status_code=404, detail="Not found")
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)
    items = db.scalars(select(LessonFeedback).order_by(LessonFeedback.created_at.desc()).limit(limit).offset(offset)).all()
    return {"items": [{"id": x.id, "lessonId": x.lesson_id, "lessonTitle": x.lesson_title, "slideIndex": x.slide_index,
                       "category": x.category, "details": x.details, "status": x.status, "createdAt": x.created_at.isoformat()} for x in items],
            "limit": limit, "offset": offset}


@app.post("/api/v1/admin/curriculum/import", status_code=201)
def import_curriculum(body: CurriculumImportBody, db: Annotated[Session, Depends(get_db)], import_key: Annotated[str | None, Header(alias="X-Curriculum-Import-Key")] = None):
    expected = settings.curriculum_import_token
    if not expected or not import_key or not compare_digest(expected, import_key):
        raise HTTPException(status_code=404, detail="Not found")
    if not body.sourceUrl.startswith(("https://", "http://")):
        raise HTTPException(status_code=422, detail="sourceUrl must be an http(s) URL")
    created = 0
    updated = 0
    for item in body.outcomes:
        outcome = db.scalar(select(CurriculumOutcome).where(CurriculumOutcome.board == body.board, CurriculumOutcome.grade == body.grade,
                                   CurriculumOutcome.subject == body.subject, CurriculumOutcome.code == item.code, CurriculumOutcome.version == body.version))
        if outcome:
            updated += 1
        else:
            outcome = CurriculumOutcome(board=body.board, grade=body.grade, subject=body.subject, code=item.code, version=body.version)
            db.add(outcome)
            created += 1
        outcome.title = item.title
        outcome.description = item.description
        outcome.source_name = body.sourceName
        outcome.source_url = body.sourceUrl
        outcome.license = body.license
        outcome.is_active = True
    db.commit()
    return {"created": created, "updated": updated, "version": body.version}


@app.get("/api/v1/workspace")
def workspace(user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)]):
    item = _default_workspace(db, user)
    return {"id": item.id, "name": item.name, "memberRole": "owner"}


@app.get("/api/v1/lessons")
def list_lessons(user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)], limit: int = 50, offset: int = 0):
    workspace = _default_workspace(db, user)
    lessons = db.scalars(select(Lesson).where(Lesson.workspace_id == workspace.id, Lesson.deleted_at.is_(None)).order_by(Lesson.updated_at.desc()).limit(min(max(limit, 1), 100)).offset(max(offset, 0))).all()
    return {"items": [_lesson_payload(lesson) for lesson in lessons], "offset": max(offset, 0), "limit": min(max(limit, 1), 100)}


@app.get("/api/v1/generation-status")
def generation_status(user: Annotated[User, Depends(current_user)]):
    return model_generation_status()


@app.get("/api/v1/syllabi")
def list_syllabi(user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)]):
    workspace = _default_workspace(db, user)
    items = db.scalars(select(SyllabusDocument).where(SyllabusDocument.workspace_id == workspace.id)
                       .order_by(SyllabusDocument.created_at.desc()).limit(100)).all()
    corpus_rows = db.execute(
        select(SyllabusDocument.grade, SyllabusDocument.subject, func.count(SyllabusDocument.id))
        .where(SyllabusDocument.workspace_id == GLOBAL_REFERENCE_WORKSPACE_ID)
        .group_by(SyllabusDocument.grade, SyllabusDocument.subject)
    ).all()
    corpus_grades = {row[0] for row in corpus_rows}
    corpus_subjects = {row[1] for row in corpus_rows}
    corpus_count = sum(row[2] for row in corpus_rows)
    return {
        "items": [_syllabus_payload(item) for item in items],
        "localCorpus": {
            "documents": corpus_count,
            "classes": sorted(corpus_grades, key=lambda grade: int(grade.split()[-1])),
            "subjects": sorted(corpus_subjects),
        },
    }


@app.post("/api/v1/syllabi", status_code=201)
async def upload_syllabus(user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)],
                          file: Annotated[UploadFile, File()], board: Annotated[str, Form()], grade: Annotated[str, Form()],
                          subject: Annotated[str, Form()]):
    workspace = _default_workspace(db, user)
    boards = {"CBSE", "ICSE", "State board", "IB", "All boards"}
    grades = {*(f"Class {number}" for number in range(1, 13)), "All classes"}
    subjects = {"Mathematics", "EVS", "Science", "Physics", "Chemistry", "Biology", "English", "Social studies",
                "History", "Geography", "Political Science", "Economics", "Robotics", "All subjects"}
    if board not in boards or grade not in grades or subject not in subjects:
        raise HTTPException(status_code=422, detail="Choose a supported board, class, and subject for this syllabus")
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Upload a PDF document")
    content_type = file.content_type or ""
    pdf_bytes = await file.read(settings.max_pdf_bytes + 1)
    if len(pdf_bytes) > settings.max_pdf_bytes:
        raise HTTPException(status_code=413, detail=f"PDF exceeds {settings.max_pdf_bytes // (1024 * 1024)} MB")
    if not pdf_bytes.startswith(b"%PDF-") or content_type not in {"application/pdf", "application/octet-stream", ""}:
        raise HTTPException(status_code=415, detail="The uploaded file is not a valid PDF")
    try:
        _, page_texts, page_count, _ = await run_in_threadpool(extract_document, pdf_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not any(len(str(page.get("text") or "").strip()) >= 12 for page in page_texts):
        raise HTTPException(status_code=422, detail="No readable syllabus text was found. Upload a searchable PDF or a clearer scan.")
    safe_name = re.sub(r"[^\w .()\-]+", "_", file.filename.replace("/", "_").replace("\\", "_"))[:240]
    syllabus_id = str(uuid.uuid4())
    key = f"workspaces/{workspace.id}/syllabi/{syllabus_id}/{safe_name}"
    await run_in_threadpool(put_bytes, key, pdf_bytes, "application/pdf")
    item = SyllabusDocument(id=syllabus_id, workspace_id=workspace.id, uploaded_by=user.id, board=board, grade=grade,
                            subject=subject, source_name=safe_name, source_key=key, page_count=page_count,
                            page_texts=page_texts)
    db.add(item)
    db.commit()
    db.refresh(item)
    return _syllabus_payload(item)


@app.delete("/api/v1/syllabi/{syllabus_id}", status_code=204)
def delete_syllabus(syllabus_id: str, user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)]):
    workspace = _default_workspace(db, user)
    item = db.scalar(select(SyllabusDocument).where(SyllabusDocument.id == syllabus_id,
                                                    SyllabusDocument.workspace_id == workspace.id))
    if not item:
        raise HTTPException(status_code=404, detail="Syllabus reference not found")
    if item.source_key:
        delete_object(item.source_key)
    db.delete(item)
    db.commit()
    return Response(status_code=204)


@app.post("/api/v1/lessons", status_code=202)
async def create_lesson(user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)],
                        file: Annotated[UploadFile, File()], board: Annotated[str, Form()], grade: Annotated[str, Form()],
                        subject: Annotated[str, Form()], language: Annotated[str, Form()] = "English"):
    provider_status = model_generation_status()
    if not provider_status["configured"]:
        if provider_status.get("provider") == "Ollama local":
            raise HTTPException(status_code=503, detail="The local lesson model is still starting. Wait for Ollama and its model download to finish, then try again.")
        raise HTTPException(status_code=503, detail="The configured lesson model is unavailable. Check its provider settings and try again.")
    workspace = _default_workspace(db, user)
    if board not in {"CBSE", "ICSE", "State board", "IB"} or grade not in {f"Class {n}" for n in range(1, 13)}:
        raise HTTPException(status_code=422, detail="Choose a supported board and class")
    if subject not in {"Mathematics", "EVS", "Science", "Physics", "Chemistry", "Biology", "English", "Social studies", "History", "Geography", "Political Science", "Economics", "Robotics"}:
        raise HTTPException(status_code=422, detail="Choose a supported subject")
    if language != "English":
        raise HTTPException(status_code=422, detail="This workspace currently generates English lessons")
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Upload a PDF document")
    content_type = file.content_type or ""
    stream = file.file
    signature = await file.read(5)
    await file.seek(0)
    if signature != b"%PDF-" or content_type not in {"application/pdf", "application/octet-stream", ""}:
        raise HTTPException(status_code=415, detail="The uploaded file is not a valid PDF")
    size = 0
    digest = hashlib.sha256()
    while chunk := await file.read(1024 * 1024):
        size += len(chunk)
        if size > settings.max_pdf_bytes:
            raise HTTPException(status_code=413, detail=f"PDF exceeds {settings.max_pdf_bytes // (1024 * 1024)} MB")
        digest.update(chunk)
    await file.seek(0)
    safe_name = re.sub(r"[^\w .()\-]+", "_", file.filename.replace("/", "_").replace("\\", "_"))[:240]
    candidates = db.scalars(select(Lesson).where(
        Lesson.workspace_id == workspace.id,
        Lesson.source_name == safe_name,
        Lesson.board == board,
        Lesson.grade == grade,
        Lesson.subject == subject,
        Lesson.language == language,
        Lesson.status.in_(("queued", "processing", "ready")),
    ).order_by(Lesson.created_at.desc()).limit(8)).all()
    for candidate in candidates:
        # A same-file upload made before the current creative-generation
        # pipeline must be rebuilt, not silently re-opened from the old cache.
        if (candidate.content or {}).get("generationVersion") != GENERATION_VERSION:
            continue
        try:
            if hashlib.sha256(get_bytes(candidate.source_key)).digest() != digest.digest():
                continue
        except Exception:
            continue
        existing_job = db.scalar(select(ProcessingJob).where(
            ProcessingJob.lesson_id == candidate.id,
            ProcessingJob.kind == "lesson",
        ).order_by(ProcessingJob.created_at.desc()).limit(1))
        if existing_job and existing_job.state in {"queued", "processing", "retrying", "succeeded"}:
            return {"lesson": _lesson_payload(candidate), "job": _job_payload(existing_job), "deduplicated": True}
    lesson_id, job_id = str(uuid.uuid4()), str(uuid.uuid4())
    key = f"workspaces/{workspace.id}/sources/{lesson_id}/{safe_name}"
    await run_in_threadpool(put_stream, key, stream, "application/pdf")
    lesson = Lesson(id=lesson_id, workspace_id=workspace.id, created_by=user.id, title=safe_name.rsplit(".", 1)[0],
                    source_name=safe_name, source_key=key, board=board[:64], grade=grade[:32], subject=subject[:80], language=language[:32])
    job = ProcessingJob(id=job_id, lesson_id=lesson_id, kind="lesson", state="queued", stage="queued", progress=0)
    db.add_all([lesson, job])
    db.commit()
    try:
        result = generate_lesson.apply_async(args=[lesson.id, job.id], task_id=job.id)
        job.task_id = result.id
        db.commit()
    except Exception:
        job.state = "failed"
        job.error_message = "The processing queue is unavailable. Try again later."
        lesson.status = "failed"
        db.commit()
        raise HTTPException(status_code=503, detail="The processing queue is unavailable")
    return {"lesson": _lesson_payload(lesson), "job": _job_payload(job)}


@app.get("/api/v1/lessons/{lesson_id}")
def get_lesson(lesson_id: str, user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)]):
    lesson = _accessible_lesson(db, user, lesson_id)
    _upgrade_math_lesson_if_needed(lesson, db)
    return _lesson_payload(lesson)


@app.get("/api/v1/lessons/{lesson_id}/source-images")
async def lesson_source_images(lesson_id: str, user: Annotated[User, Depends(current_user)],
                              db: Annotated[Session, Depends(get_db)]):
    lesson = _accessible_lesson(db, user, lesson_id)
    if not lesson.source_key or not lesson.content:
        return {"items": []}
    pdf_bytes = await run_in_threadpool(get_bytes, lesson.source_key)
    figures = await run_in_threadpool(extract_source_images, pdf_bytes, lesson.content.get("slides", []))
    return {"items": figures}


@app.patch("/api/v1/lessons/{lesson_id}")
def update_lesson(lesson_id: str, body: LessonUpdate, user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)]):
    lesson = _accessible_lesson(db, user, lesson_id)
    slides = body.content.get("slides")
    if not isinstance(slides, list) or not 1 <= len(slides) <= 60:
        raise HTTPException(status_code=422, detail="A lesson must contain between 1 and 60 slides")
    if any(not isinstance(slide, dict) for slide in slides):
        raise HTTPException(status_code=422, detail="Every lesson slide must be an object")
    if sum(len(str(value)) for value in body.content.values()) > 500_000:
        raise HTTPException(status_code=413, detail="Lesson content is too large")
    lesson.content = body.content
    lesson.title = str(body.content.get("title") or lesson.title)[:240]
    lesson.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _lesson_payload(lesson)


@app.delete("/api/v1/lessons/{lesson_id}", status_code=204)
def delete_lesson(lesson_id: str, user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)]):
    lesson = _accessible_lesson(db, user, lesson_id)
    keys = [lesson.source_key] if lesson.source_key else []
    keys.extend(key for key in db.scalars(select(ProcessingJob.result_key).where(ProcessingJob.lesson_id == lesson_id, ProcessingJob.result_key.is_not(None))).all() if key)
    try:
        for key in keys:
            delete_object(key)
    except Exception:
        raise HTTPException(status_code=503, detail="Lesson files could not be removed. Retry the deletion.")
    db.delete(lesson)
    db.commit()
    return Response(status_code=204)


@app.get("/api/v1/lessons/{lesson_id}/jobs")
def lesson_jobs(lesson_id: str, user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)]):
    _accessible_lesson(db, user, lesson_id)
    jobs = db.scalars(select(ProcessingJob).where(ProcessingJob.lesson_id == lesson_id).order_by(ProcessingJob.created_at.desc()).limit(20)).all()
    stale_jobs = [_reconcile_stale_job(db, job) for job in jobs]
    if any(stale_jobs):
        db.commit()
    return {"items": [_job_payload(job) for job in jobs]}


@app.get("/api/v1/jobs/{job_id}")
def get_job(job_id: str, user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)]):
    job = db.get(ProcessingJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    _accessible_lesson(db, user, job.lesson_id)
    if _reconcile_stale_job(db, job):
        db.commit()
    return _job_payload(job)


@app.post("/api/v1/lessons/{lesson_id}/retry", status_code=202)
def retry_lesson(lesson_id: str, user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)]):
    lesson = _accessible_lesson(db, user, lesson_id)
    jobs = db.scalars(select(ProcessingJob).where(
        ProcessingJob.lesson_id == lesson.id, ProcessingJob.kind == "lesson"
    ).order_by(ProcessingJob.created_at.desc()).limit(1)).all()
    latest = jobs[0] if jobs else None
    if latest and _reconcile_stale_job(db, latest):
        db.commit()
    if latest and latest.state in {"queued", "processing", "retrying"}:
        return _job_payload(latest)
    if lesson.content:
        raise HTTPException(status_code=409, detail="This lesson is already ready. Export its PowerPoint instead.")
    job = ProcessingJob(lesson_id=lesson.id, kind="lesson", state="queued", stage="queued", progress=0)
    lesson.status = "queued"
    db.add(job)
    db.commit()
    db.refresh(job)
    try:
        result = generate_lesson.apply_async(args=[lesson.id, job.id], task_id=job.id)
        job.task_id = result.id
        db.commit()
    except Exception:
        job.state = "failed"
        job.stage = "failed"
        job.progress = 100
        job.error_message = "The processing queue is unavailable. Try again later."
        lesson.status = "failed"
        db.commit()
        raise HTTPException(status_code=503, detail="The processing queue is unavailable")
    return _job_payload(job)


@app.post("/api/v1/lessons/{lesson_id}/exports", status_code=202)
def create_export(lesson_id: str, body: ExportBody, user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)]):
    lesson = _accessible_lesson(db, user, lesson_id)
    if not lesson.content:
        raise HTTPException(status_code=409, detail="Lesson processing has not completed")
    active_job = db.scalar(select(ProcessingJob).where(
        ProcessingJob.lesson_id == lesson.id,
        ProcessingJob.kind == "export",
        ProcessingJob.state.in_(("queued", "processing", "retrying")),
    ).order_by(ProcessingJob.created_at.desc()).limit(1))
    if active_job and not _reconcile_stale_job(db, active_job):
        return _job_payload(active_job)
    if active_job:
        db.commit()
    job = ProcessingJob(lesson_id=lesson.id, kind="export", state="queued", stage="queued", progress=0)
    db.add(job)
    db.commit()
    db.refresh(job)
    try:
        export_lesson.apply_async(args=[lesson.id, job.id, body.params.model_dump()], task_id=job.id)
    except Exception:
        job.state = "failed"
        job.error_message = "The rendering queue is unavailable. Try again later."
        db.commit()
        raise HTTPException(status_code=503, detail="The rendering queue is unavailable")
    return _job_payload(job)


@app.get("/api/v1/jobs/{job_id}/download")
def download_job(job_id: str, user: Annotated[User, Depends(current_user)], db: Annotated[Session, Depends(get_db)]):
    job = db.get(ProcessingJob, job_id)
    if not job or job.kind != "export":
        raise HTTPException(status_code=404, detail="PowerPoint export not found")
    lesson = _accessible_lesson(db, user, job.lesson_id)
    if job.state != "succeeded" or not job.result_key:
        raise HTTPException(status_code=409, detail="PowerPoint export is still processing")
    data = get_bytes(job.result_key)
    filename = re.sub(r"[^a-zA-Z0-9-]+", "-", lesson.title).strip("-").lower() or "classroom-lesson"
    return Response(data, media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    headers={"Content-Disposition": f'attachment; filename="{filename}.pptx"', "Cache-Control": "private, no-store"})
