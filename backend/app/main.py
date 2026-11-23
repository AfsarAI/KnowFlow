from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import health

app = FastAPI(
    title="KnowFlow API",
    version="0.1.0",
    description="Backend API for KnowFlow — Document-based Retrieval-Augmented Generation (RAG) knowledge assistant.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
