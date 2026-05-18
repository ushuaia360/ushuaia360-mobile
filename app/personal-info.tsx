import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LANGUAGE_LABELS } from '@/i18n';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200';

export default function PersonalInfoScreen() {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const user = useAuthStore((s) => s.user);
  const { language } = useLanguageStore();

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
  const langLabel = LANGUAGE_LABELS[language];

  const fields: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; valueColor?: string }[] = [
    {
      icon: 'person-outline',
      label: t('personalInfo.fullName'),
      value: user?.full_name ?? '—',
    },
    {
      icon: 'mail-outline',
      label: t('personalInfo.email'),
      value: user?.email ?? '—',
    },
    {
      icon: isVerified ? 'shield-checkmark-outline' : 'shield-outline',
      label: t('personalInfo.account'),
      value: isVerified ? t('personalInfo.verified') : t('personalInfo.unverified'),
      valueColor: isVerified ? '#34c759' : '#ff9500',
    },
    {
      icon: isPremium ? 'star' : 'star-outline',
      label: t('personalInfo.plan'),
      value: isPremium ? t('personalInfo.premium') : 'Free',
      valueColor: isPremium ? colors.tint : undefined,
    },
    {
      icon: 'language-outline',
      label: t('personalInfo.language'),
      value: langLabel,
    },
  ];

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.headerBack}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>{t('personalInfo.title')}</ThemedText>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: user?.avatar_url ?? DEFAULT_AVATAR }}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={11} color="#fff" />
              </View>
            )}
          </View>
          <ThemedText style={styles.avatarName}>{user?.full_name ?? '—'}</ThemedText>
        </View>

        {/* Fields */}
        <View style={[styles.fieldsCard, { backgroundColor: cardBg }]}>
          {fields.map((field, i) => (
            <View key={field.label}>
              <View style={styles.fieldRow}>
                <View style={[styles.fieldIconWrap, { backgroundColor: colors.tint + '15' }]}>
                  <Ionicons name={field.icon} size={20} color={colors.tint} />
                </View>
                <View style={styles.fieldContent}>
                  <ThemedText style={[styles.fieldLabel, { color: textSub }]}>{field.label}</ThemedText>
                  <ThemedText
                    style={[styles.fieldValue, field.valueColor ? { color: field.valueColor } : null]}
                    numberOfLines={1}>
                    {field.value}
                  </ThemedText>
                </View>
              </View>
              {i < fields.length - 1 && (
                <View style={[styles.divider, { backgroundColor: divider }]} />
              )}
            </View>
          ))}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  headerBack: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },

  // Scroll
  scroll: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 40, gap: 20 },

  // Avatar
  avatarSection: { alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#34c759',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarName: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },

  // Fields
  fieldsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fieldContent: { flex: 1, minWidth: 0, gap: 0 },
  fieldLabel: { fontSize: 12, fontWeight: '500' },
  fieldValue: { fontSize: 15, fontWeight: '600', marginTop: -2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 72 },
});
