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

### Database
- **Engine:** PostgreSQL 16
- **Vector Search:** pgvector (v0.8.7)
- **Deployment Compatibility:** Local Docker PostgreSQL or hosted Supabase PostgreSQL

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

## 5. Supabase & Google OAuth Configuration

For detailed step-by-step instructions on setting up Supabase Auth, Google OAuth, and JWT verification, refer to [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md).

Configure your `.env`:
```ini
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
SUPABASE_JWKS_URL=https://your-project-ref.supabase.co/auth/v1/.well-known/jwks.json
```

---

## 6. Testing

### Run Backend Tests
```bash
cd backend
.venv/bin/pytest -v
```
All 11 automated test cases pass (verifying database connectivity, pgvector extension, table schemas, missing/invalid token rejection, and automatic user record synchronization).

### Run Frontend Build
```bash
cd frontend
npm run build
```
Builds cleanly with TypeScript type checking and asset optimization.

---

## 7. Implementation Roadmap & Current Status

| Day | Milestone | Status |
| :--- | :--- | :--- |
| **Day 1** | Project Structure, FastAPI, Docker, pgvector, Initial Schema | **Completed** |
| **Day 2** | Supabase Auth, Google OAuth, JWT Verification, Product UI Redesign | **Completed** |
| **Day 3** | Document Upload, PDF/TXT Validation & Text Extraction | *Planned* |
| **Day 4** | Chunking, Embeddings & Vector Indexing | *Planned* |
| **Day 5** | Semantic Retrieval, Context Synthesis & Citations | *Planned* |
| **Day 6** | Conversational Sessions & History Persistence | *Planned* |
| **Day 7** | Automated E2E Testing, RAG Evaluation & Hardening | *Planned* |

For full architectural blueprints, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md).
