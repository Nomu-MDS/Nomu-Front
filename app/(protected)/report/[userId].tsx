import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { API_BASE_URL } from '@/constants/config';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getToken } from '@/lib/session';

const REASONS = [
  { id: 'inappropriate', label: 'Comportement inapproprié', icon: 'sentiment-very-dissatisfied' as const },
  { id: 'spam',          label: 'Spam ou publicité',        icon: 'campaign' as const },
  { id: 'harassment',    label: 'Harcèlement',              icon: 'report' as const },
  { id: 'fake',          label: 'Faux profil',              icon: 'person-off' as const },
  { id: 'offensive',     label: 'Contenu offensant',        icon: 'block' as const },
  { id: 'other',         label: 'Autre',                    icon: 'more-horiz' as const },
];

export default function ReportScreen() {
  const router = useRouter();
  const { userId, userName } = useLocalSearchParams<{ userId: string; userName?: string }>();
  const { colors, shadows } = useTheme();

  const [fontsLoaded] = useFonts({
    'RocaOne-Rg':      require('@/assets/fonts/roca/RocaOne-Rg.ttf'),
    'RocaOne-Bold':     require('@/assets/fonts/roca/RocaOne-Bold.ttf'),
    'Poppins-Regular':  require('@/assets/fonts/poppins/Poppins-Regular.ttf'),
    'Poppins-Medium':   require('@/assets/fonts/poppins/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('@/assets/fonts/poppins/Poppins-SemiBold.ttf'),
    'Poppins-Bold':     require('@/assets/fonts/poppins/Poppins-Bold.ttf'),
  });

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails]               = useState('');
  const [loading, setLoading]               = useState(false);

  const canSubmit = !!selectedReason && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reportedUserId: Number(userId),
          reason: REASONS.find(r => r.id === selectedReason)?.label ?? selectedReason,
          message: details.trim() || undefined,
        }),
      });

      if (res.ok) {
        Alert.alert(
          'Signalement envoyé',
          'Merci. Notre équipe va examiner ce profil.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else if (res.status === 409) {
        Alert.alert('Déjà signalé', 'Vous avez déjà signalé cet utilisateur.');
        router.back();
      } else {
        Alert.alert('Erreur', 'Impossible d\'envoyer le signalement.');
      }
    } catch {
      Alert.alert('Erreur', 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  const displayName = userName || 'cet utilisateur';

  return (
    <View style={[styles.screen, { backgroundColor: colors.beige }]}>

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={22} color={colors.secondary} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.secondary, fontFamily: fontsLoaded ? FontFamily.rocaBold : undefined }]}>
          Signalement
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.heading, { color: colors.navy, fontFamily: fontsLoaded ? FontFamily.rocaRg : undefined }]}>
            Signaler {displayName}
          </Text>
          <Text style={[styles.subheading, { color: colors.textSecondary, fontFamily: FontFamily.mono }]}>
            Choisissez un motif de signalement
          </Text>
        </View>

        {/* ── Reasons list ────────────────────────────────────────────── */}
        <View style={styles.reasonsList}>
          {REASONS.map((reason) => {
            const selected = selectedReason === reason.id;
            return (
              <Pressable
                key={reason.id}
                style={[
                  styles.reasonItem,
                  { backgroundColor: colors.surface, borderColor: selected ? colors.secondary : colors.border },
                  selected && styles.reasonItemSelected,
                  shadows.sm,
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <View style={[styles.reasonIcon, { backgroundColor: selected ? colors.secondary : 'rgba(70,94,138,0.08)' }]}>
                  <MaterialIcons name={reason.icon} size={18} color={selected ? '#fff' : colors.secondary} />
                </View>
                <Text style={[
                  styles.reasonLabel,
                  { color: selected ? colors.navy : colors.body, fontFamily: FontFamily.mono },
                  selected && { fontWeight: '700' },
                ]}>
                  {reason.label}
                </Text>
                <View style={[
                  styles.radio,
                  { borderColor: selected ? colors.secondary : colors.border },
                ]}>
                  {selected && <View style={[styles.radioDot, { backgroundColor: colors.secondary }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Details ─────────────────────────────────────────────────── */}
        <View style={styles.detailsSection}>
          <Text style={[styles.detailsLabel, { color: colors.textSecondary, fontFamily: FontFamily.mono }]}>
            Détails supplémentaires (optionnel)
          </Text>
          <TextInput
            style={[
              styles.detailsInput,
              { color: colors.heading, borderColor: colors.border, backgroundColor: colors.surface, fontFamily: FontFamily.mono },
            ]}
            value={details}
            onChangeText={setDetails}
            placeholder="Décrivez le problème pour aider notre équipe…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <View style={[styles.footer, { backgroundColor: colors.beige }]}>
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: colors.navy },
            !canSubmit && styles.submitBtnDisabled,
            pressed && canSubmit && { opacity: 0.85 },
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <MaterialIcons name="flag" size={18} color="#E4DBCB" />
          <Text style={[styles.submitBtnText, { fontFamily: fontsLoaded ? FontFamily.rocaBold : undefined }]}>
            {loading ? 'Envoi en cours…' : 'Envoyer le signalement'}
          </Text>
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 72 : 52,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 20,
    letterSpacing: -0.5,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  header: {
    paddingVertical: 16,
    gap: 6,
  },
  heading: {
    fontSize: 26,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 13,
    lineHeight: 18,
  },

  reasonsList: {
    gap: 10,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  reasonItemSelected: {
    borderWidth: 2,
  },
  reasonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reasonLabel: {
    flex: 1,
    fontSize: 15,
    letterSpacing: -0.1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  detailsSection: {
    marginTop: 24,
    gap: 8,
  },
  detailsLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailsInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    minHeight: 110,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(70,94,138,0.12)',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: 34,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontSize: 16,
    color: '#E4DBCB',
    letterSpacing: 0.2,
  },
});
