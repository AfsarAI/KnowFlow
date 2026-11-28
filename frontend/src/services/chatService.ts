import { apiRequest } from './apiClient';
import { ConversationItem, MessageItem, ChatResponseData } from '../types';

export const chatService = {
  async getConversations(token: string | null): Promise<ConversationItem[]> {
    if (!token) return [];
    try {
      return await apiRequest<ConversationItem[]>('/api/conversations', { token });
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      return [];
    }
  },

  async getConversation(
    conversationId: number,
    token: string | null
  ): Promise<{
    id: number;
    title: string;
    selected_document_ids?: number[] | null;
    messages: MessageItem[];
  } | null> {
    if (!token) return null;
    try {
      return await apiRequest<{
        id: number;
        title: string;
        selected_document_ids?: number[] | null;
        messages: MessageItem[];
      }>(`/api/conversations/${conversationId}`, { token });
    } catch (err) {
      console.error(`Failed to fetch conversation ${conversationId}:`, err);
      return null;
    }
  },

  async sendMessage(
    message: string,
    token: string | null,
    conversationId?: number,
    documentIds?: number[]
  ): Promise<ChatResponseData> {
    if (!token) {
      throw new Error('Authentication required to send chat messages.');
    }

    const payload: {
      message: string;
      conversation_id?: number;
      document_ids?: number[];
    } = { message: message.trim() };

    if (conversationId) {
      payload.conversation_id = conversationId;
    }
    if (documentIds && documentIds.length > 0) {
      payload.document_ids = documentIds;
    }

    return apiRequest<ChatResponseData>('/api/chat', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },

  async deleteConversation(conversationId: number, token: string | null): Promise<boolean> {
    if (!token) return false;
    try {
      await apiRequest<{ status: string }>(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        token,
      });
      return true;
    } catch (err) {
      console.error(`Failed to delete conversation ${conversationId}:`, err);
      throw err;
    }
  },
};
