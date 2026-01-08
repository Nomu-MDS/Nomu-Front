import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { decodeJwt } from '@/lib/jwt';
import { clearToken, getToken } from '@/lib/session';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface Profile {
  id: number;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  biography: string | null;
  country: string | null;
  city: string | null;
  image_url: string | null;
  is_searchable: boolean;
  Interests?: { id: number; name: string; icon: string | null }[];
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  bio: string | null;
  location: string | null;
  Profile?: Profile;
}

export default function MeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = getToken();
        console.log('API_BASE_URL:', API_BASE_URL);
        console.log('Token present for /users/me:', !!token);
        if (!token) {
          router.push('/login');
          return;
        }
        const url = `${API_BASE_URL}/users/me`;
        console.log('[Me] GET ->', url);
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log('/users/me status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('/users/me payload:', data);
          setUser(data);
        } else {
          if (response.status === 401) {
            // Token expiré ou invalide - redirection silencieuse
            console.log('[Me] Token expiré, redirection vers login');
            await clearToken();
            router.replace('/login');
            return;
          }
          if (response.status === 404) {
            console.warn('[Me] 404 /users/me -> fallback sur claims du token.');
            const rawToken = getToken();
            const claims = rawToken ? decodeJwt(rawToken) : null;
            if (claims) {
              const fallbackUser: User = {
                id: 0,
                name: (claims.name as string) || 'Utilisateur',
                email: (claims.email as string) || '—',
                role: (claims.role as string) || 'user',
                bio: null,
                location: null,
              };
              setUser(fallbackUser);
              return;
            }
          }
          // Autres erreurs - redirection silencieuse
          await clearToken();
          router.replace('/login');
          return;
        }
      } catch (error) {
        console.log('[Me] Erreur réseau, redirection vers login');
        await clearToken();
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await clearToken();
    router.replace('/login');
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!user) {
    return null;
  }

  const profile = user.Profile;
  const displayName = profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}` 
    : user.name;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec photo et bouton éditer */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {profile?.image_url ? (
              <Image source={{ uri: profile.image_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.initials}>{initials}</ThemedText>
              </View>
            )}
            <Pressable
              style={[styles.editBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handleEditProfile}
              hitSlop={8}
            >
              <MaterialIcons name="edit" size={16} color={theme.text} />
            </Pressable>
          </View>

          <ThemedText type="title" style={styles.name}>{displayName}</ThemedText>
          <ThemedText style={[styles.email, { color: theme.icon }]}>{user.email}</ThemedText>
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

          {(profile?.city || profile?.country || user.location) && (
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={20} color={theme.icon} />
              <View style={styles.infoContent}>
                <ThemedText style={[styles.infoLabel, { color: theme.icon }]}>Localisation</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {profile?.city && profile?.country 
                    ? `${profile.city}, ${profile.country}` 
                    : profile?.city || profile?.country || user.location}
                </ThemedText>
              </View>
            </View>
          )}

          {(profile?.biography || user.bio) && (
            <View style={styles.infoRow}>
              <MaterialIcons name="info-outline" size={20} color={theme.icon} />
              <View style={styles.infoContent}>
                <ThemedText style={[styles.infoLabel, { color: theme.icon }]}>Bio</ThemedText>
                <ThemedText style={styles.infoValue}>{profile?.biography || user.bio}</ThemedText>
              </View>
            </View>
          )}

          {profile?.age && (
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
        {profile?.Interests && profile.Interests.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle" style={styles.cardTitle}>Centres d'intérêt</ThemedText>
            </View>
            <View style={styles.interestsContainer}>
              {profile.Interests.map((interest) => (
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

        {/* Statut de visibilité */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle" style={styles.cardTitle}>Visibilité</ThemedText>
          </View>
          <View style={styles.visibilityRow}>
            <MaterialIcons 
              name={profile?.is_searchable ? 'visibility' : 'visibility-off'} 
              size={20} 
              color={profile?.is_searchable ? theme.primary : theme.icon} 
            />
            <ThemedText style={styles.visibilityText}>
              {profile?.is_searchable 
                ? 'Votre profil est visible dans les recherches' 
                : 'Votre profil est masqué des recherches'}
            </ThemedText>
          </View>
        </View>

        {/* Bouton déconnexion */}
        <Pressable
          style={[styles.logoutButton, { borderColor: '#EF4444' }]}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={20} color="#EF4444" />
          <ThemedText style={styles.logoutText}>Se déconnecter</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
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
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
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
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visibilityText: {
    fontSize: 14,
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 15,
  },
});


