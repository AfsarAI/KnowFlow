import json
import re
from typing import Any
from app.core.config import settings
from app.models.chunk import DocumentChunk
from app.models.document import Document


def clean_text(text: str) -> str:
    """Normalize whitespace and strip extraneous control characters while preserving structure."""
    if not text:
        return ""
    # Normalize carriage returns and form feeds
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\x0c", "\n\n")
    # Collapse 3+ newlines into double newlines (paragraphs)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Collapse multiple inline spaces/tabs to a single space
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    return "\n".join(lines).strip()


def split_text_into_chunks(
    text: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[str]:
    """
    Split text into overlapping character chunks while respecting paragraph,
    sentence, and word boundaries wherever possible.
    """
    target_size = chunk_size or settings.CHUNK_SIZE
    overlap = chunk_overlap or settings.CHUNK_OVERLAP

    if overlap >= target_size:
        overlap = max(0, target_size // 4)

    text = clean_text(text)
    if not text:
        return []

    if len(text) <= target_size:
        return [text]

    chunks: list[str] = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = start + target_size
        if end >= text_len:
            chunk = text[start:].strip()
            if chunk:
                chunks.append(chunk)
            break

        # Attempt to break at natural boundaries in descending order of preference
        # 1. Paragraph boundary (\n\n)
        paragraph_split = text.rfind("\n\n", start + overlap, end)
        if paragraph_split != -1:
            split_point = paragraph_split + 2
        else:
            # 2. Line boundary (\n)
            line_split = text.rfind("\n", start + overlap, end)
            if line_split != -1:
                split_point = line_split + 1
            else:
                # 3. Sentence boundary (. or ! or ? followed by space)
                sentence_match = list(re.finditer(r"[.!?]\s", text[start + overlap:end]))
                if sentence_match:
                    split_point = start + overlap + sentence_match[-1].end()
                else:
                    # 4. Word boundary (space)
                    space_split = text.rfind(" ", start + overlap, end)
                    if space_split != -1:
                        split_point = space_split + 1
                    else:
                        # 5. Hard break
                        split_point = end

        chunk = text[start:split_point].strip()
        if chunk:
            chunks.append(chunk)

        # Advance with sliding window overlap
        new_start = split_point - overlap
        if new_start <= start:
            new_start = split_point
        start = new_start

    return chunks


def create_document_chunks(
    document: Document,
    pages_data: list[dict[str, Any]] | None = None,
    full_text: str | None = None,
) -> list[DocumentChunk]:
    """
    Chunk an uploaded document, recording 1-based page numbers and metadata.
    Returns uncommitted DocumentChunk objects ready for DB persistence.
    """
    chunks: list[DocumentChunk] = []
    chunk_index = 0

    if pages_data:
        for page in pages_data:
            page_num = page.get("page_number", 1)
            raw_text = page.get("text", "")
            cleaned = clean_text(raw_text)
            if not cleaned:
                continue

            page_chunks = split_text_into_chunks(cleaned)
            for chunk_str in page_chunks:
                token_est = max(1, len(chunk_str.split()))
                meta = {
                    "document_id": document.id,
                    "filename": document.filename,
                    "file_type": document.file_type,
                    "page_number": page_num,
                    "char_count": len(chunk_str),
                }
                chunks.append(
                    DocumentChunk(
                        document_id=document.id,
                        chunk_index=chunk_index,
                        page_number=page_num,
                        content=chunk_str,
                        token_count=token_est,
                        metadata_json=json.dumps(meta),
                        embedding=None,
                    )
                )
                chunk_index += 1

    # Fallback if no page data or all pages were empty
    if not chunks and full_text:
        cleaned_full = clean_text(full_text)
        if cleaned_full:
            text_chunks = split_text_into_chunks(cleaned_full)
            for chunk_str in text_chunks:
                token_est = max(1, len(chunk_str.split()))
                meta = {
                    "document_id": document.id,
                    "filename": document.filename,
                    "file_type": document.file_type,
                    "page_number": 1,
                    "char_count": len(chunk_str),
                }
                chunks.append(
                    DocumentChunk(
                        document_id=document.id,
                        chunk_index=chunk_index,
                        page_number=1,
                        content=chunk_str,
                        token_count=token_est,
                        metadata_json=json.dumps(meta),
                        embedding=None,
                    )
                )
                chunk_index += 1

    return chunks
