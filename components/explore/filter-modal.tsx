import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFonts } from 'expo-font';
import React, { useEffect, useRef, useState } from 'react';
import {
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

const CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse',
  'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Lille',
  'Grenoble', 'Rennes', 'Brest', 'Annecy', 'Chambéry',
  'Nancy', 'Metz', 'Bayonne', 'Pau', 'Reims',
  'Tours', 'La Rochelle', 'Caen', 'Rouen', 'Dijon',
  'Clermont-Ferrand', 'Perpignan', 'Toulon', 'Avignon', 'Aix-en-Provence',
];
const LANGUAGES = ['Français', 'Anglais', 'Espagnol', 'Italien', 'Arabe', 'Portugais', 'Mandarin'];
const SEXES = ['Femme', 'Homme', 'Non-binaire'];
const PRICES = ['10-20 €', '20-30 €', '30-40 €', '40-50 €', '50-60 €', '60-70 €', '70-80 €'];

export interface FilterState {
  cities: string[];
  languages: string[];
  categories: string[];
  sexes: string[];
  prices: string[];
}

export const EMPTY_FILTERS: FilterState = {
  cities: [],
  languages: [],
  categories: [],
  sexes: [],
  prices: [],
};

interface FilterSectionProps {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
  fontsLoaded: boolean;
}

function FilterSection({ title, options, selected, onToggle, fontsLoaded }: FilterSectionProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(true);

  return (
    <View>
      <Pressable style={styles.sectionHeader} onPress={() => setExpanded(!expanded)}>
        <Text style={[styles.sectionTitle, { color: colors.navy }, fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {}]}>
          {title}
        </Text>
        <MaterialIcons
          name={expanded ? 'expand-less' : 'expand-more'}
          size={22}
          color={colors.navy}
        />
      </Pressable>
      {expanded && (
        <View style={styles.tagsRow}>
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <Pressable
                key={option}
                style={[
                  styles.tag,
                  { borderColor: colors.secondary, backgroundColor: colors.tagBackground },
                  isSelected && { backgroundColor: colors.tagSelectedBackground, borderColor: colors.tagSelectedBackground },
                ]}
                onPress={() => onToggle(option)}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: colors.tagText },
                    isSelected && { color: colors.tagSelectedText },
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <View style={[styles.separator, { backgroundColor: colors.separator }]} />
    </View>
  );
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
}

export function FilterModal({ visible, onClose, onApply, initialFilters }: FilterModalProps) {
  const { colors } = useTheme();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const categoriesFetched = useRef(false);

  useEffect(() => {
    if (visible) setFilters(initialFilters);
  }, [visible]);

  useEffect(() => {
    if (categoriesFetched.current) return;
    categoriesFetched.current = true;
    fetch(`${API_BASE_URL}/interests`)
      .then((res) => res.json())
      .then((data: { id: number; name: string }[]) => {
        setAvailableCategories(data.map((i) => i.name));
      })
      .catch(() => {});
  }, []);

  const [fontsLoaded] = useFonts({
    'RocaOne-Rg': require('@/assets/fonts/roca/RocaOne-Rg.ttf'),
    'RocaOne-Bold': require('@/assets/fonts/roca/RocaOne-Bold.ttf'),
  });

  const toggle = (key: keyof FilterState, item: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(item)
        ? prev[key].filter((i) => i !== item)
        : [...prev[key], item],
    }));
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const isIOS = Platform.OS === 'ios';

  const sheetContent = (
    <View style={[
      isIOS ? styles.sheetIOS : styles.sheetAndroid,
      { backgroundColor: colors.surface },
    ]}>
      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      <Text style={[styles.title, { color: colors.navy }, fontsLoaded ? { fontFamily: FontFamily.rocaBold } : {}]}>
        Filtres
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} bounces={false}>
        <FilterSection
          title="Ville"
          options={CITIES}
          selected={filters.cities}
          onToggle={(item) => toggle('cities', item)}
          fontsLoaded={fontsLoaded}
        />
        <FilterSection
          title="Langue"
          options={LANGUAGES}
          selected={filters.languages}
          onToggle={(item) => toggle('languages', item)}
          fontsLoaded={fontsLoaded}
        />
        <FilterSection
          title="Centres d'intérêt"
          options={availableCategories}
          selected={filters.categories}
          onToggle={(item) => toggle('categories', item)}
          fontsLoaded={fontsLoaded}
        />
        <FilterSection
          title="Genre"
          options={SEXES}
          selected={filters.sexes}
          onToggle={(item) => toggle('sexes', item)}
          fontsLoaded={fontsLoaded}
        />
        <FilterSection
          title="Prix"
          options={PRICES}
          selected={filters.prices}
          onToggle={(item) => toggle('prices', item)}
          fontsLoaded={fontsLoaded}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.searchButton, { backgroundColor: colors.searchButton }]} onPress={handleApply}>
          <Text style={[styles.searchButtonText, { color: colors.beige, fontFamily: FontFamily.mono }]}>
            Appliquer
          </Text>
        </Pressable>
      </View>
    </View>
  );

  if (isIOS) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        {sheetContent}
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        {sheetContent}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Android wrapper
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdrop: {
    flex: 1,
  },

  // Sheet variants
  sheetIOS: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sheetAndroid: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 24,
    paddingBottom: 24,
    maxHeight: '88%',
  },

  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
    fontWeight: '700',
  },
  scroll: {
    flexShrink: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
  },
  tag: {
    borderRadius: 4,
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  footer: {
    paddingTop: 20,
  },
  searchButton: {
    borderRadius: 34,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
