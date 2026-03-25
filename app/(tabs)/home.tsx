import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FilterModal, EMPTY_FILTERS, type FilterState } from '@/components/explore/filter-modal';
import { API_BASE_URL } from '@/constants/config';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { decodeJwt } from '@/lib/jwt';
import { getTokenAsync } from '@/lib/session';
import { type ProfileHit } from '@/components/ui/profile-card';
import { getMyReservations, type Reservation } from '@/services/api/reservations';
import { getConversations } from '@/services/api/conversations';
import type { Conversation } from '@/types/message';

// ── Static data ────────────────────────────────────────────────────────────────

const DESTINATIONS = [
  { city: 'Paris',      country: 'France' },
  { city: 'Lyon',       country: 'France' },
  { city: 'Marseille',  country: 'France' },
  { city: 'Nice',       country: 'France' },
  { city: 'Bordeaux',   country: 'France' },
  { city: 'Strasbourg', country: 'France' },
  { city: 'Annecy',     country: 'France' },
  { city: 'Toulouse',   country: 'France' },
];

function useWikiImage(city: string) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`)
      .then((r) => r.json())
      .then((d) => setUri(d?.originalimage?.source ?? d?.thumbnail?.source ?? null))
      .catch(() => {});
  }, [city]);
  return uri;
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return 'Bonne nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

// ── Local profile card (horizontal scroll) ─────────────────────────────────────

const CARD_W = 130;
const CARD_H = 175;

function LocalCard({ profile, onPress }: { profile: ProfileHit; onPress: () => void }) {
  const { shadows } = useTheme();
  const _pid = profile.user_id || profile.id || 0;
  const uri = profile.image_url ?? `https://i.pravatar.cc/500?img=${(_pid % 70) + 1}`;
  const location = profile.city || profile.country || null;

  return (
    <Pressable
      style={[styles.localCard, shadows.sm, { width: CARD_W, height: CARD_H }]}
      onPress={onPress}
    >
      <Image source={{ uri }} style={styles.localImg} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(14,34,74,0.85)']}
        locations={[0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.localInfo}>
        <Text style={[styles.localName, { fontFamily: FontFamily.rocaRg }]} numberOfLines={1}>
          {profile.name.split(' ')[0]}
        </Text>
        {location && (
          <Text style={[styles.localCity, { fontFamily: FontFamily.mono }]} numberOfLines={1}>
            {location}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// ── Destination card ──────────────────────────────────────────────────────────

const DEST_W = 200;
const DEST_H = 300;

function DestCard({
  city, country, onPress,
}: { city: string; country: string; onPress: () => void }) {
  const { shadows } = useTheme();
  const uri = useWikiImage(city);
  return (
    <Pressable
      style={[styles.destCard, shadows.md, { width: DEST_W, height: DEST_H }]}
      onPress={onPress}
    >
      {uri && <Image source={{ uri }} style={StyleSheet.absoluteFill as any} resizeMode="cover" />}
      <LinearGradient
        colors={['transparent', 'rgba(10,20,50,0.55)', 'rgba(10,20,50,0.88)']}
        locations={[0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.destInfo}>
        <Text style={[styles.destCity, { fontFamily: FontFamily.rocaBold }]}>{city}</Text>
        <Text style={[styles.destCountry, { fontFamily: FontFamily.mono }]}>{country}</Text>
      </View>
    </Pressable>
  );
}

// ── Interest pill ─────────────────────────────────────────────────────────────

function InterestPill({ name, onPress }: { name: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: pressed ? colors.secondary : colors.tagBackground, borderColor: colors.secondary + '50' },
        pressed && { opacity: 0.9 },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.pillText, { color: colors.secondary, fontFamily: FontFamily.mono }]}>
        {name}
      </Text>
    </Pressable>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  title, subtitle, linkLabel, onLink, fontsLoaded,
}: { title: string; subtitle?: string; linkLabel?: string; onLink?: () => void; fontsLoaded: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ gap: 2 }}>
        <Text style={[styles.sectionTitle, { color: colors.navy }, fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {}]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, fontFamily: FontFamily.mono }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {linkLabel && (
        <Pressable onPress={onLink} hitSlop={8}>
          <Text style={[styles.sectionLink, { color: colors.secondary, fontFamily: FontFamily.mono }]}>
            {linkLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const searchRef = useRef<TextInput>(null);

  const [fontsLoaded] = useFonts({
    'RocaOne-Rg':      require('@/assets/fonts/roca/RocaOne-Rg.ttf'),
    'RocaOne-Bold':     require('@/assets/fonts/roca/RocaOne-Bold.ttf'),
    'Poppins-Regular':  require('@/assets/fonts/poppins/Poppins-Regular.ttf'),
    'Poppins-Medium':   require('@/assets/fonts/poppins/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('@/assets/fonts/poppins/Poppins-SemiBold.ttf'),
    'Poppins-Bold':     require('@/assets/fonts/poppins/Poppins-Bold.ttf'),
  });

  const [firstName, setFirstName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredLocals, setFeaturedLocals] = useState<ProfileHit[]>([]);
  const [interests, setInterests] = useState<{ id: number; name: string }[]>([]);
  const [personalised, setPersonalised] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [upcomingReservations, setUpcomingReservations] = useState<Reservation[]>([]);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [myUserId, setMyUserId] = useState<number | null>(null);

  // ── Init ────────────────────────────────────────────────────────────────────

  useFocusEffect(useCallback(() => {
    (async () => {
      const token = await getTokenAsync();
      if (!token) { router.replace('/login'); return; }

      const claims = decodeJwt(token);
      const name: string = claims?.name || claims?.first_name || '';
      setFirstName(name.split(' ')[0] || null);

      const uid: number | null = claims?.id || claims?.userId || claims?.sub || claims?.user_id || null;
      if (uid) setMyUserId(uid);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };

        const [meRes, interestsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/users/me`, { headers }),
          fetch(`${API_BASE_URL}/interests`),
        ]);

        // Intérêts disponibles
        if (interestsRes.ok) setInterests(await interestsRes.json());

        // Intérêts du user → filtre les locals
        let filterParam = '';
        if (meRes.ok) {
          const me = await meRes.json();
          const userInterests: { id: number; name: string }[] = me?.Profile?.Interests ?? [];
          if (userInterests.length > 0) {
            filterParam = userInterests.map((i) => i.name).join(',');
            setPersonalised(true);
          }
        }

        const localsPersonalizedUrl = filterParam
          ? `${API_BASE_URL}/users/search?filterInterests=${encodeURIComponent(filterParam)}&limit=10`
          : `${API_BASE_URL}/users/search?limit=10`;

        const [localsRes, reservationsData, conversationsData] = await Promise.all([
          fetch(localsPersonalizedUrl, { headers }),
          getMyReservations().catch(() => [] as Reservation[]),
          getConversations().catch(() => ({ conversations: [] as Conversation[] })),
        ]);

        if (localsRes.ok) {
          const data = await localsRes.json();
          let hits: ProfileHit[] = data.hits ?? [];

          // Fallback: si la version personnalisée (intérêts) est vide,
          // relancer une recherche large pour éviter une Home sans profils.
          if (hits.length === 0 && filterParam) {
            const fallbackRes = await fetch(`${API_BASE_URL}/users/search?limit=10`, { headers });
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              hits = fallbackData.hits ?? [];
              setPersonalised(false);
            }
          }

          setFeaturedLocals(hits);
        }

        const now = new Date();
        const upcoming = reservationsData
          .filter((r) => r.status !== 'declined' && new Date(r.date) >= now)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3);
        setUpcomingReservations(upcoming);

        setRecentConversations((conversationsData.conversations ?? []).slice(0, 3));
      } catch {
        // silencieux
      }
    })();
  }, [router]));  // useFocusEffect + useCallback

  const goToExplore = () => {
    router.push('/explore');
  };

  const handleSearch = () => {
    goToExplore();
    setSearchQuery('');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: colors.beige }]}>

      {/* ── Top bar (beige) ──────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary, fontFamily: FontFamily.mono }]}>
            {timeGreeting()}
          </Text>
          <Text style={[styles.name, { color: colors.navy }, fontsLoaded ? { fontFamily: FontFamily.rocaBold } : {}]}>
            {firstName ?? 'Nomu'} 👋
          </Text>
        </View>

        <Pressable
          style={[styles.msgBtn, { backgroundColor: colors.surface }, shadows.sm]}
          onPress={() => router.push('/messages')}
          hitSlop={8}
        >
          <MaterialIcons name="chat-bubble-outline" size={20} color={colors.secondary} />
        </Pressable>
      </View>

      {/* ── Search bar (beige zone) ──────────────────────────────────────── */}
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.sm]}>
        <MaterialIcons name="search" size={20} color={colors.secondary} />
        <TextInput
          ref={searchRef}
          style={[styles.searchInput, { color: colors.navy, fontFamily: FontFamily.mono }]}
          placeholder="Ville, prénom, intérêt…"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={handleSearch} hitSlop={8}>
            <View style={[styles.searchGo, { backgroundColor: colors.secondary }]}>
              <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </Pressable>
        )}
        {searchQuery.length === 0 && (
          <Pressable
            style={[styles.filterIconBtn, { borderColor: colors.border }]}
            onPress={() => setFilterModalVisible(true)}
            hitSlop={8}
          >
            <MaterialIcons name="tune" size={18} color={colors.secondary} />
          </Pressable>
        )}
      </View>

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={(filters) => {
          setActiveFilters(filters);
          setFilterModalVisible(false);
          const p = new URLSearchParams();
          if (filters.cities.length)     p.set('cities',     filters.cities.join(','));
          if (filters.categories.length) p.set('categories', filters.categories.join(','));
          if (filters.sexes.length)      p.set('sexes',      filters.sexes.join(','));
          const qs = p.toString();
          router.push(qs ? `/explore?${qs}` : '/explore');
        }}
        initialFilters={activeFilters}
      />

      {/* ── White card with content ──────────────────────────────────────── */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Pour vous ── */}
          <View style={styles.section}>
            <SectionHeader
              title="Pour vous"
              subtitle={
                featuredLocals.length > 0
                  ? (personalised ? 'Sélectionnés selon vos intérêts' : `${featuredLocals.length} locals disponibles`)
                  : 'Aucun local trouvé pour le moment'
              }
              linkLabel="Voir tout"
              onLink={() => router.push('/explore')}
              fontsLoaded={fontsLoaded}
            />
            {featuredLocals.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScroll}
              >
                {featuredLocals.map((p) => (
                  <LocalCard
                    key={p.id}
                    profile={p}
                    onPress={() => router.push(`/user-profile?id=${p.user_id}`)}
                  />
                ))}
              </ScrollView>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.emptyCard,
                  { borderColor: colors.separator, opacity: pressed ? 0.75 : 1 },
                ]}
                onPress={() => router.push('/explore')}
              >
                <View style={[styles.emptyIcon, { backgroundColor: colors.tagBackground }]}>
                  <MaterialIcons name="travel-explore" size={22} color={colors.secondary} />
                </View>
                <View style={styles.emptyText}>
                  <Text style={[styles.emptyTitle, { color: colors.navy, fontFamily: FontFamily.mono }]}>Aucun profil pour l'instant</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>Lance une recherche sur Explore pour découvrir des locals</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* ── Destinations populaires ── */}
          <View style={styles.section}>
            <SectionHeader
              title="Destinations populaires"
              fontsLoaded={fontsLoaded}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
            >
              {DESTINATIONS.map((d) => (
                <DestCard
                  key={d.city}
                  city={d.city}
                  country={d.country}
                  onPress={() => router.push({ pathname: '/(tabs)/explore', params: { cities: d.city } })}
                />
              ))}
            </ScrollView>
          </View>

          {/* ── Explorer par intérêt ── */}
          {interests.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="Explorer par intérêt"
                fontsLoaded={fontsLoaded}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScroll}
              >
                {interests.map((i) => (
                  <InterestPill
                    key={i.id}
                    name={i.name}
                    onPress={() => router.push(`/explore?categories=${encodeURIComponent(i.name)}`)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Prochaines activités ── */}
          <View style={styles.section}>
            <SectionHeader
              title="Prochaines activités"
              linkLabel={upcomingReservations.length > 0 ? 'Voir tout' : undefined}
              onLink={() => router.push('/(tabs)/favorite')}
              fontsLoaded={fontsLoaded}
            />
            {upcomingReservations.length === 0 ? (
              <Pressable
                style={({ pressed }) => [
                  styles.emptyCard,
                  { borderColor: colors.separator, opacity: pressed ? 0.75 : 1 },
                ]}
                onPress={() => router.push('/explore')}
              >
                <View style={[styles.emptyIcon, { backgroundColor: colors.tagBackground }]}>
                  <MaterialIcons name="event" size={22} color={colors.secondary} />
                </View>
                <View style={styles.emptyText}>
                  <Text style={[styles.emptyTitle, { color: colors.navy, fontFamily: FontFamily.mono }]}>
                    Aucune activité prévue
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>
                    Explorez des locals pour planifier votre prochain voyage
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </Pressable>
            ) : (
              upcomingReservations.map((res) => {
                const dateObj = new Date(res.date);
                const dateStr = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const isPending = res.status === 'pending';
                return (
                  <Pressable
                    key={res.id}
                    style={({ pressed }) => [
                      styles.emptyCard,
                      { borderColor: colors.separator, opacity: pressed ? 0.85 : 1 },
                    ]}
                    onPress={() => router.push('/(tabs)/favorite')}
                  >
                    <View style={[styles.emptyIcon, { backgroundColor: isPending ? '#FFF3CD' : '#D4EDDA' }]}>
                      <MaterialIcons name="event" size={22} color={isPending ? '#856404' : '#155724'} />
                    </View>
                    <View style={styles.emptyText}>
                      <Text style={[styles.emptyTitle, { color: colors.navy, fontFamily: FontFamily.mono }]} numberOfLines={1}>
                        {res.title}
                      </Text>
                      <Text style={[styles.emptySubtitle, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>
                        {dateStr} à {timeStr} · {isPending ? 'En attente' : 'Confirmée'}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
                  </Pressable>
                );
              })
            )}
          </View>

          {/* ── Derniers messages ── */}
          <View style={styles.section}>
            <SectionHeader
              title="Derniers messages"
              linkLabel={recentConversations.length > 0 ? 'Voir tout' : undefined}
              onLink={() => router.push('/messages')}
              fontsLoaded={fontsLoaded}
            />
            {recentConversations.length === 0 ? (
              <Pressable
                style={({ pressed }) => [
                  styles.emptyCard,
                  { borderColor: colors.separator, opacity: pressed ? 0.75 : 1 },
                ]}
                onPress={() => router.push('/explore')}
              >
                <View style={[styles.emptyIcon, { backgroundColor: colors.tagBackground }]}>
                  <MaterialIcons name="chat-bubble-outline" size={22} color={colors.secondary} />
                </View>
                <View style={styles.emptyText}>
                  <Text style={[styles.emptyTitle, { color: colors.navy, fontFamily: FontFamily.mono }]}>
                    Aucun message récent
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>
                    Démarrez une conversation avec un local
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </Pressable>
            ) : (
              recentConversations.map((conv) => {
                const otherUser = conv.voyager_id === myUserId ? conv.Local : conv.Voyager;
                const lastMsg = conv.Messages?.[0];
                const initials = otherUser?.name
                  ? otherUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                  : '?';
                const preview = lastMsg
                  ? lastMsg.attachment
                    ? '📷 Photo'
                    : lastMsg.content?.startsWith('{"__type":"reservation"')
                      ? 'Activité proposée'
                      : lastMsg.content
                  : 'Aucun message';
                return (
                  <Pressable
                    key={conv.id}
                    style={({ pressed }) => [
                      styles.emptyCard,
                      { borderColor: colors.separator, opacity: pressed ? 0.85 : 1 },
                    ]}
                    onPress={() => router.push(`/chat/${conv.id}`)}
                  >
                    <Image
                      source={{ uri: otherUser?.image_url ?? `https://i.pravatar.cc/100?u=${conv.id}` }}
                      style={styles.convAvatar}
                      resizeMode="cover"
                    />
                    <View style={styles.emptyText}>
                      <Text style={[styles.emptyTitle, { color: colors.navy, fontFamily: FontFamily.mono }]} numberOfLines={1}>
                        {otherUser?.name ?? 'Utilisateur'}
                      </Text>
                      <Text style={[styles.emptySubtitle, { color: colors.textMuted, fontFamily: FontFamily.mono }]} numberOfLines={1}>
                        {preview}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
                  </Pressable>
                );
              })
            )}
          </View>

        </ScrollView>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 72 : 52,
    paddingBottom: 12,
  },
  greeting: { fontSize: 12, marginBottom: 2 },
  name: { fontSize: 30, letterSpacing: -0.5 },
  msgBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search bar (in beige zone, above white card)
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  searchGo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  filterIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  // White card
  card: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 100,
    gap: 28,
  },

  // Generic section
  section: { gap: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  sectionTitle: { fontSize: 18, letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 11, fontWeight: '500' },
  sectionLink: { fontSize: 12, fontWeight: '600' },

  // Horizontal scroll
  hScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },

  // Local card
  localCard: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#B0A89A',
  },
  localImg: { ...StyleSheet.absoluteFillObject },
  localInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 12,
    gap: 2,
  },
  localName: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
  localCity: { fontSize: 10, color: 'rgba(255,255,255,0.75)' },

  // Destination card
  destCard: {
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  destInfo: {
    padding: 12,
    gap: 1,
  },
  destCity: { fontSize: 20, color: '#FFFFFF', letterSpacing: -0.5, fontWeight: '700' },
  destCountry: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  // Interest pill
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 0.5,
  },
  pillText: { fontSize: 13, fontWeight: '500' },

  // Empty state cards
  emptyCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  emptyText: {
    flex: 1,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },

  convAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    flexShrink: 0,
  },

});
