import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.core.deps import get_current_user
from app.schemas.chat import (
    ConversationResponse,
    ConversationDetailResponse,
    MessageResponse,
    Citation,
)

router = APIRouter(tags=["Conversations"])


@router.get("", response_model=list[ConversationResponse])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ConversationResponse]:
    """
    List all conversations belonging to the authenticated user ordered newest first.
    Strictly isolated by current_user.id.
    """
    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    results: list[ConversationResponse] = []
    for conv in conversations:
        # Fetch the last message snippet if available
        last_msg = (
            db.query(Message.content)
            .filter(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        selected_ids = None
        if conv.selected_document_ids:
            try:
                selected_ids = json.loads(conv.selected_document_ids)
            except Exception:
                selected_ids = None

        results.append(
            ConversationResponse(
                id=conv.id,
                user_id=conv.user_id,
                title=conv.title,
                selected_document_ids=selected_ids,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                last_message=last_msg[0] if last_msg else None,
            )
        )

    return results


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationDetailResponse:
    """
    Retrieve full conversation turns with source citations.
    Returns HTTP 404 if not found or unauthorized.
    """
    conv = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with ID {conversation_id} was not found.",
        )

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    formatted_messages: list[MessageResponse] = []
    for msg in messages:
        citations: list[Citation] = []
        if msg.sources_json:
            try:
                raw_sources = json.loads(msg.sources_json)
                citations = [Citation(**s) for s in raw_sources]
            except Exception:
                citations = []

        formatted_messages.append(
            MessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                role=msg.role,
                content=msg.content,
                sources=citations,
                created_at=msg.created_at,
            )
        )

    selected_ids = None
    if conv.selected_document_ids:
        try:
            selected_ids = json.loads(conv.selected_document_ids)
        except Exception:
            selected_ids = None

    return ConversationDetailResponse(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        selected_document_ids=selected_ids,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=formatted_messages,
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_200_OK)
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """
    Delete a conversation and all its messages.
    Strictly enforces ownership: 404 if conversation belongs to another user.
    """
    conv = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with ID {conversation_id} was not found.",
        )

    db.delete(conv)
    db.commit()

    return {"status": "ok", "message": f"Conversation {conversation_id} deleted."}
