# KnowFlow 7-Day Implementation Roadmap (KF-04)

This roadmap outlines the structured 7-day development plan for KnowFlow, tracking milestones, deliverables, and progress across the full development cycle.

---

## Development Milestones

### Day 1: Project Foundation & Initial Setup
**Status:** ✅ **COMPLETED**
- [x] Inspect workspace and initialize Git repository on `main`.
- [x] Configure Docker Compose with PostgreSQL 16 and `pgvector` (image: `pgvector/pgvector:pg16`).
- [x] Create persistent Docker volume `knowflow_pgdata` and expose port on localhost (5434).
- [x] Enable and verify PostgreSQL `vector` extension.
- [x] Scaffold FastAPI backend with Python 3.12 virtual environment and required dependencies.
- [x] Implement `GET /health` and `GET /health/db` endpoints.
- [x] Setup SQLAlchemy 2.0 DeclarativeBase, session manager, and dependency injection.
- [x] Initialize Alembic and apply initial database schema migration for core entities.
- [x] Scaffold React 19 + TypeScript + Vite frontend with live API health checker.
- [x] Write comprehensive architectural, database, and pipeline documentation.
- [x] Execute backend automated test suite (6/6 tests passing).

---

### Day 2: Authentication & User Management
**Status:** ⏳ **PLANNED (Upcoming)**
- [ ] Implement password hashing with Argon2 via `pwdlib`.
- [ ] Implement JWT token generation, expiration, and validation via `PyJWT`.
- [ ] Build user registration (`POST /api/v1/auth/register`) and login (`POST /api/v1/auth/login`).
- [ ] Build `get_current_user` FastAPI dependency for protected routes.
- [ ] Add unit tests for registration, authentication, and invalid token rejection.
- [ ] Build frontend login and registration forms.

---

### Day 3: Document Ingestion & Processing
**Status:** ⏳ **PLANNED**
- [ ] Implement document upload endpoint (`POST /api/v1/documents/upload`).
- [ ] Add file validation (MIME checking, 15MB size limits, format restriction to PDF/TXT).
- [ ] Implement text extraction using `pypdf` with page tracking.
- [ ] Store document metadata in `documents` table with owner foreign key.
- [ ] Add backend tests for document upload and extraction.

---

### Day 4: Chunking, Embeddings & Vector Indexing
**Status:** ⏳ **PLANNED**
- [ ] Select and configure embedding model provider.
- [ ] Create Alembic migration to add `embedding vector(N)` column to `document_chunks`.
- [ ] Implement chunking strategy (sliding window, token counts, metadata tags).
- [ ] Generate dense embeddings for document chunks.
- [ ] Build vector index (HNSW / IVFFlat) on `document_chunks.embedding`.
- [ ] Verify similarity search via SQL queries.

---

### Day 5: Semantic Retrieval & LLM Context Synthesis
**Status:** ⏳ **PLANNED**
- [ ] Implement cosine similarity retrieval filtered by current user's documents.
- [ ] Build context window assembler with system prompt and passage delimiters.
- [ ] Integrate LLM API provider for answer generation.
- [ ] Implement citation extraction and validation matching source documents and pages.
- [ ] Implement insufficient-evidence fallback ("I cannot find this information...").

---

### Day 6: Conversational Interface & Access Isolation
**Status:** ⏳ **PLANNED**
- [ ] Implement conversational sessions (`conversations` and `messages` endpoints).
- [ ] Build React chat interface with citation preview popovers.
- [ ] Enforce strict multi-tenant isolation across all chat queries.
- [ ] Support multi-turn conversation memory with sliding history window.

---

### Day 7: Automated Testing, RAG Evaluation & Production Hardening
**Status:** ⏳ **PLANNED**
- [ ] Implement end-to-end integration tests (Upload → Retrieval → Answer).
- [ ] Perform RAG evaluation for answer faithfulness and citation accuracy.
- [ ] Run security audit: check for exposed secrets, unauthorized access attempts, prompt injection defenses.
- [ ] Finalize documentation and prepare production deployment guide.
