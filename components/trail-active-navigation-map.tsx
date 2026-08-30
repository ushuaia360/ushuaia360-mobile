import {
  TRAIL_MAIN_MARKER_COLOR,
  TRAIL_POI_MARKER_COLOR,
  TRAIL_ROUTE_LINE_COLOR,
} from '@/components/trail-route-tile-map';
import { mapUserLocationDotStyles } from '@/components/home/map-user-location-styles';
import { Colors } from '@/constants/theme';
import { useWatchUserLocation } from '@/hooks/use-watch-user-location';
import {
  centerMapOnLatLon,
  latLonToMapPixel,
  MAP_TILE_SIZE,
  type MapPanState,
} from '@/lib/map-projection';
import { pinScaleFromRegionSpan, pinScaleFromTileZoom } from '@/lib/map-pin-scale';
import { poiTypeIcon } from '@/lib/poi-icons';
import {
  calcTilesLikeHome,
  clampPanToTdf,
  esriImageryTileUrl,
  esriStreetTileUrl,
  fitMapStateToCoordinatesInTdf,
} from '@/lib/tile-map';
import type {
  ActiveTrailEmergencyPoint,
  ActiveTrailMapPoint,
} from '@/store/active-trail-session-store';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, {
  Marker,
  Polyline as MapPolyline,
  type LatLng,
  type Region,
} from 'react-native-maps';
import Svg, { Polyline } from 'react-native-svg';

/** Flecha coherente con la rotación del mapa (dirección de marcha respecto al borde superior de la pantalla). */
function arrowRotationDeg(headingDeg: number | null, mapBearingDeg: number): number | null {
  if (headingDeg == null) return null;
  const d = headingDeg - mapBearingDeg;
  return ((d % 360) + 360) % 360;
}

/** Límites de `animateToRegion` (mismo criterio que mapa inicio). */
const REGION_ZOOM_MIN_DELTA = 0.002;
const REGION_ZOOM_MAX_DELTA = 1.2;

function regionCoveringCoords(
  coords: { latitude: number; longitude: number }[],
  fallback: { latitude: number; longitude: number },
): Region {
  if (coords.length === 0) {
    return {
      latitude: fallback.latitude,
      longitude: fallback.longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    };
  }
  let minLat = coords[0].latitude;
  let maxLat = coords[0].latitude;
  let minLon = coords[0].longitude;
  let maxLon = coords[0].longitude;
  for (const c of coords) {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLon = Math.min(minLon, c.longitude);
    maxLon = Math.max(maxLon, c.longitude);
  }
  const midLat = (minLat + maxLat) / 2;
  const midLon = (minLon + maxLon) / 2;
  const pad = 1.45;
  const latDelta = Math.max((maxLat - minLat) * pad, 0.008);
  const lonDelta = Math.max((maxLon - minLon) * pad, 0.008);
  return {
    latitude: midLat,
    longitude: midLon,
    latitudeDelta: latDelta,
    longitudeDelta: lonDelta,
  };
}

/** Nivel aproximado a partir del span (solo escala de íconos POI, iOS). */
function syncZoomRefFromRegion(r: Region, zoomRef: { current: number }) {
  const d = Math.max(r.latitudeDelta, r.longitudeDelta);
  let z: number;
  if (d >= 0.35) z = 14;
  else if (d >= 0.18) z = 15;
  else if (d >= 0.09) z = 16;
  else if (d >= 0.045) z = 17;
  else if (d >= 0.022) z = 18;
  else z = 19;
  zoomRef.current = Math.max(14, Math.min(19, z));
}

/** Rota un vector (usado para convertir un delta de arrastre en pantalla al espacio sin rotar de `MapPanState`). */
function rotateVector(dx: number, dy: number, deg: number): { dx: number; dy: number } {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { dx: dx * cos - dy * sin, dy: dx * sin + dy * cos };
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

const POI_Z = 10;
const MAIN_Z = 200;
const ROUTE_Z = 2;
const EMERGENCY_Z = 60;
const USER_MARKER_Z = 100_000;
const MAIN_PIN = 32;

const RECORDED_PATH_COLOR = '#22c55e';

const EMERGENCY_MARKER_COLOR = '#E65C00';

/** Android (tiles): límites de zoom, igual que `lib/tile-map.ts` / `components/home/map-home.tsx`. */
const TILE_MIN_ZOOM = 11;
const TILE_MAX_ZOOM = 18;
/** Android: zoom al hacer `focusCoordinate` (igual criterio que `TrailRouteTileMap.zoomToLatLng`). */
const TILE_FOCUS_ZOOM = 16;
/** Android: mínimo layout medido antes de intentar dibujar tiles/overlay. */
const TILE_MIN_LAYOUT = 32;
/** Android: padding (px) al ajustar la ruta al viewport (tile map). */
const FIT_MAP_PADDING = 50;
/** Android: margen extra sobre la diagonal del viewport para la capa de tiles rotada (evita esquinas vacías). */
const TILE_DIAG_MARGIN = 96;
const MAX_ROUTE_VERTICES = 400;
/** Tamaño base (antes de escalar por zoom) de cada tipo de marcador — igual criterio que la rama iOS. */
const POI_BASE_DIM = 34;
const POI_BASE_ICON = 18;
const EMERGENCY_BASE_DIM = 42;
const EMERGENCY_BASE_ICON = 20;
/** Bounding box aproximado de la columna flecha+punto de usuario (ver `styles.userPinCol`). */
const USER_MARKER_W = 26;
const USER_MARKER_H = 40;
const USER_MARKER_ANCHOR_Y = 0.58;

export interface TrailActiveNavigationMapRef {
  zoomIn: () => void;
  zoomOut: () => void;
  fitRoute: () => void;
  focusCoordinate: (coord: { latitude: number; longitude: number }) => void;
}

interface Props {
  lineCoordinates: { latitude: number; longitude: number }[];
  /** Ruta GPS real del usuario, se dibuja en verde sobre la ruta del sendero. */
  recordedPath?: { latitude: number; longitude: number }[];
  interestPoints: ActiveTrailMapPoint[];
  emergencyPoints?: ActiveTrailEmergencyPoint[];
  highlightedEmergencyId?: string | null;
  mainPoint?: { latitude: number; longitude: number } | null;
  fallbackCenter: { latitude: number; longitude: number };
  isDark: boolean;
  isPaused?: boolean;
}

const TrailActiveNavigationMap = forwardRef<TrailActiveNavigationMapRef, Props>(
  function TrailActiveNavigationMap(
    {
      lineCoordinates,
      recordedPath,
      interestPoints,
      emergencyPoints = [],
      highlightedEmergencyId = null,
      mainPoint = null,
      fallbackCenter,
      isDark,
      isPaused = false,
    },
    ref,
  ) {
    const { bottom: insetBottom } = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    const theme = Colors[isDark ? 'dark' : 'light'];
    const mapCtlChrome = isDark
      ? {
          bd: 'rgba(109,206,251,0.55)',
          bg: '#ffffff',
          hairline: 'rgba(63,169,245,0.22)',
        }
      : {
          bd: 'rgba(63,169,245,0.55)',
          bg: '#ffffff',
          hairline: 'rgba(63,169,245,0.28)',
        };
    const geoFix = useWatchUserLocation(Platform.OS !== 'web');
    const displayCoord = useMemo<LatLng | null>(
      () =>
        geoFix
          ? { latitude: geoFix.latitude, longitude: geoFix.longitude }
          : null,
      [geoFix],
    );
    /** Rumbo GPS; sin magnetómetro suele faltar hasta que hay movimiento. */
    const headingDeg = geoFix?.heading ?? null;
    /** iOS: rumbo de cámara nativa (`MapView.animateCamera`). */
    const [mapBearing, setMapBearing] = useState(0);
    const [useSatellite, setUseSatellite] = useState(false);

    // ---------------------------------------------------------------------
    // iOS: mapa nativo (Apple Maps) — estado y helpers sin cambios.
    // ---------------------------------------------------------------------
    const didFitRoute = useRef(false);
    const zoomRef = useRef<number>(17);
    const regionRef = useRef<Region>(
      regionCoveringCoords(lineCoordinates, fallbackCenter),
    );

    const initialRegion = useMemo(
      () => regionCoveringCoords(lineCoordinates, fallbackCenter),
      [lineCoordinates, fallbackCenter],
    );

    const [poiPinScale, setPoiPinScale] = useState(() =>
      pinScaleFromRegionSpan(
        Math.max(initialRegion.latitudeDelta, initialRegion.longitudeDelta),
      ),
    );

    useEffect(() => {
      regionRef.current = initialRegion;
      syncZoomRefFromRegion(initialRegion, zoomRef);
      setPoiPinScale(
        pinScaleFromRegionSpan(
          Math.max(initialRegion.latitudeDelta, initialRegion.longitudeDelta),
        ),
      );
    }, [initialRegion]);

    const onRegionChange = useCallback((r: Region) => {
      regionRef.current = r;
      syncZoomRefFromRegion(r, zoomRef);
    }, []);

    const onRegionChangeComplete = useCallback((region: Region) => {
      regionRef.current = region;
      syncZoomRefFromRegion(region, zoomRef);
      setPoiPinScale(
        pinScaleFromRegionSpan(Math.max(region.latitudeDelta, region.longitudeDelta)),
      );
      const map = mapRef.current;
      if (map && Platform.OS !== 'web') {
        void map.getCamera().then((cam) => {
          setMapBearing(cam.heading ?? 0);
        });
      }
    }, []);

    useEffect(() => {
      if (Platform.OS !== 'ios') return;
      if (didFitRoute.current || allForFit.length < 2) return;
      const id = requestAnimationFrame(() => {
        mapRef.current?.fitToCoordinates(allForFit, {
          edgePadding: { top: 100, right: 36, bottom: 160, left: 36 },
          animated: true,
        });
        didFitRoute.current = true;
      });
      return () => cancelAnimationFrame(id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lineCoordinates, interestPoints, mainPoint]);

    // ---------------------------------------------------------------------
    // Android: mapa de tiles (sin API key) — pan/pinch + rotación.
    // ---------------------------------------------------------------------

    const [size, setSize] = useState({ w: 0, h: 0 });
    const [committed, setCommitted] = useState<MapPanState>(() =>
      clampPanToTdf(centerMapOnLatLon(fallbackCenter.latitude, fallbackCenter.longitude, 15)),
    );
    const committedRef = useRef<MapPanState>(committed);
    const didFitTileRoute = useRef(false);

    const animPanX = useRef(new Animated.Value(0)).current;
    const animPanY = useRef(new Animated.Value(0)).current;
    const animScale = useRef(new Animated.Value(1)).current;
    const gestureRef = useRef({ isPinching: false, pinchStartDist: 0, pinchCurrentScale: 1 });
    const currentAnimPanX = useRef(0);
    const currentAnimPanY = useRef(0);
    const isProcessingRelease = useRef(false);
    const pendingAnimReset = useRef(false);

    /** Rumbo del mapa (norte-arriba por defecto); solo cambia al presionar "recenter". Animado. */
    const bearingAnim = useRef(new Animated.Value(0)).current;
    const bearingUnwrappedRef = useRef(0);
    const [bearingDeg, setBearingDegState] = useState(0);
    /** Mirror del valor animado para el `PanResponder` (memoizado una sola vez: closures no ven el `useState`). */
    const bearingDegRef = useRef(0);

    useEffect(() => {
      const id = bearingAnim.addListener(({ value }) => {
        bearingDegRef.current = value;
        setBearingDegState(value);
      });
      return () => bearingAnim.removeListener(id);
    }, [bearingAnim]);

    useLayoutEffect(() => {
      committedRef.current = committed;
      if (pendingAnimReset.current) {
        animPanX.setValue(0);
        animPanY.setValue(0);
        currentAnimPanX.current = 0;
        currentAnimPanY.current = 0;
        pendingAnimReset.current = false;
        isProcessingRelease.current = false;
      }
    }, [committed, animPanX, animPanY]);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: (evt) => {
          isProcessingRelease.current = false;
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
            // El wrapper Animated.View no está rotado: un delta de pantalla crudo es visualmente
            // correcto sea cual sea el bearing actual (no hace falta rotarlo acá).
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
            isProcessingRelease.current = true;
            setCommitted((prev) => {
              const newZoom = Math.max(TILE_MIN_ZOOM, Math.min(TILE_MAX_ZOOM, prev.zoom + deltaZoom));
              const panMult = Math.pow(2, newZoom - prev.zoom);
              const next = clampPanToTdf({
                zoom: newZoom,
                panX: prev.panX * panMult,
                panY: prev.panY * panMult,
              });
              committedRef.current = next;
              isProcessingRelease.current = false;
              return next;
            });
          } else {
            if (isProcessingRelease.current) return;
            isProcessingRelease.current = true;

            const dx = currentAnimPanX.current;
            const dy = currentAnimPanY.current;
            // `MapPanState` vive en el espacio sin rotar del proyector de tiles: convertimos el
            // delta de pantalla (rotado visualmente por `bearingDeg`) aplicando la rotación inversa.
            // Se lee `bearingDegRef` (no el estado) porque este `PanResponder` se memoiza una sola
            // vez y su closure no vería actualizaciones posteriores de `bearingDeg`.
            const { dx: tileDx, dy: tileDy } = rotateVector(dx, dy, -bearingDegRef.current);

            pendingAnimReset.current = true;
            setCommitted((prev) => {
              const next = clampPanToTdf({
                zoom: prev.zoom,
                panX: prev.panX + tileDx,
                panY: prev.panY + tileDy,
              });
              committedRef.current = next;
              return next;
            });
          }
        },
      }),
    ).current;

    const routeLine = useMemo(() => {
      if (lineCoordinates.length >= 2) return lineCoordinates;
      return [];
    }, [lineCoordinates]);

    const allForFit = useMemo(() => {
      const pts: LatLng[] = [...lineCoordinates];
      for (const p of interestPoints) {
        pts.push({ latitude: p.latitude, longitude: p.longitude });
      }
      return pts;
    }, [lineCoordinates, interestPoints]);

    useEffect(() => {
      if (Platform.OS === 'ios') return;
      if (didFitTileRoute.current || allForFit.length < 2) return;
      if (size.w < TILE_MIN_LAYOUT || size.h < TILE_MIN_LAYOUT) return;
      const next = fitMapStateToCoordinatesInTdf(allForFit, size.w, size.h, FIT_MAP_PADDING);
      committedRef.current = next;
      setCommitted(next);
      didFitTileRoute.current = true;
    }, [allForFit, size.w, size.h]);

    const androidPinScale = pinScaleFromTileZoom(committed.zoom);

    const tileDiag = useMemo(
      () => Math.ceil(Math.hypot(size.w, size.h)) + TILE_DIAG_MARGIN,
      [size.w, size.h],
    );

    const tiles = useMemo(() => {
      if (Platform.OS === 'ios' || size.w < TILE_MIN_LAYOUT || size.h < TILE_MIN_LAYOUT) return [];
      const tileUrl = useSatellite ? esriImageryTileUrl : esriStreetTileUrl;
      return calcTilesLikeHome(committed, tileDiag, tileDiag, tileUrl);
    }, [committed, size.w, size.h, tileDiag, useSatellite]);

    const routeForDrawTile = useMemo(
      () => decimateRoute(routeLine, MAX_ROUTE_VERTICES),
      [routeLine],
    );
    const routePixelPolyline = useMemo(() => {
      if (routeForDrawTile.length < 2 || size.w < TILE_MIN_LAYOUT) return '';
      const pts: string[] = [];
      for (const c of routeForDrawTile) {
        const { left, top } = latLonToMapPixel(c.latitude, c.longitude, committed, size.w, size.h);
        if (!Number.isFinite(left) || !Number.isFinite(top)) continue;
        pts.push(`${left},${top}`);
      }
      return pts.length >= 2 ? pts.join(' ') : '';
    }, [routeForDrawTile, committed, size.w, size.h]);

    const poiLayouts = useMemo(() => {
      if (size.w < TILE_MIN_LAYOUT) return [] as { id: string; left: number; top: number; type?: string | null }[];
      return interestPoints.map((p) => {
        const { left, top } = latLonToMapPixel(p.latitude, p.longitude, committed, size.w, size.h);
        return { id: p.id, left, top, type: p.type };
      });
    }, [interestPoints, committed, size.w, size.h]);

    const mainMarkerLayout = useMemo(() => {
      if (!mainPoint || size.w < TILE_MIN_LAYOUT) return null;
      return latLonToMapPixel(mainPoint.latitude, mainPoint.longitude, committed, size.w, size.h);
    }, [mainPoint, committed, size.w, size.h]);

    const emergencyLayouts = useMemo(() => {
      if (!highlightedEmergencyId || size.w < TILE_MIN_LAYOUT) {
        return [] as { id: string; left: number; top: number }[];
      }
      return emergencyPoints
        .filter((p) => p.id === highlightedEmergencyId)
        .map((p) => {
          const { left, top } = latLonToMapPixel(p.latitude, p.longitude, committed, size.w, size.h);
          return { id: p.id, left, top };
        });
    }, [emergencyPoints, highlightedEmergencyId, committed, size.w, size.h]);

    const userTileLayout = useMemo(() => {
      if (!displayCoord || size.w < TILE_MIN_LAYOUT) return null;
      return latLonToMapPixel(displayCoord.latitude, displayCoord.longitude, committed, size.w, size.h);
    }, [displayCoord, committed, size.w, size.h]);

    /** `mapBearingDeg` para la flecha de rumbo: iOS usa el heading de cámara nativa, Android el bearing de tiles. */
    const arrowDeg = useMemo(
      () => arrowRotationDeg(headingDeg, Platform.OS === 'ios' ? mapBearing : bearingDeg),
      [headingDeg, mapBearing, bearingDeg],
    );

    // ---------------------------------------------------------------------
    // API imperativa (zoomIn/zoomOut/fitRoute/focusCoordinate) — ramifica por plataforma.
    // ---------------------------------------------------------------------
    const fitRoute = useCallback(() => {
      if (Platform.OS === 'ios') {
        if (allForFit.length < 2 || !mapRef.current) return;
        mapRef.current.fitToCoordinates(allForFit, {
          edgePadding: { top: 100, right: 36, bottom: 140, left: 36 },
          animated: true,
        });
        return;
      }
      if (allForFit.length < 2 || size.w < TILE_MIN_LAYOUT || size.h < TILE_MIN_LAYOUT) return;
      const next = fitMapStateToCoordinatesInTdf(allForFit, size.w, size.h, FIT_MAP_PADDING);
      committedRef.current = next;
      setCommitted(next);
    }, [allForFit, size.w, size.h]);

    const focusCoordinate = useCallback(
      (coord: { latitude: number; longitude: number }) => {
        if (Platform.OS === 'ios') {
          const map = mapRef.current;
          if (!map) return;
          map.animateToRegion(
            {
              latitude: coord.latitude,
              longitude: coord.longitude,
              latitudeDelta: 0.012,
              longitudeDelta: 0.012,
            },
            450,
          );
          return;
        }
        const next = clampPanToTdf(centerMapOnLatLon(coord.latitude, coord.longitude, TILE_FOCUS_ZOOM));
        committedRef.current = next;
        setCommitted(next);
      },
      [],
    );

    const zoomIn = useCallback(() => {
      if (Platform.OS === 'ios') {
        const map = mapRef.current;
        if (!map) return;
        const r = regionRef.current;
        map.animateToRegion(
          {
            latitude: r.latitude,
            longitude: r.longitude,
            latitudeDelta: Math.max(r.latitudeDelta * 0.5, REGION_ZOOM_MIN_DELTA),
            longitudeDelta: Math.max(r.longitudeDelta * 0.5, REGION_ZOOM_MIN_DELTA),
          },
          200,
        );
        return;
      }
      setCommitted((prev) => {
        const newZoom = Math.max(TILE_MIN_ZOOM, Math.min(TILE_MAX_ZOOM, prev.zoom + 1));
        if (newZoom === prev.zoom) return prev;
        const panMult = Math.pow(2, newZoom - prev.zoom);
        const next = clampPanToTdf({ zoom: newZoom, panX: prev.panX * panMult, panY: prev.panY * panMult });
        committedRef.current = next;
        return next;
      });
    }, []);

    const zoomOut = useCallback(() => {
      if (Platform.OS === 'ios') {
        const map = mapRef.current;
        if (!map) return;
        const r = regionRef.current;
        map.animateToRegion(
          {
            latitude: r.latitude,
            longitude: r.longitude,
            latitudeDelta: Math.min(r.latitudeDelta * 2, REGION_ZOOM_MAX_DELTA),
            longitudeDelta: Math.min(r.longitudeDelta * 2, REGION_ZOOM_MAX_DELTA),
          },
          200,
        );
        return;
      }
      setCommitted((prev) => {
        const newZoom = Math.max(TILE_MIN_ZOOM, Math.min(TILE_MAX_ZOOM, prev.zoom - 1));
        if (newZoom === prev.zoom) return prev;
        const panMult = Math.pow(2, newZoom - prev.zoom);
        const next = clampPanToTdf({ zoom: newZoom, panX: prev.panX * panMult, panY: prev.panY * panMult });
        committedRef.current = next;
        return next;
      });
    }, []);

    const recenterOnUser = useCallback(() => {
      if (!geoFix || Platform.OS === 'web') return;
      const heading = geoFix.heading ?? 0;

      if (Platform.OS === 'ios') {
        const map = mapRef.current;
        if (!map) return;
        void map.getCamera().then((cam) => {
          setMapBearing(heading);
          map.animateCamera(
            {
              ...cam,
              center: { latitude: geoFix.latitude, longitude: geoFix.longitude },
              heading,
              pitch: 0,
            },
            { duration: 450 },
          );
        });
        return;
      }

      // Android: rota suavemente hacia el rumbo actual por el camino más corto (sin dar la vuelta larga).
      const currentUnwrapped = bearingUnwrappedRef.current;
      const currentMod = ((currentUnwrapped % 360) + 360) % 360;
      let delta = heading - currentMod;
      delta = (((delta + 180) % 360) + 360) % 360 - 180;
      const target = currentUnwrapped + delta;
      bearingUnwrappedRef.current = target;
      Animated.timing(bearingAnim, { toValue: target, duration: 450, useNativeDriver: false }).start();

      setCommitted((prev) => {
        const next = clampPanToTdf(centerMapOnLatLon(geoFix.latitude, geoFix.longitude, prev.zoom));
        committedRef.current = next;
        return next;
      });
    }, [geoFix, bearingAnim]);

    useImperativeHandle(
      ref,
      () => ({
        zoomIn,
        zoomOut,
        fitRoute,
        focusCoordinate,
      }),
      [fitRoute, focusCoordinate, zoomIn, zoomOut],
    );

    const panZoomTransformStyle = {
      transform: [
        { translateX: animPanX },
        { translateY: animPanY },
        { scale: animScale },
      ],
    };

    return (
      <View style={styles.fill}>
        {Platform.OS === 'ios' ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={initialRegion}
            mapType={useSatellite ? 'satellite' : 'standard'}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
            showsUserLocation={false}
            onRegionChange={onRegionChange}
            onRegionChangeComplete={onRegionChangeComplete}
            showsMyLocationButton={false}
            pitchEnabled
            rotateEnabled
            scrollEnabled
            showsCompass={false}
            loadingEnabled>
            {routeLine.length >= 2 && (
              <>
                <MapPolyline
                  coordinates={routeLine}
                  strokeColor="#ffffff"
                  strokeWidth={7}
                  lineCap="round"
                  lineJoin="round"
                  zIndex={ROUTE_Z}
                />
                <MapPolyline
                  coordinates={routeLine}
                  strokeColor={TRAIL_ROUTE_LINE_COLOR}
                  strokeWidth={4}
                  lineCap="round"
                  lineJoin="round"
                  zIndex={ROUTE_Z + 1}
                />
              </>
            )}
            {recordedPath && recordedPath.length >= 2 && (
              <>
                <MapPolyline
                  coordinates={recordedPath}
                  strokeColor="rgba(255,255,255,0.9)"
                  strokeWidth={5}
                  lineCap="round"
                  lineJoin="round"
                  zIndex={ROUTE_Z + 2}
                />
                <MapPolyline
                  coordinates={recordedPath}
                  strokeColor={RECORDED_PATH_COLOR}
                  strokeWidth={3}
                  lineCap="round"
                  lineJoin="round"
                  zIndex={ROUTE_Z + 3}
                />
              </>
            )}
            {interestPoints.map((p) => {
              const dim = Math.round(POI_BASE_DIM * poiPinScale);
              const iconSz = Math.max(10, Math.round(POI_BASE_ICON * poiPinScale));
              const radius = dim / 2;
              return (
                <Marker
                  key={p.id}
                  coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  zIndex={POI_Z}
                  tracksViewChanges={false}>
                  <View
                    style={[
                      styles.poiHost,
                      {
                        width: dim,
                        height: dim,
                        borderRadius: radius,
                        backgroundColor: TRAIL_POI_MARKER_COLOR,
                      },
                    ]}>
                    <Ionicons name={poiTypeIcon(p.type)} size={iconSz} color="#fff" />
                  </View>
                </Marker>
              );
            })}
            {mainPoint ? (
              <Marker
                coordinate={mainPoint}
                anchor={{ x: 0.5, y: 1 }}
                zIndex={MAIN_Z}
                tracksViewChanges={false}>
                <View pointerEvents="none" style={{ alignItems: 'center' }} collapsable={false}>
                  <Ionicons name="location" size={MAIN_PIN} color={TRAIL_MAIN_MARKER_COLOR} />
                </View>
              </Marker>
            ) : null}
            {highlightedEmergencyId
              ? emergencyPoints
                  .filter((p) => p.id === highlightedEmergencyId)
                  .map((p) => {
                    const dim = Math.round(EMERGENCY_BASE_DIM * poiPinScale);
                    const iconSz = Math.max(12, Math.round(EMERGENCY_BASE_ICON * poiPinScale));
                    const radius = dim / 2;
                    return (
                      <Marker
                        key={`emergency-${p.id}`}
                        coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        zIndex={EMERGENCY_Z}
                        tracksViewChanges>
                        <View
                          style={[
                            styles.poiHost,
                            styles.emergencyHost,
                            {
                              width: dim,
                              height: dim,
                              borderRadius: radius,
                              backgroundColor: EMERGENCY_MARKER_COLOR,
                              borderWidth: 3,
                            },
                          ]}>
                          <Ionicons name="warning" size={iconSz} color="#fff" />
                        </View>
                      </Marker>
                    );
                  })
              : null}
            {displayCoord ? (
              <Marker
                coordinate={displayCoord}
                anchor={{ x: 0.5, y: 0.58 }}
                zIndex={USER_MARKER_Z}
                tracksViewChanges={arrowDeg != null}>
                <View style={styles.userPinCol} pointerEvents="none">
                  {arrowDeg != null ? (
                    <View
                      style={[
                        styles.headingArrowWrap,
                        { transform: [{ rotate: `${arrowDeg}deg` }] },
                      ]}>
                      <Ionicons name="navigate" size={26} color={theme.tint} />
                    </View>
                  ) : (
                    <View style={styles.headingPlaceholder} />
                  )}
                  <View style={mapUserLocationDotStyles.userDot}>
                    <View style={mapUserLocationDotStyles.userDotInner} />
                  </View>
                </View>
              </Marker>
            ) : null}
          </MapView>
        ) : (
          <View
            style={StyleSheet.absoluteFillObject}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              if (width > 0 && height > 0 && (width !== size.w || height !== size.h)) {
                setSize({ w: width, h: height });
              }
            }}>
            <View style={[StyleSheet.absoluteFillObject, styles.tileClip]}>
              <Animated.View
                style={[StyleSheet.absoluteFillObject, panZoomTransformStyle]}
                {...panResponder.panHandlers}>
                {/* Capa de tiles: cuadrado sobredimensionado para que la rotación no exponga esquinas vacías. */}
                <View
                  style={{
                    position: 'absolute',
                    width: tileDiag,
                    height: tileDiag,
                    left: (size.w - tileDiag) / 2,
                    top: (size.h - tileDiag) / 2,
                    transform: [{ rotate: `${bearingDeg}deg` }],
                  }}>
                  {tiles.map((t) => (
                    <Image
                      key={t.key}
                      source={{ uri: t.url }}
                      style={[styles.tile, { left: t.posX, top: t.posY }]}
                      cachePolicy="memory-disk"
                      transition={0}
                    />
                  ))}
                </View>

                {/* Capa de overlay (ruta + marcadores): mismo pivote/rotación que la capa de tiles. */}
                <View
                  style={[StyleSheet.absoluteFillObject, { transform: [{ rotate: `${bearingDeg}deg` }] }]}
                  pointerEvents="none">
                  {size.w >= TILE_MIN_LAYOUT && size.h >= TILE_MIN_LAYOUT && (
                    <Svg
                      width={size.w}
                      height={size.h}
                      viewBox={`0 0 ${size.w} ${size.h}`}
                      style={styles.svgOverlay}
                      collapsable={false}>
                      {routePixelPolyline.length > 0 && (
                        <>
                          <Polyline
                            points={routePixelPolyline}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth={7}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <Polyline
                            points={routePixelPolyline}
                            fill="none"
                            stroke={TRAIL_ROUTE_LINE_COLOR}
                            strokeWidth={4}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      )}
                      {/* Android: no se dibuja la ruta grabada (recordedPath) del usuario, a pedido. */}
                    </Svg>
                  )}

                  {poiLayouts.map((layout) => {
                    const dim = Math.round(POI_BASE_DIM * androidPinScale);
                    const iconSz = Math.max(10, Math.round(POI_BASE_ICON * androidPinScale));
                    const radius = dim / 2;
                    return (
                      <View
                        key={layout.id}
                        style={[styles.rotHost, { left: layout.left, top: layout.top, zIndex: POI_Z }]}>
                        <View style={{ transform: [{ rotate: `${-bearingDeg}deg` }] }}>
                          <View
                            style={[
                              styles.rotOffset,
                              {
                                left: -dim / 2,
                                top: -dim / 2,
                                width: dim,
                                height: dim,
                              },
                            ]}>
                            <View
                              style={[
                                styles.poiHost,
                                {
                                  width: dim,
                                  height: dim,
                                  borderRadius: radius,
                                  backgroundColor: TRAIL_POI_MARKER_COLOR,
                                },
                              ]}>
                              <Ionicons name={poiTypeIcon(layout.type)} size={iconSz} color="#fff" />
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {mainMarkerLayout ? (
                    <View
                      style={[
                        styles.rotHost,
                        { left: mainMarkerLayout.left, top: mainMarkerLayout.top, zIndex: MAIN_Z },
                      ]}>
                      <View style={{ transform: [{ rotate: `${-bearingDeg}deg` }] }}>
                        <View
                          style={[
                            styles.rotOffset,
                            { left: -MAIN_PIN / 2, top: -MAIN_PIN, width: MAIN_PIN, height: MAIN_PIN },
                          ]}>
                          <Ionicons name="location" size={MAIN_PIN} color={TRAIL_MAIN_MARKER_COLOR} />
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {emergencyLayouts.map((layout) => {
                    const dim = Math.round(EMERGENCY_BASE_DIM * androidPinScale);
                    const iconSz = Math.max(12, Math.round(EMERGENCY_BASE_ICON * androidPinScale));
                    const radius = dim / 2;
                    return (
                      <View
                        key={`emergency-${layout.id}`}
                        style={[styles.rotHost, { left: layout.left, top: layout.top, zIndex: EMERGENCY_Z }]}>
                        <View style={{ transform: [{ rotate: `${-bearingDeg}deg` }] }}>
                          <View
                            style={[
                              styles.rotOffset,
                              { left: -dim / 2, top: -dim / 2, width: dim, height: dim },
                            ]}>
                            <View
                              style={[
                                styles.poiHost,
                                styles.emergencyHost,
                                {
                                  width: dim,
                                  height: dim,
                                  borderRadius: radius,
                                  backgroundColor: EMERGENCY_MARKER_COLOR,
                                  borderWidth: 3,
                                },
                              ]}>
                              <Ionicons name="warning" size={iconSz} color="#fff" />
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {userTileLayout ? (
                    <View
                      style={[
                        styles.rotHost,
                        { left: userTileLayout.left, top: userTileLayout.top, zIndex: USER_MARKER_Z },
                      ]}>
                      <View style={{ transform: [{ rotate: `${-bearingDeg}deg` }] }}>
                        <View
                          style={[
                            styles.rotOffset,
                            {
                              left: -USER_MARKER_W / 2,
                              top: -USER_MARKER_H * USER_MARKER_ANCHOR_Y,
                              width: USER_MARKER_W,
                              height: USER_MARKER_H,
                            },
                          ]}>
                          <View style={styles.userPinCol}>
                            {arrowDeg != null ? (
                              // El wrapper padre ya contrarrota por `-bearingDeg` (igual que cualquier
                              // otro marcador), así que la rotación propia de la flecha queda igual a
                              // `arrowDeg` (rumbo relativo al "arriba" actual del mapa) sin término extra
                              // — igual que en la rama iOS.
                              <View
                                style={[
                                  styles.headingArrowWrap,
                                  { transform: [{ rotate: `${arrowDeg}deg` }] },
                                ]}>
                                <Ionicons name="navigate" size={26} color={theme.tint} />
                              </View>
                            ) : (
                              <View style={styles.headingPlaceholder} />
                            )}
                            <View style={mapUserLocationDotStyles.userDot}>
                              <View style={mapUserLocationDotStyles.userDotInner} />
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  ) : null}
                </View>
              </Animated.View>
            </View>
          </View>
        )}

        {Platform.OS !== 'web' && !isPaused ? (
          <View
            style={[styles.mapCtlFabColumn, { bottom: Math.max(insetBottom, 12) + 6 }]}
            pointerEvents="box-none">
            <View
              style={[
                styles.mapCtlZoomGroup,
                { borderColor: mapCtlChrome.bd, backgroundColor: mapCtlChrome.bg },
              ]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Acercar mapa"
                onPress={zoomIn}
                style={({ pressed }) => [styles.mapCtlZoomTap, { opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons name="add" size={18} color={theme.tint} />
              </Pressable>
              <View
                style={[styles.mapCtlHairline, { backgroundColor: mapCtlChrome.hairline }]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Alejar mapa"
                onPress={zoomOut}
                style={({ pressed }) => [styles.mapCtlZoomTap, { opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons name="remove" size={18} color={theme.tint} />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                useSatellite ? 'Cambiar a vista de mapa' : 'Cambiar a vista satelital'
              }
              onPress={() => setUseSatellite((v) => !v)}
              style={({ pressed }) => [
                styles.mapCtlChip,
                {
                  marginTop: 6,
                  borderColor: mapCtlChrome.bd,
                  backgroundColor: mapCtlChrome.bg,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <Ionicons name="layers-outline" size={16} color={theme.tint} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ir a mi ubicación y alinear el mapa con mi dirección"
              onPress={recenterOnUser}
              disabled={!geoFix}
              style={({ pressed }) => [
                styles.mapCtlChip,
                {
                  marginTop: 6,
                  borderColor: mapCtlChrome.bd,
                  backgroundColor: mapCtlChrome.bg,
                  opacity: !geoFix ? 0.42 : pressed ? 0.7 : 1,
                },
              ]}>
              <Ionicons name="locate" size={16} color={theme.tint} />
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  },
);

export default TrailActiveNavigationMap;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  tileClip: { overflow: 'hidden' },
  tile: {
    position: 'absolute',
    width: MAP_TILE_SIZE,
    height: MAP_TILE_SIZE,
  },
  svgOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  /** Host posicionado exactamente en el punto geográfico (pivote de rotación = ese punto). */
  rotHost: {
    position: 'absolute',
  },
  /** Desplazamiento del ícono dentro del wrapper ya contrarrotado (ancla tipo "pin"/"centro"). */
  rotOffset: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPinCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headingArrowWrap: {
    marginBottom: -4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 4,
  },
  headingPlaceholder: {
    height: 22,
    marginBottom: -4,
  },
  mapCtlFabColumn: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end',
  },
  mapCtlZoomGroup: {
    width: 42,
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapCtlZoomTap: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCtlHairline: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  mapCtlChip: {
    width: 42,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poiHost: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  emergencyHost: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 5,
  },
});
