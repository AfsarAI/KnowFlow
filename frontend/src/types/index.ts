export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  auth_provider: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface DocumentItem {
  id: number;
  user_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  processing_status: 'uploaded' | 'processing' | 'completed' | 'failed';
  page_count?: number | null;
  error_message?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ConversationItem {
  id: number;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
}

export interface CitationItem {
  id?: number;
  document_name: string;
  page_number?: number;
  excerpt: string;
}

export interface MessageItem {
  id: number | string;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: CitationItem[];
  created_at: string;
  isStreaming?: boolean;
}

export interface UploadFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'queued' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
  progress: number;
}
