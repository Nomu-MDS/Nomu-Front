import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { ReservationBubble } from '@/components/messages/reservation-bubble';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Message, ReservationMessagePayload } from '@/types/message';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  currentUserId: number;
  otherUserName?: string;
}

function parseReservation(content: string): ReservationMessagePayload | null {
  try {
    if (!content.startsWith('{"__type":"reservation"')) return null;
    const parsed = JSON.parse(content);
    if (parsed.__type === 'reservation') return parsed as ReservationMessagePayload;
  } catch {
    // not a reservation
  }
  return null;
}

export function MessageBubble({ message, isCurrentUser, currentUserId, otherUserName }: MessageBubbleProps) {
  const { colors } = useTheme();

  const reservation = parseReservation(message.content);
  if (reservation) {
    return (
      <ReservationBubble
        data={reservation}
        currentUserId={currentUserId}
        createdAt={message.createdAt}
        otherUserName={otherUserName}
      />
    );
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const m = date.getMinutes().toString().padStart(2, '0');
    const period = date.getHours() >= 12 ? 'PM' : 'AM';
    const h12 = date.getHours() % 12 || 12;
    return `${h12}:${m} ${period}`;
  };

  const isImageOnly = !!message.attachment && !message.content?.trim();

  return (
    <View style={[styles.wrapper, isCurrentUser ? styles.wrapperSent : styles.wrapperReceived]}>
      <View
        style={[
          styles.bubble,
          isImageOnly
            ? styles.bubbleImageOnly
            : { backgroundColor: isCurrentUser ? colors.messageSent : colors.messageReceived },
        ]}
      >
        {message.attachment && (
          <Image
            source={{ uri: message.attachment }}
            style={styles.attachment}
            resizeMode="cover"
          />
        )}
        {message.content?.trim() ? (
          <Text
            style={[
              styles.content,
              { color: isCurrentUser ? colors.messageSentText : colors.messageReceivedText },
            ]}
          >
            {message.content}
          </Text>
        ) : null}
      </View>

      <Text
        style={[
          styles.timestamp,
          isCurrentUser ? styles.timestampRight : styles.timestampLeft,
          { color: colors.body },
        ]}
      >
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
  bubbleImageOnly: {
    maxWidth: '78%',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  content: {
    fontFamily: FontFamily.mono,
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
    fontFamily: FontFamily.system,
    fontSize: 11,
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
