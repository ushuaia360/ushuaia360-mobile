import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacySecurityScreen() {
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const divider = isDark ? '#2a2a2a' : '#f0f0f0';
  const textSub = colors.icon;
  const headerBg = isDark ? '#1c1c1e' : '#fff';
  const headerBorder = isDark ? '#2a2a2a' : '#EDF0F5';

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.push('/(tabs)/profile');
  }, []);

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
            <ThemedText style={styles.headerTitle}>Privacidad y seguridad</ThemedText>
          </View>
          <View style={[styles.headerIconWrap, { backgroundColor: colors.tint + '18' }]}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.tint} />
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>

        {/* Seguridad */}
        <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
          <ThemedText style={[styles.sectionLabel, { color: textSub }]}>SEGURIDAD</ThemedText>

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => router.push('/forgot-password')}
            accessibilityRole="button"
            accessibilityLabel="Cambiar contraseña">
            <View style={[styles.rowIcon, { backgroundColor: '#ff9500' + '18' }]}>
              <Ionicons name="lock-closed-outline" size={18} color="#ff9500" />
            </View>
            <View style={styles.rowContent}>
              <ThemedText style={styles.rowLabel}>Cambiar contraseña</ThemedText>
              <ThemedText style={[styles.rowSub, { color: textSub }]}>
                Actualizá tu contraseña de acceso
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={textSub} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: divider }]} />

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Autenticación en dos pasos">
            <View style={[styles.rowIcon, { backgroundColor: colors.tint + '18' }]}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.tint} />
            </View>
            <View style={styles.rowContent}>
              <ThemedText style={styles.rowLabel}>Verificación en dos pasos</ThemedText>
              <ThemedText style={[styles.rowSub, { color: textSub }]}>
                Próximamente
              </ThemedText>
            </View>
            <View style={[styles.comingSoonBadge, { backgroundColor: textSub + '18' }]}>
              <ThemedText style={[styles.comingSoonText, { color: textSub }]}>Pronto</ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Privacidad */}
        <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
          <ThemedText style={[styles.sectionLabel, { color: textSub }]}>PRIVACIDAD</ThemedText>

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Política de privacidad">
            <View style={[styles.rowIcon, { backgroundColor: colors.tint + '18' }]}>
              <Ionicons name="document-text-outline" size={18} color={colors.tint} />
            </View>
            <View style={styles.rowContent}>
              <ThemedText style={styles.rowLabel}>Política de privacidad</ThemedText>
              <ThemedText style={[styles.rowSub, { color: textSub }]}>
                Cómo usamos tus datos
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={textSub} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: divider }]} />

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Términos y condiciones">
            <View style={[styles.rowIcon, { backgroundColor: colors.tint + '18' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.tint} />
            </View>
            <View style={styles.rowContent}>
              <ThemedText style={styles.rowLabel}>Términos y condiciones</ThemedText>
              <ThemedText style={[styles.rowSub, { color: textSub }]}>
                Condiciones de uso de la app
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={textSub} />
          </TouchableOpacity>
        </View>


      </ScrollView>
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

  sectionCard: {
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
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowSub: {
    fontSize: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },
  comingSoonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
