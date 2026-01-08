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
import { FilterBadge } from '@/components/ui/filter-badge';
import { ProfileCard, type ProfileHit } from '@/components/ui/profile-card';
import { SearchBar } from '@/components/ui/search-bar';
import { API_BASE_URL } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDebounce } from '@/hooks/use-debounce';
import { getToken } from '@/lib/session';

interface Interest {
  id: number;
  name: string;
  icon: string | null;
}

interface SearchResult {
  hits: ProfileHit[];
  query: string;
  limit: number;
  estimatedTotalHits: number;
}

export default function ExploreScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // États de recherche
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Filtres
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce de la recherche
  const debouncedQuery = useDebounce(query, 400);

  // Charger les intérêts disponibles
  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/interests`);
        if (response.ok) {
          const data = await response.json();
          setInterests(data);
        }
      } catch (error) {
        console.error('Erreur chargement intérêts:', error);
      }
    };
    fetchInterests();
  }, []);

  // Effectuer la recherche
  const performSearch = useCallback(async (searchQuery: string, filters: string[], isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    try {
      const token = getToken();
      const params = new URLSearchParams();
      
      // Combiner la requête textuelle avec les intérêts sélectionnés
      // (workaround car filterInterests utilise CONTAINS qui n'existe pas dans Meilisearch)
      const queryParts: string[] = [];
      if (searchQuery) queryParts.push(searchQuery);
      if (filters.length > 0) queryParts.push(filters.join(' '));
      
      const combinedQuery = queryParts.join(' ');
      if (combinedQuery) params.append('q', combinedQuery);
      params.append('limit', '20');

      const url = `${API_BASE_URL}/users/search?${params.toString()}`;
      console.log('[Search] GET ->', url);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });
      
      if (response.ok) {
        const data: SearchResult = await response.json();
        console.log('[Search] Résultats:', data.hits.length);
        setResults(data.hits);
      } else {
        console.error('[Search] Erreur:', response.status);
        setResults([]);
      }
    } catch (error) {
      console.error('[Search] Erreur réseau:', error);
      setResults([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setHasSearched(true);
    }
  }, []);

  // Recherche automatique lors du changement de query ou filtres
  useEffect(() => {
    performSearch(debouncedQuery, selectedInterests);
  }, [debouncedQuery, selectedInterests, performSearch]);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    performSearch(debouncedQuery, selectedInterests, true);
  }, [debouncedQuery, selectedInterests, performSearch]);

  // Toggle filtre intérêt
  const toggleInterest = useCallback((interestName: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestName)
        ? prev.filter((i) => i !== interestName)
        : [...prev, interestName]
    );
  }, []);

  // Clear tous les filtres
  const clearFilters = useCallback(() => {
    setSelectedInterests([]);
  }, []);

  // Render item pour FlatList
  const renderItem = useCallback(({ item }: { item: ProfileHit }) => (
    <ProfileCard
      profile={item}
      onPress={() => {
        // TODO: Naviguer vers le profil détaillé
        console.log('Profil sélectionné:', item.id);
      }}
    />
  ), []);

  // Key extractor
  const keyExtractor = useCallback((item: ProfileHit) => item.id.toString(), []);

  // Empty state component
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

  // Header component (barre de recherche + filtres)
  const HeaderComponent = useCallback(() => (
    <View style={styles.headerContainer}>
      {/* Filtres actifs */}
      {selectedInterests.length > 0 && (
        <View style={styles.activeFiltersRow}>
          <ThemedText style={[styles.activeFiltersLabel, { color: theme.icon }]}>
            Filtres actifs:
          </ThemedText>
          <View style={styles.activeFiltersBadges}>
            {selectedInterests.map((interest) => (
              <FilterBadge
                key={interest}
                label={interest}
                selected
                onPress={() => toggleInterest(interest)}
              />
            ))}
            <Pressable onPress={clearFilters} hitSlop={8}>
              <ThemedText style={[styles.clearFilters, { color: theme.primary }]}>
                Tout effacer
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Bouton filtres */}
      <Pressable
        style={[styles.filterButton, { borderColor: theme.border }]}
        onPress={() => setShowFilters(!showFilters)}
      >
        <MaterialIcons name="tune" size={20} color={theme.text} />
        <ThemedText style={styles.filterButtonText}>
          Filtrer par intérêts
        </ThemedText>
        <MaterialIcons
          name={showFilters ? 'expand-less' : 'expand-more'}
          size={20}
          color={theme.icon}
        />
      </Pressable>

      {/* Panel de filtres */}
      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.filtersBadges}>
            {interests.map((interest) => (
              <FilterBadge
                key={interest.id}
                label={interest.name}
                selected={selectedInterests.includes(interest.name)}
                onPress={() => toggleInterest(interest.name)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Compteur de résultats */}
      {hasSearched && !loading && (
        <ThemedText style={[styles.resultsCount, { color: theme.icon }]}>
          {results.length} profil{results.length !== 1 ? 's' : ''} trouvé{results.length !== 1 ? 's' : ''}
        </ThemedText>
      )}
    </View>
  ), [selectedInterests, showFilters, interests, results.length, hasSearched, loading, theme, toggleInterest, clearFilters]);

  return (
    <ThemedView style={styles.container}>
      {/* Header fixe avec titre et recherche */}
      <View style={[styles.topHeader, { borderBottomColor: theme.border }]}>
        <ThemedText type="title" style={styles.title}>Explorer</ThemedText>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un profil..."
          onSubmitEditing={() => performSearch(query, selectedInterests)}
        />
      </View>

      {/* Liste des résultats */}
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

      {/* Loading overlay */}
      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
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
    gap: 12,
    paddingBottom: 8,
  },
  activeFiltersRow: {
    gap: 8,
  },
  activeFiltersLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeFiltersBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  clearFilters: {
    fontSize: 13,
    fontWeight: '600',
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
  filtersPanel: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filtersBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultsCount: {
    fontSize: 13,
    marginTop: 4,
  },
  listContent: {
    padding: 20,
    paddingTop: 16,
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
