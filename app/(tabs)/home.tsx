import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getTokenAsync } from '@/lib/session';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

export default function HomeScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await getTokenAsync();
      setToken(t);
      setLoaded(true);
    })();
  }, []);

  if (!loaded) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Chargement...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Bienvenue sur Nomu</ThemedText>
      {!token ? (
        <>
          <ThemedText>Connectez-vous ou inscrivez-vous pour commencer.</ThemedText>
          <Link href="/login">
            <ThemedText type="link">Se connecter</ThemedText>
          </Link>
          <Link href="/signup">
            <ThemedText type="link">S'inscrire</ThemedText>
          </Link>
        </>
      ) : (
        <Link href="/profile">
          <ThemedText type="link">Aller à mon profil</ThemedText>
        </Link>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
});
