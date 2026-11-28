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
  chunk_count?: number | null;
  error_message?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CitationItem {
  document_id: number;
  filename: string;
  document_name?: string;
  page_number?: number | null;
  chunk_index: number;
  snippet: string;
  excerpt?: string;
  similarity?: number | null;
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

export interface ConversationItem {
  id: number;
  user_id: string;
  title: string;
  selected_document_ids?: number[] | null;
  created_at: string;
  updated_at: string;
  last_message?: string | null;
}

export interface ChatResponseData {
  conversation_id: number;
  user_message: MessageItem;
  assistant_message: MessageItem;
  citations: CitationItem[];
  insufficient_evidence: boolean;
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
