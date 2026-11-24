import json
import os
import uuid
from typing import BinaryIO
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException, status

from app.core.config import settings
from app.models.document import Document
from app.models.user import User
from app.services.extraction_service import (
    validate_file,
    extract_document_text,
    ValidationError,
    ExtractionError,
)

def save_and_process_document(
    db: Session,
    user: User,
    file: UploadFile,
) -> Document:
    """
    Synchronously validate, store, extract, and record an uploaded document.
    """
    raw_filename = file.filename or "unnamed_document"

    # 1. Read file bytes into memory up to max allowed size
    try:
        content = file.file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file '{raw_filename}': {str(exc)}",
        )

    # 2. Validate metadata, extension, size, and signature
    try:
        safe_filename, file_type = validate_file(raw_filename, content)
    except ValidationError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )

    # 3. Store file securely in user-scoped storage directory
    user_upload_dir = settings.get_upload_root() / str(user.id)
    user_upload_dir.mkdir(parents=True, exist_ok=True)

    unique_disk_filename = f"{uuid.uuid4().hex}_{safe_filename}"
    disk_file_path = user_upload_dir / unique_disk_filename

    try:
        with open(disk_file_path, "wb") as f:
            f.write(content)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save document to storage: {str(exc)}",
        )

    # 4. Create Document record in DB with 'processing' status
    document = Document(
        user_id=user.id,
        filename=safe_filename,
        file_type=file_type,
        file_size=len(content),
        storage_path=str(disk_file_path),
        processing_status="processing",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # 5. Extract text content synchronously
    try:
        page_count, full_text, pages_data = extract_document_text(file_type, content)
        document.page_count = page_count
        document.extracted_text = full_text
        document.pages_json = json.dumps(pages_data)
        document.processing_status = "completed"
        document.error_message = None
    except ExtractionError as ext_err:
        document.processing_status = "failed"
        document.error_message = str(ext_err)
    except Exception as exc:
        document.processing_status = "failed"
        document.error_message = f"Unexpected extraction error: {str(exc)}"

    db.commit()
    db.refresh(document)
    return document


def list_documents(db: Session, user_id: uuid.UUID) -> list[Document]:
    """Retrieve all documents belonging to the authenticated user ordered newest first."""
    return (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .all()
    )


def get_document(db: Session, user_id: uuid.UUID, document_id: int) -> Document | None:
    """Retrieve a single document owned by user, returning None if not found or unauthorized."""
    return (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == user_id)
        .first()
    )


def delete_document(db: Session, user_id: uuid.UUID, document_id: int) -> bool:
    """Delete a document record and its physical storage file, enforcing ownership."""
    document = get_document(db, user_id, document_id)
    if not document:
        return False

    # Remove physical file if present
    if document.storage_path and os.path.exists(document.storage_path):
        try:
            os.remove(document.storage_path)
        except OSError:
            pass

    db.delete(document)
    db.commit()
    return True
