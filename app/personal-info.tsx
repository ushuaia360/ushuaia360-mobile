import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200';

const LANG_LABELS: Record<string, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
};

export default function PersonalInfoScreen() {
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const user = useAuthStore((s) => s.user);

  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const divider = isDark ? '#2a2a2a' : '#f0f0f0';
  const textSub = colors.icon;
  const headerBg = isDark ? '#1c1c1e' : '#fff';
  const headerBorder = isDark ? '#2a2a2a' : '#EDF0F5';

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.push('/(tabs)/profile');
  }, []);

  const isVerified = Boolean(user?.email_verified);
  const isPremium = Boolean(user?.is_premium);
  const emailDisplay = (user?.email ?? '').replace(/[@.]/g, (ch) => `${ch}​`);
  const langLabel = LANG_LABELS[user?.language ?? ''] ?? user?.language ?? '—';

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
            <ThemedText style={styles.headerTitle}>Información personal</ThemedText>
          </View>
          <View style={[styles.headerIconWrap, { backgroundColor: colors.tint + '18' }]}>
            <Ionicons name="person-outline" size={22} color={colors.tint} />
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>

        {/* Avatar + nombre */}
        <View style={[styles.avatarCard, { backgroundColor: cardBg }]}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: user?.avatar_url ?? DEFAULT_AVATAR }}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            {isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: '#34c759' }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </View>
          <ThemedText style={styles.avatarName}>{user?.full_name ?? '—'}</ThemedText>
          <ThemedText style={[styles.avatarEmail, { color: textSub }]} numberOfLines={1}>
            {user?.email ?? ''}
          </ThemedText>
        </View>

        {/* Campos */}
        <View style={[styles.fieldsCard, { backgroundColor: cardBg }]}>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="person-outline" size={18} color={colors.tint} />
            </View>
            <View style={styles.fieldContent}>
              <ThemedText style={[styles.fieldLabel, { color: textSub }]}>Nombre completo</ThemedText>
              <ThemedText style={styles.fieldValue}>{user?.full_name ?? '—'}</ThemedText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: divider }]} />

          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="mail-outline" size={18} color={colors.tint} />
            </View>
            <View style={styles.fieldContent}>
              <ThemedText style={[styles.fieldLabel, { color: textSub }]}>Email</ThemedText>
              <ThemedText style={styles.fieldValue}>{emailDisplay}</ThemedText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: divider }]} />

          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: (isVerified ? '#34c759' : '#ff3b30') + '18' }]}>
              <Ionicons
                name={isVerified ? 'shield-checkmark-outline' : 'shield-outline'}
                size={18}
                color={isVerified ? '#34c759' : '#ff3b30'}
              />
            </View>
            <View style={[styles.fieldContent, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <View>
                <ThemedText style={[styles.fieldLabel, { color: textSub }]}>Cuenta</ThemedText>
                <ThemedText style={styles.fieldValue}>
                  {isVerified ? 'Verificada' : 'Sin verificar'}
                </ThemedText>
              </View>
              <View style={[styles.badge, { backgroundColor: (isVerified ? '#34c759' : '#ff3b30') + '18' }]}>
                <Ionicons
                  name={isVerified ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={isVerified ? '#34c759' : '#ff3b30'}
                />
                <ThemedText style={[styles.badgeText, { color: isVerified ? '#34c759' : '#ff3b30' }]}>
                  {isVerified ? 'OK' : 'Pendiente'}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: divider }]} />

          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: (isPremium ? colors.tint : textSub) + '18' }]}>
              <Ionicons
                name={isPremium ? 'star' : 'star-outline'}
                size={18}
                color={isPremium ? colors.tint : textSub}
              />
            </View>
            <View style={[styles.fieldContent, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <View>
                <ThemedText style={[styles.fieldLabel, { color: textSub }]}>Plan</ThemedText>
                <ThemedText style={styles.fieldValue}>
                  {isPremium ? 'Premium' : 'Gratuito'}
                </ThemedText>
              </View>
              <View style={[styles.badge, { backgroundColor: (isPremium ? colors.tint : textSub) + '15' }]}>
                <Ionicons
                  name={isPremium ? 'star' : 'star-outline'}
                  size={14}
                  color={isPremium ? colors.tint : textSub}
                />
                <ThemedText style={[styles.badgeText, { color: isPremium ? colors.tint : textSub }]}>
                  {isPremium ? 'Premium' : 'Free'}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: divider }]} />

          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="language-outline" size={18} color={colors.tint} />
            </View>
            <View style={styles.fieldContent}>
              <ThemedText style={[styles.fieldLabel, { color: textSub }]}>Idioma</ThemedText>
              <ThemedText style={styles.fieldValue}>{langLabel}</ThemedText>
            </View>
          </View>

        </View>


      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
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

  // Scroll
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
  },

  // Avatar card
  avatarCard: {
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  avatarEmail: {
    fontSize: 14,
  },

  // Fields card
  fieldsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fieldContent: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

});
