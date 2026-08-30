import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  MAP_BASE_TILE_X,
  MAP_BASE_TILE_Y,
  MAP_BASE_ZOOM,
  MAP_TILE_SIZE,
  latLonToMapPixel,
  latToTileY,
  lonToTileX,
  type MapPanState,
} from '@/lib/map-projection';
import { esriStreetTileUrl } from '@/lib/tile-map';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const PIN_SIZE = 32;

const TILE_SIZE = MAP_TILE_SIZE;
const BASE_ZOOM = MAP_BASE_ZOOM;
const BASE_TILE_X = MAP_BASE_TILE_X;
const BASE_TILE_Y = MAP_BASE_TILE_Y;
const BUFFER = 3;

function calcTiles(state: MapPanState, width: number, height: number) {
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
      tiles.push({
        key: `${zoom}-${tx}-${ty}`,
        url: esriStreetTileUrl(zoom, tx, ty),
        posX: width / 2 - subX + dx * TILE_SIZE,
        posY: height / 2 - subY + dy * TILE_SIZE,
      });
    }
  }
  return tiles;
}

function centerOnLatLon(lat: number, lon: number, zoom: number): MapPanState {
  const zoomScale = Math.pow(2, zoom - BASE_ZOOM);
  const px = lonToTileX(lon, zoom);
  const py = latToTileY(lat, zoom);
  const panX = (BASE_TILE_X * zoomScale - px) * TILE_SIZE;
  const panY = (BASE_TILE_Y * zoomScale - py) * TILE_SIZE;
  return { zoom, panX, panY };
}

interface Props {
  latitude: number;
  longitude: number;
  isDark: boolean;
  zoom?: number;
}

export default function TrailTileMapPreview({ latitude, longitude, isDark, zoom = 14 }: Props) {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;
  const [size, setSize] = useState({ w: 1, h: 1 });

  const mapState = useMemo(
    () => centerOnLatLon(latitude, longitude, zoom),
    [latitude, longitude, zoom],
  );

  const tiles = useMemo(
    () => (size.w > 0 && size.h > 0 ? calcTiles(mapState, size.w, size.h) : []),
    [mapState, size.w, size.h],
  );

  const pin = useMemo(() => {
    if (size.w <= 0 || size.h <= 0) return { left: 0, top: 0 };
    const { left, top } = latLonToMapPixel(latitude, longitude, mapState, size.w, size.h);
    return {
      left: left - PIN_SIZE / 2,
      top: top - PIN_SIZE,
    };
  }, [latitude, longitude, mapState, size.w, size.h]);

  return (
    <View
      style={styles.fill}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0 && (width !== size.w || height !== size.h)) {
          setSize({ w: width, h: height });
        }
      }}>
      {tiles.map((t) => (
        <Image
          key={t.key}
          source={t.url}
          style={[styles.tile, { left: t.posX, top: t.posY }]}
          cachePolicy="memory-disk"
          transition={0}
        />
      ))}
      <View style={[styles.pinHost, { left: pin.left, top: pin.top }]} pointerEvents="none">
        <Ionicons name="location" size={PIN_SIZE} color={tint} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e8e4dc',
    overflow: 'hidden',
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  pinHost: {
    position: 'absolute',
    zIndex: 10,
  },
});
