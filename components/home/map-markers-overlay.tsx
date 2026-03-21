import { latLonToMapPixel, type MapPanState } from '@/lib/map-projection';
import type { MapMarker } from '@/services/api';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapWaypointPin, { MAP_PIN_HEIGHT, MAP_PIN_WIDTH } from './map-waypoint-pin';

interface Props {
  markers: MapMarker[];
  mapState: MapPanState;
  width: number;
  height: number;
  selectedKey: string | null;
  onMarkerPress: (m: MapMarker) => void;
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
}: Props) {
  const ordered = useMemo(() => {
    const pl = markers.filter((m): m is Extract<MapMarker, { kind: 'place' }> => m.kind === 'place');
    const tr = markers.filter((m): m is Extract<MapMarker, { kind: 'trail' }> => m.kind === 'trail');
    return [...pl, ...tr];
  }, [markers]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {ordered.map((m) => {
        const { left, top } = latLonToMapPixel(m.latitude, m.longitude, mapState, width, height);
        const anchorLeft = left - MAP_PIN_WIDTH / 2;
        const anchorTop = top - MAP_PIN_HEIGHT;
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
              selected={selectedKey === markerKey(m)}
              onPress={() => onMarkerPress(m)}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  markerHost: {
    position: 'absolute',
    zIndex: 10,
  },
});
