import { mapUserLocationDotStyles } from '@/components/home/map-user-location-styles';
import MapWaypointPin, { getWaypointPinBox } from '@/components/home/map-waypoint-pin';
import { latLonToMapPixel, type MapPanState } from '@/lib/map-projection';
import type { MapMarker } from '@/services/api';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  markers: MapMarker[];
  mapState: MapPanState;
  width: number;
  height: number;
  selectedKey: string | null;
  onMarkerPress: (m: MapMarker) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  /** Si true, no se pintan senderos/lugares (p. ej. mientras se arrastra el mapa). */
  hideWaypoints?: boolean;
  pinScale?: number;
}

function markerKey(m: MapMarker): string {
  return `${m.kind}-${m.id}`;
}

export default function MapMarkersOverlay({
  markers,
  mapState,
  width,
  height,
  selectedKey,
  onMarkerPress,
  userLocation,
  hideWaypoints = false,
  pinScale = 1,
}: Props) {
  const { width: pinW, height: pinH } = getWaypointPinBox(pinScale);

  const ordered = useMemo(() => {
    const pl = markers.filter((m): m is Extract<MapMarker, { kind: 'place' }> => m.kind === 'place');
    const tr = markers.filter((m): m is Extract<MapMarker, { kind: 'trail' }> => m.kind === 'trail');
    return [...pl, ...tr];
  }, [markers]);

  const userPixel = useMemo(() => {
    if (!userLocation) return null;
    return latLonToMapPixel(userLocation.latitude, userLocation.longitude, mapState, width, height);
  }, [userLocation, mapState, width, height]);

  const userHalf = 18;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {userPixel ? (
        <View
          style={[
            styles.userHost,
            {
              left: userPixel.left - userHalf,
              top: userPixel.top - userHalf,
            },
          ]}
          pointerEvents="none">
          <View style={mapUserLocationDotStyles.userDot}>
            <View style={mapUserLocationDotStyles.userDotInner} />
          </View>
        </View>
      ) : null}
      {!hideWaypoints
        ? ordered.map((m) => {
            const { left, top } = latLonToMapPixel(m.latitude, m.longitude, mapState, width, height);
            const anchorLeft = left - pinW / 2;
            const anchorTop = top - pinH;
            if (anchorLeft < -100 || anchorTop < -100 || anchorLeft > width + 60 || anchorTop > height + 60) {
              return null;
            }
            return (
              <View
                key={markerKey(m)}
                style={[styles.markerHost, { left: anchorLeft, top: anchorTop }]}
                pointerEvents="box-none">
                <MapWaypointPin
                  variant={m.kind === 'trail' ? 'trail' : 'place'}
                  placeCategory={m.kind === 'place' ? m.category : null}
                  selected={selectedKey === markerKey(m)}
                  sizeScale={pinScale}
                  onPress={() => onMarkerPress(m)}
                />
              </View>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  markerHost: {
    position: 'absolute',
    zIndex: 10,
  },
  userHost: {
    position: 'absolute',
    zIndex: 25,
    width: 36,
    height: 36,
  },
});
