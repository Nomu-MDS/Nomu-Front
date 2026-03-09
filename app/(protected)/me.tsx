import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
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
import { decodeJwt } from '@/lib/jwt';
import { clearToken, getToken } from '@/lib/session';

const BIO_PROMPT_KEY = 'bio_prompt_dismissed_at';

// ── Types ──────────────────────────────────────────────────────────────────────

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
  Interests?: { id: number; name: string; icon: string | null }[];
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  bio: string | null;
  location: string | null;
  Profile?: Profile;
}

// ── Settings row ───────────────────────────────────────────────────────────────

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  danger = false,
  right,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  sublabel?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [styles.settingsRow, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View
        style={[
          styles.settingsIcon,
          { backgroundColor: danger ? 'rgba(239,68,68,0.1)' : colors.tagBackground },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={18}
          color={danger ? '#EF4444' : colors.secondary}
        />
      </View>

      <View style={styles.settingsLabelGroup}>
        <Text
          style={[
            styles.settingsLabel,
            { color: danger ? '#EF4444' : colors.navy, fontFamily: FontFamily.mono },
          ]}
        >
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.settingsSublabel, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>
            {sublabel}
          </Text>
        )}
      </View>

      {right ?? (!danger && (
        <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
      ))}
    </Pressable>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function MeScreen() {
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

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBioPrompt, setShowBioPrompt] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        try {
          const token = getToken();
          if (!token) { router.replace('/login'); return; }

          const res = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!active) return;

          if (res.ok) {
            setUser(await res.json());
          } else if (res.status === 401) {
            await clearToken();
            router.replace('/login');
          } else if (res.status === 404) {
            const claims = decodeJwt(token);
            if (claims) {
              setUser({
                id: 0,
                name: (claims.name as string) || 'Utilisateur',
                email: (claims.email as string) || '—',
                role: (claims.role as string) || 'user',
                bio: null,
                location: null,
              });
            }
          } else {
            await clearToken();
            router.replace('/login');
          }
        } catch {
          if (!active) return;
          await clearToken();
          router.replace('/login');
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [router]),
  );

  // Afficher la modal si pas de bio et pas refusée récemment
  useEffect(() => {
    if (!user) return;
    const hasBio = !!(user.Profile?.biography || user.bio);
    if (hasBio) return;
    (async () => {
      const raw = await AsyncStorage.getItem(BIO_PROMPT_KEY);
      if (raw) {
        const dismissedAt = parseInt(raw, 10);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - dismissedAt < sevenDays) return;
      }
      setShowBioPrompt(true);
    })();
  }, [user]);

  const dismissBioPrompt = async () => {
    await AsyncStorage.setItem(BIO_PROMPT_KEY, String(Date.now()));
    setShowBioPrompt(false);
  };

  const handleLogout = async () => {
    await clearToken();
    router.replace('/login');
  };

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading || !fontsLoaded) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.beige, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  if (!user) return null;

  // ── Data ─────────────────────────────────────────────────────────────────────

  const profile = user.Profile;
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.name;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const location =
    profile?.city && profile?.country
      ? `${profile.city}, ${profile.country}`
      : profile?.city || profile?.country || user.location || null;
  const imageUri = profile?.image_url ?? (user.id > 0
    ? `https://i.pravatar.cc/500?img=${(user.id % 70) + 1}`
    : null);
  const roleLabel =
    user.role === 'local' ? 'Local' : user.role === 'voyager' ? 'Voyageur' : user.role;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: colors.beige }]}>

      {/* ── Modal bio prompt ─────────────────────────────────────────────────── */}
      <Modal
        visible={showBioPrompt}
        transparent
        animationType="slide"
        onRequestClose={dismissBioPrompt}
      >
        <Pressable style={styles.modalBackdrop} onPress={dismissBioPrompt}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <View style={styles.modalHandle} />

            <View style={[styles.modalIconWrap, { backgroundColor: colors.tagBackground }]}>
              <MaterialIcons name="auto-awesome" size={32} color={colors.secondary} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.navy, fontFamily: FontFamily.rocaBold }]}>
              Complétez votre profil
            </Text>
            <Text style={[styles.modalBody, { color: colors.body, fontFamily: FontFamily.mono }]}>
              Ajoutez une bio pour obtenir des suggestions de profils plus pertinentes et augmenter vos chances de connexion.
            </Text>

            <Pressable
              style={[styles.modalCta, { backgroundColor: colors.secondary }]}
              onPress={() => { setShowBioPrompt(false); router.push('/edit-profile'); }}
            >
              <Text style={[styles.modalCtaText, { fontFamily: FontFamily.mono }]}>Ajouter une bio</Text>
            </Pressable>

            <Pressable style={styles.modalLater} onPress={dismissBioPrompt}>
              <Text style={[styles.modalLaterText, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>
                Plus tard
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Text
          style={[
            styles.pageTitle,
            fontsLoaded ? { fontFamily: FontFamily.rocaBold } : {},
            { color: colors.navy },
          ]}
        >
          Mon Profil
        </Text>
        <Pressable
          style={[styles.editBtn, { backgroundColor: colors.secondary }]}
          onPress={() => router.push('/edit-profile')}
          hitSlop={8}
        >
          <MaterialIcons name="edit" size={15} color="#FFFFFF" />
          <Text style={[styles.editBtnLabel, { fontFamily: FontFamily.mono }]}>Modifier</Text>
        </Pressable>
      </View>

      {/* ── White card ──────────────────────────────────────────────────────── */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* Hero */}
          <View style={styles.hero}>
            <View style={[styles.avatarRing, { borderColor: colors.separator }, shadows.md]}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.initials, { fontFamily: FontFamily.rocaBold }]}>
                    {initials}
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={[
                styles.displayName,
                fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {},
                { color: colors.navy },
              ]}
            >
              {displayName}
            </Text>

            <Text style={[styles.email, { color: colors.textSecondary, fontFamily: FontFamily.mono }]}>
              {user.email}
            </Text>

            <View style={styles.metaRow}>
              {/* <View style={[styles.roleBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.roleBadgeText, { fontFamily: FontFamily.mono }]}>
                  {roleLabel}
                </Text>
              </View> */}
              {location && (
                <View style={styles.locationPill}>
                  <MaterialIcons name="location-on" size={12} color={colors.textMuted} />
                  <Text style={[styles.locationText, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>
                    {location}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* À propos */}
          {(profile?.biography || user.bio) ? (
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {},
                  { color: colors.navy },
                ]}
              >
                À propos
              </Text>
              <Text style={[styles.bioText, { color: colors.body, fontFamily: FontFamily.mono }]}>
                {profile?.biography || user.bio}
              </Text>
            </View>
          ) : null}

          {/* Intérêts */}
          {profile?.Interests && profile.Interests.length > 0 ? (
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {},
                  { color: colors.navy },
                ]}
              >
                Intérêts
              </Text>
              <View style={styles.tagsRow}>
                {profile.Interests.map((interest) => (
                  <View
                    key={interest.id}
                    style={[styles.tag, { backgroundColor: colors.tagBackground, borderColor: colors.secondary + '60' }]}
                  >
                    <Text style={[styles.tagText, { color: colors.secondary, fontFamily: FontFamily.mono }]}>
                      {interest.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Paramètres */}
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {},
                { color: colors.navy },
              ]}
            >
              Paramètres
            </Text>

            <View style={[styles.settingsCard, { borderColor: colors.separator }]}>
              <SettingsRow
                icon={profile?.is_searchable ? 'visibility' : 'visibility-off'}
                label={profile?.is_searchable ? 'Profil visible' : 'Profil masqué'}
                sublabel={profile?.is_searchable ? 'Visible dans les recherches' : 'Caché des recherches'}
                onPress={() => router.push('/edit-profile')}
                right={
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: profile?.is_searchable ? '#4CAF50' : colors.textMuted },
                    ]}
                  />
                }
              />
              <View style={[styles.rowDivider, { backgroundColor: colors.separator }]} />
              <SettingsRow
                icon="person-outline"
                label="Modifier le profil"
                onPress={() => router.push('/edit-profile')}
              />
              <View style={[styles.rowDivider, { backgroundColor: colors.separator }]} />
              <SettingsRow
                icon="logout"
                label="Se déconnecter"
                onPress={handleLogout}
                danger
              />
            </View>
          </View>

        </ScrollView>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 72 : 52,
    paddingBottom: 20,
  },
  pageTitle: {
    fontSize: 30,
    letterSpacing: -0.5,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  editBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Card
  card: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    gap: 8,
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 36,
    color: '#FFFFFF',
  },
  displayName: {
    fontSize: 26,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  email: {
    fontSize: 13,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  roleBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: 12,
    letterSpacing: 0.1,
  },

  // Sections
  section: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  tagText: {
    fontSize: 13,
    letterSpacing: -0.1,
  },

  // Settings
  settingsCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  settingsLabelGroup: {
    flex: 1,
    gap: 2,
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsSublabel: {
    fontSize: 11,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Bio prompt modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginBottom: 8,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    letterSpacing: -0.1,
    marginBottom: 8,
  },
  modalCta: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  modalCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalLater: {
    paddingVertical: 8,
  },
  modalLaterText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
