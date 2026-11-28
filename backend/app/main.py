from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import health, auth, documents, chat, conversations

app = FastAPI(
    title="KnowFlow API",
    version="0.1.0",
    description="Backend API for KnowFlow — Document-based Retrieval-Augmented Generation (RAG) knowledge assistant.",
)

# CORS Middleware allowing frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public health checks
app.include_router(health.router)

# Authentication endpoints (supported at both /api/auth and /api/v1/auth)
app.include_router(auth.router, prefix="/api/auth")
app.include_router(auth.router, prefix="/api/v1/auth")

# Document endpoints (supported at both /api/documents and /api/v1/documents)
app.include_router(documents.router, prefix="/api/documents")
app.include_router(documents.router, prefix="/api/v1/documents")

# Chat / RAG endpoints (supported at both /api/chat and /api/v1/chat)
app.include_router(chat.router, prefix="/api/chat")
app.include_router(chat.router, prefix="/api/v1/chat")

# Conversation session endpoints (supported at both /api/conversations and /api/v1/conversations)
app.include_router(conversations.router, prefix="/api/conversations")
app.include_router(conversations.router, prefix="/api/v1/conversations")
