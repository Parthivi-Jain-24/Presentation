"""Index the PDFs in the mounted project data folder for local lesson retrieval."""

from __future__ import annotations

import logging
import os
import re
import secrets
import uuid
from pathlib import Path

from sqlalchemy import select

from app.content import extract_document, safe_pdf_title
from app.database import SessionLocal
from app.models import SyllabusDocument, User, Workspace
from app.reference_corpus import GLOBAL_REFERENCE_USER_ID, GLOBAL_REFERENCE_WORKSPACE_ID
from app.security import hash_password
from app.storage import put_bytes

logger = logging.getLogger("reference-corpus-import")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _classification(path: Path, root: Path) -> tuple[str, str] | None:
    relative = path.relative_to(root)
    folder = relative.parts[0]
    match = re.fullmatch(r"class\s+(\d+)(?:\s+([a-z0-9]+))?", folder.strip(), re.IGNORECASE)
    if not match:
        return None
    grade_number = int(match.group(1))
    if not 1 <= grade_number <= 12:
        return None
    folder_subject = (match.group(2) or "").upper()
    if folder_subject.startswith("S"):
        subject = "Science"
    elif folder_subject.startswith("M") or not folder_subject:
        subject = "Mathematics"
    else:
        return None
    return f"Class {grade_number}", subject


def _ensure_global_library(db) -> None:
    user = db.get(User, GLOBAL_REFERENCE_USER_ID)
    if user is None:
        user = User(
            id=GLOBAL_REFERENCE_USER_ID,
            email="local-curriculum-library@invalid.local",
            display_name="Built-in local curriculum library",
            password_hash=hash_password(secrets.token_urlsafe(32)),
            is_active=False,
        )
        db.add(user)
    workspace = db.get(Workspace, GLOBAL_REFERENCE_WORKSPACE_ID)
    if workspace is None:
        db.add(Workspace(id=GLOBAL_REFERENCE_WORKSPACE_ID, name="Built-in local curriculum library"))
    db.commit()


def _source_name(path: Path, grade: str, subject: str, page_texts: list[dict]) -> str:
    title = safe_pdf_title(path.name, page_texts)
    if title.casefold() == path.stem.replace("_", " ").replace("-", " ").casefold():
        title = path.stem
    return f"NCERT {grade} {subject} - {title}"[:240]


def import_corpus(root: Path) -> dict[str, int]:
    if not root.is_dir():
        raise FileNotFoundError(f"Reference PDF folder does not exist: {root}")
    pdf_paths = sorted((path for path in root.rglob("*") if path.is_file() and path.suffix.casefold() == ".pdf"), key=lambda item: str(item).casefold())
    if not pdf_paths:
        raise ValueError(f"No PDFs were found under {root}")

    counts = {"found": len(pdf_paths), "created": 0, "updated": 0, "skipped": 0, "pages": 0}
    with SessionLocal() as db:
        _ensure_global_library(db)
        for index, path in enumerate(pdf_paths, start=1):
            classification = _classification(path, root)
            if classification is None:
                logger.warning("Skipping PDF in an unrecognized class/subject folder: %s", path.relative_to(root))
                counts["skipped"] += 1
                continue

            grade, subject = classification
            relative_name = path.relative_to(root).as_posix()
            source_key = f"reference-corpus/{relative_name}"
            document_id = str(uuid.uuid5(uuid.NAMESPACE_URL, source_key))
            pdf_bytes = path.read_bytes()
            _, page_texts, page_count, _ = extract_document(pdf_bytes)
            if not any(len(str(page.get("text") or "").strip()) >= 12 for page in page_texts):
                raise ValueError(f"No readable text could be extracted from {relative_name}")

            existing = db.get(SyllabusDocument, document_id)
            if existing is None:
                existing = SyllabusDocument(
                    id=document_id,
                    workspace_id=GLOBAL_REFERENCE_WORKSPACE_ID,
                    uploaded_by=GLOBAL_REFERENCE_USER_ID,
                    board="CBSE",
                    grade=grade,
                    subject=subject,
                    source_name=_source_name(path, grade, subject, page_texts),
                    source_key=source_key,
                    page_count=page_count,
                    page_texts=page_texts,
                )
                db.add(existing)
                counts["created"] += 1
            else:
                existing.board = "CBSE"
                existing.grade = grade
                existing.subject = subject
                existing.source_name = _source_name(path, grade, subject, page_texts)
                existing.source_key = source_key
                existing.page_count = page_count
                existing.page_texts = page_texts
                counts["updated"] += 1

            put_bytes(source_key, pdf_bytes, "application/pdf")
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise
            counts["pages"] += page_count
            logger.info("Indexed %d/%d: %s (%s, %s, %d pages)", index, len(pdf_paths), relative_name, grade, subject, page_count)
    return counts


def main() -> None:
    root = Path(os.environ.get("REFERENCE_PDF_ROOT", "/reference-data"))
    counts = import_corpus(root)
    logger.info(
        "Local curriculum corpus ready: %(created)d added, %(updated)d refreshed, %(skipped)d skipped; "
        "%(found)d PDFs scanned, %(pages)d pages indexed.",
        counts,
    )


if __name__ == "__main__":
    main()
