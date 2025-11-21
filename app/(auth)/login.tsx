import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/config';
import { setToken } from '@/lib/session';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      console.log('[Login] Utilisation API_BASE_URL =', API_BASE_URL);
      const url = `${API_BASE_URL}/auth/login`;
      console.log('[Login] Requête POST ->', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      console.log('Login status:', response.status);
      console.log('Login headers content-type:', response.headers.get('content-type'));
      if (!response.ok) {
        const text = await response.text();
        console.log('Login error body:', text);
        throw new Error(text || 'Erreur de connexion');
      }
      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }
      }
      console.log('Login response payload:', data);
      const authHeader = response.headers.get('authorization') || response.headers.get('Authorization') || '';
      const headerToken = authHeader?.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7)
        : undefined;
      const receivedToken =
        headerToken ||
        data?.token ||
        data?.idToken ||
        data?.access_token ||
        data?.jwt ||
        data?.data?.token ||
        data?.data?.idToken ||
        data?.data?.access_token;
      if (!receivedToken) {
        throw new Error('Token manquant dans la réponse');
      }
      await setToken(receivedToken);
      console.log('Stored token (idToken/access_token) persisted:', !!receivedToken);
      // Rediriger vers l'écran profil dans les tabs pour conserver la barre de navigation
      router.push('/profile');
    } catch (err: any) {
      console.error('Login error:', err);
      Alert.alert('Connexion échouée', err?.message || 'Veuillez réessayer');
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>Se connecter</ThemedText>
        <ThemedText style={[styles.subtitle, styles.textDark]}>Retrouvez vos recommandations Nomu en quelques secondes.</ThemedText>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable style={styles.primaryButton} onPress={handleLogin}>
          <ThemedText style={styles.primaryButtonText}>Continuer</ThemedText>
        </Pressable>

        <View style={styles.footerRow}>
          <ThemedText style={styles.textDark}>Pas encore de compte ?</ThemedText>
          <ThemedText type="link" style={styles.textDark}> Inscription</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f7fb',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    gap: 12,
  },
  title: {
    color: '#000000',
  },
  subtitle: {
    opacity: 0.7,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#d0d4dd',
    borderRadius: 12,
    backgroundColor: '#f9fafc',
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#111827',
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  footerRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  textDark: {
    color: '#000000',
  },
});


