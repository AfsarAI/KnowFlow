import { apiRequest, API_BASE_URL, isValidToken } from './apiClient';
import { DocumentItem } from '../types';

export const documentService = {
  async getDocuments(token: string | null): Promise<DocumentItem[]> {
    if (!token || !isValidToken(token)) return [];
    try {
      return await apiRequest<DocumentItem[]>('/api/documents', { token });
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      return [];
    }
  },

  async getDocument(documentId: number, token: string | null): Promise<DocumentItem | null> {
    if (!token || !isValidToken(token)) return null;
    return apiRequest<DocumentItem>(`/api/documents/${documentId}`, { token });
  },

  async uploadDocuments(files: File[], token: string | null): Promise<DocumentItem[]> {
    if (!token || !isValidToken(token)) {
      throw new Error('Authentication required: You must be signed in to upload documents.');
    }

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));

    // Never manually set Content-Type header on FormData; fetch sets multipart/form-data boundary automatically
    const response = await fetch(`${API_BASE_URL}/api/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
      },
      body: formData,
    });

    if (response.status === 401) {
      throw new Error('Your session has expired or is invalid. Please sign in again.');
    }

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
    if (!token || !isValidToken(token)) return false;
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
