import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field


class Citation(BaseModel):
    document_id: int
    filename: str
    page_number: int | None = None
    chunk_index: int
    snippet: str
    similarity: float | None = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000, description="User question or prompt")
    conversation_id: int | None = Field(None, description="Optional existing conversation ID to continue")
    document_ids: list[int] | None = Field(None, description="Optional document IDs to scope retrieval to")


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    role: str
    content: str
    sources: list[Citation] = []
    created_at: datetime.datetime


class ChatResponse(BaseModel):
    conversation_id: int
    user_message: MessageResponse
    assistant_message: MessageResponse
    citations: list[Citation] = []
    insufficient_evidence: bool = False


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: uuid.UUID
    title: str
    selected_document_ids: list[int] | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    last_message: str | None = None


class ConversationDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: uuid.UUID
    title: str
    selected_document_ids: list[int] | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    messages: list[MessageResponse] = []
