import io
import os
import re
from typing import Any
import pypdf
from app.core.config import settings

class ExtractionError(Exception):
    """Base exception for document extraction failures."""
    pass

class ValidationError(ExtractionError):
    """Raised when file format, extension, or size validation fails."""
    pass


def validate_file(filename: str, content: bytes) -> tuple[str, str]:
    """
    Validate document filename, extension, size, and header signature.
    Returns: (sanitized_filename, file_type) where file_type is 'pdf' or 'txt'.
    """
    if not filename or not filename.strip():
        raise ValidationError("Filename cannot be empty.")

    clean_filename = os.path.basename(filename.strip())
    # Sanitize special characters
    clean_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean_filename)

    ext = os.path.splitext(clean_filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        allowed = ", ".join(settings.ALLOWED_EXTENSIONS)
        raise ValidationError(
            f"Unsupported file extension '{ext}'. Only {allowed} files are allowed."
        )

    file_size = len(content)
    if file_size == 0:
        raise ValidationError("Uploaded file is empty (0 bytes).")

    if file_size > settings.max_upload_size_bytes:
        raise ValidationError(
            f"File size ({file_size / (1024 * 1024):.2f} MB) exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
        )

    file_type = "pdf" if ext == ".pdf" else "txt"

    # Signature verification
    if file_type == "pdf":
        if b"%PDF-" not in content[:1024]:
            raise ValidationError("Invalid PDF format: magic signature '%PDF-' not found in header.")
    else:
        # Check text file does not contain null bytes indicating raw binary
        if b"\x00" in content[:4096]:
            raise ValidationError("Invalid text file: binary data or null bytes detected.")

    return clean_filename, file_type


def extract_from_pdf(content: bytes) -> tuple[int, str, list[dict[str, Any]]]:
    """
    Extract text page-by-page from a PDF document using pypdf.
    Returns: (page_count, full_text, pages_list)
    """
    try:
        reader = pypdf.PdfReader(io.BytesIO(content))
    except Exception as exc:
        raise ExtractionError(f"Failed to parse PDF document structure: {str(exc)}") from exc

    if reader.is_encrypted:
        try:
            decrypt_result = reader.decrypt("")
            if decrypt_result == 0:
                raise ExtractionError("Encrypted or password-protected PDFs are not supported.")
        except Exception as exc:
            raise ExtractionError("Encrypted or password-protected PDFs are not supported.") from exc

    page_count = len(reader.pages)
    if page_count == 0:
        raise ExtractionError("PDF contains no pages.")

    pages_data: list[dict[str, Any]] = []
    extracted_paragraphs: list[str] = []

    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        try:
            page_text = page.extract_text() or ""
        except Exception:
            page_text = ""

        cleaned_text = page_text.strip()
        pages_data.append({
            "page_number": page_num,
            "text": cleaned_text,
            "char_count": len(cleaned_text),
        })

        if cleaned_text:
            extracted_paragraphs.append(cleaned_text)

    full_text = "\n\n".join(extracted_paragraphs)
    return page_count, full_text, pages_data


def extract_from_txt(content: bytes) -> tuple[int, str, list[dict[str, Any]]]:
    """
    Extract text from a plain-text document, handling encodings cleanly.
    Returns: (page_count=1, full_text, pages_list)
    """
    text = ""
    for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if not text and content:
        text = content.decode("utf-8", errors="replace")

    cleaned_text = text.strip()
    pages_data = [{
        "page_number": 1,
        "text": cleaned_text,
        "char_count": len(cleaned_text),
    }]

    return 1, cleaned_text, pages_data


def extract_document_text(file_type: str, content: bytes) -> tuple[int, str, list[dict[str, Any]]]:
    """Dispatch document extraction based on validated file type."""
    if file_type == "pdf":
        return extract_from_pdf(content)
    elif file_type == "txt":
        return extract_from_txt(content)
    else:
        raise ValidationError(f"Unknown file type '{file_type}'.")
