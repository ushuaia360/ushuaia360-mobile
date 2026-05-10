import PanoramaWebView from '@/components/panorama-webview';
import ReviewSelectedPhotosStrip from '@/components/review-selected-photos-strip';
import TrailGalleryLightbox from '@/components/trail-gallery-lightbox';
import TrailRouteTileMap, {
  TRAIL_ROUTE_LINE_COLOR,
  type TrailInterestPoint,
} from '@/components/trail-route-tile-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNetworkReachable } from '@/hooks/use-network-reachable';
import { imageUrlsToGallerySlides, placeMediaToGallerySlides } from '@/lib/gallery-slides';
import { formatPlaceCategoryLabel, getPlaceCategoryVisual } from '@/lib/place-category-map';
import { redirectToLogin } from '@/lib/needAuth';
import { pickReviewImagesToAppend } from '@/lib/review-image-picker';
import { REVIEW_GALLERY_MAX_PHOTOS, REVIEWS_LIST_PAGE_SIZE } from '@/lib/review-constants';
import { resolveApiMediaUrl } from '@/lib/resolve-api-media-url';
import { loadPlaceOfflinePack } from '@/lib/offline-pack';
import {
  createPlaceReview,
  fetchPlace,
  fetchPlaceReviews,
  uploadReviewImages,
  type BackendPlace,
  type PlaceReview,
} from '@/services/api';
import { useAuthStore } from '@/store/auth-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { Stack, router, useLocalSearchParams, usePathname } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_HORIZONTAL_MARGIN = 16;
const GALLERY_TOP_GAP = 16;
const GALLERY_SLIDE_WIDTH = SCREEN_WIDTH - GALLERY_HORIZONTAL_MARGIN * 2;
const GALLERY_HERO_HEIGHT_RATIO = 0.88;
const TRAIL_FLOAT_ACTIONS_ROW_PAD = 88;
const EXPANDABLE_DESC_CHAR_THRESHOLD = 200;
const EXPANDABLE_DESC_COLLAPSED_LINES = 5;

type RatingCounts = {
  one_star: number;
  two_star: number;
  three_star: number;
  four_star: number;
  five_star: number;
};

const EMPTY_RATING_COUNTS: RatingCounts = {
  one_star: 0,
  two_star: 0,
  three_star: 0,
  four_star: 0,
  five_star: 0,
};

function relativeDate(date: Date): string {
  const DAY = 86400000;
  const days = Math.floor((Date.now() - date.getTime()) / DAY);
  if (days < 7) return days <= 1 ? 'Hace 1 día' : `Hace ${days} días`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`;
  const years = Math.floor(days / 365);
  return years === 1 ? 'Hace 1 año' : `Hace ${years} años`;
}

function descriptionNeedsExpandToggle(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.length > EXPANDABLE_DESC_CHAR_THRESHOLD) return true;
  return t.split(/\n/).length > EXPANDABLE_DESC_COLLAPSED_LINES;
}

function ExpandableDescription({
  text,
  textStyle,
  tint,
  collapsedLines = EXPANDABLE_DESC_COLLAPSED_LINES,
}: {
  text: string;
  textStyle: object | object[];
  tint: string;
  collapsedLines?: number;
}) {
  const trimmed = text.trim();
  const [expanded, setExpanded] = useState(false);
  const needsToggle = descriptionNeedsExpandToggle(trimmed);
  if (!trimmed) return null;
  return (
    <View style={descStyles.expandableDescWrap}>
      <ThemedText style={textStyle} numberOfLines={expanded || !needsToggle ? undefined : collapsedLines}>
        {trimmed}
      </ThemedText>
      {needsToggle ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={({ pressed }) => [descStyles.expandableDescBtn, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Ver menos' : 'Ver más'}>
          <ThemedText style={[descStyles.expandableDescBtnLabel, { color: tint }]}>
            {expanded ? 'Ver menos' : 'Ver más'}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const descStyles = StyleSheet.create({
  expandableDescWrap: { alignSelf: 'stretch' },
  expandableDescBtn: { alignSelf: 'center', marginTop: 8, paddingVertical: 4 },
  expandableDescBtnLabel: { fontSize: 15, fontWeight: '600' },
});

interface MetricProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  iconColor: string;
}

function Metric({ icon, label, value, iconColor }: MetricProps) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
    </View>
  );
}

export default function PlaceDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { top, bottom } = useSafeAreaInsets();
  const networkReachable = useNetworkReachable();
  const isOnline = networkReachable === true;

  const { id } = useLocalSearchParams<{ id?: string }>();
  const placeId = typeof id === 'string' ? id : undefined;
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const placeFavorited = useFavoritesStore((s) => (placeId ? s.isPlaceFavorite(placeId) : false));
  const togglePlaceFavorite = useFavoritesStore((s) => s.togglePlace);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const topBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [80, 160], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [80, 160], [-10, 0], Extrapolation.CLAMP) }],
  }));

  const [place, setPlace] = useState<BackendPlace | null>(null);
  const [placeFromOffline, setPlaceFromOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviewsOffset, setReviewsOffset] = useState(0);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsAverageRating, setReviewsAverageRating] = useState(0);
  const [reviewsRatingCounts, setReviewsRatingCounts] = useState<RatingCounts>(EMPTY_RATING_COUNTS);
  const [reviewsSubmitting, setReviewsSubmitting] = useState(false);
  const [reviewsSubmitError, setReviewsSubmitError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotoUris, setReviewPhotoUris] = useState<string[]>([]);
  const [reviewImagesLightbox, setReviewImagesLightbox] = useState<{
    uris: string[];
    index: number;
  } | null>(null);

  const load = useCallback(async () => {
    if (!placeId) return;
    setLoading(true);
    setError(null);
    setPlaceFromOffline(false);
    try {
      const p = await fetchPlace(placeId);
      setPlace(p);
      setPlaceFromOffline(false);
    } catch {
      const cached = await loadPlaceOfflinePack(placeId);
      if (cached) {
        setPlace(cached);
        setPlaceFromOffline(true);
        setError(null);
      } else {
        setError('No se pudo cargar el lugar');
        setPlace(null);
        setPlaceFromOffline(false);
      }
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!mapFullscreen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setMapFullscreen(false);
      return true;
    });
    return () => sub.remove();
  }, [mapFullscreen]);

  const gallerySlides = useMemo(() => {
    if (!place) return [];
    const typed = place.media?.length ? placeMediaToGallerySlides(place.media) : [];
    const base = typed.length > 0 ? typed : imageUrlsToGallerySlides(place.image_urls ?? []);
    return base.map((s) => ({ ...s, uri: resolveApiMediaUrl(s.uri) ?? s.uri }));
  }, [place]);

  const hasCoords =
    place != null && place.latitude != null && place.longitude != null;

  /** La posición se dibuja solo con `mainPoint` (mismo criterio que el mapa de sendero). Un POI en la misma coordenada duplicaba el pin (verde + rojo) hasta al hacer zoom. */
  const placeMapInterestPoints = useMemo<TrailInterestPoint[]>(() => [], []);

  const mapCenter = useMemo(() => {
    if (place && hasCoords) {
      return { latitude: place.latitude!, longitude: place.longitude! };
    }
    return { latitude: -54.8, longitude: -68.3 };
  }, [place, hasCoords]);

  const mainPoint = hasCoords && place
    ? { latitude: place.latitude!, longitude: place.longitude! }
    : null;

  const categoryVisual = useMemo(
    () => (place ? getPlaceCategoryVisual(place.category, isDark) : null),
    [place, isDark],
  );

  const openMaps = useCallback(() => {
    if (!place || !hasCoords) return;
    const { latitude, longitude } = place;
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(place.name ?? 'Lugar')}`
        : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(place.name ?? 'Lugar')})`;
    Linking.openURL(url).catch(() => {});
  }, [place, hasCoords]);

  const refreshReviews = useCallback(async () => {
    if (!placeId) return;
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const data = await fetchPlaceReviews(placeId, REVIEWS_LIST_PAGE_SIZE, 0);
      setReviews(data.reviews);
      setReviewsTotal(data.total);
      setReviewsOffset(0);
      setReviewsAverageRating(Number.isFinite(data.average_rating) ? data.average_rating : 0);
      setReviewsRatingCounts({
        one_star: data.rating_counts?.one_star ?? 0,
        two_star: data.rating_counts?.two_star ?? 0,
        three_star: data.rating_counts?.three_star ?? 0,
        four_star: data.rating_counts?.four_star ?? 0,
        five_star: data.rating_counts?.five_star ?? 0,
      });
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : 'Error al cargar las reseñas');
      setReviews([]);
      setReviewsAverageRating(0);
      setReviewsRatingCounts(EMPTY_RATING_COUNTS);
    } finally {
      setReviewsLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    if (!placeId || networkReachable !== true) return;
    void refreshReviews();
  }, [placeId, refreshReviews, networkReachable]);

  const ratingPercentages = useMemo(() => {
    const total = Math.max(1, reviewsTotal);
    return [
      (reviewsRatingCounts.five_star / total) * 100,
      (reviewsRatingCounts.four_star / total) * 100,
      (reviewsRatingCounts.three_star / total) * 100,
      (reviewsRatingCounts.two_star / total) * 100,
      (reviewsRatingCounts.one_star / total) * 100,
    ];
  }, [reviewsRatingCounts, reviewsTotal]);

  const handleSubmitReview = useCallback(async () => {
    if (!placeId) return;
    if (!token) {
      redirectToLogin(pathname || '/(tabs)');
      return;
    }
    const comment = reviewComment.trim();
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewsSubmitError('Seleccioná una calificación entre 1 y 5.');
      return;
    }
    if (!comment) {
      setReviewsSubmitError('Escribí un comentario para enviar la reseña.');
      return;
    }
    setReviewsSubmitting(true);
    setReviewsSubmitError(null);
    try {
      let image_urls: string[] | undefined;
      if (reviewPhotoUris.length > 0) {
        image_urls = await uploadReviewImages(token, reviewPhotoUris);
      }
      await createPlaceReview(placeId, token, {
        rating: reviewRating,
        comment,
        ...(image_urls?.length ? { image_urls } : {}),
      });
      await refreshReviews();
      setReviewComment('');
      setReviewRating(5);
      setReviewPhotoUris([]);
    } catch (err) {
      setReviewsSubmitError(err instanceof Error ? err.message : 'Error al enviar la reseña');
    } finally {
      setReviewsSubmitting(false);
    }
  }, [pathname, placeId, reviewComment, reviewPhotoUris, reviewRating, refreshReviews, token]);

  const handlePickReviewPhotos = useCallback(async () => {
    if (reviewsSubmitting) return;
    const next = await pickReviewImagesToAppend(reviewPhotoUris);
    if (next) setReviewPhotoUris(next);
  }, [reviewsSubmitting, reviewPhotoUris]);

  const loadMoreReviews = useCallback(async () => {
    if (!placeId) return;
    if (reviewsLoading) return;
    if (reviews.length >= reviewsTotal) return;
    const nextOffset = reviewsOffset + REVIEWS_LIST_PAGE_SIZE;
    setReviewsLoading(true);
    try {
      const data = await fetchPlaceReviews(placeId, REVIEWS_LIST_PAGE_SIZE, nextOffset);
      setReviews((prev) => [...prev, ...data.reviews]);
      setReviewsOffset(nextOffset);
      setReviewsTotal(data.total);
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : 'Error al cargar más reseñas');
    } finally {
      setReviewsLoading(false);
    }
  }, [placeId, reviews.length, reviewsLoading, reviewsOffset, reviewsTotal]);

  const detailListBottomPad = bottom + TRAIL_FLOAT_ACTIONS_ROW_PAD;
  const galleryMarginTop = top + GALLERY_TOP_GAP;
  const heroHeight = Math.round(GALLERY_SLIDE_WIDTH * GALLERY_HERO_HEIGHT_RATIO);
  const showFullSkeleton = Boolean(placeId && !place && loading);
  const skelBlock = isDark ? '#2c2c2e' : '#e8eaed';
  const skelBlockInner = isDark ? '#3a3a3c' : '#dfe3e8';

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {!placeId ? (
        <View style={styles.center}>
          <ThemedText style={{ color: colors.icon }}>Lugar inválido</ThemedText>
        </View>
      ) : showFullSkeleton ? (
        <View style={styles.scrollShell}>
          <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
            <View style={[styles.floatRow, { top: 12 }]} pointerEvents="box-none">
              <TouchableOpacity
                style={[styles.floatBtn, { backgroundColor: '#fff' }]}
                onPress={() => router.back()}
                hitSlop={12}>
                <Ionicons name="chevron-back" size={22} color="#000" />
              </TouchableOpacity>
            </View>
            <View
              style={{
                marginHorizontal: GALLERY_HORIZONTAL_MARGIN,
                marginTop: galleryMarginTop,
                width: GALLERY_SLIDE_WIDTH,
                height: heroHeight,
                backgroundColor: skelBlock,
                borderRadius: 16,
              }}
            />
            <View style={[styles.card, { marginHorizontal: 16, marginTop: 12, paddingBottom: 20, gap: 12 }]}>
              <View
                style={{
                  height: 24,
                  width: '72%',
                  maxWidth: 280,
                  backgroundColor: skelBlockInner,
                  borderRadius: 8,
                  alignSelf: 'center',
                }}
              />
              <View
                style={{
                  height: 14,
                  width: 100,
                  backgroundColor: skelBlockInner,
                  borderRadius: 6,
                  alignSelf: 'center',
                }}
              />
              <View
                style={[
                  styles.cardDivider,
                  { backgroundColor: isDark ? '#2a2a2a' : '#F2F4F7', marginTop: 4 },
                ]}
              />
              <View style={{ flexDirection: 'row', paddingVertical: 8, gap: 8 }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ flex: 1, height: 56, backgroundColor: skelBlock, borderRadius: 10 }} />
                ))}
              </View>
              <View
                style={{
                  height: 18,
                  width: 120,
                  backgroundColor: skelBlockInner,
                  borderRadius: 6,
                  marginTop: 8,
                }}
              />
              <View style={{ gap: 8, marginTop: 4 }}>
                <View style={{ height: 14, borderRadius: 4, backgroundColor: skelBlock }} />
                <View style={{ height: 14, width: '92%', borderRadius: 4, backgroundColor: skelBlock }} />
                <View style={{ height: 14, width: '78%', borderRadius: 4, backgroundColor: skelBlock }} />
              </View>
              <View style={styles.mapSection}>
                <View style={styles.mapWrap}>
                  <View style={[styles.mapLayoutBox, { backgroundColor: skelBlock }]} />
                </View>
              </View>
              <View style={{ height: 18, width: 200, backgroundColor: skelBlockInner, borderRadius: 6 }} />
              <View style={{ gap: 12 }}>
                <View
                  style={{ height: 200, borderRadius: 12, backgroundColor: skelBlock, overflow: 'hidden' }}
                />
                <View
                  style={{ height: 200, borderRadius: 12, backgroundColor: skelBlock, overflow: 'hidden' }}
                />
              </View>
            </View>
          </View>
        </View>
      ) : error || !place ? (
        <View style={styles.center}>
          <ThemedText style={{ color: colors.icon, textAlign: 'center', paddingHorizontal: 24 }}>
            {networkReachable === false
              ? 'Sin conexión. No hay una copia guardada de este lugar. Conectate y abrilo una vez para guardarlo en el dispositivo.'
              : error ?? 'No encontrado'}
          </ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.scrollShell}>
            <Animated.FlatList
              style={styles.flexScroll}
              data={[place.id]}
              keyExtractor={(k) => k}
              showsVerticalScrollIndicator={false}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              pointerEvents={mapFullscreen ? 'none' : 'auto'}
              contentContainerStyle={{ paddingBottom: detailListBottomPad }}
              renderItem={() => (
                <View>
                  {placeFromOffline ? (
                    <View
                      style={{
                        marginHorizontal: 16,
                        marginBottom: 8,
                        marginTop: 4,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        backgroundColor: isDark ? '#2a2a2c' : '#eef2fb',
                      }}>
                      <ThemedText style={{ fontSize: 13, color: colors.text, opacity: 0.92 }}>
                        Sin conexión: copia guardada en el dispositivo.
                      </ThemedText>
                    </View>
                  ) : null}
            <View style={[styles.galleryWrap, { marginTop: galleryMarginTop }]}>
              <View
                style={[
                  styles.gallery,
                  { height: heroHeight, backgroundColor: isDark ? '#1c1c1e' : '#e0e4ea' },
                ]}>
                {gallerySlides.length > 0 ? (
                  <FlatList
                    data={gallerySlides}
                    keyExtractor={(_, i) => String(i)}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                      const index = Math.round(e.nativeEvent.contentOffset.x / GALLERY_SLIDE_WIDTH);
                      if (index !== activeImage) setActiveImage(index);
                    }}
                    scrollEventThrottle={16}
                    renderItem={({ item, index }) => (
                      <Pressable
                        accessibilityRole="imagebutton"
                        onPress={() => {
                          setLightboxIndex(index);
                          setLightboxOpen(true);
                        }}>
                        <View style={{ width: GALLERY_SLIDE_WIDTH, height: heroHeight }}>
                          {item.mode === 'panorama' ? (
                            <PanoramaWebView
                              uri={item.uri}
                              panoramaHalf={item.panoramaHalf}
                              style={{ width: GALLERY_SLIDE_WIDTH, height: heroHeight }}
                            />
                          ) : (
                            <Image
                              source={{ uri: item.uri }}
                              style={{ width: GALLERY_SLIDE_WIDTH, height: heroHeight }}
                              resizeMode="cover"
                            />
                          )}
                          {item.mode === 'panorama' ? (
                            <View
                              style={[
                                styles.galleryPanoBadge,
                                {
                                  backgroundColor: item.panoramaHalf
                                    ? 'rgba(80,80,120,0.85)'
                                    : 'rgba(0,0,0,0.55)',
                                },
                              ]}>
                              <ThemedText style={styles.galleryPanoBadgeText}>
                                {item.panoramaHalf ? '180°' : '360°'}
                              </ThemedText>
                            </View>
                          ) : null}
                        </View>
                      </Pressable>
                    )}
                  />
                ) : (
                  <View
                    style={[
                      styles.heroPlaceholder,
                      { height: heroHeight, backgroundColor: isDark ? '#2c2c2e' : '#f0f0f5' },
                    ]}>
                    <Ionicons
                      name={categoryVisual?.icon ?? 'location'}
                      size={48}
                      color={categoryVisual?.accent ?? colors.tint}
                    />
                  </View>
                )}

                {gallerySlides.length > 1 ? (
                  <View style={styles.dots}>
                    {gallerySlides.map((_, i) => {
                      const active = i === activeImage;
                      return (
                        <View
                          key={i}
                          style={[
                            styles.dot,
                            active
                              ? { width: 18, backgroundColor: 'rgba(0,0,0,0.5)' }
                              : { backgroundColor: 'rgba(0,0,0,0.2)' },
                          ]}
                        />
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <View style={[styles.floatRow, { top: 12 }]} pointerEvents="box-none">
                <TouchableOpacity
                  style={[styles.floatBtn, { backgroundColor: '#fff' }]}
                  onPress={() => router.back()}
                  hitSlop={12}>
                  <Ionicons name="chevron-back" size={22} color="#000" />
                </TouchableOpacity>
                <View style={styles.floatRightGroup}>
                  {isOnline ? (
                    <TouchableOpacity
                      style={[styles.floatBtn, { backgroundColor: '#fff' }]}
                      onPress={() => Share.share({ message: `Mirá este lugar: ${place.name ?? place.slug}` })}
                      hitSlop={12}>
                      <Ionicons name="share-outline" size={20} color="#000" />
                    </TouchableOpacity>
                  ) : null}
                  {isOnline ? (
                    <TouchableOpacity
                      style={[
                        styles.floatBtn,
                        { backgroundColor: '#fff' },
                        placeFavorited && styles.floatBtnLiked,
                      ]}
                      onPress={async () => {
                        if (!token) {
                          redirectToLogin(pathname || '/(tabs)');
                          return;
                        }
                        if (!placeId) return;
                        await togglePlaceFavorite(placeId, token, !placeFavorited);
                      }}
                      hitSlop={12}>
                      <Ionicons
                        name={placeFavorited ? 'heart' : 'heart-outline'}
                        size={20}
                        color={placeFavorited ? '#ff3b30' : '#000'}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff', padding: 0, overflow: 'hidden' }]}>
              <View style={styles.nameSection}>
                <ThemedText style={styles.name}>{place.name ?? place.slug}</ThemedText>
                <ThemedText style={[styles.ratingText, { color: colors.icon, marginTop: 6, fontSize: 15 }]}>
                  {formatPlaceCategoryLabel(place.category)}
                  {place.region ? ` · ${place.region}` : ''}
                </ThemedText>
                {isOnline && reviewsTotal > 0 ? (
                  <View style={styles.titleRatingRow}>
                    <Ionicons name="star" size={14} color="#000" />
                    <ThemedText style={[styles.titleRatingValue, { color: '#000' }]}>
                      {reviewsAverageRating.toFixed(1)}
                    </ThemedText>
                    <ThemedText style={[styles.titleRatingCount, { color: colors.icon }]}>
                      ({reviewsTotal})
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              <View style={[styles.cardDivider, { backgroundColor: isDark ? '#2a2a2a' : '#F2F4F7' }]} />

              <View style={styles.metricsRow}>
                <Metric
                  icon={categoryVisual?.icon ?? 'map-outline'}
                  label="Categoría"
                  value={formatPlaceCategoryLabel(place.category)}
                  iconColor={categoryVisual?.accent ?? colors.tint}
                />
                <View style={[styles.metricSep, { backgroundColor: isDark ? '#2a2a2a' : '#EDF0F5' }]} />
                <Metric
                  icon="location-outline"
                  label="Región"
                  value={place.region?.trim() || '—'}
                  iconColor={colors.tint}
                />
                <View style={[styles.metricSep, { backgroundColor: isDark ? '#2a2a2a' : '#EDF0F5' }]} />
                <Metric
                  icon="star"
                  label="Rating"
                  value={
                    isOnline && reviewsTotal > 0 ? reviewsAverageRating.toFixed(1) : '—'
                  }
                  iconColor={isOnline && reviewsTotal > 0 ? '#FFB800' : colors.tint}
                />
              </View>

              {place.description?.trim() ? (
                <View style={styles.trailDescBlock}>
                  <ExpandableDescription
                    text={place.description}
                    textStyle={[styles.descInline, { color: colors.icon }]}
                    tint={colors.tint}
                  />
                </View>
              ) : null}

              {hasCoords ? (
                <View style={styles.mapSection}>
                  <ThemedText style={[styles.mapSectionLabel, { color: colors.text }]}>Ubicación</ThemedText>
                  <View style={styles.mapWrap}>
                    <View style={styles.mapLayoutBox} />
                    <View style={styles.mapOverlay}>
                      <TrailRouteTileMap
                        routeCoordinates={[]}
                        interestPoints={placeMapInterestPoints}
                        mainPoint={mainPoint}
                        fallbackCenter={mapCenter}
                        isDark={isDark}
                        tint={colors.tint}
                        routeColor={TRAIL_ROUTE_LINE_COLOR}
                        interactive
                        focusTarget={null}
                        onPoiPress={() => {
                          setMapFullscreen(true);
                        }}
                        onMapPressAt={() => {
                          setMapFullscreen(true);
                        }}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.mapExpandBtn}
                      onPress={() => setMapFullscreen(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Ver mapa en pantalla completa">
                      <Ionicons name="scan-outline" size={22} color="#000" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {isOnline && reviews.length > 0 ? (
                <View style={styles.ratingBreakdown}>
                  <View style={styles.rbLeft}>
                    <ThemedText style={[styles.rbScore, { color: colors.tint }]}>
                      {reviewsAverageRating.toFixed(1)}
                    </ThemedText>
                    <View style={styles.rbStars}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons
                          key={i}
                          name="star"
                          size={20}
                          color={i <= Math.round(reviewsAverageRating) ? '#FFB800' : '#D1D1D6'}
                        />
                      ))}
                    </View>
                  </View>
                  <View style={styles.rbBars}>
                    {[5, 4, 3, 2, 1].map((star, idx) => (
                      <View key={star} style={styles.rbBarRow}>
                        <View style={[styles.rbTrack, { backgroundColor: isDark ? '#2a2a2a' : '#E5E5EA' }]}>
                          <View
                            style={[
                              styles.rbFill,
                              {
                                width: `${ratingPercentages[idx]}%` as any,
                                backgroundColor: isDark ? '#fff' : '#1C1C1E',
                              },
                            ]}
                          />
                        </View>
                        <ThemedText style={[styles.rbLabel, { color: colors.icon }]}>{star}</ThemedText>
                        <Ionicons name="star" size={10} color={isDark ? '#555' : '#C7C7CC'} />
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>

            {isOnline ? (
            <>
            <View
              style={[
                styles.reviewFormCard,
                {
                  backgroundColor: isDark ? '#1c1c1e' : '#fff',
                  borderColor: isDark ? '#2a2a2a' : '#E5E7EB',
                },
              ]}>
              <ThemedText style={[styles.reviewFormTitle, { color: colors.text }]}>Dejá tu reseña</ThemedText>
              <View style={styles.reviewFormRatingRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setReviewRating(i)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Calificar con ${i} estrella${i > 1 ? 's' : ''}`}>
                    <Ionicons
                      name="star"
                      size={24}
                      color={i <= reviewRating ? '#FFB800' : isDark ? '#555' : '#D1D1D6'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <View
                style={[
                  styles.reviewInputOuter,
                  {
                    borderColor: isDark ? '#2a2a2a' : '#E5E7EB',
                    backgroundColor: isDark ? '#111' : '#fff',
                  },
                ]}>
                <TextInput
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  placeholder="Contá tu experiencia en este lugar..."
                  placeholderTextColor={colors.icon}
                  style={[styles.reviewTextInputFlex, { color: colors.text }]}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <View style={styles.reviewAttachBtnWrap} pointerEvents="box-none">
                  <TouchableOpacity
                    onPress={() => void handlePickReviewPhotos()}
                    disabled={
                      reviewsSubmitting || reviewPhotoUris.length >= REVIEW_GALLERY_MAX_PHOTOS
                    }
                    style={styles.reviewAttachBtn}
                    hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Adjuntar fotos a la reseña">
                    <Ionicons
                      name="image-outline"
                      size={24}
                      color={colors.tint}
                      style={{
                        opacity:
                          reviewsSubmitting ||
                          reviewPhotoUris.length >= REVIEW_GALLERY_MAX_PHOTOS
                            ? 0.35
                            : 1,
                      }}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <ReviewSelectedPhotosStrip
                value={reviewPhotoUris}
                onChange={setReviewPhotoUris}
                disabled={reviewsSubmitting}
                isDark={isDark}
              />
              {reviewsSubmitError ? (
                <ThemedText style={styles.reviewFormError}>{reviewsSubmitError}</ThemedText>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.reviewSubmitBtn,
                  { backgroundColor: colors.tint, opacity: reviewsSubmitting ? 0.7 : 1 },
                ]}
                disabled={reviewsSubmitting}
                onPress={handleSubmitReview}
                activeOpacity={0.85}>
                <ThemedText style={styles.reviewSubmitBtnText}>
                  {reviewsSubmitting ? 'Enviando...' : 'Enviar reseña'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.reviewsCard}>
              {reviewsTotal > 0 && (
                <View style={styles.reviewsHeader}>
                  <ThemedText style={[styles.reviewsTitle, { color: '#808080' }]}>
                    {reviewsTotal} {reviewsTotal === 1 ? 'reseña' : 'reseñas'}
                  </ThemedText>
                  <View style={[styles.reviewsHeaderSep, { backgroundColor: '#808080' }]} />
                  <View style={styles.reviewsRating}>
                    <Ionicons name="star" size={15} color="#808080" />
                    <ThemedText style={[styles.reviewsCount, { color: '#808080' }]}>
                      {reviewsAverageRating.toFixed(1)}
                    </ThemedText>
                  </View>
                </View>
              )}
              {reviewsLoading && reviews.length === 0 ? (
                <View style={styles.reviewEmpty}>
                  <ThemedText style={[styles.reviewEmptySubtitle, { color: colors.icon }]}>
                    Cargando reseñas...
                  </ThemedText>
                </View>
              ) : reviewsError ? (
                <View style={styles.reviewEmpty}>
                  <ThemedText style={[styles.reviewEmptyTitle, { color: '#ff3b30' }]}>Error al cargar reseñas</ThemedText>
                  <ThemedText style={[styles.reviewEmptySubtitle, { color: colors.icon }]}>{reviewsError}</ThemedText>
                </View>
              ) : reviews.length === 0 ? (
                <View style={styles.reviewEmpty}>
                  <Ionicons name="chatbubble-outline" size={32} color={colors.icon} />
                  <ThemedText style={[styles.reviewEmptyTitle, { color: colors.text }]}>No hay reseñas aún</ThemedText>
                  <ThemedText style={[styles.reviewEmptySubtitle, { color: colors.icon }]}>
                    Sé el primero en compartir tu experiencia en este lugar.
                  </ThemedText>
                </View>
              ) : (
                reviews.map((review, idx) => (
                  <View key={review.id}>
                    {idx > 0 && (
                      <View style={[styles.reviewDivider, { backgroundColor: isDark ? '#2a2a2a' : '#F2F4F7' }]} />
                    )}
                    <View style={styles.reviewItem}>
                      <View style={styles.reviewAvatarPlaceholder}>
                        <Ionicons name="person-circle" size={40} color={colors.tint} />
                      </View>
                      <View style={styles.reviewBody}>
                        <View style={styles.reviewHeader}>
                          <ThemedText style={styles.reviewUser}>{review.name ?? 'Usuario'}</ThemedText>
                          <ThemedText style={[styles.reviewDate, { color: colors.icon }]}>
                            {relativeDate(new Date(review.created_at))}
                          </ThemedText>
                        </View>
                        <View style={styles.reviewStars}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Ionicons
                              key={i}
                              name="star"
                              size={12}
                              color={i <= review.rating ? '#FFB800' : '#D1D1D6'}
                            />
                          ))}
                        </View>
                        <ThemedText style={[styles.reviewText, { color: colors.icon }]}>{review.comment}</ThemedText>
                        {(review.image_urls?.length ?? 0) > 0
                          ? (() => {
                              const reviewPhotoUrisResolved = (review.image_urls ?? [])
                                .map((x) => resolveApiMediaUrl(x) ?? x)
                                .filter((x): x is string => Boolean(x));
                              return (
                                <ScrollView
                                  horizontal
                                  showsHorizontalScrollIndicator={false}
                                  style={styles.reviewPhotosScroll}
                                  contentContainerStyle={styles.reviewPhotosRow}>
                                  {reviewPhotoUrisResolved.map((uri, photoIdx) => (
                                    <TouchableOpacity
                                      key={`${review.id}-photo-${photoIdx}`}
                                      activeOpacity={0.85}
                                      onPress={() =>
                                        setReviewImagesLightbox({
                                          uris: reviewPhotoUrisResolved,
                                          index: photoIdx,
                                        })
                                      }
                                      accessibilityRole="imagebutton"
                                      accessibilityLabel="Ampliar foto de la reseña">
                                      <ExpoImage
                                        source={{ uri }}
                                        style={styles.reviewPhotoThumb}
                                        contentFit="cover"
                                      />
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              );
                            })()
                          : null}
                      </View>
                    </View>
                  </View>
                ))
              )}
              {reviews.length > 0 && reviews.length < reviewsTotal ? (
                <TouchableOpacity
                  style={[styles.loadMoreButton, { borderColor: colors.tint }]}
                  onPress={loadMoreReviews}
                  activeOpacity={0.8}
                  disabled={reviewsLoading}>
                  <ThemedText style={[styles.loadMoreButtonText, { color: colors.tint }]}>
                    {reviewsLoading ? 'Cargando...' : `Ver más reseñas (${reviews.length}/${reviewsTotal})`}
                  </ThemedText>
                </TouchableOpacity>
              ) : null}
            </View>
            </>
            ) : null}

            <View style={{ height: 16 }} />
                </View>
              )}
            />
          </View>

          {mapFullscreen && hasCoords && (
            <View
              style={[styles.mapFullscreenOverlay, { backgroundColor: isDark ? '#1c1c1e' : '#e8e4dc' }]}
              pointerEvents="auto">
              <View style={[styles.mapFullscreenHeader, { paddingTop: top + 8 }]}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  onPress={() => setMapFullscreen(false)}
                  style={styles.mapFullscreenClose}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar mapa">
                  <Ionicons name="close" size={28} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
              </View>
              <View style={styles.mapFullscreenBody}>
                <TrailRouteTileMap
                  routeCoordinates={[]}
                  interestPoints={placeMapInterestPoints}
                  mainPoint={mainPoint}
                  fallbackCenter={mapCenter}
                  isDark={isDark}
                  tint={colors.tint}
                  routeColor={TRAIL_ROUTE_LINE_COLOR}
                  interactive
                />
              </View>
            </View>
          )}

          <View style={[styles.placeFloatActions, { bottom: 0 }]} pointerEvents="box-none">
            <View
              style={[
                styles.trailFloatBar,
                {
                  paddingTop: 22,
                  paddingBottom: bottom + 2,
                  backgroundColor: isDark ? '#1c1c1e' : '#fff',
                  gap: isOnline ? 8 : 0,
                },
              ]}>
              {isOnline ? (
                <TouchableOpacity
                  style={[styles.trailFloatBtnPrimary, { backgroundColor: colors.tint }]}
                  onPress={() => Share.share({ message: `Mirá este lugar: ${place.name ?? place.slug}` })}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Compartir lugar">
                  <Ionicons name="share-outline" size={20} color="#fff" />
                  <ThemedText style={styles.trailFloatBtnPrimaryLabel} numberOfLines={1}>
                    Compartir
                  </ThemedText>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.trailFloatBtnSecondary,
                  {
                    borderColor: colors.tint,
                    opacity: hasCoords ? 1 : 0.45,
                    flex: isOnline ? undefined : 1,
                  },
                ]}
                onPress={openMaps}
                disabled={!hasCoords}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Abrir en mapas">
                <Ionicons name="navigate-outline" size={22} color={colors.tint} />
                <ThemedText style={styles.trailFloatBtnSecondaryLabel} numberOfLines={1}>
                  Cómo llegar
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View
            style={[
              styles.topBar,
              { backgroundColor: isDark ? '#000' : '#fff', paddingTop: top },
              topBarStyle,
            ]}
            pointerEvents="box-none">
            <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={isDark ? '#fff' : '#000'} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            {isOnline ? (
            <View style={styles.topBarRight} pointerEvents="auto">
              <TouchableOpacity
                style={styles.topBarBtn}
                onPress={() => Share.share({ message: `Mirá este lugar: ${place.name ?? place.slug}` })}>
                <Ionicons name="share-outline" size={20} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.topBarBtn}
                onPress={async () => {
                  if (!token) {
                    redirectToLogin(pathname || '/(tabs)');
                    return;
                  }
                  if (!placeId) return;
                  await togglePlaceFavorite(placeId, token, !placeFavorited);
                }}>
                <Ionicons
                  name={placeFavorited ? 'heart' : 'heart-outline'}
                  size={20}
                  color={placeFavorited ? '#ff3b30' : isDark ? '#fff' : '#000'}
                />
              </TouchableOpacity>
            </View>
            ) : null}
          </Animated.View>
        </>
      )}

      {place && gallerySlides.length > 0 ? (
        <TrailGalleryLightbox
          visible={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          items={gallerySlides}
          initialIndex={lightboxIndex}
        />
      ) : null}

      {reviewImagesLightbox && reviewImagesLightbox.uris.length > 0 ? (
        <TrailGalleryLightbox
          visible
          onClose={() => setReviewImagesLightbox(null)}
          items={imageUrlsToGallerySlides(reviewImagesLightbox.uris)}
          initialIndex={reviewImagesLightbox.index}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollShell: { flex: 1, position: 'relative' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  flexScroll: { flex: 1 },
  muted: { marginTop: 8, fontSize: 15 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 10,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  topBarBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topBarRight: { flexDirection: 'row', marginRight: 10 },
  galleryWrap: { position: 'relative', marginHorizontal: GALLERY_HORIZONTAL_MARGIN, zIndex: 1 },
  gallery: { overflow: 'hidden', borderRadius: 16 },
  heroPlaceholder: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  galleryPanoBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  galleryPanoBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  floatRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 40,
    elevation: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  floatBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatBtnLiked: { backgroundColor: '#fff' },
  floatRightGroup: { flexDirection: 'row', gap: 8 },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  nameSection: { padding: 16, paddingBottom: 12, alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '500', lineHeight: 27, textAlign: 'center' },
  titleRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  titleRatingValue: { fontSize: 18, fontWeight: '500' },
  titleRatingCount: { fontSize: 18 },
  ratingText: { fontSize: 18 },
  descInline: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  trailDescBlock: { paddingHorizontal: 6, paddingBottom: 20, paddingTop: 4 },
  cardDivider: { height: 1, marginHorizontal: 0 },
  metricsRow: { flexDirection: 'row', paddingTop: 24, paddingBottom: 14, paddingHorizontal: 8 },
  metric: { flex: 1, alignItems: 'center', gap: 0, paddingVertical: 2 },
  metricSep: { width: 1, marginVertical: 4 },
  metricValue: { fontSize: 16, fontWeight: '500', textAlign: 'center', marginTop: 10 },
  metricLabel: { fontSize: 14, opacity: 0.55, textAlign: 'center' },
  mapSection: { padding: 16, paddingTop: 8, paddingBottom: 24, gap: 8 },
  mapSectionLabel: { fontSize: 16, fontWeight: '600' },
  mapWrap: { width: '100%', position: 'relative', borderRadius: 12, overflow: 'hidden' },
  mapLayoutBox: { width: '100%', aspectRatio: 1 },
  mapOverlay: { ...StyleSheet.absoluteFillObject },
  mapExpandBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  mapFullscreenOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 300 },
  mapFullscreenHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  mapFullscreenClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mapFullscreenBody: { flex: 1 },
  placeFloatActions: { position: 'absolute', left: 0, right: 0, zIndex: 100 },
  trailFloatBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  trailFloatBtnPrimary: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 100,
  },
  trailFloatBtnPrimaryLabel: { color: '#fff', fontSize: 14, fontWeight: '500', flexShrink: 1 },
  trailFloatBtnSecondary: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#fff',
  },
  trailFloatBtnSecondaryLabel: { fontSize: 14, fontWeight: '500', textAlign: 'center', color: '#11181C', flexShrink: 1 },
  ratingBreakdown: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rbLeft: { width: 130, alignItems: 'center', gap: 8, marginLeft: -5 },
  rbScore: { fontSize: 72, fontWeight: '500', lineHeight: 80 },
  rbStars: { flexDirection: 'row', gap: 4 },
  rbBars: { width: 195, gap: 1 },
  rbBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rbTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  rbFill: { height: 6, borderRadius: 3 },
  rbLabel: { fontSize: 12, width: 10, textAlign: 'right' },
  reviewFormCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  reviewFormTitle: { fontSize: 16, fontWeight: '700' },
  reviewFormRatingRow: { flexDirection: 'row', gap: 8 },
  reviewInputOuter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 110,
    paddingLeft: 12,
    paddingRight: 4,
    paddingTop: 4,
    paddingBottom: 4,
  },
  reviewTextInputFlex: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 100,
    paddingVertical: 8,
    paddingRight: 6,
    fontSize: 15,
    lineHeight: 21,
  },
  reviewAttachBtnWrap: {
    flexShrink: 0,
    justifyContent: 'flex-end',
  },
  reviewAttachBtn: {
    padding: 10,
    alignSelf: 'flex-end',
    marginBottom: 2,
    zIndex: 2,
    elevation: 4,
  },
  reviewTextarea: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 21,
  },
  reviewFormError: { color: '#ff3b30', fontSize: 13 },
  reviewSubmitBtn: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewSubmitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  reviewsCard: { marginHorizontal: 16, marginTop: 4, padding: 16 },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, marginTop: 8 },
  reviewsTitle: { fontSize: 14, fontWeight: '500' },
  reviewsHeaderSep: { flex: 1, height: 1 },
  reviewsRating: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewsCount: { fontSize: 14, fontWeight: '500' },
  reviewEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  reviewEmptyTitle: { fontSize: 16, fontWeight: '500' },
  reviewEmptySubtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 260 },
  reviewDivider: { height: 1, marginVertical: 24 },
  reviewItem: { flexDirection: 'row', gap: 12 },
  reviewAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reviewBody: { flex: 1, gap: 4 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewUser: { fontSize: 14, fontWeight: '600' },
  reviewDate: { fontSize: 12 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewText: { fontSize: 14, lineHeight: 20 },
  reviewPhotosScroll: { marginTop: 8, maxHeight: 88 },
  reviewPhotosRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  reviewPhotoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#e5e5ea',
  },
  loadMoreButton: {
    marginTop: 18,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loadMoreButtonText: { fontSize: 14, fontWeight: '600' },
});
