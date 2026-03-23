import { useFocusEffect, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getConversations } from '@/services/api/conversations';
import { getMyReservations, type Reservation } from '@/services/api/reservations';
import { getToken } from '@/lib/session';
import { decodeJwt } from '@/lib/jwt';
import { connectSocket, getSocket } from '@/services/socket';
import type { Conversation, Message } from '@/types/message';

export default function MessagesScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentUserIdRef = useRef<number | null>(null);

  const [fontsLoaded] = useFonts({
    'RocaOne-Rg':      require('@/assets/fonts/roca/RocaOne-Rg.ttf'),
    'RocaOne-Bold':     require('@/assets/fonts/roca/RocaOne-Bold.ttf'),
    'Poppins-Regular':  require('@/assets/fonts/poppins/Poppins-Regular.ttf'),
    'Poppins-Medium':   require('@/assets/fonts/poppins/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('@/assets/fonts/poppins/Poppins-SemiBold.ttf'),
    'Poppins-Bold':     require('@/assets/fonts/poppins/Poppins-Bold.ttf'),
  });

  const loadConversations = async (isRefresh = false, silent = false) => {
    if (!silent) {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
    }
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        setError('Vous devez être connecté');
        router.replace('/login');
        return;
      }

      const claims = decodeJwt(token);
      const currentUserIdFromToken = claims?.id || claims?.userId || claims?.sub || claims?.user_id;

      if (!currentUserIdFromToken) {
        setError('Impossible de récupérer votre identifiant');
        return;
      }

      const [{ conversations: convList }, resaList] = await Promise.all([
        getConversations(),
        getMyReservations().catch(() => [] as Reservation[]),
      ]);

      if (convList.length > 0) {
        const firstConv = convList[0];
        let userId: number | null = null;
        if (firstConv.Voyager?.id === currentUserIdFromToken) {
          userId = firstConv.Voyager.id;
        } else if (firstConv.Local?.id === currentUserIdFromToken) {
          userId = firstConv.Local.id;
        }
        if (userId) {
          setCurrentUserId(userId);
          currentUserIdRef.current = userId;
        }
      }

      setConversations(convList);
      setReservations(resaList);
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Impossible de charger les conversations');
      }
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const setupSocket = useCallback((firstConvId: number) => {
    const token = getToken();
    if (!token) return;

    connectSocket(token);
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join_conversation', { conversation_id: firstConvId });

    socket.on('new_message', () => {
      loadConversations(true, true);
    });

    socket.on('message_read_update', () => {
      loadConversations(true, true);
    });

    return () => {
      socket.off('new_message');
      socket.off('message_read_update');
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cleanup: (() => void) | undefined;

      const init = async () => {
        try {
          const token = getToken();
          if (!token) {
            setError('Vous devez être connecté');
            router.replace('/login');
            return;
          }

          const claims = decodeJwt(token);
          const currentUserIdFromToken = claims?.id || claims?.userId || claims?.sub || claims?.user_id;

          if (!currentUserIdFromToken) {
            setError('Impossible de récupérer votre identifiant');
            return;
          }

          const [{ conversations: convList }, resaList] = await Promise.all([
            getConversations(),
            getMyReservations().catch(() => [] as Reservation[]),
          ]);

          if (convList.length > 0) {
            const firstConv = convList[0];
            let userId: number | null = null;
            if (firstConv.Voyager?.id === currentUserIdFromToken) {
              userId = firstConv.Voyager.id;
            } else if (firstConv.Local?.id === currentUserIdFromToken) {
              userId = firstConv.Local.id;
            }
            if (userId) {
              setCurrentUserId(userId);
              currentUserIdRef.current = userId;
            }

            cleanup = setupSocket(firstConv.id);
          }

          setConversations(convList);
          setReservations(resaList);
          setLoading(false);
          setRefreshing(false);
        } catch (err: any) {
          setError(err.message || 'Impossible de charger les conversations');
          setLoading(false);
          setRefreshing(false);
        }
      };

      init();

      return () => {
        if (cleanup) cleanup();
      };
    }, [setupSocket, router])
  );

  const handleRefresh = () => {
    loadConversations(true);
  };

  const handleOpenConversation = (conversationId: number) => {
    router.push(`/chat/${conversationId}`);
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) {
      const h = date.getHours().toString().padStart(2, '0');
      const m = date.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    }
    if (diffDays < 7) return `${diffDays}j`;

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const Header = () => (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
        <MaterialIcons name="arrow-back" size={24} color={colors.heading} />
      </Pressable>
      <Text style={[styles.headerTitle, fontsLoaded ? { fontFamily: FontFamily.rocaBold } : {}, { color: colors.heading }]}>
        Messages
      </Text>
      <View style={styles.headerRight} />
    </View>
  );

  if (loading || !fontsLoaded) {
    return (
      <View style={[styles.screenContainer, { backgroundColor: colors.cream }]}>
        <Header />
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screenContainer, { backgroundColor: colors.cream }]}>
        <Header />
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.centerContent}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
            <Pressable
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => loadConversations()}
            >
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.cream }]}>
      <Header />
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const otherUser = item.voyager_id === currentUserId ? item.Local : item.Voyager;
            const lastMessage = item.Messages?.[0];
            const avatarUri = otherUser.image_url ?? `https://i.pravatar.cc/500?img=${(otherUser.id % 70) + 1}`;

            const unreadCount = item.Messages?.filter(
              (msg: Message) => !msg.read && msg.user_id !== currentUserId
            ).length || 0;

            return (
              <Pressable
                style={styles.conversationItem}
                onPress={() => handleOpenConversation(item.id)}
              >
                <View style={styles.avatarWrapper}>
                  <Image source={{ uri: avatarUri }} style={styles.avatarImg} resizeMode="cover" />
                </View>

                <View style={styles.conversationContent}>
                  <Text
                    style={[styles.userName, { color: colors.heading }, fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {}]}
                    numberOfLines={1}
                  >
                    {otherUser.name}
                  </Text>
                  <Text style={[styles.lastMessage, { color: colors.textSecondary, fontFamily: FontFamily.mono }]} numberOfLines={1}>
                    {(() => {
                      const lastResa = reservations
                        .filter(r => r.conversation_id === item.id)
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                      if (lastResa && (!lastMessage || new Date(lastResa.createdAt) > new Date(lastMessage.createdAt))) {
                        return 'Activité proposée';
                      }
                      if (!lastMessage) return 'Aucun message';
                      if (lastMessage.attachment) return '📷 Photo';
                      return lastMessage.content;
                    })()}
                  </Text>
                </View>

                <View style={styles.rightSection}>
                  {unreadCount > 0 && <View style={[styles.unreadDot, { backgroundColor: colors.unread }]} />}
                  {lastMessage && (
                    <Text style={[styles.timestamp, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>
                      {formatTimestamp(lastMessage.createdAt)}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucune conversation
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Commencez une conversation en visitant le profil d'un utilisateur
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 72 : 52,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  card: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  listContent: {
    paddingHorizontal: 25,
    paddingTop: 8,
    paddingBottom: 100,
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  avatarWrapper: {
    width: 56,
    height: 56,
  },
  avatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  conversationContent: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 18,
    lineHeight: 24,
  },
  lastMessage: {
    fontSize: 12,
    lineHeight: 17,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 48,
  },
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timestamp: {
    fontSize: 12,
    textAlign: 'right',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 72,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
