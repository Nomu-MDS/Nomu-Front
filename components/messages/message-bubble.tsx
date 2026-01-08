// Composant pour afficher une bulle de message
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Message } from '@/types/message';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, isCurrentUser ? styles.sentContainer : styles.receivedContainer]}>
      <View
        style={[
          styles.bubble,
          isCurrentUser
            ? { backgroundColor: theme.primary }
            : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
        ]}
      >
        {/* Pièce jointe (image) */}
        {message.attachment && (
          <Image
            source={{ uri: message.attachment }}
            style={styles.attachment}
            resizeMode="cover"
          />
        )}

        {/* Contenu du message */}
        {message.content && (
          <ThemedText
            style={[
              styles.content,
              { color: isCurrentUser ? '#FFFFFF' : theme.text },
            ]}
          >
            {message.content}
          </ThemedText>
        )}

        {/* Timestamp et statut de lecture */}
        <View style={styles.footer}>
          <ThemedText
            style={[
              styles.time,
              { color: isCurrentUser ? '#FFFFFF' : theme.icon, opacity: 0.7 },
            ]}
          >
            {formatTime(message.createdAt)}
          </ThemedText>
          {isCurrentUser && (
            <ThemedText style={[styles.readStatus, { color: '#FFFFFF', opacity: 0.7 }]}>
              {message.read ? '✓✓' : '✓'}
            </ThemedText>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  sentContainer: {
    alignItems: 'flex-end',
  },
  receivedContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 20,
    padding: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  attachment: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  content: {
    fontSize: 15,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  time: {
    fontSize: 11,
  },
  readStatus: {
    fontSize: 12,
  },
});
