/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const palette = {
  primary: '#FF6A57',
  primaryMuted: '#FF8A78',
  darkPrimary: '#E15B4A',
  textDark: '#0E224A',
  textLight: '#ECEDEE',
  borderLight: '#D9DEE8',
  borderDark: '#2C3038',
  surfaceLight: '#FFFFFF',
  surfaceDark: '#1A1C20',
  iconLight: '#687076',
  iconDark: '#9BA1A6',
};

// Orange accent color for navigation (using palette primary)
const orangeAccent = palette.primary;

const tintColorLight = palette.primary;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: palette.surfaceLight,
    tint: tintColorLight,
    icon: palette.iconLight,
    tabIconDefault: orangeAccent,
    tabIconSelected: orangeAccent,
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E5E7EB',
    primary: palette.primary,
    primaryMuted: palette.primaryMuted,
    border: palette.borderLight,
    surface: palette.surfaceLight,
    inputBorder: palette.borderLight,
    inputBackground: palette.surfaceLight,
    placeholder: '#0E224A99',
  },
  dark: {
    text: palette.textLight,
    background: '#151718',
    tint: orangeAccent,
    icon: palette.iconDark,
    tabIconDefault: orangeAccent,
    tabIconSelected: orangeAccent,
    tabBarBackground: '#151718',
    tabBarBorder: '#374151',
    primary: palette.darkPrimary,
    primaryMuted: palette.primary,
    border: palette.borderDark,
    surface: palette.surfaceDark,
    inputBorder: palette.borderDark,
    inputBackground: '#1E1F22',
    placeholder: '#ECEDEE99',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
