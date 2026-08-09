import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { buildProgressiveStages, useProgressiveImageSource } from '@/lib/progressive-image';
import { resolveApiMediaUrl } from '@/lib/resolve-api-media-url';
import { saveWallpaperToDevice } from '@/lib/save-wallpaper';
import { supabaseThumbnailUrl } from '@/lib/supabase-image-transform';
import { fetchWallpapers, type Wallpaper } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const GRID_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;
const HORIZONTAL_CARD_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;
const MAX_ZOOM_SCALE = 4;

type OrientationFilter = 'all' | 'vertical' | 'horizontal';

const PREVIEW_PROGRESSIVE_TIERS = [
  { width: 24, quality: 20 },
  { width: 480, quality: 45 },
];
/** La grilla ya apunta a un thumb chico (600w); alcanza con un único escalón previo, más chico todavía. */
const GRID_PROGRESSIVE_TIERS = [{ width: 32, quality: 20 }];

interface ZoomableImageProps {
  uri: string;
  width: number;
  height: number;
  contentFit: 'cover' | 'contain';
  onZoomChange: (zoomed: boolean) => void;
}

/** Imagen con pinch-to-zoom + doble tap; se usa dentro del preview a pantalla completa. */
function ZoomableImage({ uri, width, height, contentFit, onZoomChange }: ZoomableImageProps) {
  const {
    src,
    isLowQuality,
    advance: advanceStage,
    onError: onStageError,
  } = useProgressiveImageSource(uri, PREVIEW_PROGRESSIVE_TIERS);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetZoom = () => {
    'worklet';
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), MAX_ZOOM_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.01) {
        resetZoom();
        runOnJS(onZoomChange)(false);
      } else {
        runOnJS(onZoomChange)(true);
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value <= 1) return;
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        resetZoom();
        runOnJS(onZoomChange)(false);
      } else {
        scale.value = withTiming(2);
        savedScale.value = 2;
        runOnJS(onZoomChange)(true);
      }
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, animatedStyle]}>
        <Image
          source={{ uri: src ?? uri }}
          style={StyleSheet.absoluteFillObject}
          contentFit={contentFit}
          blurRadius={isLowQuality ? 14 : 0}
          transition={300}
          cachePolicy="memory-disk"
          priority="high"
          onLoad={advanceStage}
          onError={onStageError}
        />
      </Animated.View>
    </GestureDetector>
  );
}

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

type WallpaperCardProps = {
  item: Wallpaper;
  index: number;
  isHorizontal: boolean;
  skelBg: string;
  colors: (typeof Colors)[keyof typeof Colors];
  downloadingId: string | null;
  onPress: (item: Wallpaper) => void;
  onDownload: (item: Wallpaper) => void;
  t: (key: string) => string;
};

function WallpaperCard({ item, index, isHorizontal, skelBg, colors, downloadingId, onPress, onDownload, t }: WallpaperCardProps) {
  const imageUrl = resolveApiMediaUrl(item.url);
  const thumbUrl = supabaseThumbnailUrl(imageUrl, { width: 600, quality: 25, resize: 'cover' });
  const hasDifferentThumb = thumbUrl !== null && thumbUrl !== imageUrl;
  const gridTarget = hasDifferentThumb ? thumbUrl : imageUrl;

  const stages = useMemo(() => buildProgressiveStages(gridTarget, GRID_PROGRESSIVE_TIERS), [gridTarget]);
  const [stageIndex, setStageIndex] = useState(0);
  const [fallbackActive, setFallbackActive] = useState(false);
  const [hasRenderedOnce, setHasRenderedOnce] = useState(false);

  const isDownloading = downloadingId === item.id;
  const isBlocked = downloadingId != null && !isDownloading;
  const cardWidth = isHorizontal ? HORIZONTAL_CARD_WIDTH : CARD_WIDTH;

  const src = fallbackActive ? imageUrl : stages[stageIndex] ?? gridTarget;
  const isLowQuality = !fallbackActive && stageIndex < stages.length - 1;

  const handleLoad = useCallback(() => {
    setHasRenderedOnce(true);
    if (!fallbackActive) {
      setStageIndex((i) => Math.min(i + 1, Math.max(stages.length - 1, 0)));
    }
  }, [fallbackActive, stages.length]);

  const handleError = useCallback(() => {
    if (!fallbackActive && imageUrl && src !== imageUrl) {
      setFallbackActive(true);
    } else {
      setHasRenderedOnce(true);
    }
  }, [fallbackActive, imageUrl, src]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(320)}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.card, { width: cardWidth }]}
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={item.title ?? t('wallpapers.title')}>
        <View style={[
          isHorizontal ? styles.horizontalImage : styles.verticalImage,
          { backgroundColor: skelBg },
        ]}>
          {src ? (
            <Image
              source={{ uri: src }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              blurRadius={isLowQuality ? 6 : 0}
              transition={300}
              cachePolicy="memory-disk"
              priority={index < 6 ? 'high' : 'normal'}
              recyclingKey={item.id}
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={28} color={colors.icon} />
            </View>
          )}

          {!hasRenderedOnce && src ? (
            <View style={styles.cardLoader} pointerEvents="none">
              <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
            </View>
          ) : null}

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
            onPress={() => onDownload(item)}
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
}

export default function WallpapersScreen() {
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const skelBg = isDark ? '#2c2c2e' : '#e8e8ed';

  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [orientationFilter, setOrientationFilter] = useState<OrientationFilter>('all');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewPage, setPreviewPage] = useState(0);
  const [zoomActive, setZoomActive] = useState(false);
  const previewListRef = useRef<FlatList<Wallpaper>>(null);

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

  const filteredWallpapers = useMemo(() => {
    if (orientationFilter === 'vertical') return wallpapers.filter((w) => w.orientation !== 'horizontal');
    if (orientationFilter === 'horizontal') return wallpapers.filter((w) => w.orientation === 'horizontal');
    return wallpapers;
  }, [wallpapers, orientationFilter]);

  const sections = useMemo<SectionData[]>(() => {
    const vertical = filteredWallpapers.filter((w) => w.orientation !== 'horizontal');
    const horizontal = filteredWallpapers.filter((w) => w.orientation === 'horizontal');

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
  }, [filteredWallpapers]);

  // Con un solo grupo visible (todo vertical, todo horizontal, o filtro activo) el chip de
  // arriba ya dice de qué se trata — repetir el título de sección es ruido.
  const showSectionHeaders = sections.length > 1;

  const headerSubtitle = useMemo(() => {
    if (loading && wallpapers.length === 0) return null;
    if (wallpapers.length === 0) return t('wallpapers.subtitle');
    return t(filteredWallpapers.length === 1 ? 'wallpapers.count_one' : 'wallpapers.count_other', {
      count: filteredWallpapers.length,
    });
  }, [loading, wallpapers.length, filteredWallpapers.length, t]);

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
    const idx = filteredWallpapers.findIndex((w) => w.id === item.id);
    setPreviewIndex(idx >= 0 ? idx : 0);
  }, [filteredWallpapers]);

  const closePreview = useCallback(() => {
    setPreviewIndex(null);
    setZoomActive(false);
  }, []);

  useEffect(() => {
    if (previewIndex == null) return;
    setPreviewPage(previewIndex);
    setZoomActive(false);
  }, [previewIndex]);

  const onPreviewMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / winW);
    setPreviewPage(idx);
    setZoomActive(false);
  }, [winW]);

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

  const renderCard = (item: Wallpaper, index: number, isHorizontal: boolean) => (
    <WallpaperCard
      key={item.id}
      item={item}
      index={index}
      isHorizontal={isHorizontal}
      skelBg={skelBg}
      colors={colors}
      downloadingId={downloadingId}
      onPress={openPreview}
      onDownload={(w) => void handleDownload(w)}
      t={t}
    />
  );

  const renderSectionHeader = ({ section }: { section: SectionData }) => {
    if (!showSectionHeaders) return null;
    return (
      <View style={styles.sectionHeader}>
        <Ionicons
          name={section.orientation === 'vertical' ? 'phone-portrait-outline' : 'phone-landscape-outline'}
          size={16}
          color={colors.icon}
        />
        <ThemedText style={[styles.sectionTitle, { color: colors.icon }]}>{section.title}</ThemedText>
      </View>
    );
  };

  const filterChips: { key: OrientationFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'all', label: t('wallpapers.filterAll'), icon: 'apps-outline' },
    { key: 'vertical', label: t('wallpapers.filterVertical'), icon: 'phone-portrait-outline' },
    { key: 'horizontal', label: t('wallpapers.filterHorizontal'), icon: 'phone-landscape-outline' },
  ];

  const filterBar =
    wallpapers.length > 0 ? (
      <View style={[styles.filterBar, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
        {filterChips.map((chip) => {
          const active = orientationFilter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.tint : isDark ? '#2c2c2e' : '#F0F0F5',
                },
              ]}
              onPress={() => setOrientationFilter(chip.key)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}>
              <Ionicons name={chip.icon} size={14} color={active ? '#fff' : colors.icon} />
              <ThemedText style={[styles.filterChipText, { color: active ? '#fff' : colors.icon }]}>
                {chip.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    ) : null;

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

  const previewItem = previewIndex != null ? filteredWallpapers[previewPage] ?? null : null;
  const isPreviewDownloading = previewItem != null && downloadingId === previewItem.id;

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <Stack.Screen options={{ headerShown: false, presentation: 'card' }} />
      {header}
      {filterBar}
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
      ) : filteredWallpapers.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.tint + '12' }]}>
            <Ionicons name="image-outline" size={52} color={colors.tint} />
          </View>
          <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
            {t('wallpapers.emptyFilterTitle')}
          </ThemedText>
          <ThemedText style={[styles.emptySub, { color: colors.icon }]}>
            {t('wallpapers.emptyFilterBody')}
          </ThemedText>
          <TouchableOpacity
            style={[styles.emptyFilterBtn, { borderColor: colors.tint }]}
            onPress={() => setOrientationFilter('all')}
            activeOpacity={0.85}>
            <ThemedText style={[styles.emptyFilterBtnText, { color: colors.tint }]}>
              {t('wallpapers.viewAllFilter')}
            </ThemedText>
          </TouchableOpacity>
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
        visible={previewIndex != null}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={closePreview}>
        {previewIndex != null && previewItem ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.previewRoot}>
            <GestureHandlerRootView style={StyleSheet.absoluteFillObject}>
              <FlatList
                ref={previewListRef}
                data={filteredWallpapers}
                keyExtractor={(w) => w.id}
                horizontal
                pagingEnabled
                scrollEnabled={!zoomActive}
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={previewIndex}
                getItemLayout={(_, index) => ({ length: winW, offset: winW * index, index })}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    previewListRef.current?.scrollToIndex({ index: info.index, animated: false });
                  }, 120);
                }}
                onMomentumScrollEnd={onPreviewMomentumEnd}
                renderItem={({ item }) => {
                  const url = resolveApiMediaUrl(item.url);
                  const isHorizontal = item.orientation === 'horizontal';
                  return (
                    <View style={{ width: winW, height: winH }}>
                      {url ? (
                        <ZoomableImage
                          uri={url}
                          width={winW}
                          height={winH}
                          contentFit={isHorizontal ? 'contain' : 'cover'}
                          onZoomChange={setZoomActive}
                        />
                      ) : null}
                    </View>
                  );
                }}
              />
            </GestureHandlerRootView>

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

            {filteredWallpapers.length > 1 ? (
              <View style={[styles.previewCounter, { top: top + 20 }]} pointerEvents="none">
                <BlurView intensity={40} tint="dark" style={styles.previewCounterBlur}>
                  <Text style={styles.previewCounterText}>
                    {previewPage + 1} / {filteredWallpapers.length}
                  </Text>
                </BlurView>
              </View>
            ) : null}

            <View style={[styles.previewFooter, { paddingBottom: bottom + 20 }]} pointerEvents="box-none">
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
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: GRID_PADDING,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
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
  cardLoader: {
    ...StyleSheet.absoluteFillObject,
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
  emptyFilterBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1,
  },
  emptyFilterBtnText: { fontSize: 14, fontWeight: '600' },

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
  previewCounter: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 100,
    overflow: 'hidden',
  },
  previewCounterBlur: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  previewCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
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
