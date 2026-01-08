import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { startConversation } from '@/lib/chat-helper';

// User de test depuis les seeds
const LAURA_TEST_USER = {
  name: 'Laura Michel',
  email: 'laura@test.com',
  // L'ID sera trouvé dynamiquement via l'API
};

export default function MessagesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [loading, setLoading] = useState(false);
  const [lauraUserId, setLauraUserId] = useState<number | null>(null);
  const [searchingLaura, setSearchingLaura] = useState(true);

  // Chercher l'ID de Laura au montage
  useEffect(() => {
    async function findLaura() {
      try {
        // Note: Vous devrez peut-être créer un endpoint /users/search?email=laura@test.com
        // Pour l'instant, on va utiliser un ID fixe ou demander à l'utilisateur
        // Option temporaire: utiliser un ID connu des seeds (à ajuster)
        setLauraUserId(2); // Ajustez cet ID selon vos seeds
      } catch (error) {
        console.error('Erreur recherche Laura:', error);
      } finally {
        setSearchingLaura(false);
      }
    }
    findLaura();
  }, []);

  const handleStartConversationWithLaura = async () => {
    if (!lauraUserId) {
      Alert.alert('Erreur', 'Impossible de trouver l\'utilisateur de test');
      return;
    }

    setLoading(true);
    try {
      console.log('[Messages] Création conversation avec Laura (ID:', lauraUserId, ')');
      const conversationId = await startConversation(lauraUserId);
      console.log('[Messages] Conversation créée/récupérée:', conversationId);
      router.push(`/chat/${conversationId}`);
    } catch (error: any) {
      console.error('[Messages] Erreur:', error);

      if (error.message.includes('Only travelers')) {
        Alert.alert(
          'Non autorisé',
          'Seuls les voyageurs peuvent initier des conversations avec les locaux. Assurez-vous d\'être connecté avec un compte voyageur.'
        );
      } else if (error.message.includes('Token manquant')) {
        Alert.alert('Non connecté', 'Vous devez être connecté pour envoyer des messages');
        router.push('/login');
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de démarrer la conversation');
      }
    } finally {
      setLoading(false);
    }
  };

  if (searchingLaura) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ color: theme.icon }}>Chargement...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Messages
        </ThemedText>

        <View style={[styles.testCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Test de la messagerie
          </ThemedText>

          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.initials}>LM</ThemedText>
            </View>
            <View style={styles.userDetails}>
              <ThemedText style={styles.userName}>{LAURA_TEST_USER.name}</ThemedText>
              <ThemedText style={[styles.userBio, { color: theme.icon }]}>
                Monitrice de plongée • Ajaccio
              </ThemedText>
            </View>
          </View>

          <ThemedText style={[styles.instructions, { color: theme.icon }]}>
            Cliquez sur le bouton ci-dessous pour démarrer une conversation de test avec Laura.
          </ThemedText>

          <Button
            label={loading ? 'Chargement...' : 'Envoyer un message à Laura'}
            onPress={handleStartConversationWithLaura}
            disabled={loading || !lauraUserId}
          />

          {!lauraUserId && (
            <ThemedText style={[styles.warning, { color: '#EF4444' }]}>
              User ID non trouvé. Ajustez lauraUserId dans le code selon vos seeds.
            </ThemedText>
          )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.surface + '80', borderColor: theme.border }]}>
          <ThemedText style={[styles.infoText, { color: theme.icon }]}>
            💡 Ceci est un écran de test temporaire. Vos collègues implémenteront la liste complète des conversations.
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    gap: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  testCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
  },
  userBio: {
    fontSize: 14,
  },
  instructions: {
    fontSize: 14,
    lineHeight: 20,
  },
  warning: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
