import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type SearchBarProps = Omit<TextInputProps, 'style'> & {
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  iconColor?: string;
};

export const SearchBar = forwardRef<TextInput, SearchBarProps>(function SearchBar(
  {
    containerStyle,
    inputStyle,
    iconColor,
    placeholder = 'Local, Destination, Category',
    autoCapitalize = 'none',
    returnKeyType = 'search',
    clearButtonMode = 'while-editing',
    ...textInputProps
  },
  ref,
) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const resolvedIconColor = iconColor ?? theme.icon;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.inputBackground,
          borderColor: theme.inputBorder,
        },
        containerStyle,
      ]}
    >
      <MaterialIcons name="search" size={18} color={resolvedIconColor} style={styles.icon} />
      <TextInput
        ref={ref}
        placeholder={placeholder}
        placeholderTextColor={theme.placeholder}
        style={[styles.input, { color: theme.text }, inputStyle]}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        clearButtonMode={clearButtonMode}
        accessibilityRole="search"
        {...textInputProps}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.25,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#0E224A',
    fontSize: 14,
    fontWeight: '400',
    minHeight: 40,
  },
});
