import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const REASONS = [
  'Ya no uso la app',
  'Problemas técnicos',
  'Preocupaciones de privacidad',
  'Prefiero no decirlo',
];

export default function DeleteAccountScreen() {
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { logout } = useAuthStore();

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const divider = isDark ? '#2a2a2a' : '#f0f0f0';
  const textSub = colors.icon;
  const inputBg = isDark ? '#2c2c2e' : '#f5f5f7';
  const headerBg = isDark ? '#1c1c1e' : '#fff';
  const headerBorder = isDark ? '#2a2a2a' : '#EDF0F5';

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.push('/(tabs)/profile');
  }, []);

  const handleSubmit = useCallback(() => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Estás seguro? Esta acción es permanente y no se puede deshacer. Todos tus datos, historial y favoritos serán eliminados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // TODO: llamar endpoint DELETE /api/v1/users/me cuando esté disponible
              await new Promise((r) => setTimeout(r, 1200));
              await logout();
              router.replace('/login');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }, [logout]);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: top + 8, backgroundColor: headerBg, borderBottomColor: headerBorder },
        ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.headerBack}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel="Volver">
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <ThemedText style={styles.headerTitle}>Eliminar cuenta</ThemedText>
          </View>
          <View style={[styles.headerIconWrap, { backgroundColor: '#ff3b30' + '15' }]}>
            <Ionicons name="trash-outline" size={22} color="#ff3b30" />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}>

          {/* Aviso */}
          <View style={[styles.warningCard, { backgroundColor: '#ff3b30' + '12', borderColor: '#ff3b30' + '30' }]}>
            <Ionicons name="warning-outline" size={22} color="#ff3b30" style={{ flexShrink: 0, marginTop: 1 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText style={[styles.warningTitle, { color: '#ff3b30' }]}>
                Acción irreversible
              </ThemedText>
              <ThemedText style={[styles.warningBody, { color: textSub }]}>
                Al eliminar tu cuenta perderás permanentemente tu historial de senderos, reseñas, favoritos y todos tus datos personales.
              </ThemedText>
            </View>
          </View>

          {/* Motivo (opcional) */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <ThemedText style={[styles.sectionLabel, { color: textSub }]}>
              MOTIVO <ThemedText style={[styles.optionalLabel, { color: textSub }]}>(opcional)</ThemedText>
            </ThemedText>

            {REASONS.map((reason, i) => {
              const active = selectedReason === reason;
              return (
                <View key={reason}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: divider }]} />}
                  <TouchableOpacity
                    style={styles.reasonRow}
                    activeOpacity={0.7}
                    onPress={() => setSelectedReason(active ? null : reason)}>
                    <ThemedText style={[styles.reasonLabel, active && { color: colors.tint, fontWeight: '600' }]}>
                      {reason}
                    </ThemedText>
                    <View style={[
                      styles.radio,
                      { borderColor: active ? colors.tint : divider },
                      active && { backgroundColor: colors.tint },
                    ]}>
                      {active && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}

            <View style={[styles.divider, { backgroundColor: divider }]} />

            {/* Texto libre */}
            <View style={styles.textAreaWrap}>
              <ThemedText style={[styles.textAreaLabel, { color: textSub }]}>
                Contanos más (opcional)
              </ThemedText>
              <TextInput
                style={[styles.textArea, { backgroundColor: inputBg, color: colors.text }]}
                placeholder="Tu opinión nos ayuda a mejorar..."
                placeholderTextColor={textSub}
                value={customReason}
                onChangeText={setCustomReason}
                multiline
                maxLength={300}
                textAlignVertical="top"
              />
              <ThemedText style={[styles.charCount, { color: textSub }]}>
                {customReason.length}/300
              </ThemedText>
            </View>
          </View>

          {/* Botón */}
          <TouchableOpacity
            style={[styles.deleteBtn, loading && { opacity: 0.6 }]}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Solicitar eliminación de cuenta">
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <ThemedText style={styles.deleteBtnText}>Solicitar eliminación</ThemedText>
              </>
            )}
          </TouchableOpacity>

          <ThemedText style={[styles.footerNote, { color: textSub }]}>
            Tu solicitud será procesada en un plazo de 30 días. Podés cancelarla iniciando sesión antes de que se complete.
          </ThemedText>

        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingBottom: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
  },

  warningCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  warningBody: {
    fontSize: 13,
    lineHeight: 18,
  },

  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  optionalLabel: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  reasonLabel: {
    fontSize: 15,
    flex: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textAreaWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
  },
  textAreaLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  textArea: {
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 90,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },

  deleteBtn: {
    backgroundColor: '#ff3b30',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  footerNote: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
