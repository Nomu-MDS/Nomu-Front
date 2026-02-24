import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFonts } from 'expo-font';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { API_BASE_URL, COMMISSION_RATE, commissionAmount, priceWithCommission } from '@/constants/config';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getToken } from '@/lib/session';
import type { Reservation } from '@/types/message';

interface ReservationModalProps {
  visible: boolean;
  conversationId: number;
  onClose: () => void;
  onCreated: (reservation: Reservation) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(d: Date) {
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

// ── Champ date + heure ────────────────────────────────────────────────────────

function DateTimeField({
  label,
  icon,
  value,
  minimumDate,
  onChange,
}: {
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  value: Date | null;
  minimumDate?: Date;
  onChange: (d: Date) => void;
}) {
  const { colors } = useTheme();
  const isAndroid = Platform.OS === 'android';

  // iOS : spinner ouvert/fermé
  const [openIOS, setOpenIOS] = useState(false);

  // Android : deux étapes (date puis heure)
  const [androidStep, setAndroidStep] = useState<'date' | 'time' | null>(null);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  // ── iOS handlers ────────────────────────────────────────────────────────────
  const handleIOSChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (selected) onChange(selected);
  };

  // ── Android handlers ────────────────────────────────────────────────────────
  const openAndroid = () => {
    setPendingDate(value ?? new Date());
    setAndroidStep('date');
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') { setAndroidStep(null); return; }
    if (!selected) { setAndroidStep(null); return; }

    if (androidStep === 'date') {
      setPendingDate(selected);
      setAndroidStep('time');
    } else {
      // Fusion date + heure
      const base = pendingDate ?? new Date();
      base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(new Date(base));
      setAndroidStep(null);
    }
  };

  const handlePress = () => {
    if (isAndroid) openAndroid();
    else setOpenIOS((v) => !v);
  };

  return (
    <View style={dtStyles.wrapper}>
      <Pressable
        style={[
          dtStyles.pill,
          {
            borderColor: openIOS ? colors.secondary : colors.separator,
            backgroundColor: colors.surface,
          },
        ]}
        onPress={handlePress}
      >
        <MaterialIcons name={icon} size={18} color={openIOS ? colors.secondary : colors.textMuted} />
        <View style={{ flex: 1 }}>
          <Text style={[dtStyles.pillLabel, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>{label}</Text>
          <Text style={[dtStyles.pillValue, { color: value ? colors.navy : colors.textMuted, fontFamily: FontFamily.mono }]}>
            {value ? formatDateTime(value) : 'Choisir date et heure'}
          </Text>
        </View>
        <MaterialIcons name={openIOS ? 'expand-less' : 'expand-more'} size={18} color={colors.textMuted} />
      </Pressable>

      {/* iOS : spinner datetime inline */}
      {!isAndroid && openIOS && (
        <View style={[dtStyles.spinnerWrap, { borderColor: colors.separator, backgroundColor: colors.surface }]}>
          <DateTimePicker
            value={value ?? new Date()}
            mode="datetime"
            display="spinner"
            minimumDate={minimumDate ?? new Date()}
            onChange={handleIOSChange}
            locale="fr-FR"
            textColor={colors.navy}
            style={dtStyles.spinner}
          />
        </View>
      )}

      {/* Android : dialog date */}
      {isAndroid && androidStep === 'date' && (
        <DateTimePicker
          value={pendingDate ?? new Date()}
          mode="date"
          display="default"
          minimumDate={minimumDate ?? new Date()}
          onChange={handleAndroidChange}
        />
      )}

      {/* Android : dialog heure */}
      {isAndroid && androidStep === 'time' && (
        <DateTimePicker
          value={pendingDate ?? new Date()}
          mode="time"
          display="default"
          is24Hour
          onChange={handleAndroidChange}
        />
      )}
    </View>
  );
}

const dtStyles = StyleSheet.create({
  wrapper: { gap: 0 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pillLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600', marginBottom: 2 },
  pillValue: { fontSize: 14 },
  spinnerWrap: {
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: 'hidden',
  },
  spinner: { height: 160 },
});

// ── Modal ─────────────────────────────────────────────────────────────────────

export function ReservationModal({ visible, conversationId, onClose, onCreated }: ReservationModalProps) {
  const { colors } = useTheme();
  const [fontsLoaded] = useFonts({
    'RocaOne-Rg': require('@/assets/fonts/roca/RocaOne-Rg.ttf'),
    'RocaOne-Bold': require('@/assets/fonts/roca/RocaOne-Bold.ttf'),
  });

  const [title, setTitle]   = useState('');
  const [start, setStart]   = useState<Date | null>(null);
  const [end, setEnd]       = useState<Date | null>(null);
  const [price, setPrice]   = useState('');
  const [loading, setLoading] = useState(false);

  const base       = parseFloat(price.replace(',', '.')) || 0;
  const commission = commissionAmount(base);
  const total      = priceWithCommission(base);

  const resetForm = () => { setTitle(''); setStart(null); setEnd(null); setPrice(''); };
  const handleClose = () => { resetForm(); onClose(); };

  const validate = (): string | null => {
    if (!title.trim())    return 'Ajoutez un nom à votre activité.';
    if (!start)           return 'Choisissez une date et heure de début.';
    if (!end)             return 'Choisissez une date et heure de fin.';
    if (end <= start)     return 'La fin doit être après le début.';
    if (base <= 0)        return 'Indiquez un prix supérieur à 0 €.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { Alert.alert('Champ manquant', err); return; }
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          conversation_id: conversationId,
          price: base,
          date: start!.toISOString(),
          end_date: end!.toISOString(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Erreur ${res.status}`);
      }
      const created: Reservation = await res.json();
      resetForm();
      onCreated(created);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de créer l\'activité.');
    } finally {
      setLoading(false);
    }
  };

  const isIOS = Platform.OS === 'ios';

  const content = (
    <View style={[isIOS ? styles.sheetIOS : styles.sheetAndroid, { backgroundColor: colors.surface }]}>
      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      {/* En-tête */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.tagBackground }]}>
          <MaterialIcons name="local-activity" size={22} color={colors.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.navy }, fontsLoaded ? { fontFamily: FontFamily.rocaBold } : {}]}>
            Proposer une activité
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>
            Envoyez une proposition avec le détail et le prix
          </Text>
        </View>
        <Pressable onPress={handleClose} hitSlop={12}>
          <MaterialIcons name="close" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={isIOS ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.form}
        >
          {/* Nom */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>NOM DE L'ACTIVITÉ</Text>
            <TextInput
              style={[styles.textInput, { borderColor: colors.separator, color: colors.navy, fontFamily: FontFamily.mono }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex : Visite guidée, cours de cuisine…"
              placeholderTextColor={colors.textMuted}
              maxLength={100}
            />
          </View>

          {/* Dates */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>QUAND ?</Text>
            <DateTimeField
              label="Début"
              icon="event"
              value={start}
              onChange={(d) => { setStart(d); if (end && d >= end) setEnd(null); }}
            />
            <DateTimeField
              label="Fin"
              icon="event-available"
              value={end}
              minimumDate={start ?? new Date()}
              onChange={setEnd}
            />
          </View>

          {/* Prix */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>PRIX PAR PERSONNE</Text>
            <View style={[styles.priceRow, { borderColor: colors.separator }]}>
              <TextInput
                style={[styles.priceInput, { color: colors.navy, fontFamily: FontFamily.mono }]}
                value={price}
                onChangeText={setPrice}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                maxLength={7}
              />
              <Text style={[styles.priceCurrency, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>€</Text>
            </View>

            {base > 0 && (
              <View style={[styles.commissionCard, { backgroundColor: colors.tagBackground, borderColor: colors.separator }]}>
                <View style={styles.commRow}>
                  <Text style={[styles.commLabel, { color: colors.body, fontFamily: FontFamily.mono }]}>Votre revenu</Text>
                  <Text style={[styles.commVal, { color: colors.navy, fontFamily: FontFamily.mono }]}>{base.toFixed(2)} €</Text>
                </View>
                <View style={styles.commRow}>
                  <Text style={[styles.commLabel, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>
                    Commission Nomu ({(COMMISSION_RATE * 100).toFixed(0)} %)
                  </Text>
                  <Text style={[styles.commVal, { color: colors.textMuted, fontFamily: FontFamily.mono }]}>+ {commission.toFixed(2)} €</Text>
                </View>
                <View style={[styles.commDivider, { backgroundColor: colors.separator }]} />
                <View style={styles.commRow}>
                  <Text style={[styles.commTotal, { color: colors.navy }, fontsLoaded ? { fontFamily: FontFamily.rocaRg } : {}]}>
                    Payé par le voyageur
                  </Text>
                  <Text style={[styles.commTotalVal, { color: colors.secondary }, fontsLoaded ? { fontFamily: FontFamily.rocaBold } : {}]}>
                    {total.toFixed(2)} €
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { borderTopColor: colors.separator }]}>
        <Pressable
          style={[styles.submitBtn, { backgroundColor: colors.secondary }, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <View style={styles.submitInner}>
              <MaterialIcons name="send" size={16} color="#FFF" />
              <Text style={[styles.submitText, { fontFamily: FontFamily.mono }]}>Envoyer la proposition</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );

  if (isIOS) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        {content}
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={[styles.root, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        {content}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheetIOS: { flex: 1, paddingHorizontal: 20, paddingBottom: 40 },
  sheetAndroid: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 28, maxHeight: '95%' },

  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 24 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 28 },
  headerIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  headerTitle: { fontSize: 20, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, marginTop: 2, lineHeight: 17 },

  form: { gap: 24, paddingBottom: 8 },
  fieldGroup: { gap: 10 },
  fieldLabel: { fontSize: 11, letterSpacing: 0.6, fontWeight: '600' },

  textInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  priceInput: { flex: 1, fontSize: 26, letterSpacing: -0.5 },
  priceCurrency: { fontSize: 26, letterSpacing: -0.5 },

  commissionCard: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },
  commRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commLabel: { fontSize: 12 },
  commVal: { fontSize: 12, fontWeight: '600' },
  commDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  commTotal: { fontSize: 13 },
  commTotalVal: { fontSize: 18, letterSpacing: -0.4 },

  footer: { paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  submitBtn: { borderRadius: 100, height: 56, justifyContent: 'center', alignItems: 'center' },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#FFF', letterSpacing: 0.2 },
});
