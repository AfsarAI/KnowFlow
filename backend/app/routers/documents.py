from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.schemas.document import (
    DocumentResponse,
    DocumentDetailResponse,
    DocumentDeleteResponse,
)
from app.services import document_service

router = APIRouter(tags=["Documents"])

@router.post("", response_model=list[DocumentResponse], status_code=status.HTTP_201_CREATED)
def upload_documents(
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DocumentResponse]:
    """
    Upload one or multiple PDF or TXT documents.
    Validates, securely stores, extracts text page-by-page, and returns structured records.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file must be provided.",
        )

    results: list[DocumentResponse] = []
    for f in files:
        doc = document_service.save_and_process_document(db, current_user, f)
        results.append(doc)

    return results


@router.get("", response_model=list[DocumentResponse])
def get_user_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DocumentResponse]:
    """
    List all documents belonging to the authenticated user, ordered by newest first.
    Enforces multi-tenant data isolation.
    """
    return document_service.list_documents(db, current_user.id)


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_details(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentDetailResponse:
    """
    Retrieve document details and extracted text content.
    Returns 404 if the document does not exist or does not belong to the authenticated user.
    """
    doc = document_service.get_document(db, current_user.id, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} was not found.",
        )
    return doc


@router.delete("/{document_id}", response_model=DocumentDeleteResponse)
def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentDeleteResponse:
    """
    Delete a document record and its associated storage file.
    Enforces user ownership: users can only delete their own documents.
    """
    success = document_service.delete_document(db, current_user.id, document_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} was not found.",
        )

    return DocumentDeleteResponse(
        status="ok",
        message="Document and stored file successfully deleted.",
        document_id=document_id,
    )
