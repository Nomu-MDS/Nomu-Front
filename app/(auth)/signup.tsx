import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  Image, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  View,
  Text,
  ImageBackground,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';

import { FilterBadge } from '@/components/ui/filter-badge';
import { API_BASE_URL } from '@/constants/config';
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

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedInterestIds, setSelectedInterestIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Intérêts chargés depuis l'API
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loadingInterests, setLoadingInterests] = useState(true);

  const [fontsLoaded] = useFonts({
    'RocaOne-Bold': require('@/assets/fonts/roca/RocaOne-Bold.ttf'),
  });

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
  const usernameValid = username.trim().length >= 2;
  const passwordValid = password.length >= 6;

  const step1Valid = emailValid && usernameValid && passwordValid;
  const step2Valid = true; // Toujours valide, la photo est optionnelle
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
          name: username.trim(),
          email: trimmedEmail,
          password,
          is_searchable: true,
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

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E9E0D0" />
      </View>
    );
  }

  const getBackgroundImage = () => {
    if (step === 1) return require('@/assets/images/register_background.png');
    if (step === 2) return require('@/assets/images/pdp_page.jpg');
    return require('@/assets/images/interets_page.jpg');
  };

  return (
    <ImageBackground
      source={getBackgroundImage()}
      style={styles.screen}
      resizeMode="cover"
      imageStyle={{ transform: [{ translateY: -100 }] }}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,1)']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      >
        <View style={styles.container}>
          {/* Barre de progression en haut */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => step === 1 ? router.back() : setStep(step - 1)}
              hitSlop={12}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back-ios" size={20} color="#E9E0D0" />
            </Pressable>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#E9E0D0" />
            </Pressable>
          </View>

          {/* Contenu avec KeyboardAvoidingView */}
          <KeyboardAvoidingView 
            style={styles.contentWrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={step === 2 ? styles.scrollContentCenter : styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {step === 1 && (
                <View style={styles.formSection}>
                  <Text style={styles.title}>Create an account</Text>
                  
                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.input}
                      placeholder="Email address"
                      placeholderTextColor="rgba(233, 224, 208, 0.5)"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.input}
                      placeholder="Pseudo"
                      placeholderTextColor="rgba(233, 224, 208, 0.5)"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.input}
                      placeholder="Mot de passe"
                      placeholderTextColor="rgba(233, 224, 208, 0.5)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                </View>
              )}

              {step === 2 && (
                <View style={styles.formSection}>
                  <Text style={styles.title}>Create an account</Text>
                  
                  <Pressable
                    style={styles.avatarContainer}
                    onPress={pickImage}
                  >
                    <View style={styles.avatarCircle}>
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarPlaceholder}>Add a photo</Text>
                      )}
                    </View>
                    <View style={styles.cameraBadge}>
                      <MaterialIcons name="photo-camera" size={24} color="#000" />
                    </View>
                  </Pressable>

                  <Pressable 
                    onPress={() => setStep(step + 1)}
                    style={styles.skipButton}
                  >
                    <Text style={styles.skipText}>Skip for now</Text>
                  </Pressable>
                </View>
              )}

              {step === 3 && (
                <View style={styles.formSection}>
                  <Text style={styles.title}>Your Interests</Text>
                  
                  {loadingInterests ? (
                    <ActivityIndicator size="small" color="#E9E0D0" />
                  ) : (
                    <View style={styles.interestsGrid}>
                      {interests.map((interest) => (
                        <FilterBadge
                          key={interest.id}
                          label={interest.name}
                          selected={selectedInterestIds.includes(interest.id)}
                          onPress={() => toggleInterest(interest.id)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Bouton en bas */}
              <Pressable
                style={[
                  styles.button,
                  ((step === 1 && !step1Valid) || 
                   (step === 2 && !step2Valid) || 
                   (step === 3 && !step3Valid) ||
                   isSubmitting) && styles.buttonDisabled
                ]}
                onPress={() => {
                  if (step < totalSteps) {
                    setStep(step + 1);
                  } else {
                    handleSubmit();
                  }
                }}
                disabled={
                  (step === 1 && !step1Valid) || 
                  (step === 2 && !step2Valid) || 
                  (step === 3 && !step3Valid) ||
                  isSubmitting
                }
              >
                <Text style={styles.buttonText}>
                  {step < totalSteps ? 'Next' : isSubmitting ? 'Creating...' : 'Finish'}
                </Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  screen: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
  },
  closeButton: {
    padding: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(70, 94, 138, 0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#465E8A',
  },
  contentWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  scrollContentCenter: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    gap: 16,
  },
  title: {
    fontSize: 36,
    fontFamily: 'RocaOne-Bold',
    fontWeight: '700',
    color: '#E9E0D0',
    marginBottom: 24,
  },
  inputGroup: {
    gap: 0,
  },
  input: {
    backgroundColor: '#3C3C3B69',
    borderWidth: 1.5,
    borderColor: '#465E8A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#E9E0D0',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  avatarCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#465E8A',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    fontSize: 16,
    color: 'rgba(233, 224, 208, 0.6)',
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(233, 224, 208, 0.7)',
    textDecorationLine: 'underline',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 20,
    right: '30%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E9E0D0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  button: {
    backgroundColor: '#E9E0D0',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
});


