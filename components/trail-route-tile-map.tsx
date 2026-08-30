import {
  centerMapOnLatLon,
  latLonToMapPixel,
  MAP_TILE_SIZE,
  mapPixelToLatLon,
  type MapPanState,
} from '@/lib/map-projection';
import { offlineTileFileUri } from '@/lib/offline-tile-cache';
import { poiTypeIcon } from '@/lib/poi-icons';
import { computeRouteDirectionArrows } from '@/lib/route-direction-arrows';
import {
  calcTilesLikeHome,
  clampPanToTdf,
  esriStreetTileUrl,
  fitMapStateToCoordinatesInTdf,
} from '@/lib/tile-map';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View } from 'react-native';
import MapView, { Polyline as MapPolyline, Marker, type Region } from 'react-native-maps';
import Svg, { Polygon, Polyline } from 'react-native-svg';

const MIN_LAYOUT = 32;
/** Mismo rango de zoom que el resto de los mapas por teselas de la app. */
const MIN_TILE_ZOOM = 11;
const MAX_TILE_ZOOM = 18;
/** Por debajo de este desplazamiento (px), un gesto se trata como tap y no como arrastre. */
const TAP_MAX_MOVEMENT = 8;

const MAX_ROUTE_VERTICES = 400;
const MAX_RECORDED_VERTICES = 600;
const RECORDED_PATH_COLOR = '#22c55e';

/** Padding (px) al ajustar la ruta al viewport (tile map) — más alto = encuadre más holgado, menos zoom. */
const FIT_MAP_PADDING = 50;
/**
 * iOS: margen hacia adentro al hacer fitToCoordinates. Más valor = se ve más entorno, menos zoom al abrir.
 */
const IOS_FIT_EDGE_PADDING = { top: 92, right: 68, bottom: 92, left: 68 } as const;
/**
 * Si el encuadre es casi un punto (ficha de un lugar o duplicados), forzamos caja mínima en grados
 * para no abrir al máximo acercamiento.
 */
const TINY_DEG = 0.00022;
const MIN_SINGLE_FIT_BOX_HALF_DEG = 0.0065;

/**
 * Asegura caja mínima en grados alrededor del centro para que el ajuste inicial no sea a zoom/calle.
 */
function coordsForInitialFit(pts: { latitude: number; longitude: number }[]) {
  if (pts.length === 0) return pts;
  let minLat = pts[0].latitude;
  let maxLat = pts[0].latitude;
  let minLon = pts[0].longitude;
  let maxLon = pts[0].longitude;
  for (const c of pts) {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLon = Math.min(minLon, c.longitude);
    maxLon = Math.max(maxLon, c.longitude);
  }
  const latSpan = maxLat - minLat;
  const lonSpan = maxLon - minLon;
  if (latSpan < TINY_DEG && lonSpan < TINY_DEG) {
    const cLat = (minLat + maxLat) / 2;
    const cLon = (minLon + maxLon) / 2;
    const d = MIN_SINGLE_FIT_BOX_HALF_DEG;
    return [
      { latitude: cLat - d, longitude: cLon - d },
      { latitude: cLat + d, longitude: cLon + d },
    ];
  }
  return pts;
}

function decimateRoute(
  coords: { latitude: number; longitude: number }[],
  max: number,
): { latitude: number; longitude: number }[] {
  if (coords.length <= max) return coords;
  const step = Math.ceil(coords.length / max);
  const out: { latitude: number; longitude: number }[] = [];
  for (let i = 0; i < coords.length; i += step) {
    out.push(coords[i]);
  }
  const last = coords[coords.length - 1];
  const prev = out[out.length - 1];
  if (prev.latitude !== last.latitude || prev.longitude !== last.longitude) {
    out.push(last);
  }
  return out;
}

export interface TrailInterestPoint {
  id: string;
  latitude: number;
  longitude: number;
  /** Tipo de POI (backend): inicio, mirador, agua, … */
  type?: string | null;
}

/** Mismo azul que `UnifiedMapComponent` / Leaflet en ushuaia360-frontend */
export const TRAIL_ROUTE_LINE_COLOR = '#3FA9F5';
/** Marcador rojo “punto principal del sendero” (Leaflet color-markers red) */
export const TRAIL_MAIN_MARKER_COLOR = '#E53935';
/** POIs: verde como `marker-icon-2x-green` en admin */
export const TRAIL_POI_MARKER_COLOR = '#2E7D32';

export interface MapFocusTarget {
  latitude: number;
  longitude: number;
  /** Incrementar en 1 cada vez que el padre quiera forzar el mismo zoom otra vez */
  token: number;
}

interface Props {
  routeCoordinates: { latitude: number; longitude: number }[];
  /** Ruta GPS real del usuario (se dibuja en verde sobre la ruta oficial). */
  recordedPath?: { latitude: number; longitude: number }[];
  interestPoints: TrailInterestPoint[];
  /** Punto principal del sendero (`map_point`), igual que el marcador rojo en admin */
  mainPoint: { latitude: number; longitude: number } | null;
  fallbackCenter: { latitude: number; longitude: number };
  isDark: boolean;
  tint: string;
  /** Color de la polilínea (default: admin web) */
  routeColor?: string;
  /** Color de los círculos de POI (default: verde Leaflet admin) */
  poiMarkerColor?: string;
  /** Tap en mapa / POIs: acercar y opcionalmente notificar al padre */
  interactive?: boolean;
  onPoiPress?: (poiId: string) => void;
  onMapPressAt?: (latitude: number, longitude: number) => void;
  /** Zoom externo (p. ej. sincronizar dos instancias del mapa) */
  focusTarget?: MapFocusTarget | null;
  /**
   * Sendero descargado para uso offline: id + claves de tiles ya cacheadas localmente
   * (ver `lib/offline-tile-cache.ts`). Si un tile está en `offlineTileKeys`, se sirve desde
   * disco en vez de pedirlo a Esri (relevante en Android/web; iOS usa mapa nativo).
   */
  offlineTrailId?: string | null;
  offlineTileKeys?: Set<string> | null;
}

const LOCATION_PIN = 28;
const POI_PIN = 32;
const MAIN_PIN = 32;
const POI_HIT_RADIUS = 28;
/** Las flechas de sentido solo se muestran con suficiente zoom; de lejos ensucian la línea. */
const ARROW_MIN_ZOOM = 13;
/** Equivalente en `latitudeDelta` para el mapa nativo de iOS (más chico = más zoom). */
const ARROW_MAX_LAT_DELTA = 0.05;

export default function TrailRouteTileMap({
  routeCoordinates,
  recordedPath,
  interestPoints,
  mainPoint,
  fallbackCenter,
  isDark,
  tint,
  routeColor = TRAIL_ROUTE_LINE_COLOR,
  poiMarkerColor = TRAIL_POI_MARKER_COLOR,
  interactive = false,
  onPoiPress,
  onMapPressAt,
  focusTarget,
  offlineTrailId,
  offlineTileKeys,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [userTileState, setUserTileState] = useState<MapPanState | null>(null);

  const routeForDraw = useMemo(
    () => decimateRoute(routeCoordinates, MAX_ROUTE_VERTICES),
    [routeCoordinates],
  );

  /** Flechas de sentido de recorrido sobre la línea (de inicio a fin del `path` guardado). */
  const directionArrows = useMemo(
    () => computeRouteDirectionArrows(routeForDraw, { spacingMeters: 150, maxArrows: 20 }),
    [routeForDraw],
  );

  const allForFit = useMemo(() => {
    const pts: { latitude: number; longitude: number }[] = [...routeCoordinates];
    for (const p of interestPoints) {
      pts.push({ latitude: p.latitude, longitude: p.longitude });
    }
    if (mainPoint) pts.push(mainPoint);
    if (!pts.length) pts.push(fallbackCenter);
    return coordsForInitialFit(pts);
  }, [routeCoordinates, interestPoints, mainPoint, fallbackCenter]);

  const baseMapState = useMemo(() => {
    if (size.w < MIN_LAYOUT || size.h < MIN_LAYOUT) {
      return clampPanToTdf({ zoom: 12, panX: 0, panY: 0 });
    }
    return fitMapStateToCoordinatesInTdf(allForFit, size.w, size.h, FIT_MAP_PADDING);
  }, [allForFit, size.w, size.h]);

  const baseMapStateRef = useRef(baseMapState);
  baseMapStateRef.current = baseMapState;

  const routeFingerprint = useMemo(() => {
    const mainFp =
      mainPoint != null
        ? `:${mainPoint.latitude.toFixed(5)}:${mainPoint.longitude.toFixed(5)}`
        : '';
    return `${routeCoordinates.length}:${routeCoordinates[0]?.latitude ?? ''}:${
      routeCoordinates[routeCoordinates.length - 1]?.longitude ?? ''
    }:${interestPoints.map((p) => p.id).join(',')}${mainFp}`;
  }, [routeCoordinates, interestPoints, mainPoint]);

  useEffect(() => {
    setUserTileState(null);
  }, [routeFingerprint]);

  const mapState = userTileState ?? baseMapState;

  const tiles = useMemo(
    () =>
      size.w >= MIN_LAYOUT && size.h >= MIN_LAYOUT
        ? calcTilesLikeHome(mapState, size.w, size.h, esriStreetTileUrl)
        : [],
    [mapState, size.w, size.h],
  );

  const routePixelPolyline = useMemo(() => {
    if (routeForDraw.length < 2 || size.w < MIN_LAYOUT) return '';
    const pts: string[] = [];
    for (const c of routeForDraw) {
      const { left, top } = latLonToMapPixel(c.latitude, c.longitude, mapState, size.w, size.h);
      if (!Number.isFinite(left) || !Number.isFinite(top)) continue;
      pts.push(`${left},${top}`);
    }
    return pts.length >= 2 ? pts.join(' ') : '';
  }, [routeForDraw, mapState, size.w, size.h]);

  const recordedPathForDraw = useMemo(
    () => (recordedPath ? decimateRoute(recordedPath, MAX_RECORDED_VERTICES) : []),
    [recordedPath],
  );

  const recordedPathPixelPolyline = useMemo(() => {
    if (recordedPathForDraw.length < 2 || size.w < MIN_LAYOUT) return '';
    const pts: string[] = [];
    for (const c of recordedPathForDraw) {
      const { left, top } = latLonToMapPixel(c.latitude, c.longitude, mapState, size.w, size.h);
      if (!Number.isFinite(left) || !Number.isFinite(top)) continue;
      pts.push(`${left},${top}`);
    }
    return pts.length >= 2 ? pts.join(' ') : '';
  }, [recordedPathForDraw, mapState, size.w, size.h]);

  const showRouteLine = routePixelPolyline.length > 0;
  const showMainMarker = Boolean(mainPoint);
  const showFallbackPin =
    !showMainMarker && !showRouteLine && interestPoints.length === 0;

  const fallbackPinPos = useMemo(() => {
    if (!showFallbackPin || size.w < MIN_LAYOUT) return { left: 0, top: 0 };
    const { left, top } = latLonToMapPixel(
      fallbackCenter.latitude,
      fallbackCenter.longitude,
      mapState,
      size.w,
      size.h,
    );
    return { left: left - LOCATION_PIN / 2, top: top - LOCATION_PIN };
  }, [showFallbackPin, fallbackCenter, mapState, size.w, size.h]);

  const poiLayouts = useMemo(() => {
    if (size.w < MIN_LAYOUT) return [] as { id: string; left: number; top: number }[];
    return interestPoints.map((p) => {
      const { left, top } = latLonToMapPixel(p.latitude, p.longitude, mapState, size.w, size.h);
      return { id: p.id, left: left - POI_PIN / 2, top: top - POI_PIN };
    });
  }, [interestPoints, mapState, size.w, size.h]);

  const arrowLayouts = useMemo(() => {
    if (size.w < MIN_LAYOUT || !showRouteLine || mapState.zoom < ARROW_MIN_ZOOM) {
      return [] as { left: number; top: number; bearingDeg: number }[];
    }
    return directionArrows.map((a) => {
      const { left, top } = latLonToMapPixel(a.latitude, a.longitude, mapState, size.w, size.h);
      return { left, top, bearingDeg: a.bearingDeg };
    });
  }, [directionArrows, showRouteLine, mapState, size.w, size.h]);

  const mainMarkerLayout = useMemo(() => {
    if (!mainPoint || size.w < MIN_LAYOUT) return null;
    const { left, top } = latLonToMapPixel(
      mainPoint.latitude,
      mainPoint.longitude,
      mapState,
      size.w,
      size.h,
    );
    return { left: left - MAIN_PIN / 2, top: top - MAIN_PIN };
  }, [mainPoint, mapState, size.w, size.h]);

  const iosMapRef = useRef<MapView>(null);
  const iosRegionRef = useRef<Region | null>(null);
  /** Delta de latitud actual (iOS, mapa nativo) — gatilla el re-render que oculta las flechas de sentido al alejar el zoom. */
  const [iosLatDelta, setIosLatDelta] = useState<number | null>(null);
  /**
   * `tracksViewChanges` de los markers de flecha: arranca en `true` para que react-native-maps
   * tome el snapshot recién cuando el glifo de `Ionicons` (fuente async) ya esté pintado; si
   * quedara en `false` desde el primer render, un snapshot tomado antes de que la fuente cargue
   * deja el marker en blanco para siempre.
   */
  const [arrowIconsReady, setArrowIconsReady] = useState(false);
  useEffect(() => {
    setArrowIconsReady(false);
    const id = setTimeout(() => setArrowIconsReady(true), 300);
    return () => clearTimeout(id);
  }, [directionArrows]);

  const zoomToLatLng = useCallback((latitude: number, longitude: number) => {
    if (Platform.OS === 'ios') {
      iosMapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 },
        320,
      );
      return;
    }
    setUserTileState(
      clampPanToTdf(centerMapOnLatLon(latitude, longitude, 16)),
    );
  }, []);

  const focusToken = focusTarget?.token;
  const focusLat = focusTarget?.latitude;
  const focusLng = focusTarget?.longitude;
  useEffect(() => {
    if (focusToken == null || focusLat == null || focusLng == null) return;
    zoomToLatLng(focusLat, focusLng);
  }, [focusToken, focusLat, focusLng, zoomToLatLng]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (size.w < MIN_LAYOUT || size.h < MIN_LAYOUT) return;
    if (allForFit.length === 0) return;
    const id = requestAnimationFrame(() => {
      iosMapRef.current?.fitToCoordinates(
        allForFit.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
        { edgePadding: IOS_FIT_EDGE_PADDING, animated: false },
      );
    });
    return () => cancelAnimationFrame(id);
  }, [size.w, size.h, allForFit]);

  /**
   * Android/web: arrastre y pellizco del mapa por teselas. No hay `MapView` nativo acá, así que
   * el pan tiene que implementarse a mano (mismo patrón que `map-home.tsx` / `trail-active-navigation-map.tsx`).
   */
  const mapStateRef = useRef(mapState);
  const pendingAnimReset = useRef(false);
  const animPanX = useRef(new Animated.Value(0)).current;
  const animPanY = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(1)).current;
  const gestureRef = useRef({ isPinching: false, pinchStartDist: 0, pinchCurrentScale: 1 });
  const currentAnimPanX = useRef(0);
  const currentAnimPanY = useRef(0);
  const isProcessingRelease = useRef(false);
  const tapStartRef = useRef({ x: 0, y: 0 });

  useLayoutEffect(() => {
    mapStateRef.current = mapState;
    if (pendingAnimReset.current) {
      animPanX.setValue(0);
      animPanY.setValue(0);
      currentAnimPanX.current = 0;
      currentAnimPanY.current = 0;
      pendingAnimReset.current = false;
      isProcessingRelease.current = false;
    }
  }, [mapState, animPanX, animPanY]);

  const handleTapAt = useCallback(
    (x: number, y: number) => {
      if (!interactive) return;
      const state = mapStateRef.current;
      for (const p of interestPoints) {
        const { left, top } = latLonToMapPixel(p.latitude, p.longitude, state, size.w, size.h);
        const cx = left;
        const cy = top - POI_PIN / 2;
        if (Math.hypot(x - cx, y - cy) <= POI_HIT_RADIUS) {
          onPoiPress?.(p.id);
          return;
        }
      }
      const { latitude, longitude } = mapPixelToLatLon(x, y, state, size.w, size.h);
      onMapPressAt?.(latitude, longitude);
    },
    [interactive, interestPoints, onPoiPress, onMapPressAt, size.w, size.h],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt) => {
        isProcessingRelease.current = false;
        tapStartRef.current = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          gestureRef.current.isPinching = true;
          gestureRef.current.pinchStartDist = Math.hypot(
            touches[1].pageX - touches[0].pageX,
            touches[1].pageY - touches[0].pageY,
          );
          gestureRef.current.pinchCurrentScale = 1;
        } else {
          gestureRef.current.isPinching = false;
          animPanX.setValue(0);
          animPanY.setValue(0);
          currentAnimPanX.current = 0;
          currentAnimPanY.current = 0;
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        if (isProcessingRelease.current) return;
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2 && gestureRef.current.isPinching) {
          const dist = Math.hypot(
            touches[1].pageX - touches[0].pageX,
            touches[1].pageY - touches[0].pageY,
          );
          gestureRef.current.pinchCurrentScale = dist / gestureRef.current.pinchStartDist;
          animScale.setValue(gestureRef.current.pinchCurrentScale);
        } else if (!gestureRef.current.isPinching) {
          currentAnimPanX.current = gestureState.dx;
          currentAnimPanY.current = gestureState.dy;
          animPanX.setValue(gestureState.dx);
          animPanY.setValue(gestureState.dy);
        }
      },

      onPanResponderRelease: () => {
        if (gestureRef.current.isPinching) {
          const rawScale = gestureRef.current.pinchCurrentScale;
          const deltaZoom = Math.round(Math.log2(rawScale));
          gestureRef.current.isPinching = false;
          animScale.setValue(1);
          animPanX.setValue(0);
          animPanY.setValue(0);
          currentAnimPanX.current = 0;
          currentAnimPanY.current = 0;
          const prev = mapStateRef.current;
          const newZoom = Math.max(MIN_TILE_ZOOM, Math.min(MAX_TILE_ZOOM, prev.zoom + deltaZoom));
          const panMult = Math.pow(2, newZoom - prev.zoom);
          const next = clampPanToTdf({
            zoom: newZoom,
            panX: prev.panX * panMult,
            panY: prev.panY * panMult,
          });
          mapStateRef.current = next;
          setUserTileState(next);
          return;
        }

        if (isProcessingRelease.current) return;

        const dx = currentAnimPanX.current;
        const dy = currentAnimPanY.current;

        if (Math.hypot(dx, dy) < TAP_MAX_MOVEMENT) {
          animPanX.setValue(0);
          animPanY.setValue(0);
          currentAnimPanX.current = 0;
          currentAnimPanY.current = 0;
          handleTapAt(tapStartRef.current.x, tapStartRef.current.y);
          return;
        }

        isProcessingRelease.current = true;
        pendingAnimReset.current = true;
        const prev = mapStateRef.current;
        const next = clampPanToTdf({ zoom: prev.zoom, panX: prev.panX + dx, panY: prev.panY + dy });
        mapStateRef.current = next;
        setUserTileState(next);
      },
    }),
  ).current;

  const panZoomTransformStyle = {
    transform: [{ translateX: animPanX }, { translateY: animPanY }, { scale: animScale }],
  };

  if (Platform.OS === 'ios') {
    return (
      <View
        style={styles.fill}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0 && (width !== size.w || height !== size.h)) {
            setSize({ w: width, h: height });
          }
        }}>
        <MapView
          ref={iosMapRef}
          style={StyleSheet.absoluteFillObject}
          mapType="standard"
          userInterfaceStyle={isDark ? 'dark' : 'light'}
          rotateEnabled={false}
          showsCompass={false}
          onRegionChangeComplete={(r) => {
            iosRegionRef.current = r;
            setIosLatDelta(r.latitudeDelta);
          }}
          onPress={(e) => {
            if (!interactive) return;
            const c = e.nativeEvent.coordinate;
            onMapPressAt?.(c.latitude, c.longitude);
          }}>
          {routeForDraw.length >= 2 && (
            <>
              <MapPolyline
                coordinates={routeForDraw}
                strokeColor="#ffffff"
                strokeWidth={10}
                lineCap="round"
                lineJoin="round"
              />
              <MapPolyline
                coordinates={routeForDraw}
                strokeColor={routeColor}
                strokeWidth={7}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}
          {iosLatDelta != null && iosLatDelta <= ARROW_MAX_LAT_DELTA && directionArrows.map((a, i) => (
            <Marker
              key={`arrow-${i}`}
              coordinate={{ latitude: a.latitude, longitude: a.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={!arrowIconsReady}
              zIndex={15}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: `${a.bearingDeg}deg` }],
                }}
                collapsable={false}>
                <Ionicons name="caret-up" size={13} color="rgba(255,255,255,0.92)" />
              </View>
            </Marker>
          ))}
          {recordedPathForDraw.length >= 2 && (
            <>
              <MapPolyline
                coordinates={recordedPathForDraw}
                strokeColor="rgba(255,255,255,0.9)"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
              <MapPolyline
                coordinates={recordedPathForDraw}
                strokeColor={RECORDED_PATH_COLOR}
                strokeWidth={3}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}
          {interestPoints.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              onPress={() => {
                if (!interactive) return;
                onPoiPress?.(p.id);
              }}>
              <View
                style={[
                  styles.poiHost,
                  { position: 'relative', left: 0, top: 0, backgroundColor: poiMarkerColor },
                ]}
                pointerEvents="box-none">
                <Ionicons name={poiTypeIcon(p.type)} size={18} color="#fff" />
              </View>
            </Marker>
          ))}
          {mainPoint && (
            <Marker
              coordinate={mainPoint}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges
              zIndex={200}>
              <View pointerEvents="none" style={{ alignItems: 'center' }} collapsable={false}>
                <Ionicons name="location" size={MAIN_PIN} color={TRAIL_MAIN_MARKER_COLOR} />
              </View>
            </Marker>
          )}
          {showFallbackPin && (
            <Marker
              coordinate={fallbackCenter}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges
              zIndex={100}>
              <View pointerEvents="none" style={{ alignItems: 'center' }}>
                <Ionicons name="location" size={LOCATION_PIN} color={tint} />
              </View>
            </Marker>
          )}
        </MapView>
      </View>
    );
  }

  return (
    <View
      style={styles.fill}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0 && (width !== size.w || height !== size.h)) {
          setSize({ w: width, h: height });
        }
      }}>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, panZoomTransformStyle]}
        {...(interactive ? panResponder.panHandlers : null)}>
      <View style={styles.tileLayer} pointerEvents="none">
        {tiles.map((t) => {
          const localUri =
            offlineTrailId && offlineTileKeys?.has(t.key)
              ? offlineTileFileUri(offlineTrailId, t.key)
              : null;
          return (
            <Image
              key={t.key}
              source={{ uri: localUri ?? t.url }}
              style={[styles.tile, { left: t.posX, top: t.posY }]}
              cachePolicy="memory-disk"
              transition={0}
            />
          );
        })}
      </View>

      {(showRouteLine || recordedPathPixelPolyline.length > 0) && size.w >= MIN_LAYOUT && size.h >= MIN_LAYOUT && (
        <Svg
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          style={[styles.svgOverlay, Platform.OS === 'android' ? styles.svgAndroidElev : null]}
          pointerEvents="none"
          collapsable={false}>
          {showRouteLine && (
            <>
              <Polyline
                points={routePixelPolyline}
                fill="none"
                stroke="#ffffff"
                strokeWidth={10}
                strokeOpacity={0.95}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Polyline
                points={routePixelPolyline}
                fill="none"
                stroke={routeColor}
                strokeWidth={7}
                strokeOpacity={0.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {arrowLayouts.map((a, i) => (
                <Polygon
                  key={`arrow-${i}`}
                  points="0,-6 5,5 -5,5"
                  fill="#ffffff"
                  fillOpacity={0.92}
                  transform={`translate(${a.left}, ${a.top}) rotate(${a.bearingDeg})`}
                />
              ))}
            </>
          )}
          {recordedPathPixelPolyline.length > 0 && (
            <>
              <Polyline
                points={recordedPathPixelPolyline}
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Polyline
                points={recordedPathPixelPolyline}
                fill="none"
                stroke={RECORDED_PATH_COLOR}
                strokeWidth={3}
                strokeOpacity={0.85}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
        </Svg>
      )}

      {poiLayouts.map((layout) => {
        const poi = interestPoints.find((x) => x.id === layout.id);
        return (
          <View
            key={layout.id}
            style={[
              styles.poiHost,
              { left: layout.left, top: layout.top, backgroundColor: poiMarkerColor },
            ]}
            pointerEvents="none"
            collapsable={false}>
            <Ionicons name={poiTypeIcon(poi?.type)} size={18} color="#fff" />
          </View>
        );
      })}

      {showMainMarker && mainMarkerLayout && (
        <View
          style={[
            styles.mainMarkerHost,
            { left: mainMarkerLayout.left, top: mainMarkerLayout.top },
          ]}
          pointerEvents="none"
          collapsable={false}>
          <Ionicons name="location" size={MAIN_PIN} color={TRAIL_MAIN_MARKER_COLOR} />
        </View>
      )}

      {showFallbackPin && (
        <View
          style={[styles.locHost, { left: fallbackPinPos.left, top: fallbackPinPos.top }]}
          pointerEvents="none"
          collapsable={false}>
          <Ionicons name="location" size={LOCATION_PIN} color={tint} />
        </View>
      )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e8e4dc',
    overflow: 'hidden',
  },
  tileLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  tile: {
    position: 'absolute',
    width: MAP_TILE_SIZE,
    height: MAP_TILE_SIZE,
  },
  svgOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 10,
  },
  svgAndroidElev: {
    elevation: 12,
    zIndex: 11,
  },
  mainMarkerHost: {
    position: 'absolute',
    zIndex: 25,
    elevation: 16,
  },
  poiHost: {
    position: 'absolute',
    elevation: 14,
    zIndex: 20,
    width: POI_PIN,
    height: POI_PIN,
    borderRadius: POI_PIN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  locHost: {
    position: 'absolute',
    zIndex: 8,
  },
});
