import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveApiMediaUrl } from '@/lib/resolve-api-media-url';
import {
  listManualDownloads,
  removeManualTrailDownload,
  type ManualTrailEntry,
} from '@/lib/offline-pack';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DownloadsScreen() {
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const headerBg = isDark ? '#1c1c1e' : '#fff';
  const headerBorder = isDark ? '#2a2a2a' : '#EDF0F5';

  const [trailEntries, setTrailEntries] = useState<ManualTrailEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { trails } = await listManualDownloads();
    setTrailEntries(trails);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const total = trailEntries.length;

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, []);

  const headerSubtitle =
    total === 0
      ? 'Guardá senderos desde el botón de descarga en la ficha del recorrido'
      : total === 1
        ? '1 sendero guardado'
        : `${total} senderos guardados`;

  const header = (
    <View
      style={[
        styles.header,
        {
          paddingTop: top + 8,
          backgroundColor: headerBg,
          borderBottomColor: headerBorder,
        },
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
          <ThemedText style={styles.headerTitle}>Descargas</ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: colors.icon }]} numberOfLines={1}>
            {headerSubtitle}
          </ThemedText>
        </View>
        <View style={[styles.headerIconWrap, { backgroundColor: colors.tint + '18' }]}>
          <Ionicons name="download-outline" size={22} color={colors.tint} />
        </View>
      </View>
    </View>
  );

  const askRemoveTrail = (entry: ManualTrailEntry) => {
    Alert.alert(
      'Quitar descarga',
      `¿Eliminar «${entry.detail.name ?? 'Sendero'}» del dispositivo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            await removeManualTrailDownload(entry.id);
            await load();
          },
        },
      ],
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {header}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }>
        {trailEntries.length > 0 ? (
          <>
            <ThemedText style={[styles.sectionTitle, { color: colors.icon }]}>Senderos</ThemedText>
            {trailEntries.map((entry) => {
              const thumb =
                resolveApiMediaUrl(entry.detail.thumbnail_url ?? entry.detail.image_urls?.[0] ?? null) ??
                entry.detail.thumbnail_url ??
                entry.detail.image_urls?.[0] ??
                '';
              const sub =
                [entry.detail.region, entry.detail.distance_km != null ? `${entry.detail.distance_km} km` : null]
                  .filter(Boolean)
                  .join(' · ') || null;
              return (
                <View key={entry.id} style={[styles.row, { backgroundColor: cardBg }]}>
                  <TouchableOpacity
                    style={styles.rowMain}
                    activeOpacity={0.88}
                    onPress={() =>
                      router.push({ pathname: '/trails/[id]', params: { id: entry.id } } as never)
                    }>
                    {thumb ? (
                      <ExpoImage source={{ uri: thumb }} style={styles.rowImg} contentFit="cover" />
                    ) : (
                      <View style={[styles.rowImg, styles.rowImgPlaceholder]}>
                        <Ionicons name="trail-sign-outline" size={28} color={colors.icon} />
                      </View>
                    )}
                    <View style={styles.rowText}>
                      <ThemedText style={styles.rowTitle} numberOfLines={2}>
                        {entry.detail.name ?? 'Sendero'}
                      </ThemedText>
                      {sub ? (
                        <ThemedText style={[styles.rowSub, { color: colors.icon }]} numberOfLines={1}>
                          {sub}
                        </ThemedText>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rowTrash}
                    onPress={() => askRemoveTrail(entry)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar descarga">
                    <Ionicons name="trash-outline" size={22} color="#ff3b30" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        ) : null}

        {total === 0 && !refreshing ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-download-outline" size={48} color={colors.icon} style={{ opacity: 0.5 }} />
            <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>Nada descargado todavía</ThemedText>
            <ThemedText style={[styles.emptySub, { color: colors.icon }]}>
              En la ficha de un sendero, tocá el ícono de descarga cuando tengas conexión. Los puntos turísticos no se
              pueden guardar para uso sin conexión.
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32, paddingTop: 8 },
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
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.92,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 8,
    minHeight: 88,
  },
  rowImg: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#e8eaed',
  },
  rowImgPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  rowTrash: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  empty: {
    paddingHorizontal: 28,
    paddingTop: 48,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
});
