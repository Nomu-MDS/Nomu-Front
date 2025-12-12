import React, { useMemo, useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    View,
    type KeyboardTypeOptions,
    type TextInputProps,
    type TextStyle,
    type ViewStyle,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type InputType = 'text' | 'password' | 'email' | 'number';

export type InputProps = Omit<TextInputProps, 'style' | 'secureTextEntry' | 'keyboardType'> & {
  type?: InputType;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  fullWidth?: boolean;
  label?: string;
  helperText?: string;
  helperStyle?: TextStyle;
};

type InputConfig = {
  secureTextEntry: boolean;
  keyboardType: KeyboardTypeOptions;
  autoCapitalize: TextInputProps['autoCapitalize'];
  autoCorrect: boolean | undefined;
};

export function Input({
  type = 'text',
  containerStyle,
  inputStyle,
  fullWidth = true,
  label,
  helperText,
  helperStyle,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const [focused, setFocused] = useState(false);

  const { secureTextEntry, keyboardType, autoCapitalize, autoCorrect } = useMemo<InputConfig>(() => {
    const base: InputConfig = {
      secureTextEntry: false,
      keyboardType: 'default',
      autoCapitalize: 'sentences',
      autoCorrect: true,
    };

    if (type === 'password') {
      return { ...base, secureTextEntry: true, autoCapitalize: 'none', autoCorrect: false };
    }

    if (type === 'email') {
      return { ...base, keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false };
    }

    if (type === 'number') {
      return { ...base, keyboardType: 'numeric', autoCapitalize: 'none', autoCorrect: false };
    }

    return base;
  }, [type]);

  return (
    <View style={fullWidth && styles.fullWidth}>
      <View
        style={[
          styles.container,
          {
            borderColor: focused ? Colors[colorScheme].primary : Colors[colorScheme].inputBorder,
            backgroundColor: Colors[colorScheme].inputBackground,
          },
          containerStyle,
        ]}
      >
        {label ? (
          <Text style={[styles.label, { color: Colors[colorScheme].placeholder }]} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
        <TextInput
          {...rest}
          style={[
            styles.input,
            { color: Colors[colorScheme].text },
            inputStyle,
          ]}
          placeholderTextColor={Colors[colorScheme].placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
      </View>
      {helperText ? (
        <Text
          style={[
            styles.helper,
            { color: Colors[colorScheme].placeholder },
            helperStyle,
          ]}
          numberOfLines={1}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.25,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 54,
  },
  fullWidth: {
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    paddingTop: 12,
  },
  label: {
    position: 'absolute',
    top: 8,
    left: 16,
    fontSize: 10,
    fontWeight: '400',
  },
  helper: {
    marginTop: 6,
    fontSize: 8,
    fontWeight: '400',
  },
});
