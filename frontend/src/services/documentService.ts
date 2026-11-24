import { apiRequest } from './apiClient';
import { DocumentItem } from '../types';

export const documentService = {
  async getDocuments(token: string | null): Promise<DocumentItem[]> {
    if (!token) return [];
    try {
      return await apiRequest<DocumentItem[]>('/api/documents', { token });
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      return [];
    }
  },

  async getDocument(documentId: number, token: string | null): Promise<DocumentItem | null> {
    if (!token) return null;
    return apiRequest<DocumentItem>(`/api/documents/${documentId}`, { token });
  },

  async uploadDocuments(files: File[], token: string | null): Promise<DocumentItem[]> {
    if (!token) throw new Error('Authentication required to upload documents.');

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));

    const response = await fetch('http://127.0.0.1:8000/api/documents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMsg = `Upload failed (HTTP ${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson.detail) {
          errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch {
        // use default
      }
      throw new Error(errorMsg);
    }

    return response.json();
  },

  async deleteDocument(documentId: number, token: string | null): Promise<boolean> {
    if (!token) return false;
    try {
      await apiRequest<{ status: string }>(`/api/documents/${documentId}`, {
        method: 'DELETE',
        token,
      });
      return true;
    } catch (err) {
      console.error(`Failed to delete document ${documentId}:`, err);
      throw err;
    }
  },
};
