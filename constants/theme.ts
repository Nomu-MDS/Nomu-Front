import { Platform } from 'react-native';

// ─── Palette (source of truth) ──────────────────────────────────────────────
// Toutes les valeurs brutes de couleur. Ne jamais utiliser directement dans les
// composants — utiliser les tokens sémantiques de `Colors` ci-dessous.
const palette = {
  // Brand red
  primary: '#AF3437',
  primaryMuted: '#C55558',
  darkPrimary: '#8F2B2E',

  // Brand blue (accent secondaire)
  secondary: '#465E8A',
  secondaryMuted: '#5A7AAA',
  darkSecondary: '#3A4F75',

  // Beiges / crème
  cream: '#E9E0D0',    // fond d'écran (messages)
  beige: '#E4DBCB',    // icône active tab, bouton search filter
  darkCream: '#1F1A14',

  // Surfaces
  surfaceLight: '#FFFFFF',
  surfaceDark: '#1A1C20',

  // Texte
  heading: '#22172A',      // titres principaux (plum foncé)
  navy: '#0E224A',         // labels, titres de section (bleu marine)
  charcoal: '#3C3C3B',     // body text, bulles de messages
  textLight: '#ECEDEE',
  textSecondary: '#6C727F', // texte atténué (preview message)
  textMuted: '#9EA3AE',    // très atténué (timestamps)

  // Bordures & séparateurs
  borderLight: '#D9DEE8',
  borderDark: '#2C3038',
  separator: '#E8E8E8',

  // Icônes
  iconLight: '#687076',
  iconDark: '#9BA1A6',

  // États
  success: '#4CAF50',
};

// ─── Tokens sémantiques (light / dark) ──────────────────────────────────────
export const Colors = {
  light: {
    // Base
    text: '#11181C',
    background: palette.surfaceLight,
    tint: palette.primary,
    icon: palette.iconLight,
    border: palette.borderLight,
    surface: palette.surfaceLight,
    separator: palette.separator,

    // Brand
    primary: palette.primary,
    primaryMuted: palette.primaryMuted,
    secondary: palette.secondary,
    secondaryText: palette.beige,   // texte/icônes sur fond secondary

    // Backgrounds d'écran
    cream: palette.cream,           // fond beige clair (écran messages)
    beige: palette.beige,           // accent beige

    // Hiérarchie texte
    heading: palette.heading,       // #22172A — grands titres
    navy: palette.navy,             // #0E224A — labels, titres section
    body: palette.charcoal,         // #3C3C3B — corps du texte
    textSecondary: palette.textSecondary,
    textMuted: palette.textMuted,

    // Inputs
    inputBorder: palette.borderLight,
    inputBackground: palette.surfaceLight,
    placeholder: '#0E224A99',

    // Tab bar
    tabBarBackground: palette.surfaceLight,
    tabBarBorder: '#E5E7EB',
    tabIconDefault: palette.secondary,
    tabIconSelected: palette.secondary,
    tabActiveCircle: palette.secondary,
    tabActiveIcon: palette.beige,

    // Bulles de messages
    messageSent: palette.charcoal,              // #3C3C3B
    messageReceived: 'rgba(60,60,59,0.41)',
    messageSentText: palette.surfaceLight,
    messageReceivedText: palette.charcoal,

    // Tags (filter modal)
    tagBackground: 'rgba(70,94,138,0.1)',
    tagSelectedBackground: palette.secondary,
    tagText: palette.navy,
    tagSelectedText: palette.surfaceLight,

    // Bouton de recherche (filter modal)
    searchButton: 'rgba(60,60,59,0.8)',

    // Feedback
    unread: palette.success,
  },

  dark: {
    text: palette.textLight,
    background: '#151718',
    tint: palette.primary,
    icon: palette.iconDark,
    border: palette.borderDark,
    surface: palette.surfaceDark,
    separator: '#2C3038',

    primary: palette.darkPrimary,
    primaryMuted: palette.primary,
    secondary: palette.secondaryMuted,
    secondaryText: '#C8BFB0',

    cream: palette.darkCream,
    beige: '#C8BFB0',

    heading: '#E8DFCF',
    navy: '#A0AFCF',
    body: '#C0BFBE',
    textSecondary: '#8A8F9A',
    textMuted: '#6E7380',

    inputBorder: palette.borderDark,
    inputBackground: '#1E1F22',
    placeholder: '#ECEDEE99',

    tabBarBackground: '#151718',
    tabBarBorder: '#374151',
    tabIconDefault: palette.secondaryMuted,
    tabIconSelected: palette.secondaryMuted,
    tabActiveCircle: palette.secondaryMuted,
    tabActiveIcon: '#C8BFB0',

    messageSent: '#4A4A49',
    messageReceived: 'rgba(80,80,79,0.5)',
    messageSentText: '#FFFFFF',
    messageReceivedText: '#C0BFBE',

    tagBackground: 'rgba(90,122,170,0.15)',
    tagSelectedBackground: palette.secondaryMuted,
    tagText: '#A0AFCF',
    tagSelectedText: '#FFFFFF',

    searchButton: 'rgba(80,80,79,0.8)',

    unread: '#66BB6A',
  },
};

// ─── Espacement ──────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

// ─── Border radii ────────────────────────────────────────────────────────────
export const Radii = {
  sm: 4,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 25,
  '3xl': 32,
  full: 100,
} as const;

// ─── Ombres ──────────────────────────────────────────────────────────────────
export const Shadows = {
  sm: {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
} as const;

// ─── Typographie ─────────────────────────────────────────────────────────────
export const FontFamily = {
  rocaBold:        'RocaOne-Bold',
  rocaRg:          'RocaOne-Rg',
  poppins:         'Poppins-Regular',
  poppinsMedium:   'Poppins-Medium',
  poppinsSemiBold: 'Poppins-SemiBold',
  poppinsBold:     'Poppins-Bold',
  /** @deprecated utilise poppins à la place */
  mono: 'Poppins-Regular',
};

// Conservé pour la rétrocompatibilité avec les imports existants
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
