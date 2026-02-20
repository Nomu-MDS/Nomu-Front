import { useFocusEffect, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  Text,
  Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getConversations } from '@/services/api/conversations';
import { getToken } from '@/lib/session';
import { decodeJwt } from '@/lib/jwt';
import { connectSocket, getSocket } from '@/services/socket';
import type { Conversation, Message } from '@/types/message';

const BG_COLOR = '#E9E0D0';
const CARD_COLOR = '#FFFFFF';
const NAME_COLOR = '#22172A';
const PREVIEW_COLOR = '#6C727F';
const TIMESTAMP_COLOR = '#9EA3AE';
const UNREAD_DOT_COLOR = '#4CAF50';
const SEPARATOR_COLOR = '#E8E8E8';

export default function MessagesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentUserIdRef = useRef<number | null>(null);

  const [fontsLoaded] = useFonts({
    'RocaOne-Rg': require('@/assets/fonts/roca/RocaOne-Rg.ttf'),
    'RocaOne-Bold': require('@/assets/fonts/roca/RocaOne-Bold.ttf'),
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

      const { conversations: convList } = await getConversations();

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

          const { conversations: convList } = await getConversations();

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
        <MaterialIcons name="arrow-back" size={24} color={NAME_COLOR} />
      </Pressable>
      <Text style={styles.headerTitle}>Messages</Text>
      <View style={styles.headerRight} />
    </View>
  );

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.screenContainer}>
        <Header />
        <View style={styles.card}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screenContainer}>
        <Header />
        <View style={styles.card}>
          <View style={styles.centerContent}>
            <Text style={[styles.errorText, { color: theme.icon }]}>{error}</Text>
            <Pressable
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
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
    <View style={styles.screenContainer}>
      <Header />
      <View style={styles.card}>
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const otherUser = item.voyager_id === currentUserId ? item.Local : item.Voyager;
            const lastMessage = item.Messages?.[0];

            const initials = otherUser.name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            const unreadCount = item.Messages?.filter(
              (msg: Message) => !msg.read && msg.user_id !== currentUserId
            ).length || 0;

            return (
              <Pressable
                style={styles.conversationItem}
                onPress={() => handleOpenConversation(item.id)}
              >
                <View style={styles.avatarWrapper}>
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                    <Text style={styles.initials}>{initials}</Text>
                  </View>
                </View>

                <View style={styles.conversationContent}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {otherUser.name}
                  </Text>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {lastMessage
                      ? lastMessage.attachment
                        ? '📷 Photo'
                        : lastMessage.content
                      : 'Aucun message'}
                  </Text>
                </View>

                <View style={styles.rightSection}>
                  {unreadCount > 0 && <View style={styles.unreadDot} />}
                  {lastMessage && (
                    <Text style={styles.timestamp}>
                      {formatTimestamp(lastMessage.createdAt)}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.icon }]}>
                Aucune conversation
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.icon }]}>
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
    backgroundColor: BG_COLOR,
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
    fontFamily: 'RocaOne-Bold',
    fontSize: 24,
    color: NAME_COLOR,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  card: {
    flex: 1,
    backgroundColor: CARD_COLOR,
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
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  conversationContent: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontFamily: 'RocaOne-Rg',
    fontSize: 18,
    lineHeight: 24,
    color: NAME_COLOR,
  },
  lastMessage: {
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    lineHeight: 17,
    color: PREVIEW_COLOR,
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
    backgroundColor: UNREAD_DOT_COLOR,
  },
  timestamp: {
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    color: TIMESTAMP_COLOR,
    textAlign: 'right',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SEPARATOR_COLOR,
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
