import { Colors, FontFamily, Radii, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from './use-color-scheme';

/**
 * Hook central du design system.
 * Retourne tous les tokens (couleurs, polices, espacements, rayons, ombres)
 * adaptés au mode clair/sombre courant.
 *
 * Usage :
 *   const { colors, fonts, spacing, radii, shadows } = useTheme();
 */
export function useTheme() {
  const colorScheme = useColorScheme() ?? 'light';
  return {
    colors: Colors[colorScheme],
    fonts: FontFamily,
    spacing: Spacing,
    radii: Radii,
    shadows: Shadows,
    isDark: colorScheme === 'dark',
  };
}
