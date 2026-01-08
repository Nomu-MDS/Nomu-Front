// Types pour le système de messagerie

export interface User {
  id: number;
  name: string;
  email: string;
  firebase_uid: string;
}

export interface Message {
  id: number;
  user_id: number;
  conversation_id: number;
  content: string;
  attachment: string | null;
  read: boolean;
  createdAt: string;
  Sender: User;
}

export interface Conversation {
  id: number;
  voyager_id: number;
  local_id: number;
  createdAt: string;
  updatedAt: string;
  Voyager: User;
  Local: User;
  Messages?: Message[];
}

export interface CreateConversationPayload {
  otherUserId: number;
}

export interface CreateConversationResponse {
  conversation: Conversation;
  existed: boolean;
}

export interface GetMessagesParams {
  limit?: number;
  offset?: number;
}

export interface GetMessagesResponse {
  messages: Message[];
}

export interface GetConversationsResponse {
  conversations: Conversation[];
}

// Types pour les événements WebSocket
export interface SocketJoinConversationPayload {
  conversation_id: number;
}

export interface SocketLeaveConversationPayload {
  conversation_id: number;
}

export interface SocketSendMessagePayload {
  conversation_id: number;
  content: string;
  attachment?: string | null;
}

export interface SocketTypingPayload {
  conversation_id: number;
  isTyping: boolean;
}

export interface SocketMessageReadPayload {
  message_id: number;
}

export interface SocketNewMessageEvent {
  message: Message;
}

export interface SocketUserTypingEvent {
  userId: number;
  userName: string;
  isTyping: boolean;
}

export interface SocketMessageReadUpdateEvent {
  message_id: number;
  read: boolean;
}

export interface SocketJoinedConversationEvent {
  conversation_id: number;
}

export interface SocketErrorEvent {
  message: string;
}
