import React, { useState, useEffect } from 'react';

interface ApiHealth {
  status: string;
  project: string;
}

interface DbHealth {
  status: string;
  project: string;
  database: string;
  pgvector_extension: string;
  pgvector_version: string;
}

export const HealthStatus: React.FC = () => {
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      // Direct call to /health
      const healthRes = await fetch('http://127.0.0.1:8000/health');
      if (!healthRes.ok) throw new Error(`HTTP ${healthRes.status}`);
      const healthData: ApiHealth = await healthRes.json();
      setApiHealth(healthData);

      // Call to /health/db
      const dbRes = await fetch('http://127.0.0.1:8000/health/db');
      if (dbRes.ok) {
        const dbData: DbHealth = await dbRes.json();
        setDbHealth(dbData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reach API';
      setError(msg);
      setApiHealth(null);
      setDbHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="health-card">
      <div className="health-card-header">
        <h3>System & Connection Status</h3>
        <button className="refresh-button" onClick={fetchHealth} disabled={loading}>
          {loading ? 'Checking...' : 'Refresh Status'}
        </button>
      </div>

      <div className="status-grid">
        <div className="status-item">
          <span className="status-label">FastAPI Backend:</span>
          {loading ? (
            <span className="status-badge status-pending">Connecting...</span>
          ) : apiHealth ? (
            <span className="status-badge status-online">Online (v0.1.0)</span>
          ) : (
            <span className="status-badge status-offline">Offline</span>
          )}
        </div>

        <div className="status-item">
          <span className="status-label">PostgreSQL Database:</span>
          {dbHealth ? (
            <span className="status-badge status-online">Connected</span>
          ) : (
            <span className="status-badge status-pending">Checking / Standby</span>
          )}
        </div>

        <div className="status-item">
          <span className="status-label">pgvector Extension:</span>
          {dbHealth?.pgvector_extension === 'enabled' ? (
            <span className="status-badge status-online">Enabled (v{dbHealth.pgvector_version})</span>
          ) : (
            <span className="status-badge status-pending">Pending Check</span>
          )}
        </div>

        <div className="status-item">
          <span className="status-label">Reported Project:</span>
          <span className="status-value">{apiHealth?.project || 'KnowFlow'}</span>
        </div>
      </div>

      {error && (
        <div className="status-note error-note">
          Backend server not detected on <code>http://127.0.0.1:8000</code>. Run <code>uvicorn app.main:app</code> in <code>backend/</code>.
        </div>
      )}

      {!error && apiHealth && (
        <div className="status-note success-note">
          All Day 1 foundational components (FastAPI, PostgreSQL 16, pgvector) are operational.
        </div>
      )}
    </div>
  );
};
