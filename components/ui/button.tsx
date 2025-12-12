import React from 'react';
import {
    Pressable,
    type PressableProps,
    StyleSheet,
    Text,
    type TextStyle,
    type ViewStyle,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ButtonSize = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  fullWidth?: boolean;
  size?: ButtonSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  md: { paddingVertical: 12, paddingHorizontal: 16 },
  lg: { paddingVertical: 16, paddingHorizontal: 20 },
};

export const Button = React.memo(function Button({
  label,
  fullWidth = true,
  size = 'md',
  disabled,
  style,
  textStyle,
  ...pressableProps
}: ButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={pressableProps.accessibilityLabel ?? label}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        sizeStyles[size],
        { backgroundColor: theme.primary, shadowColor: theme.primaryMuted },
        pressed && styles.pressed,
        disabled && [styles.disabled, { backgroundColor: theme.primaryMuted }],
        style,
      ]}
      {...pressableProps}
    >
      <Text style={[styles.label, textStyle]} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    width: 'auto',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 34,
    overflow: 'hidden',
    gap: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.6,
  },
});
