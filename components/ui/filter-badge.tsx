import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, type TextStyle, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type FilterBadgeProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export const FilterBadge = React.memo(function FilterBadge({
  label,
  selected = false,
  onPress,
  style,
  textStyle,
}: FilterBadgeProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const backgroundColor = selected ? theme.primary : 'rgba(255, 106, 87, 0.10)';
  const borderColor = selected ? theme.primary : theme.primary;
  const textColor = selected ? '#FFFFFF' : theme.text;
  const iconColor = '#FFFFFF';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: textColor }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
      {selected ? <MaterialIcons name="close" size={14} color={iconColor} /> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 0.5,
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '400',
  },
});
