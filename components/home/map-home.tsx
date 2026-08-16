import MapMarkersOverlay from '@/components/home/map-markers-overlay';
import MapWaypointPin from '@/components/home/map-waypoint-pin';
import { mapUserLocationDotStyles } from '@/components/home/map-user-location-styles';
import ResumeActiveTrailBar from '@/components/home/resume-active-trail-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { USHUAIA_REGION } from '@/constants/mock-trails';
import { CARD_PADDING_TOP, SB_INPUT_HEIGHT } from '@/constants/search-layout';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguageStore } from '@/store/language-store';
import { Ionicons } from '@expo/vector-icons';
import {
  MAP_BASE_TILE_X,
  MAP_BASE_TILE_Y,
  MAP_BASE_ZOOM,
  MAP_TILE_SIZE,
  centerMapOnLatLon,
  latLonToMapPixel,
  latToTileY,
  lonToTileX,
} from '@/lib/map-projection';
import { useWatchUserLocation } from '@/hooks/use-watch-user-location';
import { homePinScaleFromRegionSpan, pinScaleFromTileZoom } from '@/lib/map-pin-scale';
import { useNetworkReachable } from '@/hooks/use-network-reachable';
import { listManualDownloads, loadMapMarkersSnapshot, saveMapMarkersSnapshot } from '@/lib/offline-pack';
import { fetchMapMarkers, type MapMarker } from '@/services/api';
import MapView, { Marker, type Details, type Region } from 'react-native-maps';
import { useHomeStore } from '@/store/home-store';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchBar from './search-bar';
import TrailsBottomSheet from './trails-bottom-sheet';

const BASE_ZOOM = MAP_BASE_ZOOM;
const TILE_SIZE = MAP_TILE_SIZE;
const BASE_TILE_X = MAP_BASE_TILE_X;
const BASE_TILE_Y = MAP_BASE_TILE_Y;
const BUFFER = 4;
const MIN_ZOOM = 11;
const MAX_ZOOM = 18;
const REGION_ZOOM_MIN_DELTA = 0.002;
const REGION_ZOOM_MAX_DELTA = 1.2;
/**
 * Tras tap en POI (iOS): acerca hasta este ancho si el mapa estaba más alejado
 * (delta grande → más zoom out; queremos clamp al target para sí notar zoom).
 */
const MARKER_SELECT_FOCUS_SPAN_LAT = 0.009;
/** Android (tiles): al menos este nivel de zoom al abrir POI (además del +pasos si aplica). */
const ANDROID_MARKER_SELECT_MIN_ZOOM = 15;
/** Al tocar un POI en Android: suma estos niveles, y no queda por debajo de ANDROID_MARKER_SELECT_MIN_ZOOM. */
const ANDROID_MARKER_SELECT_ZOOM_IN_STEPS = 3;
const ESRI_IMAGERY_TILE_BASE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';

// Ushuaia geographic bounds (city + surroundings + Parque Nacional TdF)
const TDF_BOUNDS = {
  minLat: -55.05, // south: Beagle Channel south shore
  maxLat: -54.55, // north: mountains above the city
  minLon: -68.85, // west: Lapataia / Parque Nacional
  maxLon: -68.15, // east: east of the city
};


interface MapState {
  zoom: number;
  panX: number;
  panY: number;
}

function clampPan(state: MapState): MapState {
  const { zoom, panX, panY } = state;
  const zoomScale = Math.pow(2, zoom - BASE_ZOOM);

  // Convert lat/lon bounds to tile coordinates at current zoom
  const minTileX = lonToTileX(TDF_BOUNDS.minLon, zoom);
  const maxTileX = lonToTileX(TDF_BOUNDS.maxLon, zoom);
  // Note: smaller tileY = further north (Mercator projection)
  const minTileY = latToTileY(TDF_BOUNDS.maxLat, zoom); // north = small Y
  const maxTileY = latToTileY(TDF_BOUNDS.minLat, zoom); // south = large Y

  // From: worldX = BASE_TILE_X * zoomScale - panX / TILE_SIZE
  // For worldX ∈ [minTileX, maxTileX]:
  //   panX ∈ [(BASE_TILE_X * zoomScale - maxTileX) * TILE_SIZE, (BASE_TILE_X * zoomScale - minTileX) * TILE_SIZE]
  const minPanX = (BASE_TILE_X * zoomScale - maxTileX) * TILE_SIZE;
  const maxPanX = (BASE_TILE_X * zoomScale - minTileX) * TILE_SIZE;
  const minPanY = (BASE_TILE_Y * zoomScale - maxTileY) * TILE_SIZE;
  const maxPanY = (BASE_TILE_Y * zoomScale - minTileY) * TILE_SIZE;

  return {
    zoom,
    panX: Math.max(minPanX, Math.min(maxPanX, panX)),
    panY: Math.max(minPanY, Math.min(maxPanY, panY)),
  };
}

function calcTiles(
  state: MapState,
  width: number,
  height: number,
  streetCartoBase: string,
  esriImageryBase: string,
  useImageryTiles: boolean,
) {
  const { zoom, panX, panY } = state;
  const zoomScale = Math.pow(2, zoom - BASE_ZOOM);

  const worldX = BASE_TILE_X * zoomScale - panX / TILE_SIZE;
  const worldY = BASE_TILE_Y * zoomScale - panY / TILE_SIZE;

  const centerX = Math.floor(worldX);
  const centerY = Math.floor(worldY);
  const subX = (worldX - centerX) * TILE_SIZE;
  const subY = (worldY - centerY) * TILE_SIZE;

  const halfX = Math.ceil(width / 2 / TILE_SIZE) + BUFFER;
  const halfY = Math.ceil(height / 2 / TILE_SIZE) + BUFFER;
  const maxTile = Math.pow(2, zoom) - 1;

  const tiles: { key: string; url: string; posX: number; posY: number }[] = [];
  for (let dy = -halfY; dy <= halfY; dy++) {
    for (let dx = -halfX; dx <= halfX; dx++) {
      const tx = centerX + dx;
      const ty = centerY + dy;
      if (tx < 0 || ty < 0 || tx > maxTile || ty > maxTile) continue;
      const url = useImageryTiles
        ? `${esriImageryBase}/${zoom}/${ty}/${tx}`
        : `${streetCartoBase}/${zoom}/${tx}/${ty}.png`;
      tiles.push({
        key: `${zoom}-${tx}-${ty}`,
        url,
        posX: width / 2 - subX + dx * TILE_SIZE,
        posY: height / 2 - subY + dy * TILE_SIZE,
      });
    }
  }
  return tiles;
}

export default function MapHome() {
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { language, setLanguage } = useLanguageStore();
  const LANG_FLAG: Record<string, string> = { es: '🇦🇷', en: '🇺🇸', pt: '🇧🇷' };

  const streetCartoBase = isDark
    ? 'https://a.basemaps.cartocdn.com/dark_all'
    : 'https://a.basemaps.cartocdn.com/light_all';

  const [useSatellite, setUseSatellite] = useState(false);
  const [langSheetVisible, setLangSheetVisible] = useState(false);
  const langSheetOverlay = useRef(new Animated.Value(0)).current;
  const langSheetY = useRef(new Animated.Value(260)).current;

  const openLangSheet = () => {
    setLangSheetVisible(true);
    Animated.parallel([
      Animated.timing(langSheetOverlay, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(langSheetY, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
    ]).start();
  };

  const closeLangSheet = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(langSheetOverlay, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(langSheetY, { toValue: 260, duration: 220, useNativeDriver: true }),
    ]).start(() => { setLangSheetVisible(false); cb?.(); });
  };
  /** iOS siempre MapKit. Android: teselas PNG remotas en calle; satélite con MapView nativo (mejor sin red vía caché de Google). */
  const useNativeMapView = Platform.OS === 'ios' || (Platform.OS === 'android' && useSatellite);

  const [committed, setCommitted] = useState<MapState>({ zoom: BASE_ZOOM, panX: 0, panY: 0 });
  const { searchOpen, setSearchOpen, setMapPanning } = useHomeStore();

  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [selectedMapMarker, setSelectedMapMarker] = useState<MapMarker | null>(null);
  const [iosPinScale, setIosPinScale] = useState(() =>
    homePinScaleFromRegionSpan(Math.max(USHUAIA_REGION.latitudeDelta, USHUAIA_REGION.longitudeDelta)),
  );
  const iosMapRef = useRef<MapView>(null);
  const iosRegionRef = useRef<Region>(USHUAIA_REGION);
  /**
   * Apple Maps no rellena `isGesture` bien; usamos casi todo cambio de región como gesto
   * salvo una ventana tras `animateToRegion` y un margen inicial al montar.
   */
  const iosIgnoreRegionPanningUntil = useRef(Date.now() + 900);
  /**
   * True desde el primer gesto del usuario hasta que el mapa queda en reposo (incluye inercia).
   * Durante la inercia, MapKit a menudo pone `isGesture: false`; sin esto el sheet re-expanda a destiempo.
   */
  const iosMapGestureSession = useRef(false);
  /**
   * Evita `setMapPanning(false)` mientras aún corren ajustes de región; el último `complete` gana.
   */
  const iosMapPanningIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const IOS_MAP_PANNING_SETTLE_MS = 130;

  const bumpIosProgrammaticMapMove = () => {
    iosMapGestureSession.current = false;
    iosIgnoreRegionPanningUntil.current = Date.now() + 1000;
  };

  const liveLocation = useWatchUserLocation(Platform.OS !== 'web');
  const networkReachable = useNetworkReachable();
  const isOffline = networkReachable === false;

  const [downloadedTrailIds, setDownloadedTrailIds] = useState<Set<string>>(new Set());

  const loadDownloadedTrailIds = useCallback(async () => {
    const { trails } = await listManualDownloads();
    setDownloadedTrailIds(new Set(trails.map((t) => t.id)));
  }, []);

  /** Recarga la lista de descargas al volver a esta pestaña (p. ej. después de descargar un sendero desde su ficha). */
  useFocusEffect(
    useCallback(() => {
      void loadDownloadedTrailIds();
    }, [loadDownloadedTrailIds]),
  );

  // Sin conexión: solo mostramos pines de senderos descargados (los puntos turísticos no admiten descarga manual).
  const visibleMapMarkers = useMemo(() => {
    if (!isOffline) return mapMarkers;
    return mapMarkers.filter((m) => m.kind === 'trail' && downloadedTrailIds.has(m.id));
  }, [mapMarkers, isOffline, downloadedTrailIds]);

  const orderedMapMarkers = useMemo(() => {
    const places = visibleMapMarkers.filter((m): m is Extract<MapMarker, { kind: 'place' }> => m.kind === 'place');
    const trails = visibleMapMarkers.filter((m): m is Extract<MapMarker, { kind: 'trail' }> => m.kind === 'trail');
    return [...places, ...trails];
  }, [visibleMapMarkers]);

  useEffect(() => {
    fetchMapMarkers()
      .then((markers) => {
        setMapMarkers(markers);
        void saveMapMarkersSnapshot(markers);
      })
      .catch(async () => {
        const cached = await loadMapMarkersSnapshot();
        setMapMarkers(cached ?? []);
      });
  }, []);

  useEffect(() => {
    return () => {
      if (iosMapPanningIdleTimer.current) clearTimeout(iosMapPanningIdleTimer.current);
    };
  }, []);

  const animPanX = useRef(new Animated.Value(0)).current;
  const animPanY = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(1)).current;

  const gesture = useRef({
    isPinching: false,
    pinchStartDist: 0,
    pinchCurrentScale: 1,
  });

  // Ref mirror of committed so panResponder can read current state without stale closure.
  const committedRef = useRef<MapState>({ zoom: BASE_ZOOM, panX: 0, panY: 0 });

  // Stores pending animation reset after committed state updates.
  // useLayoutEffect will apply it atomically in the same native batch as the new tiles.
  const pendingAnimReset = useRef(false);

  // Store current animation values to avoid accessing private _value property
  const currentAnimPanX = useRef(0);
  const currentAnimPanY = useRef(0);
  
  // Track if we're currently processing a release to prevent race conditions
  const isProcessingRelease = useRef(false);

  // After React commits the new tile positions, reset animations in the same native frame.
  // This prevents the 1-frame flash where tiles are at new position but animation still has delta.
  useLayoutEffect(() => {
    committedRef.current = committed;
    if (pendingAnimReset.current) {
      // Use flushSync-like behavior: reset animations synchronously
      animPanX.setValue(0);
      animPanY.setValue(0);
      animPanX.setOffset(0);
      animPanY.setOffset(0);
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
        // Reset processing flag to allow new gestures
        isProcessingRelease.current = false;
        setMapPanning(true);
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          gesture.current.isPinching = true;
          gesture.current.pinchStartDist = Math.hypot(
            touches[1].pageX - touches[0].pageX,
            touches[1].pageY - touches[0].pageY,
          );
          gesture.current.pinchCurrentScale = 1;
        } else {
          gesture.current.isPinching = false;
          animPanX.setValue(0);
          animPanY.setValue(0);
          animPanX.setOffset(0);
          animPanY.setOffset(0);
          currentAnimPanX.current = 0;
          currentAnimPanY.current = 0;
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        // Skip if we're processing a release to avoid race conditions
        if (isProcessingRelease.current) return;
        
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2 && gesture.current.isPinching) {
          const dist = Math.hypot(
            touches[1].pageX - touches[0].pageX,
            touches[1].pageY - touches[0].pageY,
          );
          gesture.current.pinchCurrentScale = dist / gesture.current.pinchStartDist;
          animScale.setValue(gesture.current.pinchCurrentScale);
        } else if (!gesture.current.isPinching) {
          // Clamp animation in real-time so the map hard-stops at bounds (no bounce).
          const base = committedRef.current;
          const clamped = clampPan({
            zoom: base.zoom,
            panX: base.panX + gestureState.dx,
            panY: base.panY + gestureState.dy,
          });
          const deltaX = clamped.panX - base.panX;
          const deltaY = clamped.panY - base.panY;
          currentAnimPanX.current = deltaX;
          currentAnimPanY.current = deltaY;
          animPanX.setValue(deltaX);
          animPanY.setValue(deltaY);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        if (gesture.current.isPinching) {
          const rawScale = gesture.current.pinchCurrentScale;
          const deltaZoom = Math.round(Math.log2(rawScale));
          gesture.current.isPinching = false;
          animScale.setValue(1);
          animPanX.setValue(0);
          animPanY.setValue(0);
          currentAnimPanX.current = 0;
          currentAnimPanY.current = 0;
          isProcessingRelease.current = true;
          setCommitted((prev) => {
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom + deltaZoom));
            const panMult = Math.pow(2, newZoom - prev.zoom);
            const newState = clampPan({ zoom: newZoom, panX: prev.panX * panMult, panY: prev.panY * panMult });
            committedRef.current = newState;
            isProcessingRelease.current = false;
            return newState;
          });
        } else {
          // Prevent multiple rapid releases from causing race conditions
          if (isProcessingRelease.current) return;
          isProcessingRelease.current = true;

          // Read the already-clamped animation value (set during onPanResponderMove).
          // This ensures the committed state matches exactly what the user saw on screen.
          const dx = currentAnimPanX.current;
          const dy = currentAnimPanY.current;

          // Schedule animation reset to happen AFTER React commits new tile positions.
          // useLayoutEffect will run synchronously after commit, in the same native batch,
          // so there's never a frame where tiles are at new position but animation has old delta.
          pendingAnimReset.current = true;

          setCommitted((prev) => {
            const newState = clampPan({
              ...prev,
              panX: prev.panX + dx,
              panY: prev.panY + dy,
            });
            // Update ref immediately to prevent race conditions
            committedRef.current = newState;
            // Reset flag will be cleared in useLayoutEffect
            return newState;
          });
        }
        setMapPanning(false);
      },
    }),
  ).current;

  const tiles = useMemo(
    () =>
      calcTiles(committed, width, height, streetCartoBase, ESRI_IMAGERY_TILE_BASE, useSatellite),
    [committed, width, height, streetCartoBase, useSatellite],
  );

  const applyAndroidZoomStep = (deltaLevels: number) => {
    pendingAnimReset.current = true;
    setCommitted((prev) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom + deltaLevels));
      if (newZoom === prev.zoom) return prev;
      const panMult = Math.pow(2, newZoom - prev.zoom);
      const newState = clampPan({
        zoom: newZoom,
        panX: prev.panX * panMult,
        panY: prev.panY * panMult,
      });
      committedRef.current = newState;
      return newState;
    });
  };

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

  const handleCtlZoomIn = () => {
    if (useNativeMapView) {
      bumpIosProgrammaticMapMove();
      const r = iosRegionRef.current;
      iosMapRef.current?.animateToRegion(
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
    applyAndroidZoomStep(1);
  };

  const handleCtlZoomOut = () => {
    if (useNativeMapView) {
      bumpIosProgrammaticMapMove();
      const r = iosRegionRef.current;
      iosMapRef.current?.animateToRegion(
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
    applyAndroidZoomStep(-1);
  };

  const chromeAccent = colors.tint;
  const FAB_CHROME_ABOVE_SHEET = Platform.OS === 'android' ? 188 : 160;


  const mapTransformStyle = {
    transform: [
      { translateX: animPanX },
      { translateY: animPanY },
      { scale: animScale },
    ],
  };

  const selectedMarkerKey = selectedMapMarker
    ? `${selectedMapMarker.kind}-${selectedMapMarker.id}`
    : null;

  const androidPinScale = pinScaleFromTileZoom(committed.zoom);

  useEffect(() => {
    if (!selectedMapMarker) return;

    const lat = selectedMapMarker.latitude;
    const lon = selectedMapMarker.longitude;
    const sheetReservedBottomPx = Math.round(height * 0.6) + bottom + 44;
    const mapTopInset = Math.round(top + CARD_PADDING_TOP + SB_INPUT_HEIGHT + 36);

    if (useNativeMapView) {
      requestAnimationFrame(() => {
        bumpIosProgrammaticMapMove();
        const r = iosRegionRef.current;
        const currentSpan = Math.max(r.latitudeDelta, r.longitudeDelta);
        const spanLat = Math.max(
          REGION_ZOOM_MIN_DELTA,
          Math.min(currentSpan, MARKER_SELECT_FOCUS_SPAN_LAT),
        );
        const spanLon = spanLat * (width / height);

        const usableTop = mapTopInset;
        const usableBottomEdge = Math.max(height - sheetReservedBottomPx, usableTop + 160);
        const targetY = usableTop + (usableBottomEdge - usableTop) * 0.4;
        const fraction = (targetY - height / 2) / height;
        const centerLat = lat + fraction * spanLat;

        iosMapRef.current?.animateToRegion(
          {
            latitude: centerLat,
            longitude: lon,
            latitudeDelta: spanLat,
            longitudeDelta: spanLon,
          },
          320,
        );
      });
      return;
    }

    pendingAnimReset.current = true;
    const usableTop = mapTopInset;
    const usableBottomEdge = Math.max(height - sheetReservedBottomPx, usableTop + 160);
    const targetY = usableTop + (usableBottomEdge - usableTop) * 0.4;

    setCommitted((prev) => {
      const z = Math.min(
        MAX_ZOOM,
        Math.max(prev.zoom + ANDROID_MARKER_SELECT_ZOOM_IN_STEPS, ANDROID_MARKER_SELECT_MIN_ZOOM),
      );
      const centered = clampPan(centerMapOnLatLon(lat, lon, z));
      const pix = latLonToMapPixel(lat, lon, centered, width, height);
      const dy = targetY - pix.top;
      const next = clampPan({ ...centered, panY: centered.panY + dy });
      committedRef.current = next;
      return next;
    });
  }, [selectedMapMarker, bottom, height, width, top]);

  return (
    <View style={styles.container}>
      {useNativeMapView ? (
        <MapView
          ref={iosMapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={USHUAIA_REGION}
          mapType={Platform.OS === 'ios' ? (useSatellite ? 'satellite' : 'standard') : 'satellite'}
          userInterfaceStyle={isDark ? 'dark' : 'light'}
          showsUserLocation={false}
          onRegionChange={(_r: Region, details: Details) => {
            if (Date.now() < iosIgnoreRegionPanningUntil.current) return;
            if (iosMapPanningIdleTimer.current) {
              clearTimeout(iosMapPanningIdleTimer.current);
              iosMapPanningIdleTimer.current = null;
            }
            if (details.isGesture !== false) {
              iosMapGestureSession.current = true;
              if (!useHomeStore.getState().mapPanning) {
                setMapPanning(true);
              }
            } else if (iosMapGestureSession.current) {
              if (!useHomeStore.getState().mapPanning) {
                setMapPanning(true);
              }
            }
          }}
          onRegionChangeComplete={(r) => {
            iosRegionRef.current = r;
            setIosPinScale(homePinScaleFromRegionSpan(Math.max(r.latitudeDelta, r.longitudeDelta)));
            if (iosMapPanningIdleTimer.current) {
              clearTimeout(iosMapPanningIdleTimer.current);
            }
            iosMapPanningIdleTimer.current = setTimeout(() => {
              iosMapPanningIdleTimer.current = null;
              iosMapGestureSession.current = false;
              setMapPanning(false);
            }, IOS_MAP_PANNING_SETTLE_MS);
          }}
          showsCompass={false}
          rotateEnabled={false}>
          {liveLocation ? (
            <Marker
              coordinate={liveLocation}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={100_000}
              tracksViewChanges={false}>
              <View style={mapUserLocationDotStyles.userDot} pointerEvents="none">
                <View style={mapUserLocationDotStyles.userDotInner} />
              </View>
            </Marker>
          ) : null}
          {orderedMapMarkers.map((m) => (
            <Marker
              key={`${m.kind}-${m.id}`}
              coordinate={{ latitude: m.latitude, longitude: m.longitude }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={selectedMarkerKey === `${m.kind}-${m.id}`}>
              <MapWaypointPin
                variant={m.kind === 'trail' ? 'trail' : 'place'}
                placeCategory={m.kind === 'place' ? m.category : null}
                selected={selectedMarkerKey === `${m.kind}-${m.id}`}
                sizeScale={iosPinScale}
                onPress={() => setSelectedMapMarker(m)}
              />
            </Marker>
          ))}
        </MapView>
      ) : (
        <Animated.View style={[StyleSheet.absoluteFillObject, mapTransformStyle]}>
          <View style={StyleSheet.absoluteFillObject} {...panResponder.panHandlers}>
            {tiles.map((t) => (
              <Image
                key={t.key}
                source={t.url}
                style={[styles.tile, { left: t.posX, top: t.posY }]}
                cachePolicy="memory-disk"
                transition={0}
              />
            ))}
          </View>
          <MapMarkersOverlay
            markers={visibleMapMarkers}
            mapState={committed}
            width={width}
            height={height}
            selectedKey={selectedMarkerKey}
            onMarkerPress={setSelectedMapMarker}
            userLocation={liveLocation}
            hideWaypoints={false}
            pinScale={androidPinScale}
          />
        </Animated.View>
      )}

      {/* Search bar */}
      <View style={[styles.searchOverlay, { paddingTop: top + CARD_PADDING_TOP, backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
        <SearchBar
          onPress={() => setSearchOpen(true)}
          isActive={searchOpen}
          offline={isOffline}
          rightSlot={
            <TouchableOpacity
              style={styles.langBtn}
              onPress={openLangSheet}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('languagePicker.title')}>
              <Ionicons name="language-outline" size={22} color={chromeAccent} />
            </TouchableOpacity>
          }
        />
      </View>

      {/* Debajo del BottomSheet «Senderos para ti» (misma idea que con el buscador en modal). */}
      <ResumeActiveTrailBar offsetTop={top + CARD_PADDING_TOP + SB_INPUT_HEIGHT + 24} />

      {/* Zoom, ubicación y sheet — capa superior para que el panel tape la barra Resumir. */}
      <View style={[styles.mapChromeLayer, StyleSheet.absoluteFillObject]} pointerEvents="box-none">
        <View
          style={[styles.rightFabChrome, { bottom: bottom + FAB_CHROME_ABOVE_SHEET }]}
          pointerEvents="box-none">
          {/*
          <View
            style={[styles.mapCtlZoomGroup, { borderColor: mapCtlChrome.bd, backgroundColor: mapCtlChrome.bg }]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('map.zoomIn')}
              style={styles.mapCtlZoomTap}
              activeOpacity={0.7}
              onPress={handleCtlZoomIn}>
              <Ionicons name="add" size={18} color={chromeAccent} />
            </TouchableOpacity>
            <View style={[styles.mapCtlHairline, { backgroundColor: mapCtlChrome.hairline }]} />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('map.zoomOut')}
              style={styles.mapCtlZoomTap}
              activeOpacity={0.7}
              onPress={handleCtlZoomOut}>
              <Ionicons name="remove" size={18} color={chromeAccent} />
            </TouchableOpacity>
          </View>
          */}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={useSatellite ? t('map.street') : t('map.satellite')}
            style={[
              styles.mapCtlChip,
              {
                borderColor: mapCtlChrome.bd,
                backgroundColor: mapCtlChrome.bg,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => setUseSatellite((v) => !v)}>
            <Ionicons name="layers-outline" size={18} color={chromeAccent} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('map.centerLocation')}
            style={[
              styles.mapCtlChip,
              {
                borderColor: mapCtlChrome.bd,
                backgroundColor: mapCtlChrome.bg,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => {
              if (useNativeMapView) {
                bumpIosProgrammaticMapMove();
                if (liveLocation) {
                  const r = iosRegionRef.current;
                  const span = Math.max(
                    0.006,
                    Math.min(Math.max(r.latitudeDelta, r.longitudeDelta) * 0.85, 0.045),
                  );
                  iosMapRef.current?.animateToRegion(
                    {
                      latitude: liveLocation.latitude,
                      longitude: liveLocation.longitude,
                      latitudeDelta: span,
                      longitudeDelta: span,
                    },
                    350,
                  );
                } else {
                  iosMapRef.current?.animateToRegion(USHUAIA_REGION, 350);
                }
                return;
              }
              pendingAnimReset.current = true;
              setCommitted((p) => {
                const lat = liveLocation?.latitude ?? USHUAIA_REGION.latitude;
                const lon = liveLocation?.longitude ?? USHUAIA_REGION.longitude;
                const next = clampPan(centerMapOnLatLon(lat, lon, p.zoom));
                committedRef.current = next;
                return next;
              });
            }}>
            <IconSymbol name="location" size={18} color={chromeAccent} />
          </TouchableOpacity>
        </View>

        <TrailsBottomSheet
          selectedMapMarker={selectedMapMarker}
          onClearMapMarker={() => setSelectedMapMarker(null)}
          onItemPress={(item) =>
            router.push(
              item.kind === 'place'
                ? ({ pathname: '/places/[id]', params: { id: item.id } } as any)
                : ({ pathname: '/trails/[id]', params: { id: item.id } } as any),
            )
          }
        />
      </View>
      {/* Language picker sheet */}
      {langSheetVisible ? (
        <Modal transparent animationType="none" visible={langSheetVisible} onRequestClose={() => closeLangSheet()}>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.langBackdrop, { opacity: langSheetOverlay }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => closeLangSheet()} />
          </Animated.View>
          <Animated.View style={[styles.langSheet, { backgroundColor: isDark ? '#1c1c1e' : '#fff', transform: [{ translateY: langSheetY }] }]}>
            <View style={styles.langSheetHandle} />
            <Text style={[styles.langSheetTitle, { color: isDark ? '#fff' : '#11181C' }]}>{t('languagePicker.title')}</Text>
            {([
              { code: 'es', flag: '🇦🇷', label: t('languagePicker.es') },
              { code: 'en', flag: '🇺🇸', label: t('languagePicker.en') },
              { code: 'pt', flag: '🇧🇷', label: t('languagePicker.pt') },
            ] as const).map((lang, i, arr) => (
              <View key={lang.code}>
                <TouchableOpacity
                  style={styles.langOption}
                  activeOpacity={0.75}
                  onPress={() => closeLangSheet(() => setLanguage(lang.code))}>
                  <Text style={styles.langOptionFlag}>{lang.flag}</Text>
                  <Text style={[styles.langOptionLabel, { color: isDark ? '#fff' : '#11181C' }]}>{lang.label}</Text>
                  {language === lang.code && (
                    <Ionicons name="checkmark" size={20} color={colors.tint} />
                  )}
                </TouchableOpacity>
                {i < arr.length - 1 && (
                  <View style={[styles.langDivider, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]} />
                )}
              </View>
            ))}
          </Animated.View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8e4dc',
  },
  mapChromeLayer: {
    zIndex: 100,
    elevation: 100,
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  langBtn: {
    width: 46,
    height: 46,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  langBtnText: {
    fontSize: 22,
  },
  rightFabChrome: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end',
    gap: 10,
  },
  mapCtlZoomGroup: {
    width: 44,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapCtlZoomTap: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCtlHairline: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  mapCtlChip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },

  // Language sheet
  langBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  langSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  langSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120,120,128,0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  langSheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'android' ? 'Inter' : undefined,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.5,
    marginBottom: 8,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  langOptionFlag: { fontSize: 26 },
  langOptionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'android' ? 'Inter' : undefined,
  },
  langDivider: { height: StyleSheet.hairlineWidth },
});
