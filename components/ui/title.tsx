import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type TitleProps = Omit<TextProps, 'style'> & {
  text: string;
  color?: string;
  style?: TextStyle;
  size?: number;
};

export const Title = React.memo(function Title({
  text,
  color,
  style,
  size = 25,
  ...textProps
}: TitleProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColor = color ?? Colors[colorScheme].primary;

  return (
    <Text
      {...textProps}
      style={[
        styles.base,
        { color: themeColor, fontSize: size },
        style,
      ]}
    >
      {text}
    </Text>
  );
});

const styles = StyleSheet.create({
  base: {
    fontWeight: '700',
    fontFamily: 'New Order',
  },
});
