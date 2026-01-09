import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getConversations } from '@/services/api/conversations';
import { getToken } from '@/lib/session';
import { decodeJwt } from '@/lib/jwt';
import { connectSocket, getSocket } from '@/services/socket';
import type { Conversation, Message } from '@/types/message';

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

  // Charger les conversations
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

      // Récupérer l'ID utilisateur depuis le token
      const claims = decodeJwt(token);
      const firebaseUid = claims?.user_id || claims?.sub;

      if (!firebaseUid) {
        setError('Impossible de récupérer votre identifiant');
        return;
      }

      // Charger les conversations
      const { conversations: convList } = await getConversations();
      console.log('[Messages] Conversations chargées:', convList.length);

      // Déterminer l'ID utilisateur depuis la première conversation si disponible
      if (convList.length > 0) {
        const firstConv = convList[0];
        let userId: number | null = null;
        if (firstConv.Voyager.firebase_uid === firebaseUid) {
          userId = firstConv.Voyager.id;
        } else if (firstConv.Local.firebase_uid === firebaseUid) {
          userId = firstConv.Local.id;
        }
        if (userId) {
          setCurrentUserId(userId);
          currentUserIdRef.current = userId;
        }
      }

      setConversations(convList);
    } catch (err: any) {
      console.error('[Messages] Erreur chargement:', err);
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

  // Configurer le socket pour la première conversation
  const setupSocket = useCallback((firstConvId: number) => {
    const token = getToken();
    if (!token) return;

    connectSocket(token);
    const socket = getSocket();
    if (!socket) return;

    console.log('[Messages] Socket connecté, rejoindre conversation:', firstConvId);
    socket.emit('join_conversation', { conversation_id: firstConvId });

    // Écouter les nouveaux messages
    socket.on('new_message', (data: { message: Message; conversation_id: number }) => {
      console.log('[Messages] Nouveau message reçu:', data);
      // Recharger les conversations silencieusement
      loadConversations(true, true);
    });

    // Écouter les messages lus
    socket.on('message_read_update', () => {
      console.log('[Messages] Message lu, refresh...');
      loadConversations(true, true);
    });

    return () => {
      socket.off('new_message');
      socket.off('message_read_update');
    };
  }, []);

  // Initialiser l'écran au focus
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
          const firebaseUid = claims?.user_id || claims?.sub;

          if (!firebaseUid) {
            setError('Impossible de récupérer votre identifiant');
            return;
          }

          const { conversations: convList } = await getConversations();
          console.log('[Messages] Conversations chargées:', convList.length);

          // Déterminer l'ID utilisateur
          if (convList.length > 0) {
            const firstConv = convList[0];
            let userId: number | null = null;
            if (firstConv.Voyager.firebase_uid === firebaseUid) {
              userId = firstConv.Voyager.id;
            } else if (firstConv.Local.firebase_uid === firebaseUid) {
              userId = firstConv.Local.id;
            }
            if (userId) {
              setCurrentUserId(userId);
              currentUserIdRef.current = userId;
            }

            // Configurer le socket avec la première conversation
            cleanup = setupSocket(firstConv.id);
          }

          setConversations(convList);
          setLoading(false);
          setRefreshing(false);
        } catch (err: any) {
          console.error('[Messages] Erreur:', err);
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

  // Formater le timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Messages</ThemedText>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Messages</ThemedText>
        </View>
        <View style={styles.centerContent}>
          <MaterialIcons name="error-outline" size={64} color={theme.icon} />
          <ThemedText style={[styles.errorText, { color: theme.icon }]}>{error}</ThemedText>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => loadConversations()}
          >
            <ThemedText style={styles.retryButtonText}>Réessayer</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Messages</ThemedText>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          // Déterminer l'autre utilisateur
          const otherUser = item.voyager_id === currentUserId ? item.Local : item.Voyager;
          const lastMessage = item.Messages?.[0];

          // Calculer initiales
          const initials = otherUser.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          // Compter les messages non lus
          const unreadCount = item.Messages?.filter(
            (msg) => !msg.read && msg.user_id !== currentUserId
          ).length || 0;

          return (
            <Pressable
              style={[styles.conversationItem, { borderBottomColor: theme.border }]}
              onPress={() => handleOpenConversation(item.id)}
            >
              <View style={styles.avatarContainer}>
                {otherUser.image_url ? (
                  <Image source={{ uri: otherUser.image_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                    <ThemedText style={styles.initials}>{initials}</ThemedText>
                  </View>
                )}
                {unreadCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                    <ThemedText style={styles.badgeText}>{unreadCount}</ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <ThemedText style={styles.userName} numberOfLines={1}>
                    {otherUser.name}
                  </ThemedText>
                  {lastMessage && (
                    <ThemedText style={[styles.timestamp, { color: theme.icon }]}>
                      {formatTimestamp(lastMessage.createdAt)}
                    </ThemedText>
                  )}
                </View>

                {lastMessage ? (
                  <View style={styles.lastMessageContainer}>
                    <ThemedText
                      style={[
                        styles.lastMessage,
                        { color: theme.icon },
                        unreadCount > 0 && styles.unreadMessage,
                      ]}
                      numberOfLines={1}
                    >
                      {lastMessage.user_id === currentUserId && 'Vous: '}
                      {lastMessage.attachment ? '📷 Photo' : lastMessage.content}
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText style={[styles.lastMessage, { color: theme.icon }]}>
                    Aucun message
                  </ThemedText>
                )}
              </View>

              <MaterialIcons name="chevron-right" size={24} color={theme.icon} />
            </Pressable>
          );
        }}
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
            <MaterialIcons name="chat-bubble-outline" size={64} color={theme.icon} />
            <ThemedText style={[styles.emptyText, { color: theme.icon }]}>
              Aucune conversation
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: theme.icon }]}>
              Commencez une conversation en visitant le profil d'un utilisateur
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
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
  listContent: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 20,
  },
  conversationContent: {
    flex: 1,
    gap: 4,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
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
