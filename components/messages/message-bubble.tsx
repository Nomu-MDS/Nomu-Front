import React, { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [viewerVisible, setViewerVisible] = useState(false);

  return (
    <View style={[styles.wrapper, isCurrentUser ? styles.wrapperSent : styles.wrapperReceived]}>
      {message.attachment && viewerVisible && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setViewerVisible(false)}>
          <SafeAreaView style={styles.viewerOverlay}>
            <Pressable style={styles.viewerClose} onPress={() => setViewerVisible(false)}>
              <Text style={styles.viewerCloseText}>✕</Text>
            </Pressable>
            <Image source={{ uri: message.attachment }} style={styles.viewerImage} resizeMode="contain" />
          </SafeAreaView>
        </Modal>
      )}

      <View
        style={
          isImageOnly
            ? styles.bubbleImageOnly
            : [styles.bubble, { backgroundColor: isCurrentUser ? colors.messageSent : colors.messageReceived }]
        }
      >
        {message.attachment && (
          <Pressable onPress={() => setViewerVisible(true)}>
            <Image
              source={{ uri: message.attachment }}
              style={styles.attachment}
              resizeMode="cover"
            />
          </Pressable>
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
  },
  content: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    letterSpacing: -0.24,
    lineHeight: 18,
  },
  attachment: {
    width: 220,
    height: 165,
    borderRadius: 16,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  viewerCloseText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  viewerImage: {
    width: '100%',
    height: '80%',
  },
  timestamp: {
    fontFamily: FontFamily.poppins,
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
