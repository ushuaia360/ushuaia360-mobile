import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OfflineHomePlaceholder() {
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  return (
    <ThemedView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#000' : '#fff', paddingTop: top + 24, paddingBottom: bottom + 24 },
      ]}>
      <View style={styles.inner}>
        <IconSymbol name="cloud-offline-outline" size={56} color={colors.icon} />
        <ThemedText style={[styles.title, { color: colors.text }]}>{t('offline.title')}</ThemedText>
        <ThemedText style={[styles.body, { color: colors.icon }]}>
          {t('offline.body')}
        </ThemedText>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/(tabs)/downloads' as never)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('offline.viewDownloads')}>
          <IconSymbol name="download-outline" size={22} color="#fff" />
          <ThemedText style={styles.ctaLabel}>{t('offline.viewDownloads')}</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 100,
    alignSelf: 'stretch',
  },
  ctaLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
