// Service API pour les conversations HTTP
import { API_BASE_URL } from '@/constants/config';
import { getToken } from '@/lib/session';
import type {
  Conversation,
  CreateConversationPayload,
  CreateConversationResponse,
  GetConversationsResponse,
  GetMessagesParams,
  GetMessagesResponse,
} from '@/types/message';

/**
 * Helper pour faire des requêtes authentifiées
 */
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  if (!token) {
    throw new Error('Token manquant');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur ${response.status}`);
  }

  return response.json();
}

/**
 * Récupère toutes les conversations de l'utilisateur
 */
export async function getConversations(): Promise<GetConversationsResponse> {
  return fetchWithAuth('/conversations');
}

/**
 * Récupère une conversation spécifique
 */
export async function getConversation(conversationId: number): Promise<{ conversation: Conversation }> {
  return fetchWithAuth(`/conversations/${conversationId}`);
}

/**
 * Récupère l'historique des messages d'une conversation
 */
export async function getMessages(
  conversationId: number,
  params: GetMessagesParams = {},
): Promise<GetMessagesResponse> {
  const { limit = 50, offset = 0 } = params;
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  return fetchWithAuth(`/conversations/${conversationId}/messages?${queryParams}`);
}

/**
 * Crée ou récupère une conversation existante
 */
export async function createOrGetConversation(
  payload: CreateConversationPayload,
): Promise<CreateConversationResponse> {
  return fetchWithAuth('/conversations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Marque un message comme lu (via HTTP)
 */
export async function markMessageAsRead(conversationId: number, messageId: number): Promise<void> {
  return fetchWithAuth(`/conversations/${conversationId}/messages/${messageId}/read`, {
    method: 'PATCH',
  });
}
