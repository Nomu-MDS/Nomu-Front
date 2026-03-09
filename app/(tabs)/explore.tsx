import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FilterModal, EMPTY_FILTERS, type FilterState } from '@/components/explore/filter-modal';
import { SearchBar } from '@/components/ui/search-bar';
import { type ProfileHit } from '@/components/ui/profile-card';
import { API_BASE_URL } from '@/constants/config';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDebounce } from '@/hooks/use-debounce';
import { getToken } from '@/lib/session';

interface SearchResult {
  hits: ProfileHit[];
  query: string;
  limit: number;
  estimatedTotalHits: number;
}

function countActiveFilters(filters: FilterState): number {
  return (
    filters.cities.length +
    filters.languages.length +
    filters.categories.length +
    filters.sexes.length +
    filters.prices.length
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PAD = 16;
const COL_GAP = 10;
const CARD_W = (SCREEN_WIDTH - H_PAD * 2 - COL_GAP) / 2;
const CARD_H = CARD_W * (4 / 3);

type ViewMode = 'grid' | 'list';

// ── Grid card ──────────────────────────────────────────────────────────────────

function GridCard({
  profile,
  fontsLoaded,
  onPress,
}: {
  profile: ProfileHit;
  fontsLoaded: boolean;
  onPress: () => void;
}) {
  const { shadows } = useTheme();

  const _pid = profile.user_id || profile.id || 0;
  const imageUri = profile.image_url ?? `https://i.pravatar.cc/500?img=${(_pid % 70) + 1}`;
  const location = profile.city || profile.country || profile.location || null;
  const firstInterest = profile.interests?.[0] ?? null;

  return (
    <Pressable
      style={[gridStyles.card, shadows.md, { width: CARD_W, height: CARD_H }]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false }}
    >
      <Image source={{ uri: imageUri }} style={gridStyles.image} resizeMode="cover" />

      <LinearGradient
        colors={['transparent', 'rgba(14,34,74,0.45)', 'rgba(14,34,74,0.90)']}
        locations={[0.3, 0.6, 1]}
        style={gridStyles.gradient}
      />

      {firstInterest && (
        <View style={gridStyles.tag}>
          <Text style={[gridStyles.tagText, { fontFamily: FontFamily.mono }]} numberOfLines={1}>
            {firstInterest}
          </Text>
        </View>
      )}

      <View style={gridStyles.bottom}>
        <Text
          style={[gridStyles.name, fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {}]}
          numberOfLines={1}
        >
          {profile.name}
        </Text>
        {location && (
          <View style={gridStyles.locationRow}>
            <MaterialIcons name="location-on" size={11} color="rgba(255,255,255,0.7)" />
            <Text style={[gridStyles.locationText, { fontFamily: FontFamily.mono }]} numberOfLines={1}>
              {location}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const gridStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#C8C0B4',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  tag: {
    position: 'absolute',
    top: 12,
    left: 10,
    backgroundColor: 'rgba(255,106,87,0.88)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
  },
  tagText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 3,
  },
  name: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.1,
    flex: 1,
  },
});

// ── List card ──────────────────────────────────────────────────────────────────

function ListCard({
  profile,
  fontsLoaded,
  onPress,
}: {
  profile: ProfileHit;
  fontsLoaded: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const pid      = profile.user_id || profile.id || 0;
  const imageUri = profile.image_url ?? `https://i.pravatar.cc/500?img=${(pid % 70) + 1}`;
  const location = profile.city || profile.country || profile.location || null;

  return (
    <Pressable style={[listStyles.card, { backgroundColor: colors.surface, borderColor: 'rgba(70,94,138,0.1)' }]} onPress={onPress}>
      <Image source={{ uri: imageUri }} style={listStyles.photo} resizeMode="cover" />
      <View style={listStyles.info}>
        <Text style={[listStyles.name, { color: colors.navy, fontFamily: fontsLoaded ? FontFamily.rocaRg : undefined }]} numberOfLines={1}>
          {profile.name}
        </Text>
        {location && (
          <View style={listStyles.locationRow}>
            <MaterialIcons name="location-on" size={11} color={colors.textMuted} />
            <Text style={[listStyles.location, { color: colors.textMuted, fontFamily: FontFamily.poppins }]} numberOfLines={1}>
              {location}
            </Text>
          </View>
        )}
        {profile.interests && profile.interests.length > 0 && (
          <View style={listStyles.tags}>
            {profile.interests.slice(0, 3).map(tag => (
              <View key={tag} style={[listStyles.tag, { backgroundColor: 'rgba(70,94,138,0.08)' }]}>
                <Text style={[listStyles.tagText, { color: colors.secondary, fontFamily: FontFamily.poppins }]} numberOfLines={1}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <MaterialIcons name="chevron-right" size={20} color="rgba(70,94,138,0.3)" />
    </Pressable>
  );
}

const listStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: H_PAD,
    marginBottom: 10,
  },
  photo: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#C8C0B4' },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 15, letterSpacing: -0.2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  location: { fontSize: 12 },
  tags: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  tagText: { fontSize: 10 },
});

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [fontsLoaded] = useFonts({
    'RocaOne-Rg':      require('@/assets/fonts/roca/RocaOne-Rg.ttf'),
    'RocaOne-Bold':     require('@/assets/fonts/roca/RocaOne-Bold.ttf'),
    'Poppins-Regular':  require('@/assets/fonts/poppins/Poppins-Regular.ttf'),
    'Poppins-Medium':   require('@/assets/fonts/poppins/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('@/assets/fonts/poppins/Poppins-SemiBold.ttf'),
    'Poppins-Bold':     require('@/assets/fonts/poppins/Poppins-Bold.ttf'),
  });

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const rawParams = useLocalSearchParams<{
    cities?: string;
    languages?: string;
    categories?: string;
    sexes?: string;
    prices?: string;
  }>();

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>(() => ({
    cities:     rawParams.cities     ? rawParams.cities.split(',')     : [],
    languages:  rawParams.languages  ? rawParams.languages.split(',')  : [],
    categories: rawParams.categories ? rawParams.categories.split(',') : [],
    sexes:      rawParams.sexes      ? rawParams.sexes.split(',')      : [],
    prices:     rawParams.prices     ? rawParams.prices.split(',')     : [],
  }));

  // Resync quand on navigue depuis home avec des params (tabs gardent le composant monté)
  useEffect(() => {
    setActiveFilters({
      cities:     rawParams.cities     ? rawParams.cities.split(',')     : [],
      languages:  rawParams.languages  ? rawParams.languages.split(',')  : [],
      categories: rawParams.categories ? rawParams.categories.split(',') : [],
      sexes:      rawParams.sexes      ? rawParams.sexes.split(',')      : [],
      prices:     rawParams.prices     ? rawParams.prices.split(',')     : [],
    });
  }, [rawParams.cities, rawParams.languages, rawParams.categories, rawParams.sexes, rawParams.prices]);

  const debouncedQuery = useDebounce(query, 400);

  const performSearch = useCallback(async (
    searchQuery: string,
    filters: FilterState,
    isRefresh = false,
  ) => {
    if (!isRefresh) setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams();

      const queryParts: string[] = [];
      if (searchQuery) queryParts.push(searchQuery);
      if (filters.cities.length > 0) queryParts.push(filters.cities.join(' '));
      if (queryParts.length > 0) params.append('q', queryParts.join(' '));
      if (filters.categories.length > 0) params.append('filterInterests', filters.categories.join(','));
      params.append('limit', '20');

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/users/search?${params.toString()}`, { headers });
      if (response.ok) {
        const data: SearchResult = await response.json();
        setResults(data.hits);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setHasSearched(true);
    }
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery, activeFilters);
  }, [debouncedQuery, activeFilters, performSearch]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    performSearch(debouncedQuery, activeFilters, true);
  }, [debouncedQuery, activeFilters, performSearch]);

  const handleApplyFilters = useCallback((filters: FilterState) => {
    setActiveFilters(filters);
  }, []);

  const activeFilterCount = countActiveFilters(activeFilters);

  return (
    <View style={[styles.screen, { backgroundColor: colors.beige }]}>

      {/* ── Header beige ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={[styles.title, fontsLoaded ? { fontFamily: FontFamily.rocaBold } : {}, { color: colors.navy }]}>
          Explorer
        </Text>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Nom, ville, intérêt…"
          onSubmitEditing={() => performSearch(query, activeFilters)}
          containerStyle={{ backgroundColor: colors.surface, borderColor: colors.border }}
        />
      </View>

      {/* ── White card section ───────────────────────────────────────────── */}
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>

        {/* Filter + toggle row */}
        <View style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterBtn,
              {
                borderColor: colors.secondary,
                backgroundColor: activeFilterCount > 0 ? colors.secondary : 'transparent',
              },
            ]}
            onPress={() => setFilterModalVisible(true)}
          >
            <MaterialIcons
              name="tune"
              size={15}
              color={activeFilterCount > 0 ? '#FFFFFF' : colors.secondary}
            />
            <Text
              style={[
                styles.filterBtnText,
                {
                  color: activeFilterCount > 0 ? '#FFFFFF' : colors.secondary,
                  fontFamily: FontFamily.mono,
                },
              ]}
            >
              {activeFilterCount > 0 ? `Filtres (${activeFilterCount})` : 'Filtres'}
            </Text>
          </Pressable>

          <View style={styles.rightRow}>
            {hasSearched && !loading && (
              <Text style={[styles.resultsCount, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>
                {results.length} profil{results.length !== 1 ? 's' : ''}
              </Text>
            )}
            <View style={[styles.viewToggle, { backgroundColor: 'rgba(70,94,138,0.08)' }]}>
              <Pressable
                style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
                onPress={() => setViewMode('grid')}
              >
                <MaterialIcons name="grid-view" size={15} color={viewMode === 'grid' ? colors.navy : 'rgba(70,94,138,0.4)'} />
              </Pressable>
              <Pressable
                style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
                onPress={() => setViewMode('list')}
              >
                <MaterialIcons name="format-list-bulleted" size={15} color={viewMode === 'list' ? colors.navy : 'rgba(70,94,138,0.4)'} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Grid / List */}
        <FlatList
          key={viewMode}
          data={results}
          keyExtractor={(item) => item.id.toString()}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.row : undefined}
          contentContainerStyle={viewMode === 'grid' ? styles.gridContent : styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) =>
            viewMode === 'grid' ? (
              <GridCard
                profile={item}
                fontsLoaded={fontsLoaded}
                onPress={() => router.push(`/user-profile?id=${item.user_id}`)}
              />
            ) : (
              <ListCard
                profile={item}
                fontsLoaded={fontsLoaded}
                onPress={() => router.push(`/user-profile?id=${item.user_id}`)}
              />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyContainer}>
                <MaterialIcons
                  name={hasSearched ? 'search-off' : 'explore'}
                  size={56}
                  color={colors.textMuted}
                />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: colors.navy },
                    fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {},
                  ]}
                >
                  {hasSearched ? 'Aucun résultat' : 'Explorez des profils'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontFamily: FontFamily.mono }]}>
                  {hasSearched
                    ? 'Modifiez votre recherche ou vos filtres'
                    : 'Recherchez par nom, ville ou intérêts'}
                </Text>
              </View>
            )
          }
        />

        {loading && !refreshing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </View>

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 72 : 52,
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 14,
  },
  title: {
    fontSize: 38,
    letterSpacing: -1,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    marginBottom: 16,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 3,
    gap: 2,
  },
  viewBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  resultsCount: {
    fontSize: 12,
  },
  gridContent: {
    paddingHorizontal: H_PAD,
    paddingBottom: 100,
    flexGrow: 1,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 100,
    flexGrow: 1,
  },
  row: {
    gap: COL_GAP,
    marginBottom: COL_GAP,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
