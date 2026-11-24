import { apiRequest } from './apiClient';
import { ConversationItem, MessageItem } from '../types';

export const chatService = {
  async getConversations(token: string): Promise<ConversationItem[]> {
    try {
      return await apiRequest<ConversationItem[]>('/api/v1/conversations', { token });
    } catch {
      return [];
    }
  },

  async getMessages(conversationId: number, token: string): Promise<MessageItem[]> {
    try {
      return await apiRequest<MessageItem[]>(`/api/v1/conversations/${conversationId}/messages`, { token });
    } catch {
      return [];
    }
  },

  async createConversation(title: string, token: string): Promise<ConversationItem> {
    return apiRequest<ConversationItem>('/api/v1/conversations', {
      method: 'POST',
      token,
      body: JSON.stringify({ title }),
    });
  },
};
