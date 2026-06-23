import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveApiMediaUrl } from '@/lib/resolve-api-media-url';
import { saveWallpaperToDevice } from '@/lib/save-wallpaper';
import { fetchWallpapers, type Wallpaper } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const GRID_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

function WallpapersSkeleton({ isDark, skelBg }: { isDark: boolean; skelBg: string }) {
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  return (
    <View style={styles.grid}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[styles.card, { width: CARD_WIDTH, backgroundColor: cardBg }]}>
          <View style={[styles.image, { backgroundColor: skelBg }]} />
        </View>
      ))}
    </View>
  );
}

export default function WallpapersScreen() {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const skelBg = isDark ? '#2c2c2e' : '#e8e8ed';

  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadWallpapers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetchWallpapers({ limit: 200 });
      setWallpapers(res.wallpapers);
    } catch {
      if (!isRefresh) setWallpapers([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallpapers(false);
  }, [loadWallpapers]);

  const headerSubtitle = useMemo(() => {
    if (loading && wallpapers.length === 0) return null;
    if (wallpapers.length === 0) return t('wallpapers.subtitle');
    return t(wallpapers.length === 1 ? 'wallpapers.count_one' : 'wallpapers.count_other', {
      count: wallpapers.length,
    });
  }, [loading, wallpapers.length, t]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.push('/(tabs)/profile');
  }, []);

  const handleDownload = useCallback(async (wallpaper: Wallpaper) => {
    if (downloadingId) return;
    setDownloadingId(wallpaper.id);
    try {
      const result = await saveWallpaperToDevice(wallpaper.url, {
        id: wallpaper.id,
        title: wallpaper.title,
      });
      if (result === 'share') {
        Alert.alert(t('wallpapers.shareSuccessTitle'), t('wallpapers.shareSuccessBody'));
      } else {
        Alert.alert(t('wallpapers.downloadSuccessTitle'), t('wallpapers.downloadSuccessBody'));
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'share-dismissed') return;
      const message = e instanceof Error ? e.message : t('wallpapers.downloadError');
      Alert.alert(t('wallpapers.downloadErrorTitle'), message);
    } finally {
      setDownloadingId(null);
    }
  }, [downloadingId, t]);

  const headerBg = isDark ? '#1c1c1e' : '#fff';
  const headerBorder = isDark ? '#2a2a2a' : '#EDF0F5';
  const cardBg = isDark ? '#1c1c1e' : '#fff';

  const header = (
    <View style={[styles.header, { paddingTop: top + 8, backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.headerBack}
          activeOpacity={0.65}
          accessibilityRole="button"
          accessibilityLabel={t('wallpapers.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <ThemedText style={styles.headerTitle}>{t('wallpapers.title')}</ThemedText>
          {headerSubtitle != null ? (
            <ThemedText style={[styles.headerSubtitle, { color: colors.icon }]} numberOfLines={1}>
              {headerSubtitle}
            </ThemedText>
          ) : null}
        </View>
        <View style={[styles.headerIconWrap, { backgroundColor: colors.tint + '18' }]}>
          <Ionicons name="image-outline" size={22} color={colors.tint} />
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Wallpaper }) => {
    const imageUrl = resolveApiMediaUrl(item.url);
    const isDownloading = downloadingId === item.id;

    return (
      <View style={[styles.card, { width: CARD_WIDTH, backgroundColor: cardBg }]}>
        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: skelBg }]}>
              <Ionicons name="image-outline" size={28} color={colors.icon} />
            </View>
          )}
        </View>
        {item.title ? (
          <ThemedText style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </ThemedText>
        ) : null}
        <TouchableOpacity
          style={[styles.downloadBtn, { backgroundColor: colors.tint }]}
          activeOpacity={0.85}
          disabled={isDownloading}
          onPress={() => void handleDownload(item)}
          accessibilityRole="button"
          accessibilityLabel={t('wallpapers.download')}>
          {isDownloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={16} color="#fff" />
              <ThemedText style={styles.downloadBtnText}>{t('wallpapers.download')}</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <Stack.Screen options={{ headerShown: false, presentation: 'card' }} />
      {header}
      {loading ? (
        <WallpapersSkeleton isDark={isDark} skelBg={skelBg} />
      ) : wallpapers.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.tint + '12' }]}>
            <Ionicons name="image-outline" size={52} color={colors.tint} />
          </View>
          <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
            {t('wallpapers.emptyTitle')}
          </ThemedText>
          <ThemedText style={[styles.emptySub, { color: colors.icon }]}>
            {t('wallpapers.emptyBody')}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={wallpapers}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadWallpapers(true)}
              tintColor={colors.tint}
            />
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerTitles: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
    paddingBottom: 32,
    gap: GRID_GAP,
  },
  row: { gap: GRID_GAP },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrap: { width: '100%' },
  image: {
    width: '100%',
    aspectRatio: 9 / 16,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  downloadBtn: {
    margin: 10,
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
