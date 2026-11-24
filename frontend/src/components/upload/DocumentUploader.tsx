import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, FileText, Trash2, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { UploadFileItem } from '../../types';

interface DocumentUploaderProps {
  onFilesSelected?: (files: File[]) => void;
  onProceedToChat?: () => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onFilesSelected,
  onProceedToChat,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<UploadFileItem[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = ['.pdf', '.txt'];
  const maxFileSizeBytes = 15 * 1024 * 1024; // 15MB

  const validateAndAddFiles = (fileList: FileList | File[]) => {
    setErrorMessage(null);
    const newItems: UploadFileItem[] = [];
    const validRawFiles: File[] = [];

    Array.from(fileList).forEach((file) => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        setErrorMessage(`"${file.name}" has an unsupported format. Only PDF and TXT are supported.`);
        return;
      }
      if (file.size > maxFileSizeBytes) {
        setErrorMessage(`"${file.name}" exceeds the 15MB size limit.`);
        return;
      }

      // Check duplicates
      const exists = selectedFiles.some((item) => item.name === file.name && item.size === file.size);
      if (!exists) {
        newItems.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          type: ext === '.pdf' ? 'PDF' : 'TXT',
          status: 'queued',
          progress: 100,
        });
        validRawFiles.push(file);
      }
    });

    if (newItems.length > 0) {
      const updated = [...selectedFiles, ...newItems];
      setSelectedFiles(updated);
      if (onFilesSelected) {
        onFilesSelected(updated.map((item) => item.file));
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    const updated = selectedFiles.filter((item) => item.id !== id);
    setSelectedFiles(updated);
    if (onFilesSelected) {
      onFilesSelected(updated.map((item) => item.file));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="document-uploader-card">
      <div
        className={`dropzone-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".pdf,.txt"
          style={{ display: 'none' }}
        />
        <div className="dropzone-icon-circle">
          <Upload size={32} />
        </div>
        <h3 className="dropzone-title">Upload your documents</h3>
        <p className="dropzone-subtitle">
          Drag and drop your files here, or <span className="browse-link">browse</span>
        </p>
        <div className="dropzone-format-tags">
          <span className="format-tag">PDF</span>
          <span className="format-tag">TXT</span>
          <span className="format-tag">Up to 15MB each</span>
          <span className="format-tag">Select multiple files</span>
        </div>
      </div>

      {errorMessage && (
        <div className="uploader-error-banner">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="selected-files-container">
          <div className="selected-files-header">
            <h4>Selected Documents ({selectedFiles.length})</h4>
            <button
              className="clear-all-btn"
              onClick={() => {
                setSelectedFiles([]);
                if (onFilesSelected) onFilesSelected([]);
              }}
            >
              Clear all
            </button>
          </div>

          <div className="file-items-list">
            {selectedFiles.map((item) => (
              <div key={item.id} className="file-item-row">
                <div className="file-info-group">
                  <FileText className="file-type-icon" size={20} />
                  <div className="file-name-meta">
                    <span className="file-item-name" title={item.name}>
                      {item.name}
                    </span>
                    <span className="file-item-size">{formatFileSize(item.size)} • {item.type}</span>
                  </div>
                </div>

                <div className="file-actions-group">
                  <span className="ready-badge">
                    <CheckCircle2 size={15} /> Ready
                  </span>
                  <button
                    className="file-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(item.id);
                    }}
                    title="Remove file"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {onProceedToChat && (
            <div className="uploader-cta-wrapper">
              <button className="primary-action-button" onClick={onProceedToChat}>
                Start Conversation with {selectedFiles.length} {selectedFiles.length === 1 ? 'Document' : 'Documents'} →
              </button>
            </div>
          )}
        </div>
      )}

      <div className="privacy-assurance-footer">
        <Shield size={16} className="shield-icon" />
        <span>Your documents remain strictly private, encrypted, and isolated to your personal workspace.</span>
      </div>
    </div>
  );
};
