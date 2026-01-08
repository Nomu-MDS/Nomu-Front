// Page de conversation/chat
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MessageBubble } from '@/components/messages/message-bubble';
import { MessageInput } from '@/components/messages/message-input';
import { TypingIndicator } from '@/components/messages/typing-indicator';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getToken } from '@/lib/session';
import { decodeJwt } from '@/lib/jwt';
import { getConversation, getMessages } from '@/services/api/conversations';
import { connectSocket, disconnectSocket, getSocket } from '@/services/socket';
import type { Message, User } from '@/types/message';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const conversationId = Number(params.conversationId);

  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [otherUserTypingName, setOtherUserTypingName] = useState('');

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserIdRef = useRef<number | null>(null);

  // Charger les données initiales
  useEffect(() => {
    async function loadInitialData() {
      try {
        const token = getToken();
        if (!token) {
          Alert.alert('Erreur', 'Vous devez être connecté');
          router.replace('/login');
          return;
        }

        // Charger la conversation d'abord pour obtenir l'ID utilisateur
        const { conversation } = await getConversation(conversationId);
        console.log('[Chat] Conversation chargée:', conversation);

        // Récupérer l'ID utilisateur depuis le token Firebase
        const claims = decodeJwt(token);
        const firebaseUid = claims?.user_id || claims?.sub;

        if (!firebaseUid) {
          throw new Error('Firebase UID introuvable dans le token');
        }

        console.log('[Chat] Firebase UID:', firebaseUid);

        // Déterminer l'ID utilisateur en BDD en comparant le firebase_uid
        let userId: number;
        if (conversation.Voyager.firebase_uid === firebaseUid) {
          userId = conversation.Voyager.id;
          console.log('[Chat] Utilisateur = Voyager (ID:', userId, ')');
        } else if (conversation.Local.firebase_uid === firebaseUid) {
          userId = conversation.Local.id;
          console.log('[Chat] Utilisateur = Local (ID:', userId, ')');
        } else {
          throw new Error('Utilisateur non trouvé dans cette conversation');
        }

        setCurrentUserId(userId);
        currentUserIdRef.current = userId;

        // Déterminer l'autre utilisateur
        const other = conversation.voyager_id === userId
          ? conversation.Local
          : conversation.Voyager;
        setOtherUser(other);

        // Charger l'historique des messages
        const { messages: messageHistory } = await getMessages(conversationId);
        setMessages(messageHistory.reverse()); // Du plus ancien au plus récent

        // Connecter le WebSocket
        connectSocket(token);
        const socket = getSocket();
        if (!socket) {
          throw new Error('Impossible de se connecter au WebSocket');
        }

        // Rejoindre la conversation
        socket.emit('join_conversation', { conversation_id: conversationId });

        // Écouter les événements
        socket.on('joined_conversation', (data) => {
          console.log('[Chat] Rejoint la conversation', data.conversation_id);
        });

        socket.on('new_message', (data) => {
          console.log('[Chat] Nouveau message reçu', data.message);
          setMessages((prev) => [...prev, data.message]);

          // Si c'est un message de l'autre personne, marquer comme lu
          const currentId = currentUserIdRef.current;
          console.log('[Chat] Comparaison:', data.message.user_id, 'vs', currentId);
          if (currentId && data.message.user_id !== currentId) {
            console.log('[Chat] Marquage message comme lu:', data.message.id);
            socket.emit('message_read', { message_id: data.message.id });
          } else {
            console.log('[Chat] Message propre, pas de marquage');
          }

          // Scroll vers le bas
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        });

        socket.on('user_typing', (data) => {
          console.log('[Chat] User typing', data);
          if (data.userId !== userId) {
            setIsOtherUserTyping(data.isTyping);
            setOtherUserTypingName(data.userName);

            // Auto-clear après 3 secondes
            if (data.isTyping) {
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              typingTimeoutRef.current = setTimeout(() => {
                setIsOtherUserTyping(false);
              }, 3000);
            }
          }
        });

        socket.on('message_read_update', (data) => {
          console.log('[Chat] Message lu', data.message_id);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.message_id ? { ...msg, read: true } : msg
            )
          );
        });

        socket.on('error', (error) => {
          console.error('[Chat] Erreur WebSocket:', error);
          Alert.alert('Erreur', error.message || 'Une erreur est survenue');
        });

      } catch (error: any) {
        console.error('[Chat] Erreur chargement:', error);
        Alert.alert('Erreur', error.message || 'Impossible de charger la conversation');
        router.back();
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();

    // Cleanup
    return () => {
      const socket = getSocket();
      if (socket) {
        socket.emit('leave_conversation', { conversation_id: conversationId });
        socket.off('joined_conversation');
        socket.off('new_message');
        socket.off('user_typing');
        socket.off('message_read_update');
        socket.off('error');
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, router]);

  const handleSendMessage = (content: string, attachment: string | null) => {
    const socket = getSocket();
    if (!socket || !socket.connected) {
      Alert.alert('Erreur', 'Connexion perdue. Veuillez réessayer.');
      return;
    }

    console.log('[Chat] Envoi message:', { content, hasAttachment: !!attachment });
    socket.emit('send_message', {
      conversation_id: conversationId,
      content,
      attachment,
    });
  };

  const handleTyping = (isTyping: boolean) => {
    const socket = getSocket();
    if (!socket || !socket.connected) return;

    socket.emit('typing', {
      conversation_id: conversationId,
      isTyping,
    });
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={handleBack} hitSlop={12} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerInfo}>
            <ThemedText type="subtitle" style={styles.headerTitle}>
              {otherUser?.name || 'Conversation'}
            </ThemedText>
          </View>
          <View style={styles.headerButton} />
        </View>

        {/* Liste des messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const isCurrentUserMessage = item.user_id === currentUserId;
            console.log('[Chat] Message ID:', item.id, '| user_id:', item.user_id, '| currentUserId:', currentUserId, '| isCurrentUser:', isCurrentUserMessage);
            return (
              <MessageBubble
                message={item}
                isCurrentUser={isCurrentUserMessage}
              />
            );
          }}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText style={{ color: theme.icon }}>
                Démarrez la conversation
              </ThemedText>
            </View>
          }
          ListFooterComponent={
            isOtherUserTyping ? <TypingIndicator userName={otherUserTypingName} /> : null
          }
        />

        {/* Zone de saisie */}
        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
        />
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerButton: {
    width: 40,
  },
  messagesList: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
});
