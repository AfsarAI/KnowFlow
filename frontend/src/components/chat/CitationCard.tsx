import React, { useState } from 'react';
import { CitationItem } from '../../types';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

export const CitationCard: React.FC<{ citation: CitationItem }> = ({ citation }) => {
  const [expanded, setExpanded] = useState(false);
  const docName = citation.filename || citation.document_name || 'Document';
  const textSnippet = citation.snippet || citation.excerpt || '';

  return (
    <div className={`citation-card-item ${expanded ? 'expanded' : ''}`}>
      <div className="citation-header-row" onClick={() => setExpanded(!expanded)} role="button">
        <div className="citation-doc-info">
          <FileText size={14} className="citation-icon" />
          <span className="citation-doc-name" title={docName}>{docName}</span>
          {citation.page_number && (
            <span className="citation-page-badge">Page {citation.page_number}</span>
          )}
        </div>

        <div className="citation-meta-group">
          {citation.similarity !== undefined && citation.similarity !== null && (
            <span className="citation-score-badge" title="Relevance confidence">
              {Math.round(citation.similarity * 100)}% match
            </span>
          )}
          <button className="citation-expand-toggle" title={expanded ? 'Collapse' : 'Expand'}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      <div className={`citation-snippet-body ${expanded ? 'full' : 'collapsed'}`}>
        "{textSnippet}"
      </div>
    </div>
  );
};
