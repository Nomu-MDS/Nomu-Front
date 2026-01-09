// Service WebSocket pour la messagerie temps réel
import { io, Socket } from 'socket.io-client';

import { API_BASE_URL } from '@/constants/config';

let socket: Socket | null = null;

/**
 * Connecte le socket WebSocket avec authentification Firebase
 */
export function connectSocket(firebaseToken: string): Socket {
  if (socket?.connected) {
    console.log('[Socket] Déjà connecté');
    return socket;
  }

  // Extraire l'URL de base sans le port pour Socket.IO
  const socketUrl = API_BASE_URL;

  console.log('[Socket] Connexion à', socketUrl);

  socket = io(socketUrl, {
    auth: {
      token: firebaseToken,
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('[Socket] ✅ Connecté, socket ID:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] ❌ Déconnecté, raison:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Erreur de connexion:', error.message);
  });

  socket.on('error', (error) => {
    console.error('[Socket] Erreur:', error);
  });

  return socket;
}

/**
 * Retourne l'instance du socket (peut être null si non connecté)
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Déconnecte le socket
 */
export function disconnectSocket(): void {
  if (socket) {
    console.log('[Socket] Déconnexion...');
    socket.disconnect();
    socket = null;
  }
}

/**
 * Vérifie si le socket est connecté
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Reconnecte le socket si déconnecté
 */
export function reconnectSocket(): void {
  if (socket && !socket.connected) {
    console.log('[Socket] Reconnexion...');
    socket.connect();
  }
}
