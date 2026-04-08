import PanoramaWebView from '@/components/panorama-webview';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import TrailGalleryLightbox from '@/components/trail-gallery-lightbox';
import TrailRouteTileMap, { TRAIL_ROUTE_LINE_COLOR } from '@/components/trail-route-tile-map';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  filterDisplayableMedia,
  imageUrlsToGallerySlides,
  trailPointMediaToGallerySlides,
} from '@/lib/gallery-slides';
import { redirectToLogin } from '@/lib/needAuth';
import { poiTypeIcon } from '@/lib/poi-icons';
import { buildLineFromTrailPoints, normalizeTrailPointLocation } from '@/lib/trail-geo-normalize';
import { buildTrailLineCoordinates } from '@/lib/trail-route-path';
import { normalizeSessionStartedAtToISO } from '@/lib/session-started-at';
import { ensureTrailMapLocationPermission, alertLocationDenied } from '@/lib/trail-location-permission';
import {
  ApiHttpError,
  fetchTrailById,
  startUserTrailHistory,
  trailHistoryEntryStartedAt,
  type TrailDetail,
  type TrailPointDetail,
} from '@/services/api';
import { useActiveTrailSessionStore, type ActiveTrailSessionSnapshot } from '@/store/active-trail-session-store';
import { useAuthStore } from '@/store/auth-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { mapBackendTrail, useTrailsStore } from '@/store/trails-store';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image as ExpoImage } from 'expo-image';
import { Stack, router, useLocalSearchParams, usePathname } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { Extrapolation, Keyframe, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
/** Márgenes laterales de la foto principal / carrusel */
const GALLERY_HORIZONTAL_MARGIN = 16;
/** Aire extra bajo el notch / status bar antes de la foto */
const GALLERY_TOP_GAP = 16;
const GALLERY_SLIDE_WIDTH = SCREEN_WIDTH - GALLERY_HORIZONTAL_MARGIN * 2;
/** Altura del hero respecto al ancho (mayor = foto más alta) */
const GALLERY_HERO_HEIGHT_RATIO = 0.88;
/** Espacio reservado para la fila de botones sobre la tab bar */
const TRAIL_FLOAT_ACTIONS_ROW_PAD = 88;

const REVIEWS: { id: string; user: string; avatar: string; rating: number; date: Date; text: string }[] = [];

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

function AnimatedDot({ active }: { active: boolean }) {
  const width = useSharedValue(active ? 18 : 6);
  useEffect(() => {
    width.value = withSpring(active ? 18 : 6, { damping: 20, stiffness: 300, mass: 0.6 });
  }, [active]);
  const style = useAnimatedStyle(() => ({
    height: 6,
    width: width.value,
    borderRadius: 3,
    backgroundColor: active ? '#fff' : 'rgba(255,255,255,0.55)',
  }));
  return <Animated.View style={style} />;
}

function starDist(rating: number): number[] {
  // returns [pct5, pct4, pct3, pct2, pct1]
  const r = rating / 5;
  const p5 = Math.round(r * r * 90 + 5);
  const p4 = Math.round((1 - r) * 25 + r * 6);
  const p3 = Math.round((1 - r) * 15 + 2);
  const p2 = Math.round((1 - r) * 8 + 1);
  const p1 = Math.max(0, 100 - p5 - p4 - p3 - p2);
  return [p5, p4, p3, p2, p1];
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Fácil: '#34c759',
  Media: '#ff9500',
  Difícil: '#ff3b30',
};

const POI_TYPE_LABEL: Record<string, string> = {
  inicio: 'Inicio',
  fin: 'Fin',
  mirador: 'Mirador',
  peligro: 'Precaución',
  agua: 'Agua',
  descanso: 'Descanso',
  refugio: 'Refugio',
  cruce: 'Cruce',
  campamento: 'Campamento',
  cascada: 'Cascada',
  vista: 'Vista',
  informacion: 'Información',
};

const mapFullscreenEntering = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.94 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(260);

const mapFullscreenExiting = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.94 }] },
}).duration(200);

const EXPANDABLE_DESC_CHAR_THRESHOLD = 200;
const EXPANDABLE_DESC_COLLAPSED_LINES = 5;

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
    <View style={styles.expandableDescWrap}>
      <ThemedText style={textStyle} numberOfLines={expanded || !needsToggle ? undefined : collapsedLines}>
        {trimmed}
      </ThemedText>
      {needsToggle ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={({ pressed }) => [styles.expandableDescBtn, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Ver menos' : 'Ver más'}>
          <ThemedText style={[styles.expandableDescBtnLabel, { color: tint }]}>
            {expanded ? 'Ver menos' : 'Ver más'}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

interface TrailPoiListCardProps {
  point: TrailPointDetail;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  isDark: boolean;
  tint: string;
  onMapPress?: (poiId: string) => void;
}

function TrailPoiListCard({ point: p, colors, isDark, tint, onMapPress }: TrailPoiListCardProps) {
  const title = p.name?.trim() || 'Punto de interés';
  const mediaItems = filterDisplayableMedia(p.media);
  const [hero, ...restMedia] = mediaItems;
  const poiGallerySlides = useMemo(() => trailPointMediaToGallerySlides(p.media), [p.media]);
  const [poiGalleryOpen, setPoiGalleryOpen] = useState(false);
  const [poiGalleryIndex, setPoiGalleryIndex] = useState(0);

  const openPoiGallery = (index: number) => {
    if (!poiGallerySlides.length) return;
    setPoiGalleryIndex(index);
    setPoiGalleryOpen(true);
  };

  return (
    <View style={[styles.poiListCard, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
      {/* Imagen con inner margin y bordes redondeados */}
      <View style={styles.poiListCardImageWrap}>
        {hero ? (
          <Pressable
            onPress={() => openPoiGallery(0)}
            disabled={!poiGallerySlides.length}
            style={({ pressed }) => [{ opacity: pressed && poiGallerySlides.length ? 0.92 : 1 }]}>
            <View>
              <ExpoImage
                source={{ uri: (hero.thumbnail_url || hero.url) as string }}
                style={styles.poiListCardHero}
                contentFit="cover"
              />
              {(hero.media_type === 'photo_360' || hero.media_type === 'photo_180') && (
                <View
                  style={[
                    styles.poiPanoBadge,
                    { backgroundColor: hero.media_type === 'photo_180' ? 'rgba(80,80,120,0.75)' : 'rgba(0,0,0,0.55)' },
                  ]}>
                  <ThemedText style={styles.poiPanoBadgeText}>
                    {hero.media_type === 'photo_180' ? '180°' : '360°'}
                  </ThemedText>
                </View>
              )}
            </View>
          </Pressable>
        ) : (
          <View style={[styles.poiListCardHeroPlaceholder, { backgroundColor: isDark ? '#2c2c2e' : '#f0f0f5' }]}>
            <Ionicons name={poiTypeIcon(p.type)} size={36} color={tint} />
          </View>
        )}
        {onMapPress ? (
          <TouchableOpacity
            style={styles.poiMapBtn}
            onPress={() => onMapPress(p.id)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Ver en mapa">
            <Ionicons name="map-outline" size={14} color="#000" />
            <ThemedText style={styles.poiMapBtnLabel}>Ver en mapa</ThemedText>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Contenido */}
      <View style={styles.poiListCardBody}>
        <ThemedText style={[styles.poiListCardTitle, { color: colors.text }]}>{title}</ThemedText>

        {/* Meta: paso y km */}
        {p.km_marker != null && p.km_marker !== 0 ? (
          <View style={styles.poiListMetaRow}>
            {p.order_index != null ? (
              <>
                <Ionicons name="flag-outline" size={13} color={colors.icon} />
                <ThemedText style={[styles.poiListMetaText, { color: colors.icon }]}>
                  Paso {p.order_index + 1}
                </ThemedText>
              </>
            ) : null}
            {p.order_index != null && p.km_marker != null ? (
              <View style={styles.poiMetaDot} />
            ) : null}
            {p.km_marker != null ? (
              <>
                <Ionicons name="map-outline" size={13} color={colors.icon} />
                <ThemedText style={[styles.poiListMetaText, { color: colors.icon }]}>
                  km {Number(p.km_marker).toFixed(1)}
                </ThemedText>
              </>
            ) : null}
          </View>
        ) : null}

        {p.description?.trim() ? (
          <ThemedText style={[styles.poiListDesc, { color: colors.icon }]}>
            {p.description.trim()}
          </ThemedText>
        ) : null}

        {restMedia.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.poiListMediaScroll}>
            {restMedia.map((m, idx) => (
              <Pressable key={m.id} onPress={() => openPoiGallery(idx + 1)}>
                <View style={styles.poiListMediaThumbWrap}>
                  <ExpoImage
                    source={{ uri: (m.thumbnail_url || m.url) as string }}
                    style={styles.poiListMediaThumb}
                    contentFit="cover"
                  />
                  {(m.media_type === 'photo_360' || m.media_type === 'photo_180') && (
                    <View style={styles.poiPanoThumbBadge}>
                      <ThemedText style={styles.poiPanoThumbBadgeText}>
                        {m.media_type === 'photo_180' ? '180°' : '360°'}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

      </View>

      <TrailGalleryLightbox
        visible={poiGalleryOpen}
        onClose={() => setPoiGalleryOpen(false)}
        items={poiGallerySlides}
        initialIndex={poiGalleryIndex}
      />
    </View>
  );
}

type PoiHeroBlock =
  | { kind: 'image'; uri: string }
  | { kind: 'panorama'; uri: string; half?: boolean };

function poiHeroFromPoint(p: TrailPointDetail): PoiHeroBlock | null {
  const list = filterDisplayableMedia(p.media);
  const m = list[0];
  if (!m) return null;
  const uri = (m.thumbnail_url || m.url) as string;
  if (m.media_type === 'photo_360') return { kind: 'panorama', uri };
  if (m.media_type === 'photo_180') return { kind: 'panorama', uri, half: true };
  return { kind: 'image', uri };
}

type PoiOverlayState =
  | { kind: 'closed' }
  | { kind: 'itinerary' }
  | { kind: 'poi'; id: string };

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

export default function TrailDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { top, bottom } = useSafeAreaInsets();

  const { id } = useLocalSearchParams<{ id?: string }>();
  const trailId = typeof id === 'string' ? id : undefined;

  const { trails, featuredTrails, fetchTrails, loading } = useTrailsStore();
  const token = useAuthStore((s) => s.token);
  const pathname = usePathname();
  const trailFavorited = useFavoritesStore((s) => (trailId ? s.isFavorite(trailId) : false));
  const toggleTrailFavorite = useFavoritesStore((s) => s.toggleTrail);

  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [poiOverlay, setPoiOverlay] = useState<PoiOverlayState>({ kind: 'closed' });
  const [mapFocus, setMapFocus] = useState<{
    latitude: number;
    longitude: number;
    token: number;
  } | null>(null);
  const poiSheetRef = useRef<BottomSheet>(null);
  const poiSnapPoints = useMemo(() => ['40%', '78%'], []);

  const bumpMapFocus = useCallback((latitude: number, longitude: number) => {
    setMapFocus((prev) => ({
      latitude,
      longitude,
      token: (prev?.token ?? 0) + 1,
    }));
  }, []);

  const renderPoiBackdrop = useCallback(
    (props: ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.45} />
    ),
    [],
  );

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const topBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [80, 160], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [80, 160], [-10, 0], Extrapolation.CLAMP) }],
  }));

  const storeTrail = useMemo(() => {
    if (!trailId) return undefined;
    return (
      trails.find((t) => t.id === trailId) ??
      featuredTrails.find((t) => t.id === trailId)
    );
  }, [trailId, trails, featuredTrails]);

  const [trailDetail, setTrailDetail] = useState<TrailDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(() => Boolean(trailId));

  useEffect(() => {
    if (!trailId) return;
    setDetailLoading(true);
    fetchTrailById(trailId)
      .then(setTrailDetail)
      .catch(() => setTrailDetail(null))
      .finally(() => setDetailLoading(false));
  }, [trailId]);

  useEffect(() => {
    setPoiOverlay({ kind: 'closed' });
    setMapFocus(null);
  }, [trailId]);

  const selectedPoi = useMemo(() => {
    if (poiOverlay.kind !== 'poi' || !trailDetail?.points) return null;
    return trailDetail.points.find((p) => p.id === poiOverlay.id) ?? null;
  }, [poiOverlay, trailDetail?.points]);

  useEffect(() => {
    if (poiOverlay.kind === 'closed') {
      poiSheetRef.current?.close();
    } else {
      requestAnimationFrame(() => poiSheetRef.current?.snapToIndex(0));
    }
  }, [poiOverlay]);

  const trail = useMemo(() => {
    if (!trailId) return undefined;
    if (storeTrail) return storeTrail;
    if (trailDetail) return mapBackendTrail(trailDetail);
    return undefined;
  }, [trailId, storeTrail, trailDetail]);

  useEffect(() => {
    if (!trailId) return;
    if (trail) return;
    fetchTrails(true);
  }, [trailId, trail, fetchTrails]);

  const routeReference = useMemo(
    () =>
      trailDetail?.map_point ??
      trail?.coordinate ?? { latitude: -54.8, longitude: -68.3 },
    [trailDetail?.map_point, trail?.coordinate],
  );

  const lineCoordinates = useMemo(() => {
    const fromSegments = buildTrailLineCoordinates(trailDetail, routeReference);
    if (fromSegments.length >= 2) return fromSegments;
    const fromPois = buildLineFromTrailPoints(trailDetail?.points ?? []);
    if (fromPois.length >= 2) return fromPois;
    // Un solo POI y sin segmentos: trazo map_point → POI (datos reales del API, no inventados)
    if (fromPois.length === 1) {
      const a = routeReference;
      const b = fromPois[0];
      const same = a.latitude === b.latitude && a.longitude === b.longitude;
      if (!same) return [a, b];
    }
    return fromSegments;
  }, [trailDetail, routeReference]);

  const mapInterestPoints = useMemo(() => {
    return (trailDetail?.points ?? [])
      .map((p) => {
        const c = normalizeTrailPointLocation(p.location);
        if (!c) return null;
        return { id: p.id, latitude: c.latitude, longitude: c.longitude, type: p.type ?? null };
      })
      .filter((x): x is { id: string; latitude: number; longitude: number; type: string | null } => x != null);
  }, [trailDetail?.points]);

  const storedActiveSession = useActiveTrailSessionStore((s) => s.session);
  /** Sin login no aplica «recorrido en curso» (el store se limpia en logout). */
  const activeSession = token ? storedActiveSession : null;
  const setActiveSession = useActiveTrailSessionStore((s) => s.setSession);
  const clearActiveSession = useActiveTrailSessionStore((s) => s.clearSession);
  const setActiveMinimized = useActiveTrailSessionStore((s) => s.setMinimized);

  const buildSessionSnapshot = useCallback(
    (historyEntryId: string, startedAt: unknown): ActiveTrailSessionSnapshot => {
      const thumb =
        trailDetail?.thumbnail_url ?? trailDetail?.image_urls?.[0] ?? trail?.image ?? null;
      return {
        historyEntryId,
        trailId: trailId!,
        trailName: (trailDetail?.name ?? trail?.name ?? 'Sendero').trim() || 'Sendero',
        thumbnailUrl: thumb,
        startedAtISO: normalizeSessionStartedAtToISO(startedAt),
        lineCoordinates,
        interestPoints: mapInterestPoints,
        mainPoint: trailDetail?.map_point ?? null,
        fallbackCenter: routeReference,
        minimized: false,
        beganRecorridoSynced: false,
      };
    },
    [trailDetail, trail, trailId, lineCoordinates, mapInterestPoints, routeReference],
  );

  const resumeActiveTrail = useCallback(async () => {
    await setActiveMinimized(false);
    router.push('/(tabs)/trail-recorrido' as any);
  }, [setActiveMinimized]);

  const startNewTrailFlow = useCallback(async () => {
    if (!trailId || !trailDetail || !token) return;
    const locOk = await ensureTrailMapLocationPermission();
    if (!locOk) {
      alertLocationDenied();
      return;
    }
    try {
      const entry = await startUserTrailHistory(token, trailId);
      const snap = buildSessionSnapshot(entry.id, trailHistoryEntryStartedAt(entry));
      await setActiveSession(snap);
      router.push('/(tabs)/trail-recorrido' as any);
    } catch (e) {
      const notFound =
        (e instanceof ApiHttpError && e.status === 404) ||
        (e instanceof Error && /not\s*found/i.test(e.message));
      if (notFound) {
        const snap = buildSessionSnapshot(
          `local-${Date.now()}-${trailId.slice(0, 8)}`,
          new Date().toISOString(),
        );
        await setActiveSession(snap);
        router.push('/(tabs)/trail-recorrido' as any);
        return;
      }
      const msg =
        e instanceof Error ? e.message : 'No pudimos iniciar el recorrido. Intentá de nuevo.';
      Alert.alert('Error', msg);
    }
  }, [trailId, trailDetail, token, buildSessionSnapshot, setActiveSession]);

  const onPrimaryTrailAction = useCallback(() => {
    if (!trailId) return;
    if (!token) {
      redirectToLogin(pathname || '/(tabs)');
      return;
    }
    const sameTrail = activeSession?.trailId === trailId;
    if (sameTrail) {
      void resumeActiveTrail();
      return;
    }
    if (activeSession) {
      Alert.alert(
        'Recorrido en curso',
        `Tenés «${activeSession.trailName}» sin terminar. Si empezás este, ese recorrido se descarta (no se guarda como completado).`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Descartar y empezar este',
            style: 'destructive',
            onPress: () => {
              void clearActiveSession().then(() => startNewTrailFlow());
            },
          },
        ],
      );
      return;
    }
    void startNewTrailFlow();
  }, [
    trailId,
    token,
    pathname,
    activeSession,
    resumeActiveTrail,
    clearActiveSession,
    startNewTrailFlow,
  ]);

  const primaryTrailActionLabel =
    activeSession?.trailId === trailId ? 'Resumir recorrido' : 'Iniciar recorrido';
  const primaryTrailActionDisabled =
    !(activeSession?.trailId === trailId) && !trailDetail;

  const sortedTrailPoints = useMemo(() => {
    const pts = [...(trailDetail?.points ?? [])];
    pts.sort((a, b) => (a.order_index ?? 1e6) - (b.order_index ?? 1e6));
    return pts;
  }, [trailDetail?.points]);

  const handleMapPoiPress = useCallback(
    (poiId: string) => {
      setPoiOverlay({ kind: 'poi', id: poiId });
      const p = trailDetail?.points.find((x) => x.id === poiId);
      const loc = normalizeTrailPointLocation(p?.location ?? null);
      setMapFullscreen(true);
      if (loc) setTimeout(() => bumpMapFocus(loc.latitude, loc.longitude), 350);
    },
    [trailDetail?.points, bumpMapFocus],
  );

  const handleMapPressAt = useCallback(
    (latitude: number, longitude: number) => {
      setPoiOverlay({ kind: 'itinerary' });
      bumpMapFocus(latitude, longitude);
      setMapFullscreen(true);
    },
    [bumpMapFocus],
  );

  const closeMapFullscreen = useCallback(() => {
    setMapFullscreen(false);
    setPoiOverlay({ kind: 'closed' });
  }, []);

  const detailListBottomPad = bottom + TRAIL_FLOAT_ACTIONS_ROW_PAD;

  useEffect(() => {
    if (!mapFullscreen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeMapFullscreen();
      return true;
    });
    return () => sub.remove();
  }, [mapFullscreen, closeMapFullscreen]);

  const gallerySlides = useMemo(() => {
    const fromTyped = trailDetail?.media?.length
      ? trailPointMediaToGallerySlides(trailDetail.media)
      : [];
    if (fromTyped.length > 0) return fromTyped;
    const urls =
      trailDetail?.image_urls?.length
        ? trailDetail.image_urls
        : trail?.images?.length
          ? trail.images
          : trail?.image
            ? [trail.image]
            : [];
    return imageUrlsToGallerySlides(urls);
  }, [trailDetail?.media, trailDetail?.image_urls, trail?.images, trail?.image]);

  const descriptionText =
    (trailDetail?.description ?? trail?.description)?.trim() ?? '';

  useEffect(() => {
    if (!__DEV__ || !trailDetail) return;
    const segs = trailDetail.route_segments ?? [];
    const fromSeg = buildTrailLineCoordinates(trailDetail, routeReference);
    const fromPois = buildLineFromTrailPoints(trailDetail.points ?? []);
    console.log('[TrailDetailMap]', {
      trailId: trailDetail.id,
      routeSegments: segs.length,
      segmentPaths: segs.map((s, i) => ({
        i,
        order: s.segment_order,
        pathLen: Array.isArray(s.path) ? s.path.length : null,
        pathType: s.path == null ? 'null' : Array.isArray(s.path) ? 'array' : typeof s.path,
        pathHead: Array.isArray(s.path) ? s.path.slice(0, 2) : s.path,
      })),
      pointsTotal: trailDetail.points?.length ?? 0,
      pointsNormalizedForMap: mapInterestPoints.length,
      sampleLocations: (trailDetail.points ?? []).slice(0, 5).map((p) => ({
        id: p.id,
        order_index: p.order_index,
        raw: p.location,
        norm: normalizeTrailPointLocation(p.location),
      })),
      lineFromSegments: fromSeg.length,
      lineFromPoisOnly: fromPois.length,
      lineCoordinatesFinal: lineCoordinates.length,
      lineHead: lineCoordinates.slice(0, 3),
      routeReference,
    });
  }, [trailDetail, routeReference, lineCoordinates, mapInterestPoints, trail?.coordinate]);

  const galleryMarginTop = top + GALLERY_TOP_GAP;
  const heroHeight = Math.round(GALLERY_SLIDE_WIDTH * GALLERY_HERO_HEIGHT_RATIO);
  const showFullSkeleton = Boolean(trailId && !trail && (loading || detailLoading));
  const skelBlock = isDark ? '#2c2c2e' : '#e8eaed';
  const skelBlockInner = isDark ? '#3a3a3c' : '#dfe3e8';

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {!trailId ? (
        <View style={styles.center}>
          <ThemedText style={{ color: colors.icon }}>Trail inválido</ThemedText>
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
              <View style={[styles.cardDivider, { backgroundColor: isDark ? '#2a2a2a' : '#F2F4F7', marginTop: 4 }]} />
              <View style={{ flexDirection: 'row', paddingVertical: 8, gap: 8 }}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={{ flex: 1, height: 56, backgroundColor: skelBlock, borderRadius: 10 }} />
                ))}
              </View>
              <View style={{ height: 18, width: 120, backgroundColor: skelBlockInner, borderRadius: 6, marginTop: 8 }} />
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
                <View style={{ height: 200, borderRadius: 12, backgroundColor: skelBlock, overflow: 'hidden' }} />
                <View style={{ height: 200, borderRadius: 12, backgroundColor: skelBlock, overflow: 'hidden' }} />
              </View>
            </View>
          </View>
        </View>
      ) : !trail ? (
        <View style={styles.center}>
          <ThemedText style={{ color: colors.icon }}>No encontramos este sendero.</ThemedText>
        </View>
      ) : (
        <>
        <View style={styles.scrollShell}>
        <Animated.FlatList
          style={styles.flexScroll}
          data={[trail.id]}
          keyExtractor={(k) => k}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          pointerEvents={mapFullscreen ? 'none' : 'auto'}
          contentContainerStyle={{ paddingBottom: detailListBottomPad }}
          renderItem={() => (
            <View>
              {/* Gallery + botones flotantes */}
              <View style={[styles.galleryWrap, { marginTop: galleryMarginTop }]}>
                <View style={[styles.gallery, { height: heroHeight, backgroundColor: isDark ? '#1c1c1e' : '#e0e4ea' }]}>
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
                        accessibilityLabel={`Foto ${index + 1} de ${gallerySlides.length}. Abrir galería`}
                        onPress={() => {
                          setLightboxStartIndex(index);
                          setLightboxOpen(true);
                        }}>
                        <View style={{ width: GALLERY_SLIDE_WIDTH, height: heroHeight }}>
                          <Image
                            source={{ uri: item.uri }}
                            style={{ width: GALLERY_SLIDE_WIDTH, height: heroHeight }}
                            resizeMode="cover"
                          />
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

                  {gallerySlides.length > 1 && (
                    <View style={styles.dots}>
                      {gallerySlides.map((_, i) => (
                        <AnimatedDot key={i} active={i === activeImage} />
                      ))}
                    </View>
                  )}
                </View>

                {/* Botones flotantes sobre la foto */}
                <View style={[styles.floatRow, { top: 12 }]} pointerEvents="box-none">
                  <TouchableOpacity
                    style={[styles.floatBtn, { backgroundColor: '#fff' }]}
                    onPress={() => router.back()}
                    hitSlop={12}>
                    <Ionicons name="chevron-back" size={22} color="#000" />
                  </TouchableOpacity>
                  <View style={styles.floatRightGroup}>
                    <TouchableOpacity
                      style={[styles.floatBtn, { backgroundColor: '#fff' }]}
                      onPress={() => Share.share({ message: `Mirá este sendero: ${trail.name}` })}
                      hitSlop={12}>
                      <Ionicons name="share-outline" size={20} color="#000" />
                    </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.floatBtn, { backgroundColor: '#fff' }, trailFavorited && styles.floatBtnLiked]}
                    onPress={async () => {
                      if (!token) {
                        redirectToLogin(pathname || '/(tabs)');
                        return;
                      }
                      await toggleTrailFavorite(trailId!, token, !trailFavorited);
                    }}
                    hitSlop={12}>
                    <Ionicons
                      name={trailFavorited ? 'heart' : 'heart-outline'}
                      size={20}
                      color={trailFavorited ? '#ff3b30' : '#000'}
                    />
                  </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Card unificada: nombre + métricas */}
              <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff', padding: 0, overflow: 'hidden' }]}>
                {/* Nombre + meta */}
                <View style={styles.nameSection}>
                  <ThemedText style={styles.name}>{trail.name}</ThemedText>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#000" />
                    <ThemedText style={[styles.ratingText, { color: '#000', fontWeight: '500' }]}>
                      {trail.rating.toFixed(1)}
                    </ThemedText>
                    <ThemedText style={[styles.ratingText, { color: colors.icon }]}>
                      ({trail.reviewCount})
                    </ThemedText>
                  </View>
                </View>

                {/* Divisor */}
                <View style={[styles.cardDivider, { backgroundColor: isDark ? '#2a2a2a' : '#F2F4F7' }]} />

                {/* Métricas */}
                <View style={styles.metricsRow}>
                  <Metric icon="map-outline" label="Distancia" value={trail.distance} iconColor={colors.tint} />
                  <View style={[styles.metricSep, { backgroundColor: isDark ? '#2a2a2a' : '#EDF0F5' }]} />
                  <Metric icon="time-outline" label="Duración" value={trail.duration} iconColor={colors.tint} />
                  <View style={[styles.metricSep, { backgroundColor: isDark ? '#2a2a2a' : '#EDF0F5' }]} />
                  <Metric icon="trending-up-outline" label="Desnivel" value={trail.elevationGain} iconColor={colors.tint} />
                  <View style={[styles.metricSep, { backgroundColor: isDark ? '#2a2a2a' : '#EDF0F5' }]} />
                  <Metric
                    icon="flag-outline"
                    label="Dificultad"
                    value={trail.difficulty}
                    iconColor={DIFFICULTY_COLOR[trail.difficulty] ?? colors.icon}
                  />
                </View>

                {detailLoading ? (
                  <>
                    <View style={{ paddingHorizontal: 16, paddingBottom: 20, gap: 8 }}>
                      <View style={{ height: 14, borderRadius: 4, backgroundColor: skelBlock }} />
                      <View style={{ height: 14, width: '92%', borderRadius: 4, backgroundColor: skelBlock }} />
                      <View style={{ height: 14, width: '78%', borderRadius: 4, backgroundColor: skelBlock }} />
                    </View>
                    <View style={styles.mapSection}>
                      <View style={styles.mapWrap}>
                        <View style={[styles.mapLayoutBox, { backgroundColor: skelBlock }]} />
                      </View>
                    </View>
                    <ThemedText
                      style={[styles.sectionBlockTitle, styles.poiListSectionHeading, { color: colors.text }]}>
                      Puntos de interés
                    </ThemedText>
                    <View style={styles.poiListSection}>
                      {[0, 1].map((i) => (
                        <View key={i} style={styles.poiListSkeletonCard}>
                          <View style={[styles.poiListCardHero, { backgroundColor: skelBlock }]} />
                          <View style={styles.poiListSkeletonBody}>
                            <View
                              style={[
                                styles.poiListSkeletonLine,
                                { width: '72%', backgroundColor: skelBlockInner },
                              ]}
                            />
                            <View
                              style={[styles.poiListSkeletonLine, { width: '36%', backgroundColor: skelBlock }]}
                            />
                            <View
                              style={[styles.poiListSkeletonLine, { width: '100%', backgroundColor: skelBlock }]}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    {descriptionText ? (
                      <View style={styles.trailDescBlock}>
                        <ExpandableDescription
                          text={descriptionText}
                          textStyle={[styles.descInline, { color: colors.icon }]}
                          tint={colors.tint}
                        />
                      </View>
                    ) : null}

                    <View style={styles.mapSection}>
                      <View style={styles.mapWrap}>
                        <View style={styles.mapLayoutBox} />
                        <View style={styles.mapOverlay}>
                          <TrailRouteTileMap
                            routeCoordinates={lineCoordinates}
                            interestPoints={mapInterestPoints}
                            mainPoint={null}
                            fallbackCenter={trail.coordinate}
                            isDark={isDark}
                            tint={colors.tint}
                            routeColor={TRAIL_ROUTE_LINE_COLOR}
                            interactive
                            focusTarget={mapFocus}
                            onPoiPress={handleMapPoiPress}
                            onMapPressAt={handleMapPressAt}
                          />
                        </View>
                        <TouchableOpacity
                          style={styles.mapExpandBtn}
                          onPress={() => {
                            setPoiOverlay({ kind: 'itinerary' });
                            setMapFullscreen(true);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel="Ver mapa en pantalla completa">
                          <Ionicons name="scan-outline" size={22} color="#000" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <ThemedText
                      style={[styles.sectionBlockTitle, styles.poiListSectionHeading, { color: colors.text }]}>
                      Puntos de interés
                    </ThemedText>
                    <View style={styles.poiListSection}>
                      {sortedTrailPoints.length === 0 ? (
                        <ThemedText style={[styles.poiListEmpty, { color: colors.icon }]}>
                          Este sendero aún no tiene puntos de interés cargados.
                        </ThemedText>
                      ) : (
                        sortedTrailPoints.map((p) => (
                          <TrailPoiListCard
                            key={p.id}
                            point={p}
                            colors={colors}
                            isDark={isDark}
                            tint={colors.tint}
                            onMapPress={handleMapPoiPress}
                          />
                        ))
                      )}
                    </View>
                  </>
                )}

                {/* Rating breakdown */}
                {REVIEWS.length > 0 && <View style={styles.ratingBreakdown}>
                  <View style={styles.rbLeft}>
                    <ThemedText style={[styles.rbScore, { color: colors.tint }]}>
                      {trail.rating.toFixed(1)}
                    </ThemedText>
                    <View style={styles.rbStars}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons
                          key={i}
                          name="star"
                          size={20}
                          color={i <= Math.round(trail.rating) ? '#FFB800' : '#D1D1D6'}
                        />
                      ))}
                    </View>
                  </View>
                  <View style={styles.rbBars}>
                    {[5, 4, 3, 2, 1].map((star, idx) => {
                      const pcts = starDist(trail.rating);
                      return (
                        <View key={star} style={styles.rbBarRow}>
                          <View style={[styles.rbTrack, { backgroundColor: isDark ? '#2a2a2a' : '#E5E5EA' }]}>
                            <View
                              style={[
                                styles.rbFill,
                                {
                                  width: `${pcts[idx]}%` as any,
                                  backgroundColor: isDark ? '#fff' : '#1C1C1E',
                                },
                              ]}
                            />
                          </View>
                          <ThemedText style={[styles.rbLabel, { color: colors.icon }]}>{star}</ThemedText>
                          <Ionicons name="star" size={10} color={isDark ? '#555' : '#C7C7CC'} />
                        </View>
                      );
                    })}
                  </View>
                </View>}
              </View>

              {/* Reseñas */}
              <View style={styles.reviewsCard}>
                {REVIEWS.length > 0 && (
                  <View style={styles.reviewsHeader}>
                    <ThemedText style={[styles.reviewsTitle, { color: '#808080' }]}>
                      {REVIEWS.length}{' '}
                      {REVIEWS.length === 1 ? 'reseña' : 'reseñas'}
                    </ThemedText>
                    <View style={[styles.reviewsHeaderSep, { backgroundColor: '#808080' }]} />
                    <View style={styles.reviewsRating}>
                      <Ionicons name="star" size={15} color="#808080" />
                      <ThemedText style={[styles.reviewsCount, { color: '#808080' }]}>
                        {trail.rating.toFixed(1)}
                      </ThemedText>
                    </View>
                  </View>
                )}
                {REVIEWS.length === 0 ? (
                  <View style={styles.reviewEmpty}>
                    <Ionicons name="chatbubble-outline" size={32} color={colors.icon} />
                    <ThemedText style={[styles.reviewEmptyTitle, { color: colors.text }]}>
                      Sin reseñas aún
                    </ThemedText>
                    <ThemedText style={[styles.reviewEmptySubtitle, { color: colors.icon }]}>
                      Sé el primero en compartir tu experiencia en este sendero.
                    </ThemedText>
                  </View>
                ) : REVIEWS.map((review, idx) => (
                  <View key={review.id}>
                    {idx > 0 && (
                      <View style={[styles.reviewDivider, { backgroundColor: isDark ? '#2a2a2a' : '#F2F4F7' }]} />
                    )}
                    <View style={styles.reviewItem}>
                      <Image source={{ uri: review.avatar }} style={styles.reviewAvatar} />
                      <View style={styles.reviewBody}>
                        <View style={styles.reviewHeader}>
                          <ThemedText style={styles.reviewUser}>{review.user}</ThemedText>
                          <ThemedText style={[styles.reviewDate, { color: colors.icon }]}>
                            {relativeDate(review.date)}
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
                        <ThemedText style={[styles.reviewText, { color: colors.icon }]}>
                          {review.text}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                ))}
              </View>


<View style={{ height: 16 }} />
            </View>
          )}
        />

        {mapFullscreen && (
          <Animated.View
            entering={mapFullscreenEntering}
            exiting={mapFullscreenExiting}
            style={[
              styles.mapFullscreenOverlay,
              { backgroundColor: isDark ? '#1c1c1e' : '#e8e4dc', bottom: 0 },
            ]}
            pointerEvents="auto">
            <View style={[styles.mapFullscreenHeader, { paddingTop: top + 8 }]}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={closeMapFullscreen}
                style={styles.mapFullscreenClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Cerrar mapa">
                <Ionicons name="close" size={28} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
            </View>
            <View style={styles.mapFullscreenBody}>
              <TrailRouteTileMap
                routeCoordinates={lineCoordinates}
                interestPoints={mapInterestPoints}
                mainPoint={null}
                fallbackCenter={trail.coordinate}
                isDark={isDark}
                tint={colors.tint}
                routeColor={TRAIL_ROUTE_LINE_COLOR}
                interactive
                focusTarget={mapFocus}
                onPoiPress={handleMapPoiPress}
                onMapPressAt={handleMapPressAt}
              />
            </View>

            {!detailLoading && (
              <BottomSheet
                ref={poiSheetRef}
                index={poiOverlay.kind !== 'closed' ? 0 : -1}
                snapPoints={poiSnapPoints}
                enablePanDownToClose
                bottomInset={0}
                onChange={(index) => {
                  if (index === -1) setPoiOverlay({ kind: 'closed' });
                }}
                backdropComponent={renderPoiBackdrop}
                backgroundStyle={{
                  backgroundColor: isDark ? '#2c2c2e' : '#fff',
                }}
                handleIndicatorStyle={{
                  backgroundColor: isDark ? '#636366' : '#c7c7cc',
                  width: 40,
                }}>
                <BottomSheetScrollView
                  contentContainerStyle={styles.poiSheetScrollContent}
                  showsVerticalScrollIndicator={false}>
                  {poiOverlay.kind === 'itinerary' ? (
                    <>
                      <ThemedText style={[styles.poiItineraryTitle, { color: colors.text }]}>
                        Recorrido
                      </ThemedText>
                      <ThemedText style={[styles.poiItinerarySubtitle, { color: colors.icon }]}>
                        Puntos en orden del sendero. Tocá uno para centrarlo en el mapa.
                      </ThemedText>
                      {(trailDetail?.points ?? []).length === 0 ? (
                        <ThemedText style={[styles.poiItineraryEmpty, { color: colors.icon }]}>
                          Este sendero no tiene puntos de interés cargados.
                        </ThemedText>
                      ) : (
                        (trailDetail?.points ?? []).map((p, index) => {
                          const loc = normalizeTrailPointLocation(p.location ?? null);
                          const title = p.name?.trim() || 'Punto de interés';
                          const typeLabel = p.type ? POI_TYPE_LABEL[p.type] ?? p.type : null;
                          return (
                            <Pressable
                              key={p.id}
                              onPress={() => {
                                setPoiOverlay({ kind: 'poi', id: p.id });
                                if (loc) bumpMapFocus(loc.latitude, loc.longitude);
                              }}
                              style={({ pressed }) => [
                                styles.poiItineraryRow,
                                {
                                  backgroundColor: isDark ? '#3a3a3c' : '#f2f2f7',
                                  opacity: pressed ? 0.85 : 1,
                                },
                              ]}>
                              <View style={styles.poiItineraryLeadingCol}>
                                <View
                                  style={[
                                    styles.poiItineraryStep,
                                    { backgroundColor: colors.tint + '22' },
                                  ]}>
                                  <ThemedText
                                    style={[styles.poiItineraryStepNum, { color: colors.tint }]}>
                                    {index + 1}
                                  </ThemedText>
                                </View>
                                <Ionicons name={poiTypeIcon(p.type)} size={22} color={colors.tint} />
                              </View>
                              <View style={styles.poiItineraryRowBody}>
                                <ThemedText
                                  style={[styles.poiItineraryRowTitle, { color: colors.text }]}
                                  numberOfLines={2}>
                                  {title}
                                </ThemedText>
                                {typeLabel ? (
                                  <ThemedText
                                    style={[styles.poiItineraryRowMeta, { color: colors.icon }]}>
                                    {typeLabel}
                                    {p.km_marker != null
                                      ? ` · Km ${Number(p.km_marker).toFixed(1)}`
                                      : ''}
                                  </ThemedText>
                                ) : p.km_marker != null ? (
                                  <ThemedText
                                    style={[styles.poiItineraryRowMeta, { color: colors.icon }]}>
                                    Km {Number(p.km_marker).toFixed(1)}
                                  </ThemedText>
                                ) : null}
                              </View>
                              <Ionicons name="chevron-forward" size={20} color={colors.icon} />
                            </Pressable>
                          );
                        })
                      )}
                    </>
                  ) : selectedPoi ? (
                    <>
                      {(() => {
                        const hero = poiHeroFromPoint(selectedPoi);
                        if (!hero) {
                          return (
                            <View
                              style={[
                                styles.poiSheetImage,
                                styles.poiSheetImagePlaceholder,
                                { backgroundColor: isDark ? '#3a3a3c' : '#e5e5ea' },
                              ]}>
                              <Ionicons
                                name={poiTypeIcon(selectedPoi.type)}
                                size={48}
                                color={colors.tint}
                              />
                            </View>
                          );
                        }
                        if (hero.kind === 'panorama') {
                          return (
                            <PanoramaWebView
                              uri={hero.uri}
                              panoramaHalf={hero.half}
                              style={styles.poiSheetImage}
                            />
                          );
                        }
                        return (
                          <ExpoImage
                            source={{ uri: hero.uri }}
                            style={styles.poiSheetImage}
                            contentFit="cover"
                          />
                        );
                      })()}
                      <View style={styles.poiSheetHeader}>
                        <Ionicons name={poiTypeIcon(selectedPoi.type)} size={26} color={colors.tint} />
                        <ThemedText style={[styles.poiSheetTitle, { color: colors.text }]}>
                          {selectedPoi.name?.trim() || 'Punto de interés'}
                        </ThemedText>
                      </View>
                      {(selectedPoi.type || selectedPoi.km_marker != null) ? (
                        <View style={styles.poiSheetMeta}>
                          {selectedPoi.type ? (
                            <View
                              style={[
                                styles.poiTypePill,
                                { backgroundColor: colors.tint + '1A', borderColor: colors.tint },
                              ]}>
                              <ThemedText style={[styles.poiTypePillText, { color: colors.tint }]}>
                                {POI_TYPE_LABEL[selectedPoi.type] ?? selectedPoi.type}
                              </ThemedText>
                            </View>
                          ) : null}
                          {selectedPoi.km_marker != null ? (
                            <View style={styles.poiSheetKmRow}>
                              <Ionicons name="map-outline" size={13} color={colors.icon} />
                              <ThemedText style={[styles.poiSheetKm, { color: colors.icon }]}>
                                Km {Number(selectedPoi.km_marker).toFixed(1)}
                              </ThemedText>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                      {selectedPoi.description?.trim() ? (
                        <ExpandableDescription
                          key={selectedPoi.id}
                          text={selectedPoi.description}
                          textStyle={[styles.poiSheetDesc, { color: colors.icon }]}
                          tint={colors.tint}
                        />
                      ) : null}
                    </>
                  ) : null}
                </BottomSheetScrollView>
                {poiOverlay.kind === 'poi' ? (
                  <View style={styles.poiSheetBottomBar}>
                    <Pressable
                      onPress={() => setPoiOverlay({ kind: 'itinerary' })}
                      style={({ pressed }) => [styles.poiSheetBackBtn, { borderColor: colors.tint, opacity: pressed ? 0.85 : 1 }]}>
                      <ThemedText style={[styles.poiSheetBackBtnLabel, { color: colors.tint }]}>
                        Volver al recorrido
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : null}
              </BottomSheet>
            )}
          </Animated.View>
        )}

        {!mapFullscreen && !detailLoading && (
          <View
            style={[styles.trailFloatActions, { bottom: 0 }]}
            pointerEvents="box-none">
            <View style={[styles.trailFloatBar, { paddingTop: 22, paddingBottom: bottom + 2 }]}>
              <TouchableOpacity
                style={[
                  styles.trailFloatBtnPrimary,
                  {
                    backgroundColor: colors.tint,
                    opacity: primaryTrailActionDisabled ? 0.45 : 1,
                  },
                ]}
                onPress={onPrimaryTrailAction}
                disabled={primaryTrailActionDisabled}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={primaryTrailActionLabel}>
                <Ionicons
                  name={activeSession?.trailId === trailId ? 'play-circle' : 'play'}
                  size={20}
                  color="#fff"
                />
                <ThemedText style={styles.trailFloatBtnPrimaryLabel} numberOfLines={1}>
                  {primaryTrailActionLabel}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.trailFloatBtnSecondary, { borderColor: colors.tint }]}
                onPress={() => {}}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Descargar sendero">
                <Ionicons name="download-outline" size={22} color={colors.tint} />
                <ThemedText style={styles.trailFloatBtnSecondaryLabel} numberOfLines={1}>
                  Descargar sendero
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
        </View>

        {/* Top bar animada */}
        {trail && gallerySlides.length > 0 && (
          <TrailGalleryLightbox
            visible={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            items={gallerySlides}
            initialIndex={lightboxStartIndex}
          />
        )}

        {trail && (
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
            <View style={styles.topBarRight} pointerEvents="auto">
              <TouchableOpacity
                style={styles.topBarBtn}
                onPress={() => Share.share({ message: `Mirá este sendero: ${trail.name}` })}>
                <Ionicons name="share-outline" size={20} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.topBarBtn}
                onPress={async () => {
                  if (!token) { redirectToLogin(pathname || '/(tabs)'); return; }
                  await toggleTrailFavorite(trailId!, token, !trailFavorited);
                }}>
                <Ionicons
                  name={trailFavorited ? 'heart' : 'heart-outline'}
                  size={20}
                  color={trailFavorited ? '#ff3b30' : isDark ? '#fff' : '#000'}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollShell: { flex: 1, position: 'relative' },
  flexScroll: { flex: 1 },
  mapFullscreenOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 300,
    flexDirection: 'column',
  },
  trailFloatActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
  },
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
  trailFloatBtnPrimaryLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
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
    borderColor: '#c7c7cc',
    backgroundColor: '#fff',
  },
  trailFloatBtnSecondaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    color: '#11181C',
    flexShrink: 1,
  },
  sectionBlockTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  poiListSectionHeading: {
    marginBottom: 14,
  },
  poiSheetScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
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
  topBarTitle: { flex: 1, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  topBarRight: { flexDirection: 'row', marginRight: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  galleryWrap: {
    marginHorizontal: GALLERY_HORIZONTAL_MARGIN,
  },
  gallery: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  galleryPanoBadge: {
    position: 'absolute',
    left: 12,
    bottom: 36,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  galleryPanoBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  floatRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  floatBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatBtnLiked: {
    backgroundColor: '#fff',
  },
  floatRightGroup: {
    flexDirection: 'row',
    gap: 8,
  },

  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  nameSection: {
    padding: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  name: { fontSize: 22, fontWeight: '500', lineHeight: 27, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  diffBadgeText: { fontSize: 12, fontWeight: '700' },
  metaDot: { fontSize: 12, opacity: 0.4 },
  type: { fontSize: 18 },
  descInline: { fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 8 },
  trailDescBlock: {
    paddingHorizontal: 6,
    paddingBottom: 20,
  },
  expandableDescWrap: {
    alignSelf: 'stretch',
  },
  expandableDescBtn: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 4,
  },
  expandableDescBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  ratingText: { fontSize: 18 },

  cardDivider: { height: 1, marginHorizontal: 0 },

  metricsRow: {
    flexDirection: 'row',
    paddingTop: 24,
    paddingBottom: 14,
    paddingHorizontal: 8,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 0,
    paddingVertical: 2,
  },
  metricSep: {
    width: 1,
    marginVertical: 4,
  },
  metricValue: { fontSize: 16, fontWeight: '500', textAlign: 'center', marginTop: 10 },
  metricLabel: { fontSize: 14, opacity: 0.55, textAlign: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 15, lineHeight: 22 },

  reviewsCard: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 16,
  },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, marginTop: 8 },
  reviewsTitle: { fontSize: 14, fontWeight: '500' },
  reviewsHeaderSep: { flex: 1, height: 1 },
  reviewsRating: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewsCount: { fontSize: 14, fontWeight: '500' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 100,
  },
  filterBtnText: { fontSize: 15 },
  filterMenu: {
    position: 'absolute',
    right: 0,
    top: 36,
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterOptionText: { fontSize: 14, color: '#000' },
  reviewDivider: { height: 1, marginVertical: 24 },
  reviewItem: { flexDirection: 'row', gap: 12 },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20 },
  reviewBody: { flex: 1, gap: 4 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewUser: { fontSize: 14, fontWeight: '600' },
  reviewDate: { fontSize: 12 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewText: { fontSize: 14, lineHeight: 20 },

  mapSection: { padding: 16, paddingTop: 20, paddingBottom: 24, gap: 12 },
  mapTitle: { fontSize: 16, fontWeight: '500' },
  mapWrap: {
    width: '100%',
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  /** Reserva altura: si todos los hijos del mapa fueran absolutos, el contenedor mediría 0. */
  mapLayoutBox: { width: '100%', aspectRatio: 1 },
  mapOverlay: { ...StyleSheet.absoluteFillObject },
  map: { flex: 1 },

  poiListSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 14,
  },
  poiListEmpty: {
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 8,
  },
  poiListCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  poiListCardImageWrap: {
    position: 'relative',
    marginHorizontal: 1,
    marginTop: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  poiPanoBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  poiPanoBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  poiListMediaThumbWrap: {
    position: 'relative',
    marginRight: 8,
  },
  poiPanoThumbBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  poiPanoThumbBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  poiListCardHero: {
    width: '100%',
    height: 210,
  },
  poiListCardHeroPlaceholder: {
    width: '100%',
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poiListCardBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
  },
  poiListCardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
  },
  poiListMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  poiListMetaText: {
    fontSize: 13,
  },
  poiMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  poiListDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  poiListMediaScroll: {
    gap: 8,
    paddingTop: 4,
  },
  poiListMediaThumb: {
    width: 112,
    height: 112,
    borderRadius: 10,
    backgroundColor: '#e5e5ea',
  },
  poiListSkeletonCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  poiListSkeletonBody: {
    padding: 16,
    gap: 10,
  },
  poiListSkeletonLine: {
    height: 14,
    borderRadius: 6,
  },

  poiSection: {
    paddingTop: 4,
    paddingBottom: 8,
    gap: 12,
  },
  poiSheetImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  poiSheetImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  poiSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  poiSheetTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  poiSheetBottomBar: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 76,
  },
  poiSheetBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 100,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  poiSheetBackBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  poiSheetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  poiSheetKmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  poiSheetKm: {
    fontSize: 13,
    fontWeight: '500',
  },
  poiSheetDesc: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 4,
  },
  poiItineraryTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  poiItinerarySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  poiItineraryEmpty: {
    fontSize: 15,
    lineHeight: 22,
  },
  poiItineraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  poiItineraryLeadingCol: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  poiItineraryStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poiItineraryStepNum: {
    fontSize: 16,
    fontWeight: '700',
  },
  poiItineraryRowBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  poiItineraryRowTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  poiItineraryRowMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  poiCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  poiCardImage: {
    width: '100%',
    height: 180,
  },
  poiCardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  poiCardBody: {
    padding: 14,
    gap: 6,
  },
  poiCardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  poiCardLeadingIcon: {
    marginTop: 2,
  },
  poiCardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    minWidth: 0,
  },
  poiTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  poiTypePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  poiListCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  poiMapBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 100,
    backgroundColor: '#fff',
  },
  poiMapBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  poiTypeBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  poiTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  poiKm: {
    fontSize: 13,
    fontWeight: '500',
  },
  poiDesc: {
    fontSize: 15,
    lineHeight: 22,
  },
  mapFullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  mapFullscreenClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapFullscreenBody: {
    flex: 1,
  },
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

  reviewEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  reviewEmptyTitle: { fontSize: 16, fontWeight: '500' },
  reviewEmptySubtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 260 },

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
  rbCount: { fontSize: 14, textAlign: 'center', marginTop: 2 },
  rbBars: { width: 195, gap: 1 },
  rbBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rbTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  rbFill: { height: 6, borderRadius: 3 },
  rbLabel: { fontSize: 12, width: 10, textAlign: 'right' },
});
