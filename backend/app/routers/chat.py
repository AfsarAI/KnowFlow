import datetime
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.core.deps import get_current_user
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    MessageResponse,
    Citation,
)
from app.services import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Chat"])


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat_endpoint(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    """
    RAG-grounded conversational endpoint:
    1. Validates or initializes user conversation session.
    2. Embeds query and retrieves user-owned document passages.
    3. Synthesizes grounded answer using bounded LLM context.
    4. Records turn into database conversation history.
    5. Returns answer with validated source citations.
    """
    clean_message = payload.message.strip()
    if not clean_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat message cannot be empty.",
        )

    # 1. Resolve or create Conversation session
    conversation: Conversation | None = None
    if payload.conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == payload.conversation_id,
                Conversation.user_id == current_user.id,
            )
            .first()
        )
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation with ID {payload.conversation_id} not found.",
            )
    else:
        # Create new conversation with title derived from initial message
        short_title = clean_message[:45].strip()
        if len(clean_message) > 45:
            short_title += "..."
        conversation = Conversation(
            user_id=current_user.id,
            title=short_title or "New Chat",
            selected_document_ids=json.dumps(payload.document_ids) if payload.document_ids else None,
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 2. Persist User Message
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=clean_message,
        sources_json=None,
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # 3. Execute true RAG pipeline
    try:
        rag_output = rag_service.answer_query(
            db=db,
            user_id=current_user.id,
            question=clean_message,
            selected_document_ids=payload.document_ids,
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error(f"RAG execution failure: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate answer: {str(exc)}",
        )

    # 4. Persist Assistant Message with citations
    citations_data = rag_output.get("citations", [])
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=rag_output.get("answer", ""),
        sources_json=json.dumps(citations_data) if citations_data else None,
    )
    db.add(assistant_msg)

    # Update conversation timestamp
    conversation.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(assistant_msg)

    # 5. Format response
    formatted_citations = [Citation(**c) for c in citations_data]

    return ChatResponse(
        conversation_id=conversation.id,
        user_message=MessageResponse(
            id=user_msg.id,
            conversation_id=conversation.id,
            role="user",
            content=user_msg.content,
            sources=[],
            created_at=user_msg.created_at,
        ),
        assistant_message=MessageResponse(
            id=assistant_msg.id,
            conversation_id=conversation.id,
            role="assistant",
            content=assistant_msg.content,
            sources=formatted_citations,
            created_at=assistant_msg.created_at,
        ),
        citations=formatted_citations,
        insufficient_evidence=rag_output.get("insufficient_evidence", False),
    )
