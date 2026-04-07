import {
  TRAIL_POI_MARKER_COLOR,
  TRAIL_ROUTE_LINE_COLOR,
} from '@/components/trail-route-tile-map';
import { mapUserLocationDotStyles } from '@/components/home/map-user-location-styles';
import { Colors } from '@/constants/theme';
import { useWatchUserLocation } from '@/hooks/use-watch-user-location';
import { pinScaleFromRegionSpan } from '@/lib/map-pin-scale';
import { poiTypeIcon } from '@/lib/poi-icons';
import type { ActiveTrailMapPoint } from '@/store/active-trail-session-store';
import { Ionicons } from '@expo/vector-icons';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, {
  Marker,
  Polyline as MapPolyline,
  type LatLng,
  type Region,
} from 'react-native-maps';

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

/** Nivel aproximado a partir del span (solo escala de íconos POI). */
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

const POI_Z = 10;
const ROUTE_Z = 2;
const USER_MARKER_Z = 100_000;

export interface TrailActiveNavigationMapRef {
  zoomIn: () => void;
  zoomOut: () => void;
  fitRoute: () => void;
}

interface Props {
  lineCoordinates: { latitude: number; longitude: number }[];
  interestPoints: ActiveTrailMapPoint[];
  fallbackCenter: { latitude: number; longitude: number };
  isDark: boolean;
}

const TrailActiveNavigationMap = forwardRef<TrailActiveNavigationMapRef, Props>(
  function TrailActiveNavigationMap(
    { lineCoordinates, interestPoints, fallbackCenter, isDark },
    ref,
  ) {
    const { bottom: insetBottom } = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    const theme = Colors[isDark ? 'dark' : 'light'];
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
    const [mapBearing, setMapBearing] = useState(0);
    const [useSatellite, setUseSatellite] = useState(false);
    const arrowDeg = useMemo(
      () => arrowRotationDeg(headingDeg, mapBearing),
      [headingDeg, mapBearing],
    );
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

    const allForFit = useMemo(() => {
      const pts: LatLng[] = [...lineCoordinates];
      for (const p of interestPoints) {
        pts.push({ latitude: p.latitude, longitude: p.longitude });
      }
      return pts;
    }, [lineCoordinates, interestPoints]);

    const routeLine = useMemo(() => {
      if (lineCoordinates.length >= 2) return lineCoordinates;
      return [];
    }, [lineCoordinates]);

    const fitRoute = useCallback(() => {
      if (allForFit.length < 2 || !mapRef.current) return;
      mapRef.current.fitToCoordinates(allForFit, {
        edgePadding: { top: 100, right: 36, bottom: 140, left: 36 },
        animated: true,
      });
    }, [allForFit]);

    const recenterOnUser = useCallback(() => {
      const map = mapRef.current;
      if (!map || !geoFix || Platform.OS === 'web') return;
      const heading = geoFix.heading ?? 0;
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
    }, [geoFix]);

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

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => {
          const map = mapRef.current;
          if (!map || Platform.OS === 'web') return;
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
        },
        zoomOut: () => {
          const map = mapRef.current;
          if (!map || Platform.OS === 'web') return;
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
        },
        fitRoute,
      }),
      [fitRoute],
    );

    useEffect(() => {
      if (didFitRoute.current || allForFit.length < 2) return;
      const id = requestAnimationFrame(() => {
        mapRef.current?.fitToCoordinates(allForFit, {
          edgePadding: { top: 100, right: 36, bottom: 160, left: 36 },
          animated: true,
        });
        didFitRoute.current = true;
      });
      return () => cancelAnimationFrame(id);
    }, [allForFit]);

    return (
      <View style={styles.fill}>
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
          {interestPoints.map((p) => {
            const dim = Math.round(34 * poiPinScale);
            const iconSz = Math.max(10, Math.round(18 * poiPinScale));
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
          {Platform.OS !== 'web' && displayCoord ? (
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

        {Platform.OS !== 'web' ? (
          <View
            style={[
              styles.fabColumn,
              { bottom: Math.max(insetBottom, 12) + 6 },
            ]}
            pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                useSatellite ? 'Cambiar a vista de mapa' : 'Cambiar a vista satelital'
              }
              onPress={() => setUseSatellite((v) => !v)}
              style={({ pressed }) => [
                styles.mapFab,
                {
                  backgroundColor: isDark ? 'rgba(44,44,46,0.94)' : 'rgba(255,255,255,0.96)',
                  borderColor: isDark ? '#3a3a3c' : '#e5e5ea',
                  opacity: pressed ? 0.85 : 1,
                  marginBottom: 12,
                },
              ]}>
              <Ionicons name="layers-outline" size={26} color={theme.tint} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ir a mi ubicación y alinear el mapa con mi dirección"
              onPress={recenterOnUser}
              disabled={!geoFix}
              style={({ pressed }) => [
                styles.mapFab,
                {
                  backgroundColor: isDark ? 'rgba(44,44,46,0.94)' : 'rgba(255,255,255,0.96)',
                  borderColor: isDark ? '#3a3a3c' : '#e5e5ea',
                  opacity: !geoFix ? 0.45 : pressed ? 0.85 : 1,
                },
              ]}>
              <Ionicons name="locate" size={26} color={theme.tint} />
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
  fabColumn: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end',
  },
  mapFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },
  poiHost: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
});
