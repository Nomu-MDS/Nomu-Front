import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { setToken } from '@/lib/session';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const formValid = emailValid && password.length >= 6;

  const handleLogin = async () => {
    if (!formValid || isLoading) return;

    setIsLoading(true);
    try {
      console.log('[Login] Connexion en cours...');
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Email ou mot de passe incorrect');
      }

      const data = await response.json();
      const token = data.idToken || data.token || data.access_token;

      if (!token) {
        throw new Error('Token manquant dans la réponse');
      }

      await setToken(token);
      console.log('[Login] Connexion réussie');
      router.replace('/profile');

    } catch (err: any) {
      console.error('[Login] Erreur:', err);
      Alert.alert('Connexion échouée', err.message || 'Veuillez réessayer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        {/* Titre */}
        <View style={styles.titleSection}>
          <ThemedText type="title" style={styles.title}>
            Bon retour ! 👋
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.icon }]}>
            Connectez-vous pour retrouver vos recommandations Nomu
          </ThemedText>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="email@exemple.com"
            value={email}
            onChangeText={setEmail}
            type="email"
            autoCapitalize="none"
            autoCorrect={false}
            helperText={email.length > 0 && !emailValid ? 'Entrez un email valide' : undefined}
          />
          <Input
            label="Mot de passe"
            placeholder="********"
            value={password}
            onChangeText={setPassword}
            type="password"
            helperText={password.length > 0 && password.length < 6 ? 'Minimum 6 caractères' : undefined}
          />

          <Pressable style={styles.forgotPassword} hitSlop={8}>
            <ThemedText style={[styles.forgotPasswordText, { color: theme.primary }]}>
              Mot de passe oublié ?
            </ThemedText>
          </Pressable>
        </View>

        {/* Bouton connexion */}
        <View style={styles.actions}>
          <Button
            label={isLoading ? 'Connexion...' : 'Se connecter'}
            onPress={handleLogin}
            disabled={!formValid || isLoading}
          />
        </View>

        {/* Séparateur */}
        <View style={styles.separatorRow}>
          <View style={[styles.separatorLine, { backgroundColor: theme.border }]} />
          <ThemedText style={[styles.separatorText, { color: theme.icon }]}>ou</ThemedText>
          <View style={[styles.separatorLine, { backgroundColor: theme.border }]} />
        </View>

        {/* Lien inscription */}
        <View style={styles.footer}>
          <ThemedText style={{ color: theme.icon }}>
            Pas encore de compte ?
          </ThemedText>
          <Link href="/signup" asChild>
            <Pressable hitSlop={8}>
              <ThemedText style={[styles.signupLink, { color: theme.primary }]}>
                Créer un compte
              </ThemedText>
            </Pressable>
          </Link>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  titleSection: {
    gap: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  form: {
    gap: 16,
    marginTop: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    marginTop: 8,
  },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  signupLink: {
    fontSize: 15,
    fontWeight: '600',
  },
});
