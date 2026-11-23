# KnowFlow (KF-04)

> A document-based Retrieval-Augmented Generation (RAG) knowledge assistant designed for secure document analysis, semantic search, and grounded conversational inquiry with verifiable source citations.

---

## 1. Project Overview

**KnowFlow** is a full-stack, privacy-centric AI application that transforms static documents (PDF and TXT) into an interactive, conversational knowledge base. Rather than relying on ungrounded generative models that hallucinate or leak information, KnowFlow employs a Retrieval-Augmented Generation (RAG) architecture. User documents are parsed, split into semantically coherent passages, and indexed in a vector-enabled database. When a user asks a question, relevant passages are retrieved using vector similarity and provided to a Large Language Model (LLM) as verifiable context.

---

## 2. Problem Statement

Knowledge workers, researchers, and students frequently deal with lengthy, dense documents such as technical manuals, research publications, legal contracts, and study notes. Manually scanning these files with keyword search often yields inaccurate results, misses conceptual context, and consumes significant time. Conversely, generic AI chatbots cannot access private user documents and often hallucinate answers when asked about specific internal files.

---

## 3. Proposed Solution

KnowFlow resolves this challenge through:
1. **Private Document Ingestion:** Users securely upload private PDF and plain-text files.
2. **Deterministic Passage Retrieval:** Relevant text excerpts are identified using high-dimensional dense embeddings and cosine similarity via `pgvector`.
3. **Grounded Generation:** Responses are produced strictly from retrieved context passages, avoiding ungrounded speculation.
4. **Transparent Citation Attribution:** Every answer includes exact document and page/passage references so users can immediately verify claims.
5. **Session Continuity:** Multi-turn conversational history is maintained with strict user-level data isolation.

---

## 4. Key Features Planned

- **User Authentication:** Token-based security (JWT) with salted password hashing (Argon2).
- **Document Ingestion:** Automated text extraction, layout detection, and metadata extraction for PDF and TXT.
- **Semantic Chunking & Indexing:** Structure-aware passage chunking paired with vector embeddings.
- **RAG Question Answering:** Semantic search with strict prompt boundaries and citation validation.
- **Conversational Memory:** Multi-turn dialogue management with contextual history retention.
- **Evidence Verification:** Fallback messaging when uploaded context lacks sufficient evidence.
- **Multi-Tenant Isolation:** Complete isolation of documents and vector queries between users.

---

## 5. Technology Stack

### Frontend
- **Framework:** React 19 (TypeScript)
- **Build Tool:** Vite 6
- **Routing & State:** Modular Component Architecture, Reactive State Management

### Backend
- **Framework:** Python 3.12, FastAPI 0.115+
- **Database ORM:** SQLAlchemy 2.0
- **Database Migrations:** Alembic 1.13+
- **Data Validation & Settings:** Pydantic v2, Pydantic-Settings
- **Security & Authentication:** PyJWT, Pwdlib (Argon2)
- **Document Processing:** pypdf 4.3+

### Database & Vector Storage
- **Database:** PostgreSQL 16
- **Vector Engine:** pgvector 0.8.7 (`pgvector/pgvector:pg16` Docker container)

### Testing & Tooling
- **Testing:** pytest 8.3+, HTTPX 0.27+
- **Orchestration:** Docker Compose
- **Version Control:** Git

---

## 6. High-Level Architecture

KnowFlow operates across four clean tiers:
1. **Client Tier (Frontend):** React SPA communicating via typed JSON REST APIs.
2. **Application Tier (Backend):** FastAPI handling authentication, document parsing, chunking, and retrieval orchestration.
3. **Data Tier (Storage & Vector):** PostgreSQL 16 storing relational user/document data and dense chunk embeddings via `pgvector`.
4. **AI Provider Tier (Future Days):** Dedicated external APIs for generating dense embeddings and synthesizing grounded answers.

For complete architectural specifications, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 7. How RAG Operates in KnowFlow

KnowFlow strictly separates document ingestion from question answering:

1. **Ingestion:**
   $$\text{Document (PDF/TXT)} \longrightarrow \text{Text Extraction} \longrightarrow \text{Chunking} \longrightarrow \text{Embedding Generation} \longrightarrow \text{pgvector Storage}$$
2. **Retrieval & Synthesis:**
   $$\text{User Query} \longrightarrow \text{Query Vector} \longrightarrow \text{Cosine Distance Search} \longrightarrow \text{Context Assembly} \longrightarrow \text{LLM Synthesis} \longrightarrow \text{Cited Answer}$$

Crucially, user queries are never sent raw to an LLM. Relevant passages are first retrieved from user-owned documents, and the model is instructed to answer solely using those passages.

For full pipeline mechanics, see [docs/RAG_PIPELINE.md](docs/RAG_PIPELINE.md).

---

## 8. Database Design Overview

The database uses PostgreSQL 16 with the `vector` extension:

- `users`: Core account data, salted password hashes, and active flags.
- `documents`: Uploaded document metadata linked to `users.id` via cascading foreign keys.
- `document_chunks`: Extracted text passages, chunk indices, and page numbers. *(Vector embedding column to be introduced in Day 4 matching chosen model dimensions).*
- `conversations`: Chat sessions tied to the initiating user.
- `messages`: Chronological conversation turns with structured source citation JSON.

For entity-relationship diagrams and table schemas, see [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md).

---

## 9. Folder Structure

```
KnowFlow-04/
├── backend/
│   ├── alembic/              # Database migration environments
│   │   ├── versions/         # Versioned migration scripts
│   │   └── env.py            # Migration runtime configuration
│   ├── app/
│   │   ├── core/             # Environment settings & security config
│   │   ├── db/               # SQLAlchemy DeclarativeBase & session management
│   │   ├── models/           # SQLAlchemy ORM entity definitions
│   │   ├── routers/          # FastAPI API route handlers (/health)
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic & external service connectors
│   │   └── main.py           # FastAPI application entrypoint
│   ├── tests/                # Automated pytest suite
│   ├── alembic.ini           # Alembic configuration file
│   ├── pytest.ini            # Pytest execution settings
│   └── requirements.txt      # Python dependencies
│
├── frontend/
│   ├── public/               # Static web assets
│   ├── src/
│   │   ├── components/       # Reusable React components (Dashboard, HealthStatus)
│   │   ├── App.css           # Application styling
│   │   ├── App.tsx           # Top-level application shell
│   │   ├── index.css         # Global design system & typography
│   │   └── main.tsx          # React application entrypoint
│   ├── index.html            # Vite HTML host document
│   ├── package.json          # Node dependencies & scripts
│   ├── tsconfig.json         # TypeScript configuration
│   └── vite.config.ts        # Vite build & proxy settings
│
├── docs/
│   ├── ARCHITECTURE.md       # Full architectural specifications & diagrams
│   ├── DATABASE_DESIGN.md    # Database schema, entities & integrity rules
│   ├── DEVELOPMENT_ROADMAP.md# 7-day implementation roadmap & progress
│   └── RAG_PIPELINE.md       # Ingestion & question-answering mechanics
│
├── docker/
│   └── init-db/              # SQL scripts executed on container startup
├── docker-compose.yml        # PostgreSQL + pgvector service definition
├── .env                      # Local development environment configuration (gitignored)
├── .env.example              # Environment template with placeholder values
├── .gitignore                # Git exclusions
├── LICENSE                   # Project license notice
└── README.md                 # Complete project documentation
```

---

## 10. Installation Instructions

### Prerequisites
- Ubuntu Linux or compatible OS
- Docker and Docker Compose
- Node.js (v20+ or v22+) and npm
- Python 3.12+ (or `uv` package manager)
- Git

---

## 11. Backend Setup Instructions

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python 3.12 virtual environment:
   ```bash
   python3.12 -m venv .venv
   source .venv/bin/activate
   ```
3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Run database migrations:
   ```bash
   alembic upgrade head
   ```
5. Launch the development server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

---

## 12. Frontend Setup Instructions

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

---

## 13. PostgreSQL and pgvector Setup

Start the containerized PostgreSQL service with `pgvector`:
```bash
docker compose up -d
```

Verify service health and pgvector extension:
```bash
docker exec knowflow_postgres psql -U knowflow -d knowflow -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
```

The database is bound exclusively to `127.0.0.1:5434` (configurable via `POSTGRES_PORT`), preventing external exposure.

---

## 14. Environment Variable Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Key variables configured:
| Variable | Description | Default (Local Dev) |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Deployment environment | `development` |
| `PROJECT_NAME` | Project name identifier | `KnowFlow` |
| `POSTGRES_SERVER` | Database host | `127.0.0.1` |
| `POSTGRES_PORT` | Local host port | `5434` |
| `POSTGRES_DB` | Database name | `knowflow` |
| `POSTGRES_USER` | Database username | `knowflow` |
| `POSTGRES_PASSWORD` | Database password | `knowflow_dev_password` |
| `DATABASE_URL` | SQLAlchemy connection string | `postgresql+psycopg://...` |

---

## 15. API Endpoints Available Today

| Method | Path | Description | Expected Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Application health check | `{"status": "ok", "project": "KnowFlow"}` |
| `GET` | `/health/db` | Database & pgvector connectivity check | `{"status": "ok", "database": "connected", "pgvector_extension": "enabled", ...}` |
| `GET` | `/docs` | Interactive Swagger API documentation | HTML UI |
| `GET` | `/openapi.json` | OpenAPI 3.1 JSON schema | OpenAPI Specification |

---

## 16. Testing Instructions

Execute the automated backend test suite:
```bash
cd backend
.venv/bin/pytest -v
```

Expected output:
```
tests/test_db.py::test_db_health_endpoint PASSED
tests/test_db.py::test_db_session_execution PASSED
tests/test_db.py::test_db_tables_exist PASSED
tests/test_health.py::test_health_endpoint PASSED
tests/test_health.py::test_docs_endpoint PASSED
tests/test_health.py::test_openapi_schema PASSED
6 passed in 0.11s
```

Verify frontend build:
```bash
cd frontend
npm run build
```

---

## 17. Security Considerations

1. **No Hardcoded Credentials:** All credentials and secrets are managed via environment variables and excluded from version control.
2. **Localhost Binding:** PostgreSQL is exposed strictly on `127.0.0.1`, shielding database ports from external networks.
3. **Multi-Tenant Scoping:** All document operations and vector similarity queries enforce strict `user_id` filtering.
4. **Untrusted Data Isolation:** Uploaded documents are treated as untrusted passive data, validated for size, type, and sanitized before storage.
5. **Prompt Injection Mitigation:** Retrieved context passages are framed with boundary delimiters to prevent prompt override attacks.

---

## 18. Current Implementation Status

| Milestone | Category | Status | Details |
| :--- | :--- | :--- | :--- |
| **Day 1: Project Foundation** | Structure & Environment | **Implemented** | Modular backend & frontend layout established. |
| **Day 1: Database & pgvector** | Persistence | **Implemented** | PostgreSQL 16 + pgvector 0.8.7 running with volume persistence. |
| **Day 1: Backend Foundation** | API Service | **Implemented** | FastAPI with `/health`, `/health/db`, SQLAlchemy 2.0 & Alembic migrations. |
| **Day 1: Frontend Foundation** | Client SPA | **Implemented** | React 19 + TypeScript + Vite with live health dashboard. |
| **Day 1: Documentation** | System Docs | **Implemented** | Complete README, Architecture, Database Design, and RAG Pipeline specs. |
| **Day 2: Authentication** | User Security | *Planned* | JWT tokens, Argon2 password hashing, registration/login routes. |
| **Day 3: Ingestion** | Documents | *Planned* | File upload validation and text extraction. |
| **Day 4: Embeddings** | Vector Indexing | *Planned* | Chunking and vector column creation with embedding model. |
| **Day 5: Retrieval** | RAG Pipeline | *Planned* | Similarity search, context synthesis, citations. |
| **Day 6: Chat UI** | Client Interface | *Planned* | Conversational interface and session history. |
| **Day 7: Evaluation** | Testing & Evals | *Planned* | RAG evaluation, security auditing, and final verification. |

---

## 19. Known Limitations

- **Vector Columns Deferred:** The `document_chunks` table does not yet have an active vector column. This is an intentional architectural decision to avoid picking arbitrary vector dimensions before finalizing the embedding model in Day 4.
- **Authentication Not Yet Enforced:** Endpoints implemented in Day 1 are public health checks; authentication guards will be added in Day 2.
- **Placeholder Dashboard:** The React interface currently displays project architecture, system status, and roadmap details; document upload and chat components will be added in Days 3 and 6.

---

## 20. Future Development Roadmap

Please consult [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md) for full task breakdowns for Days 2 through 7.
