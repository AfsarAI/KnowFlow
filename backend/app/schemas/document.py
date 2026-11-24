import datetime
import uuid
from pydantic import BaseModel, ConfigDict

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: uuid.UUID
    filename: str
    file_type: str
    file_size: int
    processing_status: str
    page_count: int | None = None
    error_message: str | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

class DocumentDetailResponse(DocumentResponse):
    extracted_text: str | None = None

class DocumentDeleteResponse(BaseModel):
    status: str
    message: str
    document_id: int

class DocumentUploadBatchResponse(BaseModel):
    uploaded: list[DocumentResponse]
    total_uploaded: int
