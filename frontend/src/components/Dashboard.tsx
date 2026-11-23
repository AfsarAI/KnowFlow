import React from 'react';
import { HealthStatus } from './HealthStatus';

export const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-container">
      <header className="hero-section">
        <div className="project-badge">KF-04 • Day 1 Milestone</div>
        <h1 className="hero-title">KnowFlow</h1>
        <p className="hero-tagline">
          Document-based Retrieval-Augmented Generation (RAG) Knowledge Assistant
        </p>
        <p className="hero-description">
          A secure, privacy-first platform that indexes your private PDF and TXT documents
          into semantic vector spaces, enabling natural-language question answering with
          grounded citations and contextual conversation memory.
        </p>
      </header>

      <section className="status-section">
        <HealthStatus />
      </section>

      <section className="features-section">
        <h2>Core RAG Capabilities (Roadmap)</h2>
        <div className="feature-cards-grid">
          <div className="feature-card">
            <div className="feature-icon">📄</div>
            <h3>Document Ingestion</h3>
            <p>Upload private PDF & TXT documents with automated text extraction, structure validation, and chunking.</p>
            <span className="feature-tag">Day 3</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Vector Embeddings</h3>
            <p>Generate dense semantic representations indexed with PostgreSQL pgvector for high-precision retrieval.</p>
            <span className="feature-tag">Day 4</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Grounded Synthesis</h3>
            <p>Passage retrieval with cosine similarity, prompt context construction, and source citation attribution.</p>
            <span className="feature-tag">Day 5</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Conversational Memory</h3>
            <p>Multi-turn conversation sessions with strict per-user document isolation and authorization checks.</p>
            <span className="feature-tag">Day 6</span>
          </div>
        </div>
      </section>

      <section className="architecture-summary">
        <h2>Architecture Highlights</h2>
        <div className="arch-grid">
          <div className="arch-item">
            <strong>Frontend:</strong> React 19, TypeScript, Vite SPA
          </div>
          <div className="arch-item">
            <strong>Backend API:</strong> Python 3.12, FastAPI, Pydantic v2
          </div>
          <div className="arch-item">
            <strong>Database & Vectors:</strong> PostgreSQL 16 + pgvector (0.8.7)
          </div>
          <div className="arch-item">
            <strong>ORM & Migrations:</strong> SQLAlchemy 2.0, Alembic
          </div>
        </div>
      </section>
    </div>
  );
};
