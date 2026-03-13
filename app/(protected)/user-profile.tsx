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
import { Image as ExpoImage } from 'expo-image';
import Svg, { Circle, Defs, Path as SvgPath, Text as SvgText, TextPath } from 'react-native-svg';

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

function PassportField({ label, value, large }: { label: string; value?: string | null; large?: boolean }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={{ fontSize: 9, color: PASSPORT.fieldLabel, fontFamily: FontFamily.poppins, letterSpacing: 0.8, textTransform: 'uppercase' }}>
        {label}
      </Text>
      {large ? (
        <Text style={{ fontSize: 15, color: PASSPORT.navy, fontFamily: FontFamily.rocaRg, letterSpacing: -0.2 }} numberOfLines={1}>
          {value || '—'}
        </Text>
      ) : (
        <Text style={{ fontSize: 12, color: PASSPORT.fieldValue, fontFamily: FontFamily.poppinsMedium }}>
          {value || '—'}
        </Text>
      )}
    </View>
  );
}

// ── Passport stamp SVG ────────────────────────────────────────────────────────

function PassportStamp({ city, date, color }: { city: string; date: string; color: string }) {
  const cx = 50, cy = 50, r = 44;
  return (
    <Svg width={88} height={88} viewBox="0 0 100 100">
      <Defs>
        {/* arc texte supérieur : rayon 37 → texte entre les 2 cercles (r=44 et r=39) */}
        <SvgPath id="topArc" d={`M ${cx - 37},${cy} A 37,37 0 0,1 ${cx + 37},${cy}`} />
        {/* arc texte inférieur : rayon 41 → texte plus bas, proche du cercle extérieur */}
        <SvgPath id="botArc" d={`M ${cx - 43},${cy} A 43,43 0 0,0 ${cx + 43},${cy}`} />
      </Defs>

      {/* Cercles */}
      <Circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth={1.5} fill="none" />
      <Circle cx={cx} cy={cy} r={r - 8} stroke={color} strokeWidth={0.5} fill="none" />

      {/* Ville courbée en haut */}
      <SvgText fill={color} fontSize={7} letterSpacing={2}>
        <TextPath href="#topArc" startOffset="32.5%" textAnchor="middle">
          {city.toUpperCase()}
        </TextPath>
      </SvgText>

      {/* Date + aéroport au centre */}
      <SvgText fill={color} fontSize={7.5} x={cx} y={cy - 4} textAnchor="middle" fontWeight="600">
        {date}
      </SvgText>
      <SvgText fill={color} fontSize={5.5} x={cx} y={cy + 7} textAnchor="middle">
        CHARLES DE GAULLE
      </SvgText>
      <SvgText fill={color} fontSize={5.5} x={cx} y={cy + 15} textAnchor="middle">
        AIRPORT
      </SvgText>

      {/* FRENCH REPUBLIC courbé en bas */}
      <SvgText fill={color} fontSize={7} letterSpacing={1.5}>
        <TextPath href="#botArc" startOffset="25%" textAnchor="middle">
          FRENCH REPUBLIC
        </TextPath>
      </SvgText>
    </Svg>
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
  const profileName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || String(userProfile.id);

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
            {profile.first_name || 'Profil'}
          </Text>
          <Pressable onPress={() => router.push({ pathname: '/(protected)/report/[userId]', params: { userId: String(userProfile.id), userName: profileName } })} hitSlop={12}>
            <MaterialIcons name="outlined-flag" size={22} color="#e53e3e" style={{ opacity: 0.7 }} />
          </Pressable>
        </View>
        {/* ── Passport card ─────────────────────────────────────────────── */}
        <View style={[styles.passportCard, { backgroundColor: PASSPORT.card, borderWidth: 1, borderColor: '#465E8A' }, shadows.md]}>

          {/* Header: NOMU PASSPORT */}
          <View style={styles.passportHeader}>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.passportTitle, { color: PASSPORT.title, fontFamily: FontFamily.mono }]}>
                NOMU  PASSPORT
              </Text>
              <View style={[styles.passportTitleLine, { backgroundColor: PASSPORT.title, width: 46 }]} />
            </View>
          </View>

          {/* Stamp — position absolute top-right */}
          <View style={{ position: 'absolute', top: 10, right: 10 }} pointerEvents="none">
            <PassportStamp city={city} date={stampDate()} color={PASSPORT.navy} />
          </View>

          {/* Corps du passeport */}
          <View style={styles.passportBody}>

            {/* Colonne gauche : numéro doc + photo */}
            <View style={styles.leftCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.docNum, { color: PASSPORT.navy, fontFamily: FontFamily.mono }]}>
                  {dNum}
                </Text>
                <Text style={[styles.docTypeLabel, { color: PASSPORT.navy, fontFamily: FontFamily.rocaBold, marginBottom: 0 }]}>
                  Passeport
                </Text>
                </View>

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
              <PassportField label="Surname" value={profile.last_name} large />
              <PassportField label="First name" value={profile.first_name} large />
              <PassportField label="Nationality" value={profile.country} large />
              <PassportField
                label="Date of birth"
                value={profile.age ? `${new Date().getFullYear() - profile.age}` : null}
                large
              />
              <PassportField label="Type" value={passportType} />
            </View>

          </View>

          {/* Numéro vertical — View pour la rotation (transform sur Text+enfants imbriqués = cassé en RN) */}
          <View style={styles.verticalNumContainer} pointerEvents="none">
            <View style={styles.verticalNumWrapper}>
              <Text numberOfLines={1} style={styles.verticalNumText}>
                <Text style={{ color: '#3C3C3B' }}>Passport Number : </Text>
                <Text style={{ color: PASSPORT.fieldValue }}>{pNum}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* ── Section sombre ────────────────────────────────────────────── */}
        <View style={[styles.darkSection, { backgroundColor: colors.navy }]}>

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

        {/* ── Badges — carte blanche après la section navy ─────────────── */}
        <View style={[styles.badgeCard, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#465E8A' }, shadows.sm]}>
          <Text style={[styles.badgeTitle, { fontFamily: FontFamily.rocaBold, color: '#22172A' }]}>
            Badges
          </Text>
          <View style={styles.badgeTitleLine} />
          <View style={styles.stampsRow}>
            <ExpoImage
              source={require('@/assets/images/Tampon1.svg')}
              style={styles.stamp1}
              contentFit="contain"
            />
            <ExpoImage
              source={require('@/assets/images/Tampon2.svg')}
              style={styles.stamp2}
              contentFit="contain"
            />
            <ExpoImage
              source={require('@/assets/images/Tampon3.svg')}
              style={styles.stamp3}
              contentFit="contain"
            />
          </View>
        </View>
      </ScrollView>

      {/* ── Bouton Contacter fixe ──────────────────────────────────────── */}
      <View style={styles.fixedFooter}>
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
    paddingBottom: Platform.OS === 'ios' ? 110 : 90,
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
    overflow: 'hidden',
  },

  passportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  passportTitle: {
    fontSize: 22,
  },
  passportTitleLine: {
    height: 3,
    borderRadius: 2,
    marginTop: 5,
    width: '100%',
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

  // Left column — 50 %
  leftCol: {
    flex: 1,
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

  // Right column — 50 %
  rightCol: {
    flex: 1,
    gap: 10,
    paddingTop: 28,
    paddingLeft: 8,
  },

  // Vertical passport number
  verticalNumContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalNumWrapper: {
    width: 240,
    transform: [{ rotate: '-90deg' }],
  },
  verticalNumText: {
    fontSize: 8,
    letterSpacing: 0.6,
    fontFamily: FontFamily.mono,
    textAlign: 'left',
  },

  // ── Dark section ────────────────────────────────────────────────────────
  darkSection: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 28,
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
    alignItems: 'center',
  },

  // ── Contact button ──────────────────────────────────────────────────────
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 34,
    paddingHorizontal: 40,
  },
  contactBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Badge section ───────────────────────────────────────────────────────
  badgeCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  badgeTitle: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  badgeTitleLine: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#22172A',
    marginTop: 4,
    marginBottom: 10,
  },
  stampsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  stamp1: {
    width: 72,
    height: 72,
    zIndex: 1,
    transform: [{ rotate: '-10deg' }],
  },
  stamp2: {
    width: 78,
    height: 78,
    marginLeft: -24,
    zIndex: 2,
    transform: [{ rotate: '-4deg' }],
  },
  stamp3: {
    width: 108,
    height: 92,
    marginLeft: -20,
    zIndex: 3,
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
