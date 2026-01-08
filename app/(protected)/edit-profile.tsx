import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getToken } from '@/lib/session';

interface Interest {
  id: number;
  name: string;
  icon: string | null;
  is_active: boolean;
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
  is_searchable: boolean;
  Interests?: Interest[];
}

interface User {
  id: number;
  name: string;
  email: string;
  bio: string | null;
  location: string | null;
  Profile?: Profile;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // États du formulaire
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [biography, setBiography] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [age, setAge] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSearchable, setIsSearchable] = useState(true);
  const [selectedInterestIds, setSelectedInterestIds] = useState<number[]>([]);

  // États de chargement
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interests, setInterests] = useState<Interest[]>([]);

  // Charger les données utilisateur et les intérêts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getToken();
        if (!token) {
          router.replace('/login');
          return;
        }

        // Charger les données utilisateur
        const userResponse = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (userResponse.ok) {
          const userData: User = await userResponse.json();
          const profile = userData.Profile;

          // Pré-remplir le formulaire
          if (profile?.first_name) setFirstName(profile.first_name);
          if (profile?.last_name) setLastName(profile.last_name);
          if (profile?.biography) setBiography(profile.biography);
          if (profile?.city) setCity(profile.city);
          if (profile?.country) setCountry(profile.country);
          if (profile?.age) setAge(profile.age.toString());
          if (profile?.image_url) setImageUrl(profile.image_url);
          if (profile?.is_searchable !== undefined) setIsSearchable(profile.is_searchable);
          if (profile?.Interests) {
            setSelectedInterestIds(profile.Interests.map((i) => i.id));
          }

          // Fallback sur les champs User si Profile vide
          if (!profile?.first_name && !profile?.last_name && userData.name) {
            const nameParts = userData.name.split(' ');
            setFirstName(nameParts[0] || '');
            setLastName(nameParts.slice(1).join(' ') || '');
          }
          if (!profile?.biography && userData.bio) {
            setBiography(userData.bio);
          }
        }

        // Charger les intérêts disponibles
        const interestsResponse = await fetch(`${API_BASE_URL}/interests`);
        if (interestsResponse.ok) {
          const interestsData = await interestsResponse.json();
          setInterests(interestsData);
        }
      } catch (error) {
        console.error('Erreur chargement données:', error);
        Alert.alert('Erreur', 'Impossible de charger vos données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const toggleInterest = (interestId: number) => {
    setSelectedInterestIds((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId],
    );
  };

  const pickImageFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour choisir une photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setImageUrl(result.assets[0]?.uri ?? '');
    }
  };

  const pickImageFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à la caméra pour prendre une photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setImageUrl(result.assets[0]?.uri ?? '');
    }
  };

  const pickImage = () => {
    Alert.alert('Modifier la photo', 'Choisissez une source', [
      { text: 'Appareil photo', onPress: pickImageFromCamera },
      { text: 'Galerie', onPress: pickImageFromLibrary },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);
    try {
      const token = getToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      const body: Record<string, any> = {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        biography: biography.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        age: age ? parseInt(age, 10) : null,
        is_searchable: isSearchable,
        interest_ids: selectedInterestIds,
      };

      // Note: Pour l'image, il faudrait un upload vers un service de stockage
      // Pour l'instant on stocke l'URL locale (fonctionne en dev)
      if (imageUrl && !imageUrl.startsWith('http')) {
        // Image locale - dans un vrai cas, il faudrait l'uploader
        body.image_url = imageUrl;
      } else if (imageUrl) {
        body.image_url = imageUrl;
      }

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      Alert.alert('Succès', 'Votre profil a été mis à jour', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', error.message || 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '?';

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerButton}>
            <MaterialIcons name="close" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Modifier le profil
          </ThemedText>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo de profil */}
          <View style={styles.avatarSection}>
            <Pressable style={styles.avatarContainer} onPress={pickImage}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                  <ThemedText style={styles.initials}>{initials}</ThemedText>
                </View>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: theme.primary }]}>
                <MaterialIcons name="photo-camera" size={18} color="#FFFFFF" />
              </View>
            </Pressable>
            <Pressable onPress={pickImage}>
              <ThemedText style={[styles.changePhotoText, { color: theme.primary }]}>
                Changer la photo
              </ThemedText>
            </Pressable>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="Prénom"
                  placeholder="Votre prénom"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="Nom"
                  placeholder="Votre nom"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            <Input
              label="Bio"
              placeholder="Parlez de vous..."
              value={biography}
              onChangeText={setBiography}
              multiline
              numberOfLines={3}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="Ville"
                  placeholder="Votre ville"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="Pays"
                  placeholder="Votre pays"
                  value={country}
                  onChangeText={setCountry}
                />
              </View>
            </View>

            <Input
              label="Âge"
              placeholder="Votre âge"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
            />
          </View>

          {/* Centres d'intérêt */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Centres d'intérêt
            </ThemedText>
            {interests.length > 0 ? (
              <View style={styles.interestsContainer}>
                {interests.map((interest) => {
                  const isSelected = selectedInterestIds.includes(interest.id);
                  return (
                    <Pressable
                      key={interest.id}
                      style={[
                        styles.interestBadge,
                        {
                          backgroundColor: isSelected ? theme.primary : 'transparent',
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => toggleInterest(interest.id)}
                    >
                      <ThemedText
                        style={[
                          styles.interestText,
                          { color: isSelected ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {interest.name}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <ThemedText style={styles.noInterests}>Aucun centre d'intérêt disponible</ThemedText>
            )}
          </View>

          {/* Visibilité */}
          <View style={[styles.visibilityCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.visibilityContent}>
              <MaterialIcons
                name={isSearchable ? 'visibility' : 'visibility-off'}
                size={24}
                color={isSearchable ? theme.primary : theme.icon}
              />
              <View style={styles.visibilityText}>
                <ThemedText style={styles.visibilityTitle}>Profil visible</ThemedText>
                <ThemedText style={[styles.visibilityDesc, { color: theme.icon }]}>
                  Apparaître dans les résultats de recherche
                </ThemedText>
              </View>
            </View>
            <Switch
              value={isSearchable}
              onValueChange={setIsSearchable}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={isSearchable ? theme.primary : '#f4f3f4'}
            />
          </View>

          {/* Bouton sauvegarder */}
          <View style={styles.saveButtonContainer}>
            <Button
              label={saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              onPress={handleSave}
              disabled={saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
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
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  changePhotoText: {
    fontSize: 15,
    fontWeight: '600',
  },
  form: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  interestText: {
    fontSize: 14,
    fontWeight: '500',
  },
  noInterests: {
    opacity: 0.6,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  visibilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  visibilityText: {
    flex: 1,
    gap: 2,
  },
  visibilityTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  visibilityDesc: {
    fontSize: 13,
  },
  saveButtonContainer: {
    marginTop: 8,
  },
});
