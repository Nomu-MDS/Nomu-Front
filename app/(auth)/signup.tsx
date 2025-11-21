import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSignup = () => {
    // TODO: Ajouter la logique d'inscription avec l'API backend
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Password:', password);
    router.push('/login'); // Rediriger vers la page de connexion après inscription
  };

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>Créer un compte</ThemedText>
        <ThemedText style={[styles.subtitle, styles.textDark]}>Rejoignez Nomu pour découvrir et partager vos lieux favoris.</ThemedText>

        <TextInput
          style={styles.input}
          placeholder="Nom"
          value={name}
          onChangeText={setName}
        />
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

        <Pressable style={styles.primaryButton} onPress={handleSignup}>
          <ThemedText style={styles.primaryButtonText}>S'inscrire</ThemedText>
        </Pressable>

        <View style={styles.footerRow}>
          <ThemedText style={styles.textDark}>Déjà un compte ?</ThemedText>
          <ThemedText type="link" style={styles.textDark}> Connexion</ThemedText>
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


