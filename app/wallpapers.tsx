import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveApiMediaUrl } from '@/lib/resolve-api-media-url';
import { saveWallpaperToDevice } from '@/lib/save-wallpaper';
import { fetchWallpapers, type Wallpaper } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const GRID_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;
const HORIZONTAL_CARD_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;

function WallpapersSkeleton({ skelBg }: { skelBg: string }) {
  return (
    <View style={styles.grid}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[styles.verticalImage, { width: CARD_WIDTH, backgroundColor: skelBg }]} />
      ))}
    </View>
  );
}

type SectionData = {
  title: string;
  orientation: 'vertical' | 'horizontal';
  data: Wallpaper[][];
};

export default function WallpapersScreen() {
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const skelBg = isDark ? '#2c2c2e' : '#e8e8ed';

  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<Wallpaper | null>(null);

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

  const sections = useMemo<SectionData[]>(() => {
    const vertical = wallpapers.filter((w) => w.orientation !== 'horizontal');
    const horizontal = wallpapers.filter((w) => w.orientation === 'horizontal');

    const toRows = (items: Wallpaper[], cols: number): Wallpaper[][] => {
      const rows: Wallpaper[][] = [];
      for (let i = 0; i < items.length; i += cols) {
        rows.push(items.slice(i, i + cols));
      }
      return rows;
    };

    const result: SectionData[] = [];
    if (vertical.length > 0) {
      result.push({ title: 'Vertical', orientation: 'vertical', data: toRows(vertical, 2) });
    }
    if (horizontal.length > 0) {
      result.push({ title: 'Horizontal', orientation: 'horizontal', data: toRows(horizontal, 1) });
    }
    return result;
  }, [wallpapers]);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const result = await saveWallpaperToDevice(wallpaper.url, {
        id: wallpaper.id,
        title: wallpaper.title,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (result === 'share') {
        Alert.alert(t('wallpapers.shareSuccessTitle'), t('wallpapers.shareSuccessBody'));
      } else {
        Alert.alert(t('wallpapers.downloadSuccessTitle'), t('wallpapers.downloadSuccessBody'));
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'share-dismissed') return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const message = e instanceof Error ? e.message : t('wallpapers.downloadError');
      Alert.alert(t('wallpapers.downloadErrorTitle'), message);
    } finally {
      setDownloadingId(null);
    }
  }, [downloadingId, t]);

  const openPreview = useCallback((item: Wallpaper) => {
    Haptics.selectionAsync().catch(() => {});
    setPreviewItem(item);
  }, []);

  const closePreview = useCallback(() => setPreviewItem(null), []);

  const headerBg = isDark ? '#1c1c1e' : '#fff';
  const headerBorder = isDark ? '#2a2a2a' : '#EDF0F5';

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

  const renderCard = (item: Wallpaper, index: number, isHorizontal: boolean) => {
    const imageUrl = resolveApiMediaUrl(item.url);
    const isDownloading = downloadingId === item.id;
    const isBlocked = downloadingId != null && !isDownloading;
    const cardWidth = isHorizontal ? HORIZONTAL_CARD_WIDTH : CARD_WIDTH;

    return (
      <Animated.View key={item.id} entering={FadeInDown.delay(index * 40).duration(320)}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.card, { width: cardWidth }]}
          onPress={() => openPreview(item)}
          accessibilityRole="button"
          accessibilityLabel={item.title ?? t('wallpapers.title')}>
          <View style={[
            isHorizontal ? styles.horizontalImage : styles.verticalImage,
            { backgroundColor: skelBg },
          ]}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                transition={300}
                cachePolicy="memory-disk"
                priority={index < 6 ? 'high' : 'normal'}
                recyclingKey={item.id}
              />
            ) : (
              <View style={[StyleSheet.absoluteFillObject, styles.imagePlaceholder]}>
                <Ionicons name="image-outline" size={28} color={colors.icon} />
              </View>
            )}

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.65)']}
              style={styles.cardGradient}
              pointerEvents="none"
            />

            {item.title ? (
              <ThemedText style={styles.cardTitle} numberOfLines={2} lightColor="#fff" darkColor="#fff">
                {item.title}
              </ThemedText>
            ) : null}

            <TouchableOpacity
              style={styles.downloadFab}
              activeOpacity={0.8}
              disabled={isDownloading || isBlocked}
              onPress={() => void handleDownload(item)}
              accessibilityRole="button"
              accessibilityLabel={t('wallpapers.download')}>
              <BlurView intensity={40} tint="dark" style={styles.downloadFabBlur}>
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="download-outline" size={18} color="#fff" style={{ opacity: isBlocked ? 0.4 : 1 }} />
                )}
              </BlurView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <Ionicons
        name={section.orientation === 'vertical' ? 'phone-portrait-outline' : 'phone-landscape-outline'}
        size={16}
        color={colors.icon}
      />
      <ThemedText style={[styles.sectionTitle, { color: colors.icon }]}>{section.title}</ThemedText>
    </View>
  );

  const renderSectionItem = ({ item, index, section }: { item: Wallpaper[]; index: number; section: SectionData }) => {
    const isHorizontal = section.orientation === 'horizontal';
    const baseIndex = index * (isHorizontal ? 1 : 2);

    if (isHorizontal) {
      return (
        <View style={[styles.horizontalRow, { paddingHorizontal: GRID_PADDING }]}>
          {item.map((w, i) => renderCard(w, baseIndex + i, true))}
        </View>
      );
    }

    return (
      <View style={styles.verticalRow}>
        {item.map((w, i) => renderCard(w, baseIndex + i, false))}
      </View>
    );
  };

  const previewUrl = previewItem ? resolveApiMediaUrl(previewItem.url) : null;
  const isPreviewDownloading = previewItem != null && downloadingId === previewItem.id;
  const previewIsHorizontal = previewItem?.orientation === 'horizontal';

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <Stack.Screen options={{ headerShown: false, presentation: 'card' }} />
      {header}
      {loading ? (
        <WallpapersSkeleton skelBg={skelBg} />
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
        <SectionList
          sections={sections}
          keyExtractor={(row, i) => row.map((w) => w.id).join('-') + i}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderSectionItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadWallpapers(true)}
              tintColor={colors.tint}
            />
          }
        />
      )}

      <Modal
        visible={previewItem != null}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={closePreview}>
        {previewItem ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.previewRoot}>
            {previewUrl ? (
              <Image
                source={{ uri: previewUrl }}
                style={StyleSheet.absoluteFillObject}
                contentFit={previewIsHorizontal ? 'contain' : 'cover'}
                cachePolicy="memory-disk"
                priority="high"
              />
            ) : null}

            <LinearGradient
              colors={['rgba(0,0,0,0.55)', 'transparent']}
              style={[styles.previewTopGradient, { height: top + 80 }]}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={styles.previewBottomGradient}
              pointerEvents="none"
            />

            <TouchableOpacity
              style={[styles.previewClose, { top: top + 12 }]}
              activeOpacity={0.75}
              onPress={closePreview}
              accessibilityRole="button"
              accessibilityLabel={t('wallpapers.back')}>
              <BlurView intensity={40} tint="dark" style={styles.previewCloseBlur}>
                <Ionicons name="close" size={22} color="#fff" />
              </BlurView>
            </TouchableOpacity>

            <View style={[styles.previewFooter, { paddingBottom: bottom + 20 }]}>
              {previewItem.title ? (
                <ThemedText style={styles.previewTitle} lightColor="#fff" darkColor="#fff">
                  {previewItem.title}
                </ThemedText>
              ) : null}
              <TouchableOpacity
                style={[styles.previewDownloadBtn, { backgroundColor: colors.tint }]}
                activeOpacity={0.88}
                disabled={isPreviewDownloading}
                onPress={() => void handleDownload(previewItem)}
                accessibilityRole="button"
                accessibilityLabel={t('wallpapers.download')}>
                {isPreviewDownloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <ThemedText style={styles.previewDownloadText}>{t('wallpapers.download')}</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : null}
      </Modal>
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
    paddingTop: 8,
    paddingBottom: 32,
    gap: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verticalRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    paddingHorizontal: GRID_PADDING,
    marginBottom: GRID_GAP,
  },
  horizontalRow: {
    marginBottom: GRID_GAP,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  verticalImage: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 18,
    overflow: 'hidden',
  },
  horizontalImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 18,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  cardTitle: {
    position: 'absolute',
    left: 12,
    right: 52,
    bottom: 12,
    fontSize: 13,
    fontWeight: '700',
  },
  downloadFab: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
  },
  downloadFabBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

  previewRoot: { flex: 1, backgroundColor: '#000' },
  previewTopGradient: { position: 'absolute', top: 0, left: 0, right: 0 },
  previewBottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
  previewClose: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  previewCloseBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFooter: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 0,
    gap: 14,
  },
  previewTitle: { fontSize: 20, fontWeight: '700' },
  previewDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  previewDownloadText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
