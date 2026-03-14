import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { decodeJwt } from '@/lib/jwt';
import { getToken } from '@/lib/session';
import {
  getMyReservations,
  acceptReservation,
  declineReservation,
  type Reservation,
} from '@/services/api/reservations';
import { connectSocket, getSocket } from '@/services/socket';

// ── Constants ──────────────────────────────────────────────────────────────
const DOT_COLORS = {
  pending:  '#d97706',
  accepted: '#059669',
  declined: '#dc2626',
} as const;

const STATUS_LABELS = {
  pending:  'En attente',
  accepted: 'Acceptée',
  declined: 'Refusée',
} as const;

const STATUS_BADGE = {
  pending:  { bg: '#fef3c7', text: '#b45309' },
  accepted: { bg: '#d1fae5', text: '#065f46' },
  declined: { bg: '#fee2e2', text: '#991b1b' },
} as const;

type TabValue   = 'all' | 'pending' | 'accepted' | 'declined';
type ViewMode   = 'calendar' | 'list';

// ── Helpers ────────────────────────────────────────────────────────────────
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function formatPrice(price: number | string) {
  const n = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}
function computeDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) { const d = Math.floor(h / 24); return `${d}j${h % 24 ? ` ${h % 24}h` : ''}`; }
  if (h > 0 && m > 0) return `${h}h${String(m).padStart(2, '0')}`;
  return h > 0 ? `${h}h` : `${m}min`;
}
function monthLabel(iso: string) {
  return new Date(iso)
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    .replace(/^./, c => c.toUpperCase());
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ReservationsScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    'RocaOne-Rg':       require('@/assets/fonts/roca/RocaOne-Rg.ttf'),
    'RocaOne-Bold':     require('@/assets/fonts/roca/RocaOne-Bold.ttf'),
    'Poppins-Regular':  require('@/assets/fonts/poppins/Poppins-Regular.ttf'),
    'Poppins-Medium':   require('@/assets/fonts/poppins/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('@/assets/fonts/poppins/Poppins-SemiBold.ttf'),
    'Poppins-Bold':     require('@/assets/fonts/poppins/Poppins-Bold.ttf'),
  });

  const [reservations, setReservations]   = useState<Reservation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab]         = useState<TabValue>('all');
  const [viewMode, setViewMode]           = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate]   = useState<string | null>(toDateStr(new Date()));
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const joinedConvIdsRef = useRef<Set<number>>(new Set());

  // ── Real-time socket handlers (stable refs) ────────────────────────────────
  const handleReservationCreated = useCallback((data: { reservation: Reservation }) => {
    setReservations(prev =>
      prev.some(r => r.id === data.reservation.id) ? prev : [...prev, data.reservation]
    );
  }, []);

  const handleReservationUpdated = useCallback((data: { reservation: Reservation }) => {
    setReservations(prev =>
      prev.map(r => r.id === data.reservation.id ? { ...r, ...data.reservation } : r)
    );
  }, []);

  // Register socket listeners once on mount
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    connectSocket(token);
    const socket = getSocket();
    if (!socket) return;

    socket.on('reservation_created', handleReservationCreated);
    socket.on('reservation_updated', handleReservationUpdated);

    return () => {
      socket.off('reservation_created', handleReservationCreated);
      socket.off('reservation_updated', handleReservationUpdated);
    };
  }, [handleReservationCreated, handleReservationUpdated]);

  // Join conversation rooms whenever the reservations list changes
  useEffect(() => {
    if (!reservations.length) return;
    const socket = getSocket();
    if (!socket) return;

    const convIds = [...new Set(reservations.map(r => r.conversation_id).filter(Boolean))];
    convIds.forEach(id => {
      if (!joinedConvIdsRef.current.has(id)) {
        socket.emit('join_conversation', { conversation_id: id });
        joinedConvIdsRef.current.add(id);
      }
    });
  }, [reservations]);

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) { router.replace('/login'); return; }
      const claims = decodeJwt(token);
      setCurrentUserId(claims?.id ?? claims?.userId ?? null);
      setReservations(await getMyReservations());
    } catch (e) {
      console.error('[Reservations]', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = activeTab === 'all'
    ? reservations
    : reservations.filter(r => r.status === activeTab);

  const countByStatus = (s: TabValue) =>
    s === 'all' ? reservations.length : reservations.filter(r => r.status === s).length;

  // markedDates for react-native-calendars
  const markedDates: Record<string, any> = {};
  for (const r of filtered) {
    const cur = new Date(r.date);
    const end = new Date(r.end_date);
    const dot = { key: String(r.id), color: DOT_COLORS[r.status] };
    while (cur <= end) {
      const key = toDateStr(cur);
      if (!markedDates[key]) markedDates[key] = { dots: [] };
      markedDates[key].dots.push(dot);
      cur.setDate(cur.getDate() + 1);
    }
  }
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] ?? {}),
      selected: true,
      selectedColor: '#465E8A',
    };
  }

  const dayResas = selectedDate
    ? filtered.filter(r => {
        const s = toDateStr(new Date(r.date));
        const e = toDateStr(new Date(r.end_date));
        return selectedDate >= s && selectedDate <= e;
      })
    : [];

  // List: grouped by month, sorted by date
  const groupedList = (() => {
    const sorted = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const groups: { key: string; label: string; items: Reservation[] }[] = [];
    for (const r of sorted) {
      const d   = new Date(r.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let g = groups.find(x => x.key === key);
      if (!g) { g = { key, label: monthLabel(r.date), items: [] }; groups.push(g); }
      g.items.push(r);
    }
    return groups;
  })();

  function partnerName(resa: Reservation) {
    if (!resa.Conversation) return 'Inconnu';
    const conv = resa.Conversation;
    return currentUserId === conv.voyager_id
      ? (conv.Local?.name ?? 'Hôte')
      : (conv.Voyager?.name ?? 'Voyageur');
  }

  async function handleAccept(id: number) {
    setActionLoading(id);
    try { await acceptReservation(id); await loadData(); }
    finally { setActionLoading(null); }
  }
  async function handleDecline(id: number) {
    setActionLoading(id);
    try { await declineReservation(id); await loadData(); }
    finally { setActionLoading(null); }
  }

  const tabs: { label: string; value: TabValue }[] = [
    { label: 'Toutes',     value: 'all'      },
    { label: 'En attente', value: 'pending'  },
    { label: 'Acceptées',  value: 'accepted' },
    { label: 'Refusées',   value: 'declined' },
  ];

  // ── Shared card renderer ───────────────────────────────────────────────────
  function renderCard(resa: Reservation, isLast: boolean) {
    const name = partnerName(resa);
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (
      <View
        key={resa.id}
        style={[
          styles.resaCard,
          { borderLeftColor: DOT_COLORS[resa.status] },
          !isLast && styles.resaCardBorder,
        ]}
      >
        {/* Head */}
        <View style={styles.cardHead}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.cardHeadInfo}>
            <Text style={[styles.partnerName, { color: colors.navy, fontFamily: FontFamily.rocaBold }]} numberOfLines={1}>
              {name}
            </Text>
            <Pressable onPress={() => router.push(`/chat/${resa.conversation_id}`)}>
              <Text style={[styles.convLink, { color: colors.secondary, fontFamily: FontFamily.poppins }]}>
                Voir la conversation →
              </Text>
            </Pressable>
          </View>
          <View style={[styles.badge, { backgroundColor: STATUS_BADGE[resa.status].bg }]}>
            <Text style={[styles.badgeText, { color: STATUS_BADGE[resa.status].text, fontFamily: FontFamily.poppinsSemiBold }]}>
              {STATUS_LABELS[resa.status]}
            </Text>
          </View>
        </View>

        {/* Title */}
        <View style={[styles.titleBlock, { backgroundColor: colors.navy }]}>
          <Text style={[styles.resaTitle, { fontFamily: FontFamily.rocaBold }]} numberOfLines={2}>
            {resa.title}
          </Text>
        </View>

        {/* Meta */}
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <MaterialIcons name="calendar-today" size={13} color={colors.secondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: FontFamily.poppins }]}>
              {formatDateLong(resa.date)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="event" size={13} color={colors.secondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: FontFamily.poppins }]}>
              {formatDateLong(resa.end_date)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="access-time" size={13} color={colors.secondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: FontFamily.poppins }]}>
              {formatTime(resa.date)} → {formatTime(resa.end_date)} · {computeDuration(resa.date, resa.end_date)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="attach-money" size={13} color={colors.navy} />
            <Text style={[styles.metaText, { color: colors.navy, fontFamily: FontFamily.poppinsSemiBold }]}>
              {formatPrice(resa.price)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {resa.status === 'pending' && resa.creator_id !== currentUserId ? (
          <View style={styles.actions}>
            <Pressable
              style={[styles.btnDecline, { borderColor: 'rgba(70,94,138,0.2)' }]}
              disabled={actionLoading === resa.id}
              onPress={() => handleDecline(resa.id)}
            >
              <Text style={[styles.btnDeclineText, { color: colors.secondary, fontFamily: FontFamily.rocaBold }]}>
                {actionLoading === resa.id ? '…' : 'Refuser'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.btnAccept, { backgroundColor: colors.navy }]}
              disabled={actionLoading === resa.id}
              onPress={() => handleAccept(resa.id)}
            >
              <Text style={[styles.btnAcceptText, { fontFamily: FontFamily.rocaBold }]}>
                {actionLoading === resa.id ? '…' : 'Accepter'}
              </Text>
            </Pressable>
          </View>
        ) : resa.status === 'pending' ? (
          <Text style={[styles.waiting, { color: colors.textMuted, fontFamily: FontFamily.poppins }]}>
            En attente de réponse…
          </Text>
        ) : null}
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: colors.beige }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.navy, fontFamily: FontFamily.rocaBold }]}>
            Réservations
          </Text>
          <Text style={[styles.pageSub, { color: colors.secondary, fontFamily: FontFamily.poppins }]}>
            Suivez et gérez vos expériences
          </Text>
        </View>

        {/* View toggle */}
        <View style={[styles.viewToggle, { backgroundColor: 'rgba(70,94,138,0.08)' }]}>
          <Pressable
            style={[styles.viewBtn, viewMode === 'calendar' && styles.viewBtnActive]}
            onPress={() => setViewMode('calendar')}
          >
            <MaterialIcons name="calendar-today" size={16} color={viewMode === 'calendar' ? colors.navy : 'rgba(70,94,138,0.4)'} />
          </Pressable>
          <Pressable
            style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <MaterialIcons name="format-list-bulleted" size={16} color={viewMode === 'list' ? colors.navy : 'rgba(70,94,138,0.4)'} />
          </Pressable>
        </View>
      </View>

      {/* White card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {loading || !fontsLoaded ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.secondary} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          >
            {/* Filter tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
              {tabs.map(tab => {
                const count  = countByStatus(tab.value);
                const active = activeTab === tab.value;
                return (
                  <Pressable
                    key={tab.value}
                    style={[styles.tab, active && { backgroundColor: colors.secondary, borderColor: colors.secondary }]}
                    onPress={() => { setActiveTab(tab.value); setSelectedDate(null); }}
                  >
                    <Text style={[styles.tabText, { color: active ? '#fff' : colors.secondary, fontFamily: FontFamily.poppinsMedium }]}>
                      {tab.label}
                    </Text>
                    {count > 0 && (
                      <View style={[styles.tabBadge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'rgba(70,94,138,0.12)' }]}>
                        <Text style={[styles.tabBadgeText, { color: active ? '#fff' : colors.secondary }]}>{count}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* ── CALENDAR VIEW ──────────────────────────────────────────── */}
            {viewMode === 'calendar' && (
              <>
                <View style={styles.calWrap}>
                  <Calendar
                    markingType="multi-dot"
                    markedDates={markedDates}
                    onDayPress={day => setSelectedDate(prev => prev === day.dateString ? null : day.dateString)}
                    firstDay={1}
                    theme={{
                      backgroundColor: '#F9F7F4',
                      calendarBackground: '#F9F7F4',
                      textSectionTitleColor: 'rgba(70,94,138,0.5)',
                      selectedDayBackgroundColor: '#465E8A',
                      selectedDayTextColor: '#fff',
                      todayTextColor: '#0E224A',
                      todayBackgroundColor: 'rgba(14,34,74,0.08)',
                      dayTextColor: '#0E224A',
                      textDisabledColor: 'rgba(70,94,138,0.25)',
                      arrowColor: '#465E8A',
                      monthTextColor: '#0E224A',
                      textDayFontFamily: FontFamily.poppinsMedium,
                      textMonthFontFamily: FontFamily.rocaBold,
                      textDayHeaderFontFamily: FontFamily.poppinsSemiBold,
                      textDayFontSize: 14,
                      textMonthFontSize: 16,
                      textDayHeaderFontSize: 11,
                      dotSize: 6,
                    }}
                  />
                </View>

                {/* Legend */}
                <View style={styles.legend}>
                  {(['pending', 'accepted', 'declined'] as const).map(s => (
                    <View key={s} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: DOT_COLORS[s] }]} />
                      <Text style={[styles.legendText, { color: colors.textSecondary, fontFamily: FontFamily.poppins }]}>
                        {STATUS_LABELS[s]}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Day panel */}
                {dayResas.length > 0 && (
                  <View style={styles.panel}>
                    <View style={styles.panelHeader}>
                      <Text style={[styles.panelDate, { color: colors.navy, fontFamily: FontFamily.rocaBold }]}>
                        {new Date(selectedDate! + 'T12:00:00')
                          .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                          .replace(/^./, c => c.toUpperCase())}
                      </Text>
                      <Pressable onPress={() => setSelectedDate(null)} hitSlop={12}>
                        <MaterialIcons name="close" size={18} color={colors.secondary} />
                      </Pressable>
                    </View>
                    {dayResas.map((r, i) => renderCard(r, i === dayResas.length - 1))}
                  </View>
                )}
              </>
            )}

            {/* ── LIST VIEW ──────────────────────────────────────────────── */}
            {viewMode === 'list' && groupedList.length > 0 && (
              <View style={styles.listWrap}>
                {groupedList.map(group => (
                  <View key={group.key}>
                    <Text style={[styles.listMonth, { color: 'rgba(70,94,138,0.5)', fontFamily: FontFamily.rocaBold }]}>
                      {group.label}
                    </Text>
                    <View style={[styles.listGroup, { borderColor: 'rgba(70,94,138,0.15)' }]}>
                      {group.items.map((r, i) => renderCard(r, i === group.items.length - 1))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Empty state */}
            {filtered.length === 0 && (
              <View style={styles.empty}>
                <MaterialIcons name="calendar-today" size={48} color="rgba(70,94,138,0.2)" />
                <Text style={[styles.emptyTitle, { color: 'rgba(70,94,138,0.5)', fontFamily: FontFamily.rocaRg }]}>
                  Aucune réservation
                </Text>
                <Text style={[styles.emptySub, { color: 'rgba(70,94,138,0.35)', fontFamily: FontFamily.poppins }]}>
                  {activeTab === 'all' ? 'Vos réservations apparaîtront ici.' : 'Aucune réservation avec ce statut.'}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  pageTitle: { fontSize: 30, letterSpacing: -0.5 },
  pageSub: { fontSize: 13, opacity: 0.7, marginTop: 2 },

  // View toggle
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
    marginBottom: 4,
  },
  viewBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  card: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingTop: 20 },

  // Tabs
  tabsScroll: { flexGrow: 0 },
  tabs: { paddingHorizontal: 20, gap: 8, flexDirection: 'row', marginBottom: 16 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 999, borderWidth: 1.5,
    borderColor: 'rgba(70,94,138,0.2)', backgroundColor: 'transparent',
  },
  tabText: { fontSize: 12 },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 },
  tabBadgeText: { fontSize: 10, fontWeight: '700' },

  // Calendar
  calWrap: {
    marginHorizontal: 16, borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#F9F7F4', borderWidth: 1, borderColor: 'rgba(70,94,138,0.1)',
  },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 11 },

  // Day panel
  panel: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 20,
    borderWidth: 1.5, borderColor: 'rgba(70,94,138,0.15)', overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#F9F7F4',
    borderBottomWidth: 1, borderBottomColor: 'rgba(70,94,138,0.1)',
  },
  panelDate: { fontSize: 15 },

  // List view
  listWrap: { paddingHorizontal: 16, gap: 20 },
  listMonth: {
    fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase',
    marginBottom: 10, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(70,94,138,0.1)',
  },
  listGroup: { borderRadius: 20, borderWidth: 1.5, overflow: 'hidden' },

  // Card
  resaCard: { padding: 16, borderLeftWidth: 4, backgroundColor: '#fff' },
  resaCardBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(70,94,138,0.1)',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  cardHeadInfo: { flex: 1 },
  partnerName: { fontSize: 14, marginBottom: 2 },
  convLink: { fontSize: 11, opacity: 0.6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 10 },
  titleBlock: { borderRadius: 12, padding: 12, marginBottom: 12 },
  resaTitle: { color: '#E4DBCB', fontSize: 15 },
  metaGrid: { gap: 6, marginBottom: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  btnDecline: {
    flex: 1, height: 40, borderRadius: 999, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(70,94,138,0.07)',
  },
  btnDeclineText: { fontSize: 14 },
  btnAccept: { flex: 1, height: 40, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
  btnAcceptText: { color: '#E4DBCB', fontSize: 14 },
  waiting: { fontSize: 12, textAlign: 'center', paddingVertical: 4 },

  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, textAlign: 'center' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
