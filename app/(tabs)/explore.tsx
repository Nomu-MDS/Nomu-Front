import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FilterModal, EMPTY_FILTERS, type FilterState } from '@/components/explore/filter-modal';
import { ProfileCard, type ProfileHit } from '@/components/ui/profile-card';
import { SearchBar } from '@/components/ui/search-bar';
import { API_BASE_URL } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDebounce } from '@/hooks/use-debounce';
import { getToken } from '@/lib/session';
import { useRouter } from 'expo-router';

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

export default function ExploreScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>(EMPTY_FILTERS);

  const debouncedQuery = useDebounce(query, 400);

  const performSearch = useCallback(async (
    searchQuery: string,
    filters: FilterState,
    isRefresh = false
  ) => {
    if (!isRefresh) setLoading(true);

    try {
      const token = getToken();
      const params = new URLSearchParams();

      const queryParts: string[] = [];
      if (searchQuery) queryParts.push(searchQuery);

      const allFilterTerms = [
        ...filters.cities,
        ...filters.languages,
        ...filters.categories,
        ...filters.sexes,
        ...filters.prices,
      ];
      if (allFilterTerms.length > 0) queryParts.push(allFilterTerms.join(' '));

      const combinedQuery = queryParts.join(' ');
      if (combinedQuery) params.append('q', combinedQuery);
      params.append('limit', '20');

      const url = `${API_BASE_URL}/users/search?${params.toString()}`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(url, { headers });

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

  const router = useRouter();

  const renderItem = useCallback(({ item }: { item: ProfileHit }) => (
    <ProfileCard
      profile={item}
      onPress={() => {
        router.push(`/user-profile?id=${item.user_id}`);
      }}
    />
  ), [router]);

  const keyExtractor = useCallback((item: ProfileHit) => item.id.toString(), []);

  const EmptyComponent = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons
          name={hasSearched ? 'search-off' : 'explore'}
          size={64}
          color={theme.icon}
        />
        <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
          {hasSearched ? 'Aucun résultat' : 'Explorez des profils'}
        </ThemedText>
        <ThemedText style={[styles.emptySubtitle, { color: theme.icon }]}>
          {hasSearched
            ? 'Essayez de modifier votre recherche ou vos filtres'
            : 'Recherchez par nom, intérêts ou localisation'}
        </ThemedText>
      </View>
    );
  }, [loading, hasSearched, theme]);

  const activeFilterCount = countActiveFilters(activeFilters);

  const HeaderComponent = useCallback(() => (
    <View style={styles.headerContainer}>
      <Pressable
        style={[styles.filterButton, { borderColor: theme.border }]}
        onPress={() => setFilterModalVisible(true)}
      >
        <MaterialIcons name="tune" size={20} color={theme.text} />
        <ThemedText style={styles.filterButtonText}>Filtres</ThemedText>
        {activeFilterCount > 0 && (
          <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.filterBadgeText}>{activeFilterCount}</ThemedText>
          </View>
        )}
      </Pressable>

      {hasSearched && !loading && (
        <ThemedText style={[styles.resultsCount, { color: theme.icon }]}>
          {results.length} profil{results.length !== 1 ? 's' : ''} trouvé{results.length !== 1 ? 's' : ''}
        </ThemedText>
      )}
    </View>
  ), [activeFilterCount, hasSearched, loading, results.length, theme]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.topHeader, { borderBottomColor: theme.border }]}>
        <ThemedText type="title" style={styles.title}>Explorer</ThemedText>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un profil..."
          onSubmitEditing={() => performSearch(query, activeFilters)}
        />
      </View>

      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={HeaderComponent}
        ListEmptyComponent={EmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerContainer: {
    gap: 8,
    paddingBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  filterBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultsCount: {
    fontSize: 13,
    marginTop: 4,
  },
  listContent: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  separator: {
    height: 12,
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
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 180,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
