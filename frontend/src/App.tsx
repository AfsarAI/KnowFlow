import React from 'react';
import { Dashboard } from './components/Dashboard';
import './App.css';

export const App: React.FC = () => {
  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="brand-logo">🌊</span>
          <span className="brand-name">KnowFlow</span>
          <span className="brand-version">v0.1.0-alpha</span>
        </div>
        <div className="nav-links">
          <a href="#roadmap" className="nav-link">Roadmap</a>
          <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" className="nav-link">
            API Docs ↗
          </a>
        </div>
      </nav>

      <main className="main-content">
        <Dashboard />
      </main>

      <footer className="footer">
        <p>KnowFlow • KF-04 Full-Stack RAG Knowledge Assistant • Day 1 Project Foundation</p>
      </footer>
    </div>
  );
};

export default App;
