// Composant pour l'indicateur "en train d'écrire"
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TypingIndicatorProps {
  userName: string;
}

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Animations pour les 3 points
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createAnimation = (value: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    const animations = Animated.parallel([
      createAnimation(dot1Opacity, 0),
      createAnimation(dot2Opacity, 200),
      createAnimation(dot3Opacity, 400),
    ]);

    animations.start();

    return () => {
      animations.stop();
    };
  }, [dot1Opacity, dot2Opacity, dot3Opacity]);

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <ThemedText style={[styles.text, { color: theme.icon }]}>
          {userName} est en train d'écrire
        </ThemedText>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { backgroundColor: theme.icon, opacity: dot1Opacity }]} />
          <Animated.View style={[styles.dot, { backgroundColor: theme.icon, opacity: dot2Opacity }]} />
          <Animated.View style={[styles.dot, { backgroundColor: theme.icon, opacity: dot3Opacity }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 20,
    padding: 12,
    paddingVertical: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
