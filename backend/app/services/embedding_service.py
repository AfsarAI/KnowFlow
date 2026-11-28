import logging
from typing import Any
import httpx
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.chunk import DocumentChunk

logger = logging.getLogger(__name__)


def is_embedding_configured() -> bool:
    """Check whether the active AI provider has an API key configured."""
    if settings.AI_PROVIDER == "openai":
        return bool(settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip())
    elif settings.AI_PROVIDER == "gemini":
        return bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())
    return False


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Generate dense embedding vectors for a batch of input texts using the configured provider.
    Raises ValueError if API keys are unconfigured, or RuntimeError if API call fails.
    """
    if not texts:
        return []

    if settings.AI_PROVIDER == "gemini":
        return _embed_texts_gemini(texts)
    else:
        return _embed_texts_openai(texts)


def embed_text(text: str) -> list[float]:
    """Generate a single embedding vector for a query string."""
    results = embed_texts([text])
    if not results:
        raise RuntimeError("Embedding provider returned empty response for query.")
    return results[0]


def _embed_texts_openai(texts: list[str]) -> list[list[float]]:
    """Generate embeddings via OpenAI-compatible REST API."""
    if not settings.OPENAI_API_KEY or not settings.OPENAI_API_KEY.strip():
        raise ValueError(
            "OpenAI API key is missing. Please configure OPENAI_API_KEY in your environment or .env file to generate embeddings."
        )

    base_url = (settings.OPENAI_BASE_URL or "https://api.openai.com/v1").rstrip("/")
    url = f"{base_url}/embeddings"

    # Batching to prevent payload limits
    batch_size = 64
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        payload: dict[str, Any] = {
            "model": settings.OPENAI_EMBEDDING_MODEL,
            "input": batch,
        }
        # If using text-embedding-3-* models, pass requested dimensions
        if "text-embedding-3" in settings.OPENAI_EMBEDDING_MODEL:
            payload["dimensions"] = settings.EMBEDDING_DIMENSION

        try:
            with httpx.Client(timeout=45.0) as client:
                res = client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY.strip()}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
        except Exception as exc:
            raise RuntimeError(f"OpenAI embedding network connection failed: {str(exc)}") from exc

        if res.status_code != 200:
            raise RuntimeError(
                f"OpenAI embedding API failed (HTTP {res.status_code}): {res.text}"
            )

        data = res.json()
        embeddings = [item["embedding"] for item in data.get("data", [])]
        all_embeddings.extend(embeddings)

    return all_embeddings


def _embed_texts_gemini(texts: list[str]) -> list[list[float]]:
    """Generate embeddings via Google Gemini REST API."""
    if not settings.GEMINI_API_KEY or not settings.GEMINI_API_KEY.strip():
        raise ValueError(
            "Gemini API key is missing. Please configure GEMINI_API_KEY in your environment or .env file to generate embeddings."
        )

    model_name = settings.GEMINI_EMBEDDING_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:batchEmbedContents?key={settings.GEMINI_API_KEY.strip()}"

    batch_size = 32
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        requests = [
            {
                "model": f"models/{model_name}",
                "content": {"parts": [{"text": t}]},
                "outputDimensionality": settings.EMBEDDING_DIMENSION,
            }
            for t in batch
        ]

        try:
            with httpx.Client(timeout=45.0) as client:
                res = client.post(url, json={"requests": requests})
        except Exception as exc:
            raise RuntimeError(f"Gemini embedding network connection failed: {str(exc)}") from exc

        if res.status_code != 200:
            raise RuntimeError(
                f"Gemini embedding API failed (HTTP {res.status_code}): {res.text}"
            )

        data = res.json()
        embeddings = [item.get("values", []) for item in data.get("embeddings", [])]
        all_embeddings.extend(embeddings)

    return all_embeddings


def embed_and_store_document_chunks(db: Session, chunks: list[DocumentChunk]) -> int:
    """
    Generate embeddings for given DocumentChunk instances and persist to database.
    If AI provider is unconfigured, chunks remain saved with embedding=None.
    """
    if not chunks:
        return 0

    if not is_embedding_configured():
        logger.info(
            "Embedding provider API key is not configured; chunks saved with embedding=None. "
            "Set OPENAI_API_KEY (or GEMINI_API_KEY) to generate dense vector embeddings."
        )
        return 0

    texts = [c.content for c in chunks]
    embeddings = embed_texts(texts)

    for chunk, emb in zip(chunks, embeddings):
        chunk.embedding = emb

    db.commit()
    logger.info(f"Successfully generated and stored {len(embeddings)} dense embeddings.")
    return len(embeddings)
