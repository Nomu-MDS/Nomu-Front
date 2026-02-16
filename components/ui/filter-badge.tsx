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

  const backgroundColor = selected ? '#465E8A' : 'rgba(70, 94, 138, 0.15)';
  const borderColor = '#465E8A';
  const textColor = selected ? '#E9E0D0' : '#E9E0D0';
  const iconColor = '#E9E0D0';

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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
