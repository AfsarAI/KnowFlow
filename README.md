# KnowFlow (KF-04)

> A document-based Retrieval-Augmented Generation (RAG) knowledge assistant designed for secure document analysis, semantic search, and grounded conversational inquiry with verifiable source citations.

---

## 1. Product Overview

**KnowFlow** is a modern, privacy-focused AI document assistant. Users upload private PDF and plain-text documents and converse with them naturally. Unlike standard generic chatbots that hallucinate or leak information, KnowFlow employs a true Retrieval-Augmented Generation (RAG) architecture: documents are partitioned into semantic passages, indexed in a vector database, and retrieved as ground-truth evidence before generating verifiable answers with exact source citations.

---

## 2. Core User Experience

- **Polished Product UI:** Dark navy interface inspired by modern AI assistants (ChatGPT, Gemini) designed for productivity.
- **Secure Authentication:** Supabase Auth supporting Email/Password and Google OAuth.
- **Multi-Document Ingestion:** Drag-and-drop file upload supporting multiple PDF and TXT files simultaneously.
- **Session-Based Workspaces:** Collapsible conversation sidebar with history organized by session.
- **Citation Attribution:** Responses reference exact source documents and page numbers.
- **Data Privacy:** Cryptographic user-level scoping guarantees documents remain isolated to each user.

---

## 3. Technology Stack

### Frontend
- **Framework:** React 19, TypeScript
- **Build Tool:** Vite 6
- **Routing:** React Router v7
- **Authentication:** Supabase Client (`@supabase/supabase-js`)
- **Icons & UI:** Lucide React

### Backend
- **Framework:** Python 3.12, FastAPI 0.115+
- **Security:** PyJWT, Cryptography, Pydantic-Settings
- **ORM & Migrations:** SQLAlchemy 2.0, Alembic 1.13+
- **Database Driver:** Psycopg 3
- **Document Processing:** pypdf 4.3+

### AI & Vector Retrieval
- **Embedding Models:** OpenAI `text-embedding-3-small` (1536 dimensions default) or Google Gemini `text-embedding-004`
- **Generative Models:** OpenAI `gpt-4o-mini` (default) or Google Gemini 1.5 Flash
- **Vector Search:** `pgvector` (v0.8.7) with HNSW cosine distance indexing (`vector_cosine_ops`)
- **HTTP Client:** HTTPX for non-blocking provider API integration

---

## 4. Setup and Quick Start

### 4.1 Prerequisites
- Docker and Docker Compose
- Node.js (v20+ or v22+) and npm
- Python 3.12+

### 4.2 Database (PostgreSQL + pgvector)
Start the local containerized database:
```bash
docker compose up -d
```

### 4.3 Backend Setup
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 4.4 Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Document Management API

All document endpoints are protected and require a valid Bearer token (`Authorization: Bearer <token>`). Ownership is strictly derived from the authenticated user.

- `POST /api/documents` (or `/api/v1/documents`): Upload one or multiple `.pdf` / `.txt` files (multipart/form-data, max 15MB each). Performs format validation, magic byte verification, synchronous text extraction (page-by-page for PDF with `pypdf`, UTF-8/fallback for TXT), sliding-window chunking (500 chars / 80 overlap), dense vector embedding generation, and stores files safely in user-scoped backend storage.
- `GET /api/documents`: List all documents belonging to the authenticated user with metadata, page counts, chunk counts, and processing statuses.
- `GET /api/documents/{id}`: Retrieve detailed document info including page count, chunk count, processing status, and text extraction statistics.
- `DELETE /api/documents/{id}`: Delete a document record with cascading deletion of all associated chunks and disk files.

---

## 6. Conversational RAG & Vector Search API

All conversation and chat endpoints enforce strict multi-tenant isolation and verify document ownership:

- `POST /api/chat` (or `/api/v1/chat`): Conversational RAG inquiry endpoint. Accepts `query`, optional `conversation_id`, and optional `selected_document_ids` (scope filtering).
  - Embeds query into 1536-dimensional dense vector.
  - Performs pgvector cosine distance search against completed chunks owned by the authenticated user.
  - Bounds context with prompt-injection defense delimiters.
  - Generates grounded response via LLM (`gpt-4o-mini` or Gemini).
  - Validates source citations against retrieved chunks (document name, page number, snippet, similarity score).
  - Returns clear insufficient-evidence fallback if relevant chunks are below similarity threshold.
- `GET /api/conversations`: List all conversation sessions belonging to the authenticated user with titles, timestamps, and message counts.
- `GET /api/conversations/{id}`: Retrieve full conversation thread with all user and assistant messages, citations, and metadata.
- `DELETE /api/conversations/{id}`: Delete a conversation and all child messages with cascading cleanup.

---

## 7. Supabase & Google OAuth Configuration

For detailed step-by-step instructions on setting up Supabase Auth, Google OAuth, and JWT verification, refer to [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md).

Configure your `.env`:
```ini
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
SUPABASE_JWKS_URL=https://your-project-ref.supabase.co/auth/v1/.well-known/jwks.json

# LLM & Embedding Settings
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
VECTOR_DIMENSION=1536
```

---

## 8. Testing

### Run Backend Tests
```bash
PYTHONPATH=backend backend/.venv/bin/pytest -v
```
All **28 automated test cases** pass (100% success rate):
- Database connectivity, pgvector extension, and core schema validation.
- Missing/invalid Bearer token rejection and unauthorized 401 handling.
- Automatic user record synchronization from validated Supabase JWTs.
- Document uploads for PDF and TXT with magic-byte verification.
- Sliding-window chunk generation and cascading chunk deletion on document removal.
- Native pgvector cosine distance queries on HNSW vector indices.
- Unauthenticated chat request rejection.
- True RAG question-answering with validated citations and similarity scoring.
- Insufficient evidence fallback detection when no matching chunks exist.
- Multi-user data and conversation tenant isolation.

### Run Frontend Build
```bash
cd frontend
npm run build
```
Builds cleanly with zero TypeScript errors (`tsc -b && vite build`) and production bundle optimization.

---

## 9. Implementation Roadmap & Final Status

| Day | Milestone | Status |
| :--- | :--- | :--- |
| **Day 1** | Project Structure, FastAPI, Docker, pgvector, Initial Schema | **Completed** ✅ |
| **Day 2** | Supabase Auth, Google OAuth, JWT Verification, Product UI Redesign | **Completed** ✅ |
| **Day 3** | Document Upload, PDF/TXT Validation & Text Extraction | **Completed** ✅ |
| **Day 4** | Chunking, Embeddings & Vector Indexing (HNSW Cosine) | **Completed** ✅ |
| **Day 5** | Semantic Retrieval, Context Synthesis & Citation Verification | **Completed** ✅ |
| **Day 6** | Conversational Sessions, Message History & Scope Selector | **Completed** ✅ |
| **Day 7** | Automated E2E Testing (28/28), RAG Hardening & Production Polish | **Completed** ✅ |

For full architectural blueprints, see:
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md)
- [docs/RAG_PIPELINE.md](docs/RAG_PIPELINE.md)
- [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md)
