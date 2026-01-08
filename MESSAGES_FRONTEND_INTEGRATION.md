# 💬 Intégration du Système de Messagerie - Guide Frontend

Ce guide explique comment intégrer le système de messagerie (conversations + WebSocket) dans votre application frontend.

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Configuration WebSocket](#configuration-websocket)
3. [Routes HTTP disponibles](#routes-http-disponibles)
4. [Événements WebSocket](#événements-websocket)
5. [Flux complet d'une conversation](#flux-complet-dune-conversation)
6. [Exemples d'intégration React](#exemples-dintégration-react)
7. [Gestion des pièces jointes](#gestion-des-pièces-jointes)
8. [Bonnes pratiques](#bonnes-pratiques)

---

## Vue d'ensemble

Le système de messagerie combine :
- **Routes HTTP REST** pour la gestion des conversations (liste, création, historique)
- **WebSocket (Socket.IO)** pour les messages en temps réel

**Contraintes:**
- Seuls les **voyageurs** peuvent initier une conversation avec un **local**
- Messages limités à **2000 caractères**
- Pièces jointes : **images uniquement**, max **10MB**
- Types acceptés : JPEG, PNG, GIF, WebP

**Base URL:** `http://localhost:3001`

---

## Configuration WebSocket

### 1. Installation

```bash
npm install socket.io-client
```

### 2. Connexion au serveur WebSocket

```javascript
// utils/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

let socket = null;

export function connectSocket(firebaseToken) {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: {
      token: firebaseToken
    },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connected');
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

### 3. Se connecter après login

```javascript
// Après login réussi
const token = localStorage.getItem('firebaseToken');
connectSocket(token);
```

---

## Routes HTTP disponibles

### 📜 1. Lister toutes les conversations

**Endpoint:** `GET /conversations`

**Usage:** Page "Mes conversations"

```javascript
import fetchWithAuth from '../utils/api';

export async function getConversations() {
  return await fetchWithAuth('/conversations');
}
```

**Réponse:**
```json
{
  "conversations": [
    {
      "id": 1,
      "voyager_id": 5,
      "local_id": 10,
      "createdAt": "2026-01-08T10:00:00.000Z",
      "updatedAt": "2026-01-08T11:30:00.000Z",
      "Voyager": {
        "id": 5,
        "name": "Alice Voyageuse",
        "email": "alice@example.com",
        "firebase_uid": "abc123"
      },
      "Local": {
        "id": 10,
        "name": "Bob Local",
        "email": "bob@example.com",
        "firebase_uid": "def456"
      },
      "Messages": [
        {
          "id": 42,
          "content": "Dernier message...",
          "read": false,
          "createdAt": "2026-01-08T11:30:00.000Z",
          "Sender": {
            "id": 10,
            "name": "Bob Local"
          }
        }
      ]
    }
  ]
}
```

**Exemple React:**
```jsx
function ConversationsList() {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    async function loadConversations() {
      const data = await getConversations();
      setConversations(data.conversations);
    }
    loadConversations();
  }, []);

  return (
    <div className="conversations-list">
      {conversations.map((conv) => {
        const lastMessage = conv.Messages?.[0];
        const otherUser = conv.Voyager.id === currentUserId
          ? conv.Local
          : conv.Voyager;

        return (
          <div key={conv.id} className="conversation-item">
            <div className="user-info">
              <h3>{otherUser.name}</h3>
            </div>
            {lastMessage && (
              <div className="last-message">
                <p>{lastMessage.content}</p>
                <span className="time">
                  {new Date(lastMessage.createdAt).toLocaleTimeString()}
                </span>
                {!lastMessage.read && <span className="unread-badge">●</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

### 👤 2. Récupérer une conversation spécifique

**Endpoint:** `GET /conversations/:id`

```javascript
export async function getConversation(conversationId) {
  return await fetchWithAuth(`/conversations/${conversationId}`);
}
```

**Réponse:**
```json
{
  "conversation": {
    "id": 1,
    "voyager_id": 5,
    "local_id": 10,
    "Voyager": { "id": 5, "name": "Alice", "email": "alice@example.com" },
    "Local": { "id": 10, "name": "Bob", "email": "bob@example.com" }
  }
}
```

---

### 📨 3. Récupérer l'historique des messages

**Endpoint:** `GET /conversations/:id/messages?limit=50&offset=0`

```javascript
export async function getMessages(conversationId, params = {}) {
  const { limit = 50, offset = 0 } = params;
  const queryParams = new URLSearchParams({ limit, offset });

  return await fetchWithAuth(
    `/conversations/${conversationId}/messages?${queryParams}`
  );
}
```

**Réponse:**
```json
{
  "messages": [
    {
      "id": 42,
      "user_id": 10,
      "conversation_id": 1,
      "content": "Bonjour !",
      "attachment": null,
      "read": true,
      "createdAt": "2026-01-08T11:30:00.000Z",
      "Sender": {
        "id": 10,
        "name": "Bob Local",
        "email": "bob@example.com",
        "firebase_uid": "def456"
      }
    }
  ]
}
```

**Exemple avec pagination:**
```jsx
function MessageHistory({ conversationId }) {
  const [messages, setMessages] = useState([]);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  useEffect(() => {
    async function loadMessages() {
      const data = await getMessages(conversationId, { limit, offset });
      setMessages(prev => [...prev, ...data.messages]);
    }
    loadMessages();
  }, [conversationId, offset]);

  function loadMore() {
    setOffset(prev => prev + limit);
  }

  return (
    <div className="message-history">
      {messages.reverse().map((msg) => (
        <div key={msg.id} className={msg.Sender.id === currentUserId ? 'sent' : 'received'}>
          <p>{msg.content}</p>
          {msg.attachment && <img src={msg.attachment} alt="Attachment" />}
          <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
        </div>
      ))}
      <button onClick={loadMore}>Charger plus</button>
    </div>
  );
}
```

---

### ➕ 4. Créer ou récupérer une conversation

**Endpoint:** `POST /conversations`

**Body:**
```json
{
  "otherUserId": 10
}
```

**Contraintes:**
- L'utilisateur actuel doit être un **voyageur**
- L'autre utilisateur doit être un **local**

```javascript
export async function createOrGetConversation(localUserId) {
  return await fetchWithAuth('/conversations', {
    method: 'POST',
    body: JSON.stringify({ otherUserId: localUserId }),
  });
}
```

**Réponse:**
```json
{
  "conversation": { "id": 1, ... },
  "existed": false
}
```

**Exemple (bouton "Contacter"):**
```jsx
function ContactButton({ localUser }) {
  async function handleContact() {
    try {
      const { conversation, existed } = await createOrGetConversation(localUser.id);

      if (existed) {
        // Conversation existe déjà, y aller
        navigate(`/conversations/${conversation.id}`);
      } else {
        // Nouvelle conversation créée
        navigate(`/conversations/${conversation.id}`);
      }
    } catch (error) {
      if (error.message.includes('Only travelers')) {
        alert('Seuls les voyageurs peuvent initier des conversations');
      }
    }
  }

  return (
    <button onClick={handleContact}>
      💬 Contacter {localUser.name}
    </button>
  );
}
```

---

### ✅ 5. Marquer un message comme lu (HTTP)

**Endpoint:** `PATCH /conversations/:id/messages/:messageId/read`

```javascript
export async function markMessageAsRead(conversationId, messageId) {
  return await fetchWithAuth(
    `/conversations/${conversationId}/messages/${messageId}/read`,
    { method: 'PATCH' }
  );
}
```

---

## Événements WebSocket

### Événements émis par le client

#### 1. `join_conversation` - Rejoindre une conversation

```javascript
const socket = getSocket();

socket.emit('join_conversation', {
  conversation_id: 1
});

socket.on('joined_conversation', (data) => {
  console.log('✅ Rejoint la conversation', data.conversation_id);
});
```

---

#### 2. `leave_conversation` - Quitter une conversation

```javascript
socket.emit('leave_conversation', {
  conversation_id: 1
});
```

---

#### 3. `send_message` - Envoyer un message

```javascript
socket.emit('send_message', {
  conversation_id: 1,
  content: 'Bonjour !',
  attachment: null // ou base64 image
});

// Confirmation d'envoi
socket.on('message_sent', (data) => {
  console.log('Message envoyé:', data.message);
});
```

**Avec pièce jointe:**
```javascript
// attachment doit être au format: data:image/jpeg;base64,/9j/4AAQSkZJRg...
socket.emit('send_message', {
  conversation_id: 1,
  content: 'Voici une photo',
  attachment: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
});
```

---

#### 4. `typing` - Indicateur "en train d'écrire"

```javascript
// Quand l'utilisateur commence à taper
socket.emit('typing', {
  conversation_id: 1,
  isTyping: true
});

// Quand l'utilisateur arrête
socket.emit('typing', {
  conversation_id: 1,
  isTyping: false
});
```

---

#### 5. `message_read` - Marquer comme lu (WebSocket)

```javascript
socket.emit('message_read', {
  message_id: 42
});
```

---

### Événements reçus du serveur

#### 1. `new_message` - Nouveau message reçu

```javascript
socket.on('new_message', (data) => {
  console.log('Nouveau message:', data.message);
  // Ajouter le message à l'UI
  addMessageToUI(data.message);
});
```

---

#### 2. `user_typing` - Quelqu'un est en train d'écrire

```javascript
socket.on('user_typing', (data) => {
  const { userId, userName, isTyping } = data;

  if (isTyping) {
    showTypingIndicator(userName);
  } else {
    hideTypingIndicator(userName);
  }
});
```

---

#### 3. `message_read_update` - Message lu

```javascript
socket.on('message_read_update', (data) => {
  const { message_id, read } = data;
  // Mettre à jour l'UI (double check bleu par exemple)
  updateMessageReadStatus(message_id, read);
});
```

---

#### 4. `error` - Erreur

```javascript
socket.on('error', (error) => {
  console.error('Erreur WebSocket:', error.message);
  alert(error.message);
});
```

---

## Flux complet d'une conversation

### Exemple complet avec React

```jsx
import { useEffect, useState } from 'react';
import { getSocket } from '../utils/socket';
import { getMessages } from '../services/conversationService';

function ChatWindow({ conversationId, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const socket = getSocket();

  // 1. Charger l'historique au montage
  useEffect(() => {
    async function loadHistory() {
      const data = await getMessages(conversationId);
      setMessages(data.messages.reverse());
    }
    loadHistory();
  }, [conversationId]);

  // 2. Rejoindre la conversation WebSocket
  useEffect(() => {
    socket.emit('join_conversation', { conversation_id: conversationId });

    return () => {
      socket.emit('leave_conversation', { conversation_id: conversationId });
    };
  }, [conversationId]);

  // 3. Écouter les nouveaux messages
  useEffect(() => {
    socket.on('new_message', (data) => {
      setMessages(prev => [...prev, data.message]);

      // Si c'est un message de l'autre personne, marquer comme lu
      if (data.message.user_id !== currentUserId) {
        socket.emit('message_read', { message_id: data.message.id });
      }
    });

    socket.on('user_typing', (data) => {
      if (data.userId !== currentUserId) {
        setOtherUserTyping(data.isTyping);
      }
    });

    socket.on('message_read_update', (data) => {
      setMessages(prev => prev.map(msg =>
        msg.id === data.message_id ? { ...msg, read: true } : msg
      ));
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('message_read_update');
    };
  }, [currentUserId]);

  // 4. Envoyer un message
  function handleSend(e) {
    e.preventDefault();

    if (!newMessage.trim()) return;

    socket.emit('send_message', {
      conversation_id: conversationId,
      content: newMessage,
      attachment: null
    });

    setNewMessage('');
    setIsTyping(false);
  }

  // 5. Gérer "en train d'écrire"
  function handleTyping(e) {
    setNewMessage(e.target.value);

    if (!isTyping && e.target.value) {
      setIsTyping(true);
      socket.emit('typing', { conversation_id: conversationId, isTyping: true });
    } else if (isTyping && !e.target.value) {
      setIsTyping(false);
      socket.emit('typing', { conversation_id: conversationId, isTyping: false });
    }
  }

  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.user_id === currentUserId ? 'sent' : 'received'}>
            <p>{msg.content}</p>
            {msg.attachment && <img src={msg.attachment} alt="Attachment" />}
            <span className="time">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </span>
            {msg.user_id === currentUserId && (
              <span className="read-status">
                {msg.read ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        ))}
        {otherUserTyping && <div className="typing-indicator">En train d'écrire...</div>}
      </div>

      <form onSubmit={handleSend} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="Votre message..."
          maxLength={2000}
        />
        <button type="submit">Envoyer</button>
      </form>
    </div>
  );
}
```

---

## Gestion des pièces jointes

### Convertir une image en base64

```javascript
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}
```

### Composant pour envoyer une image

```jsx
function ImageAttachment({ onAttachmentReady }) {
  async function handleFileSelect(e) {
    const file = e.target.files[0];

    if (!file) return;

    // Vérifier le type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Seules les images sont acceptées (JPEG, PNG, GIF, WebP)');
      return;
    }

    // Vérifier la taille (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('L\'image ne doit pas dépasser 10MB');
      return;
    }

    // Convertir en base64
    const base64 = await fileToBase64(file);
    onAttachmentReady(base64);
  }

  return (
    <div className="image-attachment">
      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
      />
    </div>
  );
}
```

### Utilisation dans le chat

```jsx
function ChatWithAttachments({ conversationId }) {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const socket = getSocket();

  function handleSend() {
    socket.emit('send_message', {
      conversation_id: conversationId,
      content: message,
      attachment: attachment // base64 ou null
    });

    setMessage('');
    setAttachment(null);
  }

  return (
    <div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Votre message..."
      />

      <ImageAttachment onAttachmentReady={setAttachment} />

      {attachment && (
        <div className="preview">
          <img src={attachment} alt="Preview" style={{ maxWidth: '200px' }} />
          <button onClick={() => setAttachment(null)}>Supprimer</button>
        </div>
      )}

      <button onClick={handleSend}>Envoyer</button>
    </div>
  );
}
```

---

## Bonnes pratiques

### 1. Gérer la reconnexion WebSocket

```javascript
socket.on('disconnect', () => {
  console.log('WebSocket déconnecté, reconnexion...');
  setTimeout(() => {
    socket.connect();
  }, 1000);
});

socket.on('connect', () => {
  // Re-rejoindre les conversations actives
  const activeConversations = getActiveConversations();
  activeConversations.forEach(convId => {
    socket.emit('join_conversation', { conversation_id: convId });
  });
});
```

---

### 2. Optimiser "en train d'écrire"

```javascript
import debounce from 'lodash/debounce';

const stopTyping = debounce(() => {
  socket.emit('typing', { conversation_id, isTyping: false });
}, 2000);

function handleTyping(e) {
  if (e.target.value) {
    socket.emit('typing', { conversation_id, isTyping: true });
    stopTyping();
  }
}
```

---

### 3. Marquer automatiquement les messages comme lus

```javascript
useEffect(() => {
  // Quand la fenêtre est visible
  const handleVisibility = () => {
    if (!document.hidden) {
      messages
        .filter(msg => !msg.read && msg.user_id !== currentUserId)
        .forEach(msg => {
          socket.emit('message_read', { message_id: msg.id });
        });
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [messages]);
```

---

### 4. Afficher les notifications

```javascript
socket.on('new_message', (data) => {
  const { message } = data;

  // Si la conversation n'est pas active
  if (currentConversationId !== message.conversation_id) {
    // Afficher une notification
    if (Notification.permission === 'granted') {
      new Notification(`Nouveau message de ${message.Sender.name}`, {
        body: message.content,
        icon: '/icon.png'
      });
    }
  }

  addMessageToUI(message);
});
```

---

### 5. Scroll automatique vers le bas

```jsx
function MessageList({ messages }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="messages">
      {messages.map(msg => <Message key={msg.id} {...msg} />)}
      <div ref={messagesEndRef} />
    </div>
  );
}
```

---

## 📌 Résumé des contraintes

- ✅ Seuls les **voyageurs** peuvent initier une conversation avec un **local**
- ✅ Messages max **2000 caractères**
- ✅ Pièces jointes : **images uniquement** (JPEG, PNG, GIF, WebP)
- ✅ Taille max des images : **10MB**
- ✅ Format base64 requis : `data:image/jpeg;base64,xxx`
- ✅ Authentification Firebase requise pour toutes les routes et WebSocket

---

## 🔒 Sécurité

- ✅ Authentification Firebase sur toutes les routes HTTP
- ✅ Authentification WebSocket au moment de la connexion
- ✅ Vérification d'accès avant chaque opération (voyageur/local)
- ✅ Validation des messages (longueur, contenu)
- ✅ Validation des pièces jointes (type, taille)
- ✅ Un utilisateur ne peut accéder qu'à ses propres conversations

---

## 📞 Support

Pour toute question sur l'intégration, référez-vous à :
- [API Documentation](./README.md)
- [WebSocket Service](./app/services/websocket/chatService.js)
- [Routes Conversations](./app/routes/conversations/index.js)
