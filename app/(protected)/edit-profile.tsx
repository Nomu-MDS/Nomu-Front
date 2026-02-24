import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useFonts } from 'expo-font';
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
  Text,
  View,
} from 'react-native';

import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/constants/config';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getToken } from '@/lib/session';

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();

  const [fontsLoaded] = useFonts({
    'RocaOne-Rg': require('@/assets/fonts/roca/RocaOne-Rg.ttf'),
    'RocaOne-Bold': require('@/assets/fonts/roca/RocaOne-Bold.ttf'),
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [biography, setBiography] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [age, setAge] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSearchable, setIsSearchable] = useState(true);
  const [selectedInterestIds, setSelectedInterestIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interests, setInterests] = useState<Interest[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        if (!token) { router.replace('/login'); return; }

        const [userRes, interestsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/interests`),
        ]);

        if (userRes.ok) {
          const userData: User = await userRes.json();
          const p = userData.Profile;

          if (p?.first_name) setFirstName(p.first_name);
          if (p?.last_name) setLastName(p.last_name);
          if (p?.biography) setBiography(p.biography);
          if (p?.city) setCity(p.city);
          if (p?.country) setCountry(p.country);
          if (p?.age) setAge(p.age.toString());
          if (p?.image_url) setImageUrl(p.image_url);
          if (p?.is_searchable !== undefined) setIsSearchable(p.is_searchable);
          if (p?.Interests) setSelectedInterestIds(p.Interests.map((i) => i.id));

          if (!p?.first_name && !p?.last_name && userData.name) {
            const parts = userData.name.split(' ');
            setFirstName(parts[0] || '');
            setLastName(parts.slice(1).join(' ') || '');
          }
          if (!p?.biography && userData.bio) setBiography(userData.bio);
        }

        if (interestsRes.ok) setInterests(await interestsRes.json());
      } catch {
        Alert.alert('Erreur', 'Impossible de charger vos données');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const toggleInterest = (id: number) => {
    setSelectedInterestIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const pickImage = () => {
    Alert.alert('Modifier la photo', 'Choisissez une source', [
      {
        text: 'Appareil photo', onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!r.canceled && r.assets?.[0]) setImageUrl(r.assets[0].uri ?? '');
        },
      },
      {
        text: 'Galerie', onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) return;
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!r.canceled && r.assets?.[0]) setImageUrl(r.assets[0].uri ?? '');
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const token = getToken();
      if (!token) { router.replace('/login'); return; }

      const body: Record<string, any> = {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        biography: biography.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        age: age ? parseInt(age, 10) : null,
        is_searchable: isSearchable,
        interest_ids: selectedInterestIds,
        image_url: imageUrl || null,
      };

      const res = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de la mise à jour');
      }

      Alert.alert('Profil mis à jour', 'Vos modifications ont été enregistrées.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '?';

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading || !fontsLoaded) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.beige, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: colors.beige }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={22} color={colors.secondary} />
          </Pressable>
          <Text style={[styles.pageTitle, fontsLoaded ? { fontFamily: FontFamily.rocaBold } : {}, { color: colors.secondary }]}>
            Modifier le profil
          </Text>
          <View style={{ width: 22 }} />
        </View>

        {/* ── White card ──────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Avatar */}
            <View style={styles.avatarSection}>
              <Pressable style={[styles.avatarWrapper, shadows.md]} onPress={pickImage}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.initials, { fontFamily: FontFamily.rocaBold }]}>{initials}</Text>
                  </View>
                )}
                <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
                  <MaterialIcons name="photo-camera" size={16} color="#FFFFFF" />
                </View>
              </Pressable>
              <Pressable onPress={pickImage} hitSlop={8}>
                <Text style={[styles.changePhoto, { color: colors.secondary, fontFamily: FontFamily.mono }]}>
                  Changer la photo
                </Text>
              </Pressable>
            </View>

            {/* ── Identité ── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {}, { color: colors.navy }]}>
                Identité
              </Text>
              <View style={styles.row}>
                <View style={styles.half}>
                  <Input label="Prénom" placeholder="Votre prénom" value={firstName} onChangeText={setFirstName} />
                </View>
                <View style={styles.half}>
                  <Input label="Nom" placeholder="Votre nom" value={lastName} onChangeText={setLastName} />
                </View>
              </View>
              <Input
                label="Âge"
                placeholder="Votre âge"
                value={age}
                onChangeText={setAge}
                type="number"
              />
            </View>

            {/* ── Localisation ── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {}, { color: colors.navy }]}>
                Localisation
              </Text>
              <View style={styles.row}>
                <View style={styles.half}>
                  <Input label="Ville" placeholder="Votre ville" value={city} onChangeText={setCity} />
                </View>
                <View style={styles.half}>
                  <Input label="Pays" placeholder="Votre pays" value={country} onChangeText={setCountry} />
                </View>
              </View>
            </View>

            {/* ── À propos ── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {}, { color: colors.navy }]}>
                À propos
              </Text>
              <Input
                label="Bio"
                placeholder="Parlez de vous, vos voyages, vos passions…"
                value={biography}
                onChangeText={setBiography}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* ── Intérêts ── */}
            {interests.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {}, { color: colors.navy }]}>
                  Intérêts
                </Text>
                <View style={styles.tagsRow}>
                  {interests.map((interest) => {
                    const selected = selectedInterestIds.includes(interest.id);
                    return (
                      <Pressable
                        key={interest.id}
                        style={[
                          styles.tag,
                          {
                            backgroundColor: selected ? colors.secondary : colors.tagBackground,
                            borderColor: selected ? colors.secondary : colors.secondary + '40',
                          },
                        ]}
                        onPress={() => toggleInterest(interest.id)}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            { color: selected ? '#FFFFFF' : colors.secondary, fontFamily: FontFamily.mono },
                          ]}
                        >
                          {interest.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Visibilité ── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {}, { color: colors.navy }]}>
                Visibilité
              </Text>
              <View style={[styles.visibilityCard, { borderColor: colors.separator }]}>
                <View style={[styles.visibilityIcon, { backgroundColor: isSearchable ? 'rgba(255,106,87,0.12)' : colors.tagBackground }]}>
                  <MaterialIcons
                    name={isSearchable ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={isSearchable ? colors.primary : colors.textMuted}
                  />
                </View>
                <View style={styles.visibilityLabel}>
                  <Text style={[styles.visibilityTitle, { color: colors.navy, fontFamily: FontFamily.mono }]}>
                    {isSearchable ? 'Profil visible' : 'Profil masqué'}
                  </Text>
                  <Text style={[styles.visibilityDesc, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>
                    {isSearchable ? 'Vous apparaissez dans les recherches' : 'Vous n\'apparaissez pas dans les recherches'}
                  </Text>
                </View>
                <Switch
                  value={isSearchable}
                  onValueChange={setIsSearchable}
                  trackColor={{ false: colors.separator, true: colors.primary + '80' }}
                  thumbColor={isSearchable ? colors.primary : '#D0D0D0'}
                />
              </View>
            </View>

            {/* ── Save button ── */}
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: colors.primary },
                shadows.md,
                pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
                saving && { opacity: 0.7 },
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <MaterialIcons name="check" size={20} color="#FFFFFF" />}
              <Text style={[styles.saveBtnText, { fontFamily: FontFamily.mono }]}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Text>
            </Pressable>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 72 : 52,
    paddingBottom: 20,
  },
  pageTitle: {
    fontSize: 22,
    letterSpacing: -0.3,
  },

  card: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  scrollContent: {
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 28,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    gap: 10,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    position: 'relative',
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 32,
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhoto: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Sections
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, letterSpacing: -0.3 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  tagText: { fontSize: 13, fontWeight: '500' },

  // Visibility
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  visibilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  visibilityLabel: { flex: 1, gap: 2 },
  visibilityTitle: { fontSize: 14, fontWeight: '600' },
  visibilityDesc: { fontSize: 11 },

  // Save button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 34,
    marginTop: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
