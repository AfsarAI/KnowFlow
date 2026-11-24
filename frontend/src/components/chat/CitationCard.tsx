import React from 'react';
import { CitationItem } from '../../types';
import { FileText } from 'lucide-react';

export const CitationCard: React.FC<{ citation: CitationItem }> = ({ citation }) => {
  return (
    <div className="citation-chip">
      <div className="citation-header">
        <FileText size={14} className="citation-icon" />
        <span className="citation-doc-name">{citation.document_name}</span>
        {citation.page_number && (
          <span className="citation-page-badge">Page {citation.page_number}</span>
        )}
      </div>
      <p className="citation-snippet">"{citation.excerpt}"</p>
    </div>
  );
};
