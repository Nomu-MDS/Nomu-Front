import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/config';
import { decodeJwt } from '@/lib/jwt';
import { clearToken, getToken } from '@/lib/session';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

interface User {
  name: string;
  email: string;
  role: string;
}

export default function MeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
          if (response.status === 404) {
            console.warn('[Me] 404 /users/me -> fallback sur claims du token.');
            const rawToken = getToken();
            const claims = rawToken ? decodeJwt(rawToken) : null;
            if (claims) {
              // Normaliser quelques champs
              const fallbackUser: User = {
                name: (claims.name as string) || 'Utilisateur',
                email: (claims.email as string) || '—',
                role: (claims.role as string) || 'user',
              };
              setUser(fallbackUser);
              return;
            }
          }
          throw new Error('Erreur lors de la récupération des données utilisateur');
        }
      } catch (error) {
        console.error('Erreur réseau ou API:', error);
        router.push('/login'); // Rediriger vers la page de connexion en cas d'erreur
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </ThemedView>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Mon Profil</ThemedText>
      <ThemedText>Nom : {user.name}</ThemedText>
      <ThemedText>Email : {user.email}</ThemedText>
      <ThemedText>Rôle : {user.role}</ThemedText>

      <Pressable
        style={styles.logoutButton}
        onPress={async () => {
          await clearToken();
          router.replace('/login');
        }}>
        <ThemedText style={styles.logoutText}>Se déconnecter</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  logoutButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#ee4444',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
});


