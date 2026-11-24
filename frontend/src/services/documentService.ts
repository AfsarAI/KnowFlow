import { apiRequest } from './apiClient';
import { DocumentItem } from '../types';

export const documentService = {
  async getDocuments(token: string): Promise<DocumentItem[]> {
    try {
      return await apiRequest<DocumentItem[]>('/api/v1/documents', { token });
    } catch {
      // Fallback for Day 2 before Day 3 document backend is implemented
      return [];
    }
  },

  async uploadDocuments(files: File[], token: string): Promise<DocumentItem[]> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));

    const response = await fetch('http://127.0.0.1:8000/api/v1/documents/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }
    return response.json();
  },
};
