import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MessageBubble } from '@/components/messages/message-bubble';
import { MessageInput } from '@/components/messages/message-input';
import { ReservationModal } from '@/components/messages/reservation-modal';
import { TypingIndicator } from '@/components/messages/typing-indicator';
import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getToken } from '@/lib/session';
import { decodeJwt } from '@/lib/jwt';
import { getConversation, getMessages } from '@/services/api/conversations';
import { connectSocket, getSocket } from '@/services/socket';
import type { Message, Reservation, User } from '@/types/message';

const BG_COLOR = '#E4DBCB';
const BLUE = '#465E8A';
const DARK = BLUE;

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
  const [reservationModalVisible, setReservationModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const [fontsLoaded] = useFonts({
    'RocaOne-Rg':      require('@/assets/fonts/roca/RocaOne-Rg.ttf'),
    'Poppins-Regular':  require('@/assets/fonts/poppins/Poppins-Regular.ttf'),
    'Poppins-Medium':   require('@/assets/fonts/poppins/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('@/assets/fonts/poppins/Poppins-SemiBold.ttf'),
    'Poppins-Bold':     require('@/assets/fonts/poppins/Poppins-Bold.ttf'),
  });

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const token = getToken();
        if (!token) {
          Alert.alert('Erreur', 'Vous devez être connecté');
          router.replace('/login');
          return;
        }

        const { conversation } = await getConversation(conversationId);

        const claims = decodeJwt(token);
        const userIdFromToken = claims?.id || claims?.userId || claims?.sub || claims?.user_id;

        if (!userIdFromToken) throw new Error('Identifiant utilisateur introuvable dans le token');

        let userId: number;
        if (conversation.Voyager?.id === userIdFromToken) {
          userId = conversation.Voyager.id;
        } else if (conversation.Local?.id === userIdFromToken) {
          userId = conversation.Local.id;
        } else {
          throw new Error('Utilisateur non trouvé dans cette conversation');
        }

        setCurrentUserId(userId);
        currentUserIdRef.current = userId;

        const other = conversation.voyager_id === userId ? conversation.Local : conversation.Voyager;
        setOtherUser(other);

        const { messages: messageHistory } = await getMessages(conversationId);
        const sortedMessages = messageHistory.reverse();
        setMessages(sortedMessages);

        connectSocket(token);
        const socket = getSocket();
        if (!socket) throw new Error('Impossible de se connecter au WebSocket');

        socket.emit('join_conversation', { conversation_id: conversationId });

        const unreadMessages = sortedMessages.filter(
          (msg) => !msg.read && msg.user_id !== userId
        );
        unreadMessages.forEach((msg) => {
          socket.emit('message_read', { message_id: msg.id });
        });

        socket.on('joined_conversation', () => {});

        socket.on('new_message', (data) => {
          setMessages((prev) => [...prev, data.message]);
          const currentId = currentUserIdRef.current;
          if (currentId && data.message.user_id !== currentId) {
            socket.emit('message_read', { message_id: data.message.id });
          }
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        });

        socket.on('user_typing', (data) => {
          if (data.userId !== currentUserIdRef.current) {
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = null;
            }
            setIsOtherUserTyping(data.isTyping);
            setOtherUserTypingName(data.userName);
            if (data.isTyping) {
              typingTimeoutRef.current = setTimeout(() => {
                setIsOtherUserTyping(false);
              }, 3000);
            }
          }
        });

        socket.on('message_read_update', (data) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === data.message_id ? { ...msg, read: true } : msg))
          );
        });

        socket.on('error', (error) => {
          Alert.alert('Erreur', error.message || 'Une erreur est survenue');
        });
      } catch (error: any) {
        Alert.alert('Erreur', error.message || 'Impossible de charger la conversation');
        router.back();
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();

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
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, router]);

  const handleSendMessage = (content: string, attachment: string | null) => {
    const socket = getSocket();
    if (!socket || !socket.connected) {
      Alert.alert('Erreur', 'Connexion perdue. Veuillez réessayer.');
      return;
    }
    socket.emit('send_message', { conversation_id: conversationId, content, attachment });
  };

  const handleTyping = (isTyping: boolean) => {
    const socket = getSocket();
    if (!socket || !socket.connected) return;
    socket.emit('typing', { conversation_id: conversationId, isTyping });
  };

  const handleReservationCreated = (reservation: Reservation) => {
    setReservationModalVisible(false);
    const socket = getSocket();
    if (!socket || !socket.connected) return;
    const payload = JSON.stringify({
      __type: 'reservation',
      id: reservation.id,
      title: reservation.title,
      price: reservation.price,
      date: reservation.date,
      end_date: reservation.end_date,
      status: reservation.status,
      creator_id: reservation.creator_id,
    });
    socket.emit('send_message', { conversation_id: conversationId, content: payload, attachment: null });
  };

  // Initiales de l'autre utilisateur
  const initials = otherUser
    ? otherUser.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (loading || !fontsLoaded) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header — sur fond beige */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={22} color={DARK} />
        </Pressable>

        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={styles.userTexts}>
            <Text style={styles.userName} numberOfLines={1}>
              {otherUser?.name || 'Conversation'}
            </Text>
            <Text style={styles.userStatus}>Online</Text>
          </View>
        </View>

        <Pressable
          style={styles.menuButton}
          hitSlop={8}
          onPress={() => setMenuVisible(true)}
        >
          <MaterialIcons name="more-vert" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Carte blanche arrondie — contenu + input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.card}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isCurrentUser={item.user_id === currentUserId}
              currentUserId={currentUserId ?? 0}
              otherUserName={otherUser?.name}
            />
          )}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.icon }]}>
                Démarrez la conversation
              </Text>
            </View>
          }
          ListFooterComponent={
            isOtherUserTyping ? <TypingIndicator userName={otherUserTypingName} /> : null
          }
        />

        <MessageInput
          conversationId={conversationId}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          onReservationRequest={() => setReservationModalVisible(true)}
        />

        <ReservationModal
          visible={reservationModalVisible}
          conversationId={conversationId}
          onClose={() => setReservationModalVisible(false)}
          onCreated={handleReservationCreated}
        />
      </KeyboardAvoidingView>

      {/* ── Dropdown menu ────────────────────────────────────────────── */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuDropdown}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                if (otherUser) router.push({ pathname: '/(protected)/report/[userId]', params: { userId: String(otherUser.id), userName: otherUser.name } });
              }}
            >
              <MaterialIcons name="flag" size={16} color="#e53e3e" />
              <Text style={styles.menuItemText}>Signaler cet utilisateur</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    gap: 10,
  },
  backButton: {
    width: 32,
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 37,
    height: 37,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userTexts: {
    gap: 2,
    flex: 1,
  },
  userName: {
    fontFamily: 'RocaOne-Rg',
    fontSize: 16,
    color: DARK,
    letterSpacing: -0.32,
  },
  userStatus: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: DARK,
    letterSpacing: -0.22,
  },
  menuButton: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: DARK,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  messagesList: {
    paddingTop: 20,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FontFamily.mono,
  },

  // ── Dropdown menu ───────────────────────────────────────────────────────
  menuOverlay: {
    flex: 1,
  },
  menuDropdown: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    minWidth: 210,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#e53e3e',
    fontFamily: FontFamily.mono,
  },

});
