import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';

import type { Message } from '@/types/message';

const RECEIVED_BG = 'rgba(60,60,59,0.41)';
const SENT_BG = '#3c3c3b';
const TEXT_COLOR = '#3c3c3b';
const SENT_TEXT_COLOR = '#FFFFFF';
const TIMESTAMP_COLOR = '#3c3c3b';
const MONO = Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' });

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const m = date.getMinutes().toString().padStart(2, '0');
    const period = date.getHours() >= 12 ? 'PM' : 'AM';
    const h12 = date.getHours() % 12 || 12;
    return `${h12}:${m} ${period}`;
  };

  return (
    <View style={[styles.wrapper, isCurrentUser ? styles.wrapperSent : styles.wrapperReceived]}>
      <View style={[styles.bubble, isCurrentUser ? styles.bubbleSent : styles.bubbleReceived]}>
        {message.attachment && (
          <Image
            source={{ uri: message.attachment }}
            style={styles.attachment}
            resizeMode="cover"
          />
        )}
        {message.content ? (
          <Text style={[styles.content, { color: isCurrentUser ? SENT_TEXT_COLOR : TEXT_COLOR }]}>
            {message.content}
          </Text>
        ) : null}
      </View>

      <Text style={[styles.timestamp, isCurrentUser ? styles.timestampRight : styles.timestampLeft]}>
        {formatTime(message.createdAt)}
        {isCurrentUser ? (message.read ? '  ✓✓' : '  ✓') : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 3,
    paddingHorizontal: 12,
    gap: 4,
  },
  wrapperSent: {
    alignItems: 'flex-end',
  },
  wrapperReceived: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  bubbleReceived: {
    backgroundColor: RECEIVED_BG,
  },
  bubbleSent: {
    backgroundColor: SENT_BG,
  },
  content: {
    fontFamily: MONO,
    fontSize: 12,
    letterSpacing: -0.24,
    lineHeight: 18,
  },
  attachment: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  timestamp: {
    fontFamily: Platform.select({ ios: 'System', android: 'normal', default: 'normal' }),
    fontSize: 11,
    color: TIMESTAMP_COLOR,
    opacity: 0.7,
    letterSpacing: -0.22,
  },
  timestampLeft: {
    alignSelf: 'flex-start',
  },
  timestampRight: {
    alignSelf: 'flex-end',
  },
});
