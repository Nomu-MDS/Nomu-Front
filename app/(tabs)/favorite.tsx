import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFonts } from 'expo-font';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function FavoriteScreen() {
  const { colors } = useTheme();

  const [fontsLoaded] = useFonts({
    'RocaOne-Rg': require('@/assets/fonts/roca/RocaOne-Rg.ttf'),
    'RocaOne-Bold': require('@/assets/fonts/roca/RocaOne-Bold.ttf'),
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.beige }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text
          style={[
            styles.pageTitle,
            { color: colors.navy },
            fontsLoaded ? { fontFamily: FontFamily.rocaBold } : {},
          ]}
        >
          Réservations
        </Text>
      </View>

      {/* White card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.center}>
          <View style={[styles.iconWrapper, { backgroundColor: colors.tagBackground }]}>
            <MaterialIcons name="calendar-today" size={44} color={colors.secondary} />
          </View>

          <Text
            style={[
              styles.title,
              { color: colors.navy },
              fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {},
            ]}
          >
            Bientôt disponible
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: FontFamily.mono }]}>
            La gestion des réservations arrive prochainement. Restez connecté !
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 72 : 52,
    paddingBottom: 20,
  },
  pageTitle: {
    fontSize: 30,
    letterSpacing: -0.5,
  },
  card: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
});
