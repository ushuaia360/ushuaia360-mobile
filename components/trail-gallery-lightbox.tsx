import PanoramaWebView from '@/components/panorama-webview';
import type { GallerySlide } from '@/lib/gallery-slides';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

/** Aire bajo el botón cerrar */
const CHROME_TOP_EXTRA = 52;
/** Altura reservada abajo: solo safe area si hay una foto; barra flechas + indicadores si hay varias */
const CHROME_BOTTOM_SINGLE = 28;
const CHROME_BOTTOM_ARROWS = 68;

/** El visor ocupa esta fracción de la altura útil (entre paddings), el resto queda margen arriba/abajo */
const VIEWER_HEIGHT_RATIO = 0.68;

function Dot({ active }: { active: boolean }) {
  const w = useSharedValue(active ? 20 : 6);
  useEffect(() => {
    w.value = withSpring(active ? 20 : 6, { damping: 20, stiffness: 300, mass: 0.6 });
  }, [active, w]);
  const style = useAnimatedStyle(() => ({
    height: 6,
    width: w.value,
    borderRadius: 3,
    backgroundColor: active ? '#fff' : 'rgba(255,255,255,0.45)',
  }));
  return <Animated.View style={style} />;
}

function LockedPanoramaOverlay({ uri }: { uri: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.lockedWrap}>
      <Image source={{ uri }} style={styles.imageFill} contentFit="cover" blurRadius={40} />
      <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={styles.lockedDim} pointerEvents="none" />
      <View style={styles.lockedContent}>
        <View style={styles.lockedIconWrap}>
          <Ionicons name="lock-closed" size={22} color="#fff" />
        </View>
        <Text style={styles.lockedTitle}>{t('premium.panoramaLockedTitle')}</Text>
        <Text style={styles.lockedBody}>{t('premium.panoramaLockedBody')}</Text>
        <TouchableOpacity
          style={styles.lockedCta}
          activeOpacity={0.85}
          onPress={() => router.push('/premium')}>
          <Ionicons name="sparkles" size={14} color="#111" style={styles.lockedCtaIcon} />
          <Text style={styles.lockedCtaText}>{t('premium.tiers.pro.cta')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface TrailGalleryLightboxProps {
  visible: boolean;
  onClose: () => void;
  items: GallerySlide[];
  initialIndex: number;
  /** Cuando es true, las fotos panorámicas (`mode: 'panorama'`) se muestran blureadas con un candado en vez del visor 360. */
  panoramaLocked?: boolean;
}

export default function TrailGalleryLightbox({
  visible,
  onClose,
  items,
  initialIndex,
  panoramaLocked = false,
}: TrailGalleryLightboxProps) {
  const { top, bottom } = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const listRef = useRef<FlatList<GallerySlide>>(null);
  const [page, setPage] = useState(initialIndex);

  const multi = items.length > 1;
  const pagePaddingTop = top + CHROME_TOP_EXTRA;
  const pagePaddingBottom = bottom + (multi ? CHROME_BOTTOM_ARROWS : CHROME_BOTTOM_SINGLE);

  const innerH = Math.max(0, winH - pagePaddingTop - pagePaddingBottom);
  const viewerH = Math.max(160, Math.round(innerH * VIEWER_HEIGHT_RATIO));

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      if (!items.length || index < 0 || index >= items.length) return;
      listRef.current?.scrollToIndex({ index, animated });
    },
    [items.length],
  );

  const goPrev = useCallback(() => {
    const i = page - 1;
    if (i < 0) return;
    setPage(i);
    scrollToIndex(i, true);
  }, [page, scrollToIndex]);

  const goNext = useCallback(() => {
    const i = page + 1;
    if (i >= items.length) return;
    setPage(i);
    scrollToIndex(i, true);
  }, [page, items.length, scrollToIndex]);

  useEffect(() => {
    if (!visible) return;
    const i = Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1));
    setPage(i);
    const id = requestAnimationFrame(() => {
      scrollToIndex(i, false);
    });
    return () => cancelAnimationFrame(id);
  }, [visible, initialIndex, items.length, scrollToIndex]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / winW);
      setPage(i);
    },
    [winW],
  );

  const currentIsPanorama = items[page]?.mode === 'panorama';
  const currentIsLockedPanorama = currentIsPanorama && panoramaLocked;

  if (!items.length) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={onClose}>
      <View style={styles.root}>
        <FlatList
          ref={listRef}
          style={styles.list}
          data={items}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          scrollEnabled={!currentIsPanorama || currentIsLockedPanorama}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: winW,
            offset: winW * index,
            index,
          })}
          onMomentumScrollEnd={onMomentumEnd}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
              });
            }, 120);
          }}
          renderItem={({ item }) => (
            <View
              style={[
                styles.page,
                {
                  width: winW,
                  height: winH,
                  paddingTop: pagePaddingTop,
                  paddingBottom: pagePaddingBottom,
                },
              ]}>
              <View style={styles.viewerCenter}>
                <View style={[styles.viewerBox, { height: item.mode === 'panorama' ? innerH : viewerH }]}>
                  {item.mode === 'panorama' ? (
                    panoramaLocked ? (
                      <LockedPanoramaOverlay uri={item.uri} />
                    ) : (
                      <PanoramaWebView
                        uri={item.uri}
                        panoramaHalf={item.panoramaHalf}
                        style={styles.panoramaFill}
                      />
                    )
                  ) : (
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.imageFill}
                      contentFit="contain"
                      transition={0}
                    />
                  )}
                </View>
              </View>
            </View>
          )}
        />

        <View style={[styles.chrome, { paddingTop: top + 8 }]} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={12}
            accessibilityLabel="Cerrar galería">
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {multi ? (
          <View
            style={[styles.bottomBar, { paddingBottom: Math.max(bottom, 12) }]}
            pointerEvents="box-none">
            <TouchableOpacity
              style={[styles.arrowBtn, page === 0 && styles.arrowBtnDisabled]}
              onPress={goPrev}
              disabled={page === 0}
              accessibilityRole="button"
              accessibilityLabel="Imagen anterior">
              <Ionicons
                name="chevron-back"
                size={28}
                color={page === 0 ? 'rgba(255,255,255,0.25)' : '#fff'}
              />
            </TouchableOpacity>

            <View style={styles.bottomCenter} pointerEvents="box-none">
              <PhotoCounter current={page + 1} total={items.length} />
              <View style={styles.dotsRow}>
                {items.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      setPage(i);
                      scrollToIndex(i, true);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                    <Dot active={i === page} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.arrowBtn, page >= items.length - 1 && styles.arrowBtnDisabled]}
              onPress={goNext}
              disabled={page >= items.length - 1}
              accessibilityRole="button"
              accessibilityLabel="Imagen siguiente">
              <Ionicons
                name="chevron-forward"
                size={28}
                color={page >= items.length - 1 ? 'rgba(255,255,255,0.25)' : '#fff'}
              />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function PhotoCounter({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.counterWrap}>
      <Text style={styles.counterText}>
        {current} / {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  list: {
    flex: 1,
  },
  page: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  viewerCenter: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 0,
  },
  viewerBox: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 4,
  },
  imageFill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  panoramaFill: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
  },
  lockedWrap: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  lockedDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  lockedContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 6,
  },
  lockedIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lockedTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  lockedBody: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 14,
  },
  lockedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    height: 42,
    borderRadius: 21,
  },
  lockedCtaIcon: {
    marginRight: 6,
  },
  lockedCtaText: {
    color: '#111',
    fontSize: 14,
    fontWeight: '700',
  },
  chrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  arrowBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  arrowBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bottomCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 220,
    alignSelf: 'center',
  },
  counterWrap: {
    paddingVertical: 2,
  },
  counterText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'android' ? 'Inter' : undefined,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
});
