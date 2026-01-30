import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { FilterBadge } from '@/components/ui/filter-badge';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { setToken } from '@/lib/session';

// Type pour les intérêts du backend
interface Interest {
  id: number;
  name: string;
  icon: string | null;
  is_active: boolean;
}

export default function SignupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedInterestIds, setSelectedInterestIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Intérêts chargés depuis l'API
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loadingInterests, setLoadingInterests] = useState(true);

  // Charger les intérêts au montage
  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/interests`);
        if (response.ok) {
          const data = await response.json();
          setInterests(data);
        }
      } catch (err) {
        console.error('Erreur chargement intérêts:', err);
      } finally {
        setLoadingInterests(false);
      }
    };
    fetchInterests();
  }, []);

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const firstNameValid = firstName.trim().length >= 2;
  const lastNameValid = lastName.trim().length >= 2;
  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordValid = password.length >= 6;

  const step1Valid =
    emailValid &&
    passwordValid &&
    passwordConfirm.length > 0 &&
    !passwordMismatch &&
    firstNameValid &&
    lastNameValid;

  const step2Valid = avatarUrl.trim().length > 0;
  const step3Valid = selectedInterestIds.length > 0;

  const progress = useMemo(() => (step / totalSteps) * 100, [step, totalSteps]);

  const toggleInterest = (interestId: number) => {
    setSelectedInterestIds((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId],
    );
  };

  const pickImageFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', 'Autorisez l’accès à la galerie pour choisir une photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setAvatarUrl(result.assets[0]?.uri ?? '');
    }
  };

  const pickImageFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', 'Autorisez l’accès à la caméra pour prendre une photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setAvatarUrl(result.assets[0]?.uri ?? '');
    }
  };

  const pickImage = () => {
    Alert.alert('Ajouter une photo', 'Choisissez une source', [
      { text: 'Appareil photo', onPress: pickImageFromCamera },
      { text: 'Galerie', onPress: pickImageFromLibrary },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const goNext = () => {
    if (step === 1 && !step1Valid) return;
    if (step === 2 && !step2Valid) return;
    setStep((prev) => Math.min(totalSteps, prev + 1));
  };

  const goBack = () => setStep((prev) => Math.max(1, prev - 1));

  const confirmExit = () => {
    Alert.alert(
      'Quitter l’inscription ?',
      'Vous allez revenir à l’écran précédent.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: () => router.back() },
      ],
    );
  };

  const handleTopBack = () => {
    if (step === 1) {
      confirmExit();
      return;
    }

    goBack();
  };

  const handleSubmit = async () => {
    if (!step3Valid || isSubmitting) return;

    setIsSubmitting(true);
    const trimmedEmail = email.trim().toLowerCase();
    
    try {
      // 1. Créer l'utilisateur via /auth/signup
      const signupResponse = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${firstName.trim()} ${lastName.trim()}`,
          email: trimmedEmail,
          password,
          is_searchable: true, // Visible par défaut
        }),
      });

      if (!signupResponse.ok) {
        const errorData = await signupResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la création du compte');
      }

      const signupData = await signupResponse.json();
      console.log('[Signup] Compte créé:', signupData.user?.email);

      // 2. Auto-login pour obtenir un idToken valide
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      if (!loginResponse.ok) {
        throw new Error('Compte créé mais erreur lors de la connexion automatique');
      }

      const loginData = await loginResponse.json();
      const token = loginData.token || loginData.idToken || loginData.access_token;

      if (!token) {
        throw new Error('Token manquant dans la réponse de login');
      }

      await setToken(token);
      console.log('[Signup] Auto-login réussi, token stocké');

      // 3. Mettre à jour le profil avec les intérêts sélectionnés
      if (selectedInterestIds.length > 0) {
        try {
          const profileResponse = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              interest_ids: selectedInterestIds,
            }),
          });

          if (profileResponse.ok) {
            console.log('[Signup] Profil mis à jour avec les intérêts');
          } else {
            console.warn('[Signup] Erreur mise à jour profil (non bloquant)');
          }
        } catch (profileErr) {
          console.warn('[Signup] Erreur mise à jour profil:', profileErr);
          // Non bloquant, on continue
        }
      }

      // 4. Rediriger vers le profil
      router.replace('/profile');

    } catch (err: any) {
      console.error('[Signup] Erreur:', err);
      Alert.alert('Erreur', err.message || 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            onPress={handleTopBack}
            hitSlop={12}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back-ios" size={18} color={theme.text} />
          </Pressable>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: theme.primary },
              ]}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            onPress={confirmExit}
            hitSlop={12}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={20} color={theme.text} />
          </Pressable>
        </View>

        <ThemedText type="title" style={styles.title}>
          Création de compte
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Étape {step} sur {totalSteps}
        </ThemedText>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 1 ? (
            <View style={styles.section}>
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
                label="Prénom"
                placeholder="Votre prénom"
                value={firstName}
                onChangeText={setFirstName}
                helperText={firstName.length > 0 && !firstNameValid ? 'Minimum 2 lettres' : undefined}
              />
              <Input
                label="Nom"
                placeholder="Votre nom"
                value={lastName}
                onChangeText={setLastName}
                helperText={lastName.length > 0 && !lastNameValid ? 'Minimum 2 lettres' : undefined}
              />
              <Input
                label="Mot de passe"
                placeholder="********"
                value={password}
                onChangeText={setPassword}
                type="password"
                helperText={
                  password.length > 0 && !passwordValid
                    ? 'Minimum 6 caractères'
                    : passwordMismatch
                      ? 'Les mots de passe doivent correspondre'
                      : undefined
                }
              />
              <Input
                label="Confirmer le mot de passe"
                placeholder="********"
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                type="password"
                helperText={passwordMismatch ? 'Les mots de passe doivent correspondre' : undefined}
              />
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Photo de profil</ThemedText>
              <Pressable
                style={[styles.avatarTouchable, { borderColor: theme.border }]}
                onPress={pickImage}
              >
                <View style={styles.avatarCircle}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <ThemedText style={styles.avatarPlaceholder}>Ajouter une photo</ThemedText>
                  )}
                </View>
                <View style={[styles.cameraBadge, { backgroundColor: theme.primary }]}> 
                  <MaterialIcons name="photo-camera" size={20} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Choisissez vos centres d'intérêt</ThemedText>
              {loadingInterests ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : interests.length > 0 ? (
                <View style={styles.badgesRow}>
                  {interests.map((interest) => (
                    <FilterBadge
                      key={interest.id}
                      label={interest.name}
                      selected={selectedInterestIds.includes(interest.id)}
                      onPress={() => toggleInterest(interest.id)}
                    />
                  ))}
                </View>
              ) : (
                <ThemedText style={styles.noInterests}>
                  Aucun centre d'intérêt disponible
                </ThemedText>
              )}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.actionsRow}>
          {step < totalSteps ? (
            <Button
              label="Suivant"
              onPress={goNext}
              disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
            />
          ) : (
            <Button
              label={isSubmitting ? 'Création...' : 'Terminer'}
              onPress={handleSubmit}
              disabled={!step3Valid || isSubmitting}
            />
          )}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#F1F2F6',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  closeButton: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  title: {
    marginTop: 4,
  },
  subtitle: {
    opacity: 0.75,
  },
  content: {
    gap: 16,
    paddingBottom: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  avatarTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  avatarCircle: {
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    opacity: 0.7,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  noInterests: {
    opacity: 0.6,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


