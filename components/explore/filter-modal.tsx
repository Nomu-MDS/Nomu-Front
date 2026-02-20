import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFonts } from 'expo-font';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const DARK = '#0e224a';
const BLUE = '#465E8A';
const TAG_BG = 'rgba(70,94,138,0.1)';
const SEARCH_BG = 'rgba(60,60,59,0.8)';
const BEIGE = '#E4DBCB';
const SEPARATOR = '#e8e8e8';

const CITIES = ['New York', 'London', 'Paris', 'Pekin', 'Berlin', 'Rome', 'Tokyo'];
const LANGUAGES = ['French', 'English', 'Spanish', 'Italian', 'Arabic', 'Portugese', 'Mandarin'];
const CATEGORIES = ['Sport', 'Music', 'Food', 'Party', 'Nature', 'Spa', 'Movie'];
const SEXES = ['Women', 'Men', 'Non-binary'];
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
  const [expanded, setExpanded] = useState(true);

  return (
    <View>
      <Pressable style={styles.sectionHeader} onPress={() => setExpanded(!expanded)}>
        <Text style={[styles.sectionTitle, fontsLoaded ? { fontFamily: 'RocaOne-Rg' } : {}]}>
          {title}
        </Text>
        <MaterialIcons
          name={expanded ? 'expand-less' : 'expand-more'}
          size={22}
          color={DARK}
        />
      </Pressable>
      {expanded && (
        <View style={styles.tagsRow}>
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <Pressable
                key={option}
                style={[styles.tag, isSelected && styles.tagSelected]}
                onPress={() => onToggle(option)}
              >
                <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <View style={styles.separator} />
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
  const [filters, setFilters] = useState<FilterState>(initialFilters);

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={[styles.title, fontsLoaded ? { fontFamily: 'RocaOne-Bold' } : {}]}>
            Filters
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            <FilterSection
              title="City"
              options={CITIES}
              selected={filters.cities}
              onToggle={(item) => toggle('cities', item)}
              fontsLoaded={fontsLoaded}
            />
            <FilterSection
              title="Language"
              options={LANGUAGES}
              selected={filters.languages}
              onToggle={(item) => toggle('languages', item)}
              fontsLoaded={fontsLoaded}
            />
            <FilterSection
              title="Categories"
              options={CATEGORIES}
              selected={filters.categories}
              onToggle={(item) => toggle('categories', item)}
              fontsLoaded={fontsLoaded}
            />
            <FilterSection
              title="Sexe"
              options={SEXES}
              selected={filters.sexes}
              onToggle={(item) => toggle('sexes', item)}
              fontsLoaded={fontsLoaded}
            />
            <FilterSection
              title="Price"
              options={PRICES}
              selected={filters.prices}
              onToggle={(item) => toggle('prices', item)}
              fontsLoaded={fontsLoaded}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.searchButton} onPress={handleApply}>
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '88%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    color: DARK,
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
    color: DARK,
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
    borderColor: BLUE,
    backgroundColor: TAG_BG,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagSelected: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  tagText: {
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    color: DARK,
  },
  tagTextSelected: {
    color: '#FFFFFF',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SEPARATOR,
  },
  footer: {
    paddingTop: 20,
  },
  searchButton: {
    backgroundColor: SEARCH_BG,
    borderRadius: 34,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    fontSize: 16,
    fontWeight: '700',
    color: BEIGE,
    letterSpacing: 0.5,
  },
});
