import { useFonts } from 'expo-font';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { API_BASE_URL } from '@/constants/config';
import { FontFamily } from '@/constants/theme';
import { getToken } from '@/lib/session';
import type { ReservationMessagePayload, ReservationStatus } from '@/types/message';

interface ReservationBubbleProps {
  data: ReservationMessagePayload;
  currentUserId: number;
  createdAt: string;
  otherUserName?: string;
  onStatusChange?: () => void;
}

const NAVY   = '#0E224A';
const BLUE   = '#465E8A';
const CREAM  = '#E4DBCB';
const BG     = '#EFEFED';

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending:  'En attente de réponse',
  accepted: 'Activité acceptée',
  declined: 'Activité refusée',
};

const STATUS_COLORS: Record<ReservationStatus, string> = {
  pending:  '#B45309',
  accepted: '#166534',
  declined: '#991B1B',
};

function formatDateCard(iso: string): string {
  const d = new Date(iso);
  return [
    d.getDate().toString().padStart(2, '0'),
    (d.getMonth() + 1).toString().padStart(2, '0'),
    d.getFullYear(),
  ].join('.');
}

function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes.toString().padStart(2, '0')}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

export function ReservationBubble({ data, currentUserId, createdAt, otherUserName, onStatusChange }: ReservationBubbleProps) {
  const [fontsLoaded] = useFonts({
    'RocaOne-Rg':   require('@/assets/fonts/roca/RocaOne-Rg.ttf'),
    'RocaOne-Bold': require('@/assets/fonts/roca/RocaOne-Bold.ttf'),
  });

  const [status, setStatus]           = useState<ReservationStatus>(data.status);
  const [actionLoading, setActionLoading] = useState<'accept' | 'decline' | null>(null);

  const isCreator = currentUserId === data.creator_id;
  const canAct    = !isCreator && status === 'pending';
  const base      = Number(data.price);
  const duration  = formatDuration(data.date, data.end_date);

  const creatorInitials = isCreator
    ? 'Moi'
    : (otherUserName ?? 'H').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const subtitleText = isCreator
    ? 'Vous avez proposé une activité'
    : `${otherUserName ?? "L'hôte"} vous a proposé une activité`;

  const handleAction = async (action: 'accept' | 'decline') => {
    setActionLoading(action);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/reservations/${data.id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setStatus(action === 'accept' ? 'accepted' : 'declined');
      onStatusChange?.();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Action impossible.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <View style={[styles.wrapper, isCreator ? styles.wrapperSent : styles.wrapperReceived]}>
      <View style={[styles.card, isCreator ? styles.cardSent : styles.cardReceived]}>

        {/* ── Avatar ── */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{creatorInitials}</Text>
        </View>

        {/* ── Subtitle ── */}
        <Text
          style={[styles.subtitle, fontsLoaded ? { fontFamily: FontFamily.rocaBold } : { fontWeight: '700' }]}
          numberOfLines={2}
        >
          {subtitleText}
        </Text>

        {/* ── Blue ticket ── */}
        <View style={styles.ticket}>
          <View style={styles.ticketHeader}>
            <Text style={[styles.ticketTitle, { fontFamily: FontFamily.mono }]} numberOfLines={2}>
              {data.title}
            </Text>
            <Text style={[styles.ticketDate, { fontFamily: FontFamily.mono }]}>
              {formatDateCard(data.date)}
            </Text>
          </View>
          <Text style={[styles.ticketMeta, { fontFamily: FontFamily.mono }]}>
            Durée : {duration}
          </Text>
          <Text style={[styles.ticketMeta, { fontFamily: FontFamily.mono }]}>
            Prix : {base.toFixed(2)} €
          </Text>
        </View>

        {/* ── Actions / status ── */}
        {status !== 'pending' ? (
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: STATUS_COLORS[status], fontFamily: FontFamily.mono }]}>
              {STATUS_LABELS[status]}
            </Text>
          </View>
        ) : canAct ? (
          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.btn, styles.declineBtn]}
              onPress={() => handleAction('decline')}
              disabled={!!actionLoading}
            >
              {actionLoading === 'decline' ? (
                <ActivityIndicator size="small" color={NAVY} />
              ) : (
                <Text style={[styles.declineBtnText, { fontFamily: FontFamily.mono }]}>Refuser</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.btn, styles.acceptBtn]}
              onPress={() => handleAction('accept')}
              disabled={!!actionLoading}
            >
              {actionLoading === 'accept' ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={[styles.acceptBtnText, { fontFamily: FontFamily.mono }]}>Accepter</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: STATUS_COLORS.pending, fontFamily: FontFamily.mono }]}>
              {STATUS_LABELS.pending}
            </Text>
          </View>
        )}
      </View>

      {/* ── Timestamp ── */}
      <Text style={[styles.timestamp, { fontFamily: FontFamily.mono, alignSelf: isCreator ? 'flex-end' : 'flex-start' }]}>
        {formatTime(createdAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 4,
    paddingHorizontal: 12,
    gap: 3,
  },
  wrapperSent: {
    alignItems: 'flex-end',
  },
  wrapperReceived: {
    alignItems: 'flex-start',
  },
  card: {
    backgroundColor: BG,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BLUE,
    padding: 14,
    gap: 12,
    maxWidth: '82%',
  },
  cardSent: {
    alignSelf: 'flex-end',
  },
  cardReceived: {
    alignSelf: 'flex-start',
  },

  // Avatar
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: CREAM,
    fontSize: 13,
    fontWeight: '700',
  },

  // Subtitle
  subtitle: {
    fontSize: 15,
    color: NAVY,
    lineHeight: 20,
    letterSpacing: -0.2,
  },

  // Ticket
  ticket: {
    backgroundColor: BLUE,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  ticketTitle: {
    color: CREAM,
    fontSize: 16,
    letterSpacing: -0.3,
    flex: 1,
    lineHeight: 20,
    fontWeight: '600',
  },
  ticketDate: {
    color: CREAM,
    fontSize: 12,
    opacity: 0.85,
    flexShrink: 0,
  },
  ticketMeta: {
    color: CREAM,
    fontSize: 12,
    letterSpacing: -0.1,
    opacity: 0.9,
  },

  // Buttons
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineBtn: {
    backgroundColor: CREAM,
    borderWidth: 1.5,
    borderColor: BLUE,
  },
  acceptBtn: {
    backgroundColor: BLUE,
  },
  declineBtnText: {
    color: NAVY,
    fontSize: 13,
    fontWeight: '600',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Status
  statusRow: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Timestamp
  timestamp: {
    fontSize: 11,
    color: '#888',
    opacity: 0.7,
  },
});
