import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { startConversation } from '@/lib/chat-helper';
import { getToken } from '@/lib/session';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface Interest {
  id: number;
  name: string;
}

interface Profile {
  id: number;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  biography: string | null;
  country: string | null;
  city: string | null;
  image_url: string | null;
  interests?: Interest[];
}

interface UserProfileResponse {
  id: number;
  profile: Profile;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!id) {
        setError('ID utilisateur manquant');
        setLoading(false);
        return;
      }

      // Validation de l'ID (doit être un entier positif)
      const userId = parseInt(id, 10);
      if (isNaN(userId) || userId <= 0) {
        setError('ID utilisateur invalide');
        setLoading(false);
        return;
      }

      try {
        const token = getToken();
        if (!token) {
          setError('Vous devez être connecté pour voir ce profil');
          setLoading(false);
          return;
        }

        const url = `${API_BASE_URL}/users/${userId}`;
        console.log('[UserProfile] GET ->', url);
        
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log('/api/users/:id status:', response.status);

        if (response.ok) {
          const data: UserProfileResponse = await response.json();
          console.log('/api/users/:id payload:', data);
          setUserProfile(data);
          setError(null);
        } else {
          // Gestion des codes d'erreur selon la documentation
          const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
          
          if (response.status === 400) {
            setError('ID utilisateur invalide');
          } else if (response.status === 403) {
            setError('Ce profil n\'est pas accessible (privé ou compte inactif)');
          } else if (response.status === 404) {
            setError('Utilisateur non trouvé');
          } else if (response.status === 500) {
            setError('Erreur serveur, veuillez réessayer plus tard');
          } else {
            setError(errorData.error || 'Erreur lors de la récupération du profil');
          }
        }
      } catch (err) {
        console.error('Erreur réseau ou API:', err);
        setError('Erreur de connexion au serveur');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [id]);

  const handleGoBack = () => {
    router.back();
  };

  const handleContactUser = async () => {
    if (!userProfile) return;

    setContactLoading(true);
    try {
      console.log('[UserProfile] Démarrage conversation avec user ID:', userProfile.id);
      const conversationId = await startConversation(userProfile.id);
      console.log('[UserProfile] Conversation créée/récupérée:', conversationId);
      router.push(`/chat/${conversationId}`);
    } catch (error: any) {
      console.error('[UserProfile] Erreur:', error);

      if (error.message.includes('Only travelers')) {
        Alert.alert(
          'Non autorisé',
          'Seuls les voyageurs peuvent initier des conversations avec les locaux.'
        );
      } else if (error.message.includes('Token manquant')) {
        Alert.alert('Non connecté', 'Vous devez être connecté pour envoyer des messages');
        router.push('/login');
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de démarrer la conversation');
      }
    } finally {
      setContactLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={theme.icon} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable
            style={[styles.backButton, { backgroundColor: theme.primary }]}
            onPress={handleGoBack}
          >
            <ThemedText style={styles.backButtonText}>Retour</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (!userProfile) {
    return null;
  }

  const { profile } = userProfile;
  const displayName = profile.first_name && profile.last_name 
    ? `${profile.first_name} ${profile.last_name}` 
    : 'Utilisateur';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ThemedView style={styles.container}>
      {/* Header avec bouton retour */}
      <View style={styles.topBar}>
        <Pressable onPress={handleGoBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">Profil</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec photo */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {profile.image_url ? (
              <Image source={{ uri: profile.image_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.initials}>{initials}</ThemedText>
              </View>
            )}
          </View>

          <ThemedText type="title" style={styles.name}>{displayName}</ThemedText>
        </View>

        {/* Informations du profil */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle" style={styles.cardTitle}>Informations</ThemedText>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={20} color={theme.icon} />
            <View style={styles.infoContent}>
              <ThemedText style={[styles.infoLabel, { color: theme.icon }]}>Nom complet</ThemedText>
              <ThemedText style={styles.infoValue}>{displayName}</ThemedText>
            </View>
          </View>

          {(profile.city || profile.country) && (
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={20} color={theme.icon} />
              <View style={styles.infoContent}>
                <ThemedText style={[styles.infoLabel, { color: theme.icon }]}>Localisation</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {profile.city && profile.country 
                    ? `${profile.city}, ${profile.country}` 
                    : profile.city || profile.country}
                </ThemedText>
              </View>
            </View>
          )}

          {profile.biography && (
            <View style={styles.infoRow}>
              <MaterialIcons name="info-outline" size={20} color={theme.icon} />
              <View style={styles.infoContent}>
                <ThemedText style={[styles.infoLabel, { color: theme.icon }]}>Bio</ThemedText>
                <ThemedText style={styles.infoValue}>{profile.biography}</ThemedText>
              </View>
            </View>
          )}

          {profile.age && (
            <View style={styles.infoRow}>
              <MaterialIcons name="cake" size={20} color={theme.icon} />
              <View style={styles.infoContent}>
                <ThemedText style={[styles.infoLabel, { color: theme.icon }]}>Âge</ThemedText>
                <ThemedText style={styles.infoValue}>{profile.age} ans</ThemedText>
              </View>
            </View>
          )}
        </View>

        {/* Centres d'intérêt */}
        {profile.interests && profile.interests.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle" style={styles.cardTitle}>Centres d'intérêt</ThemedText>
            </View>
            <View style={styles.interestsContainer}>
              {profile.interests.map((interest) => (
                <View
                  key={interest.id}
                  style={[styles.interestBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}
                >
                  <ThemedText style={[styles.interestText, { color: theme.primary }]}>
                    {interest.name}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bouton Contacter */}
        <View style={styles.contactButtonContainer}>
          <Button
            label={contactLoading ? 'Chargement...' : 'Envoyer un message'}
            onPress={handleContactUser}
            disabled={contactLoading}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  interestText: {
    fontSize: 13,
    fontWeight: '500',
  },
  errorContainer: {
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
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  contactButtonContainer: {
    marginTop: 8,
  },
});
