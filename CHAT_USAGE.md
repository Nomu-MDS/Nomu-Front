# Guide d'utilisation de la page Chat

Ce guide explique comment utiliser la page de chat créée pour vos collègues développeurs.

---

## 📍 Page créée

**Fichier**: `app/(protected)/chat/[conversationId].tsx`

**Route**: `/chat/[conversationId]`

---

## 🎯 Utilisation par vos collègues

### Option 1: Navigation directe avec conversationId connu

Si vous avez déjà un `conversationId` (par exemple depuis une liste de conversations), naviguez directement:

```tsx
import { useRouter } from 'expo-router';

function ConversationItem({ conversationId, otherUserName }) {
  const router = useRouter();

  const handleOpenChat = () => {
    router.push(`/chat/${conversationId}`);
  };

  return (
    <Pressable onPress={handleOpenChat}>
      <Text>Conversation avec {otherUserName}</Text>
    </Pressable>
  );
}
```

---

### Option 2: Créer/Récupérer une conversation puis naviguer (Recommandé)

Pour un bouton "Contacter" sur un profil utilisateur, utilisez le helper `startConversation`:

```tsx
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { startConversation } from '@/lib/chat-helper';
import { Button } from '@/components/ui/button';

function ContactButton({ userId, userName }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleContact = async () => {
    setLoading(true);
    try {
      // Crée ou récupère la conversation
      const conversationId = await startConversation(userId);

      // Navigue vers le chat
      router.push(`/chat/${conversationId}`);
    } catch (error: any) {
      if (error.message.includes('Only travelers')) {
        Alert.alert('Non autorisé', 'Seuls les voyageurs peuvent initier des conversations');
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de démarrer la conversation');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      label={loading ? 'Chargement...' : `Contacter ${userName}`}
      onPress={handleContact}
      disabled={loading}
    />
  );
}
```

---

## 📦 Ce qui est fourni

### 1. Page de chat complète
- Affichage de l'historique des messages
- Envoi de messages en temps réel
- Support des images (via caméra ou galerie)
- Indicateur "en train d'écrire"
- Marquage automatique des messages comme lus
- Bulles de messages stylées (envoyé/reçu)
- Header avec nom de l'utilisateur

### 2. Services API
**Fichier**: `services/api/conversations.ts`

Fonctions disponibles:
```typescript
// Récupérer toutes les conversations
getConversations(): Promise<GetConversationsResponse>

// Récupérer une conversation spécifique
getConversation(conversationId: number): Promise<{ conversation: Conversation }>

// Récupérer l'historique des messages
getMessages(conversationId: number, params?: GetMessagesParams): Promise<GetMessagesResponse>

// Créer ou récupérer une conversation
createOrGetConversation(payload: CreateConversationPayload): Promise<CreateConversationResponse>

// Marquer un message comme lu
markMessageAsRead(conversationId: number, messageId: number): Promise<void>
```

### 3. Service WebSocket
**Fichier**: `services/socket.ts`

Fonctions disponibles:
```typescript
// Connecter le WebSocket (appelé automatiquement dans la page de chat)
connectSocket(firebaseToken: string): Socket

// Récupérer l'instance socket
getSocket(): Socket | null

// Déconnecter le socket
disconnectSocket(): void

// Vérifier la connexion
isSocketConnected(): boolean
```

### 4. Types TypeScript
**Fichier**: `types/message.ts`

Toutes les interfaces pour les messages, conversations, et événements WebSocket.

### 5. Composants UI
**Fichiers**:
- `components/messages/message-bubble.tsx` - Bulle de message
- `components/messages/typing-indicator.tsx` - Indicateur de frappe
- `components/messages/message-input.tsx` - Zone de saisie avec support images

### 6. Helper
**Fichier**: `lib/chat-helper.ts`

Fonction utilitaire:
```typescript
startConversation(otherUserId: number): Promise<number>
```

---

## 🔧 Configuration requise

### Backend doit être démarré
Assurez-vous que le backend est lancé sur `http://localhost:3001` (ou l'URL configurée dans votre `.env`).

### Token d'authentification
L'utilisateur doit être connecté. Le token est automatiquement récupéré depuis `@/lib/session`.

---

## 📝 Exemples d'intégration

### Exemple 1: Liste de conversations

```tsx
import { useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { getConversations } from '@/services/api/conversations';
import type { Conversation } from '@/types/message';

function ConversationsListScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    async function loadConversations() {
      try {
        const { conversations } = await getConversations();
        setConversations(conversations);
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
    loadConversations();
  }, []);

  const handleOpenChat = (conversationId: number) => {
    router.push(`/chat/${conversationId}`);
  };

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => {
        const otherUser = item.Voyager.id === currentUserId
          ? item.Local
          : item.Voyager;
        const lastMessage = item.Messages?.[0];

        return (
          <Pressable onPress={() => handleOpenChat(item.id)}>
            <View style={styles.conversationItem}>
              <Text style={styles.userName}>{otherUser.name}</Text>
              {lastMessage && (
                <Text style={styles.lastMessage}>{lastMessage.content}</Text>
              )}
            </View>
          </Pressable>
        );
      }}
    />
  );
}
```

### Exemple 2: Bouton "Contacter" sur un profil

```tsx
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { startConversation } from '@/lib/chat-helper';
import { Button } from '@/components/ui/button';

function UserProfileScreen({ user }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleContactUser = async () => {
    setLoading(true);
    try {
      const conversationId = await startConversation(user.id);
      router.push(`/chat/${conversationId}`);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Text>{user.name}</Text>
      <Button
        label="Envoyer un message"
        onPress={handleContactUser}
        disabled={loading}
      />
    </View>
  );
}
```

### Exemple 3: Notification avec lien direct

```tsx
function NotificationItem({ notification }) {
  const router = useRouter();

  const handlePress = () => {
    if (notification.type === 'new_message') {
      // Naviguer directement vers la conversation
      router.push(`/chat/${notification.conversationId}`);
    }
  };

  return (
    <Pressable onPress={handlePress}>
      <Text>{notification.message}</Text>
    </Pressable>
  );
}
```

---

## 🚨 Contraintes importantes

### Contraintes backend
- ✅ Seuls les **voyageurs** peuvent initier une conversation avec un **local**
- ✅ Messages max **2000 caractères**
- ✅ Pièces jointes : **images uniquement** (JPEG, PNG, GIF, WebP)
- ✅ Taille max des images : **10MB**

### Gestion d'erreurs
La page gère automatiquement:
- Token manquant → redirection vers `/login`
- Erreur de chargement → retour à la page précédente
- Perte de connexion WebSocket → affichage d'une alerte

---

## 🎨 Personnalisation

### Modifier les styles
Les composants utilisent le système de thème de l'app (`@/constants/theme`). Les couleurs s'adaptent automatiquement au mode light/dark.

### Modifier le comportement
Tous les fichiers sont bien structurés et commentés. Vous pouvez modifier:
- Les composants dans `components/messages/`
- La page principale dans `app/(protected)/chat/[conversationId].tsx`
- Les services dans `services/`

---

## 📱 Test

### 1. Démarrer le backend
```bash
cd Nomu-Back
npm run dev
```

### 2. Démarrer l'app
```bash
npm start
```

### 3. Tester le flow
1. Créer deux utilisateurs (un voyageur, un local)
2. Se connecter en tant que voyageur
3. Naviguer vers un profil de local
4. Utiliser le bouton "Contacter" (à implémenter par vos collègues)
5. Envoyer des messages
6. Tester les images
7. Tester l'indicateur de frappe

---

## ❓ FAQ

### Q: Comment récupérer l'ID utilisateur actuel?
```typescript
import { getToken } from '@/lib/session';
import { decodeJwt } from '@/lib/jwt';

const token = getToken();
const claims = decodeJwt(token);
const currentUserId = claims?.userId || claims?.id;
```

### Q: Comment savoir si l'utilisateur est voyageur ou local?
```typescript
const claims = decodeJwt(token);
const userRole = claims?.role; // 'voyager' ou 'local'
```

### Q: Peut-on personnaliser l'apparence des bulles?
Oui, éditez `components/messages/message-bubble.tsx` et modifiez les styles.

### Q: Comment gérer les notifications push?
Ce n'est pas inclus dans cette implémentation. Vous devrez ajouter:
1. `expo-notifications`
2. Écouter les événements WebSocket même en arrière-plan
3. Afficher une notification locale

---

## 📞 Support

Pour toute question sur l'utilisation de la page de chat, référez-vous à:
- [Documentation backend](../MESSAGES_FRONTEND_INTEGRATION.md)
- Ce guide
- Les commentaires dans le code

---

## ✅ Checklist d'intégration

Pour vos collègues qui intègrent la fonctionnalité:

- [ ] Le backend est lancé et accessible
- [ ] L'utilisateur est authentifié (token présent)
- [ ] Vous avez l'ID de l'utilisateur avec qui discuter
- [ ] Vous utilisez soit `router.push(\`/chat/\${conversationId}\`)` directement
- [ ] Ou vous utilisez `startConversation(userId)` puis naviguez
- [ ] Vous gérez les erreurs (try/catch)
- [ ] Vous avez testé avec 2 utilisateurs différents

---

Bon développement! 🚀
