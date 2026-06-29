import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { loadRecordedPath } from '@/lib/recorded-trail-path';
import { fetchTrailRecordedPath } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline as MapPolyline,
  type Region,
} from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RECORDED_PATH_COLOR = '#22c55e';

interface Props {
  visible: boolean;
  trailId: string;
  trailName: string;
  token: string | null;
  onClose: () => void;
}

type LatLng = { latitude: number; longitude: number };

function fitRegion(path: LatLng[]): Region {
  let minLat = path[0].latitude, maxLat = path[0].latitude;
  let minLon = path[0].longitude, maxLon = path[0].longitude;
  for (const p of path) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLon = Math.min(minLon, p.longitude);
    maxLon = Math.max(maxLon, p.longitude);
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.008),
    longitudeDelta: Math.max((maxLon - minLon) * 1.6, 0.008),
  };
}

export default function RecordedRouteViewModal({
  visible,
  trailId,
  trailName,
  token,
  onClose,
}: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const { top } = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [path, setPath] = useState<LatLng[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !trailId) return;
    setPath(null);
    setLoading(true);
    void (async () => {
      try {
        if (token) {
          const fromServer = await fetchTrailRecordedPath(token, trailId);
          if (fromServer) { setPath(fromServer); return; }
        }
        setPath(await loadRecordedPath(trailId));
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, trailId, token]);

  const region = useMemo(() => (path && path.length >= 2 ? fitRegion(path) : null), [path]);

  useEffect(() => {
    if (!path || path.length < 2) return;
    const id = setTimeout(() => {
      mapRef.current?.fitToCoordinates(path, {
        edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
        animated: true,
      });
    }, 350);
    return () => clearTimeout(id);
  }, [path]);

  const startPt = path?.[0] ?? null;
  const endPt   = path?.[path.length - 1] ?? null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: top + 10,
              backgroundColor: isDark ? '#1c1c1e' : '#fff',
              borderBottomColor: isDark ? '#2a2a2a' : '#e5e5ea',
            },
          ]}>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="chevron-down" size={28} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText style={styles.headerTitle} numberOfLines={1}>
              {trailName}
            </ThemedText>
            <ThemedText style={[styles.headerSub, { color: colors.icon }]}>
              Mi recorrido
            </ThemedText>
          </View>
          <View style={styles.closeBtn} />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : !path || path.length < 2 ? (
          <View style={styles.center}>
            <Ionicons name="map-outline" size={52} color={colors.icon} />
            <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
              Sin ruta grabada
            </ThemedText>
            <ThemedText style={[styles.emptyBody, { color: colors.icon }]}>
              Este sendero fue completado antes de que se activara la grabación GPS.
            </ThemedText>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region ?? undefined}
            mapType="standard"
            userInterfaceStyle={isDark ? 'dark' : 'light'}
            showsUserLocation={false}
            showsMyLocationButton={false}
            rotateEnabled={false}
            showsCompass={false}>
            {/* Ruta grabada */}
            <MapPolyline
              coordinates={path}
              strokeColor="rgba(255,255,255,0.9)"
              strokeWidth={6}
              lineCap="round"
              lineJoin="round"
            />
            <MapPolyline
              coordinates={path}
              strokeColor={RECORDED_PATH_COLOR}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
            {/* Punto de inicio */}
            {startPt && (
              <Marker coordinate={startPt} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                <View style={[styles.dot, styles.dotStart]} />
              </Marker>
            )}
            {/* Punto final */}
            {endPt && startPt !== endPt && (
              <Marker coordinate={endPt} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                <View style={[styles.dot, styles.dotEnd]} />
              </Marker>
            )}
          </MapView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  map: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  dotStart: { backgroundColor: '#22c55e' },
  dotEnd:   { backgroundColor: '#ef4444' },
});
