import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { API_BASE_URL } from '@/constants/config';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Couleurs fixes du passeport — identiques en mode clair ET sombre
const PASSPORT = {
  card: '#FFFFFF',
  title: '#465E8A',       // NOMU PASSPORT
  navy: '#0E224A',        // tampon, numéros, labels
  fieldValue: '#465E8A',  // valeurs des champs
  fieldLabel: '#9EA3AE',  // labels atténués
  separator: '#E8E8E8',
};
import { startConversation } from '@/lib/chat-helper';
import { getToken } from '@/lib/session';

interface Interest {
  id: number;
  name: string;
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
  interests?: Interest[];
}

interface UserProfileResponse {
  id: number;
  profile: Profile;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function passportNumber(id: number) {
  const a = String((id * 73 + 17) % 900 + 100);
  const b = String((id * 137 + 53) % 9000 + 1000);
  const c = String((id * 31 + 7) % 90 + 10);
  return `${a} ${b} ${c}`;
}

function docNumber(id: number, country?: string | null) {
  const prefix = country ? country.slice(0, 2).toUpperCase() : 'NM';
  return `${prefix}${String((id * 17) % 900 + 100)}`;
}

function stampDate() {
  return new Date()
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PassportField({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ fontSize: 11, color: PASSPORT.fieldLabel, fontFamily: FontFamily.mono, letterSpacing: 0.3 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 14, color: PASSPORT.fieldValue, fontFamily: FontFamily.mono, fontWeight: '700' }}>
        {value || '—'}
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, shadows } = useTheme();

  const [fontsLoaded] = useFonts({
    'RocaOne-Rg':      require('@/assets/fonts/roca/RocaOne-Rg.ttf'),
    'RocaOne-Bold':     require('@/assets/fonts/roca/RocaOne-Bold.ttf'),
    'Poppins-Regular':  require('@/assets/fonts/poppins/Poppins-Regular.ttf'),
    'Poppins-Medium':   require('@/assets/fonts/poppins/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('@/assets/fonts/poppins/Poppins-SemiBold.ttf'),
    'Poppins-Bold':     require('@/assets/fonts/poppins/Poppins-Bold.ttf'),
  });

  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) { setError('ID manquant'); setLoading(false); return; }

      const userId = parseInt(id, 10);
      if (isNaN(userId) || userId <= 0) { setError('ID invalide'); setLoading(false); return; }

      try {
        const token = getToken();
        if (!token) { setError('Vous devez être connecté'); setLoading(false); return; }

        const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          setUserProfile(await res.json());
        } else {
          const body = await res.json().catch(() => ({}));
          setError(
            res.status === 403 ? 'Ce profil est privé'
            : res.status === 404 ? 'Utilisateur non trouvé'
            : body.error || 'Erreur inconnue',
          );
        }
      } catch {
        setError('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleContact = async () => {
    if (!userProfile) return;
    setContactLoading(true);
    try {
      const convId = await startConversation(userProfile.id);
      router.push(`/chat/${convId}`);
    } catch (err: any) {
      if (err.message?.includes('Only travelers')) {
        Alert.alert('Non autorisé', 'Seuls les voyageurs peuvent initier des conversations.');
      } else if (err.message?.includes('Token manquant')) {
        Alert.alert('Non connecté', 'Vous devez être connecté.');
        router.push('/login');
      } else {
        Alert.alert('Erreur', err.message || 'Impossible de démarrer la conversation');
      }
    } finally {
      setContactLoading(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading || !fontsLoaded) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.beige, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error || !userProfile) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.beige }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={22} color={colors.secondary} />
          </Pressable>
          <Text style={[styles.pageTitle, { color: colors.secondary, fontFamily: FontFamily.rocaBold }]}>
            Profil
          </Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={[styles.passportCard, { backgroundColor: PASSPORT.card, justifyContent: 'center', alignItems: 'center', gap: 16 }, shadows.md]}>
          <MaterialIcons name="error-outline" size={52} color={colors.textMuted} />
          <Text style={[styles.errorTitle, { color: colors.heading, fontFamily: FontFamily.rocaRg }]}>
            Profil introuvable
          </Text>
          <Text style={[styles.errorBody, { color: colors.textSecondary, fontFamily: FontFamily.mono }]}>
            {error || 'Impossible de charger ce profil'}
          </Text>
          <Pressable style={[styles.contactBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <Text style={[styles.contactBtnText, { fontFamily: FontFamily.mono }]}>Retour</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Data ───────────────────────────────────────────────────────────────────

  const { profile } = userProfile;

  const pNum = passportNumber(profile.id);
  const dNum = docNumber(profile.id, profile.country);
  const city = profile.city?.toUpperCase() || 'PARIS';
  const passportType = profile.country?.slice(0, 1).toUpperCase() || 'X';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: colors.beige }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={22} color={colors.secondary} />
          </Pressable>
          <Text style={[styles.pageTitle, { color: colors.secondary, fontFamily: FontFamily.rocaBold }]}>
            Profil
          </Text>
          <Pressable onPress={() => router.push({ pathname: '/(protected)/report/[userId]', params: { userId: String(userProfile.id), userName: profileName } })} hitSlop={12}>
            <MaterialIcons name="flag" size={22} color={colors.secondary} style={{ opacity: 0.45 }} />
          </Pressable>
        </View>

        {/* ── Passport card ─────────────────────────────────────────────── */}
        <View style={[styles.passportCard, { backgroundColor: PASSPORT.card }, shadows.md]}>

          {/* Header: NOMU PASSPORT + stamp */}
          <View style={styles.passportHeader}>
            <View>
              <Text style={[styles.passportTitle, { color: PASSPORT.title, fontFamily: FontFamily.mono }]}>
                {'NOMU PASS'}
                <Text style={{ textDecorationLine: 'underline' }}>PORT</Text>
              </Text>
            </View>

            {/* Stamp circulaire */}
            <View style={[styles.stamp, { borderColor: PASSPORT.navy }]}>
              <Text style={[styles.stampLine, styles.stampCityText, { color: PASSPORT.navy, fontFamily: FontFamily.mono }]}>
                {city}
              </Text>
              <Text style={[styles.stampLine, styles.stampDateText, { color: PASSPORT.navy, fontFamily: FontFamily.mono }]}>
                {stampDate()}
              </Text>
              <Text style={[styles.stampLine, styles.stampSmall, { color: PASSPORT.navy, fontFamily: FontFamily.mono }]}>
                {'CHARLES DE GAULLE\nAIRPORT'}
              </Text>
              <Text style={[styles.stampLine, styles.stampSmall, { color: PASSPORT.navy, fontFamily: FontFamily.mono }]}>
                FRENCH REPUBLIC
              </Text>
            </View>
          </View>

          {/* Separator */}
          <View style={[styles.separator, { backgroundColor: PASSPORT.separator }]} />

          {/* Corps du passeport */}
          <View style={styles.passportBody}>

            {/* Colonne gauche : numéro doc + photo */}
            <View style={styles.leftCol}>
              <Text style={[styles.docNum, { color: PASSPORT.navy, fontFamily: FontFamily.mono }]}>
                {dNum}
              </Text>
              <Text style={[styles.docTypeLabel, { color: PASSPORT.navy, fontFamily: FontFamily.rocaBold }]}>
                Passeport
              </Text>

              {/* Photo ou placeholder */}
              <Image
                source={{
                  uri: profile.image_url ?? `https://i.pravatar.cc/500?img=${(profile.id % 70) + 1}`,
                }}
                style={styles.passportPhoto}
                resizeMode="cover"
              />
            </View>

            {/* Colonne droite : champs */}
            <View style={styles.rightCol}>
              <PassportField label="Surname" value={profile.last_name} />
              <PassportField label="First name" value={profile.first_name} />
              <PassportField label="Nationality" value={profile.country} />
              <PassportField
                label="Date of birth"
                value={profile.age ? `${new Date().getFullYear() - profile.age}` : null}
              />
              <PassportField label="Type" value={passportType} />
            </View>

          </View>

          {/* Numéro vertical — texte tourné, début en bas */}
          <View style={styles.verticalNumContainer} pointerEvents="none">
            <Text style={[styles.verticalNum, { color: PASSPORT.navy, fontFamily: FontFamily.mono }]}>
              {`Passport Number : ${pNum}`}
            </Text>
          </View>
        </View>

        {/* ── Section sombre ────────────────────────────────────────────── */}
        <View style={[styles.darkSection, { backgroundColor: colors.navy, flex: 1 }]}>

          {profile.biography ? (
            <View style={styles.darkBlock}>
              <Text style={[styles.darkTitle, { color: colors.beige, fontFamily: fontsLoaded ? FontFamily.rocaRg : undefined }]}>
                À propos
              </Text>
              <Text style={[styles.darkBody, { color: '#ECEDEE', fontFamily: FontFamily.mono }]}>
                {profile.biography}
              </Text>
            </View>
          ) : null}

          {profile.interests && profile.interests.length > 0 ? (
            <View style={styles.darkBlock}>
              <Text style={[styles.darkTitle, { color: colors.beige, fontFamily: fontsLoaded ? FontFamily.rocaRg : undefined }]}>
                Intérêts
              </Text>
              <View style={styles.tagsRow}>
                {profile.interests.map((interest) => (
                  <View
                    key={interest.id}
                    style={[styles.darkTag, { borderColor: 'rgba(228,219,203,0.4)' }]}
                  >
                    <Text style={[styles.darkTagText, { color: colors.beige, fontFamily: FontFamily.mono }]}>
                      {interest.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

        </View>
      </ScrollView>

      {/* ── Bouton Contacter fixe ──────────────────────────────────────── */}
      <View style={[styles.fixedFooter, { backgroundColor: colors.navy }]}>
        <Pressable
          style={({ pressed }) => [
            styles.contactBtn,
            { backgroundColor: colors.primary },
            shadows.md,
            pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
            contactLoading && { opacity: 0.7 },
          ]}
          onPress={handleContact}
          disabled={contactLoading}
        >
          <MaterialIcons
            name={contactLoading ? 'hourglass-empty' : 'chat-bubble-outline'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={[styles.contactBtnText, { fontFamily: FontFamily.mono }]}>
            {contactLoading ? 'Chargement…' : 'Contacter'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Top bar ────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 72 : 52,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    letterSpacing: -0.5,
  },

  // ── Passport card ──────────────────────────────────────────────────────
  passportCard: {
    marginHorizontal: 16,
    borderRadius: 28,
    padding: 20,
    paddingRight: 28, // espace pour le numéro vertical
    paddingBottom: 24,
  },

  passportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passportTitle: {
    fontSize: 20,
    letterSpacing: 2,
  },

  // Stamp
  stamp: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    gap: 1,
  },
  stampLine: {
    textAlign: 'center',
  },
  stampCityText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stampDateText: {
    fontSize: 8,
    fontWeight: '600',
  },
  stampSmall: {
    fontSize: 6,
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },

  // Body
  passportBody: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },

  // Left column
  leftCol: {
    width: '42%',
    gap: 4,
  },
  docNum: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  docTypeLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  passportPhoto: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
  },

  // Right column
  rightCol: {
    flex: 1,
    gap: 14,
    paddingTop: 28,
  },

  // Vertical passport number — texte rotaté -90deg, début en bas
  verticalNumContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalNum: {
    fontSize: 8,
    letterSpacing: 0.6,
    transform: [{ rotate: '-90deg' }],
    width: 220,
    textAlign: 'left',
  },

  // ── Dark section ────────────────────────────────────────────────────────
  darkSection: {
    marginTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
    // pas d'overflow: hidden

  },
  darkBlock: {
    marginBottom: 24,
    gap: 12,
  },
  darkTitle: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  darkBody: {
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.2,
    opacity: 0.9,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  darkTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  darkTagText: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },

  // ── Contact button ──────────────────────────────────────────────────────
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 34,
  },
  contactBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Error ───────────────────────────────────────────────────────────────
  errorTitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
