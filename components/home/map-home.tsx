import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import SearchBar from './search-bar';
import TrailsBottomSheet from './trails-bottom-sheet';
import { useHomeStore } from '@/store/home-store';
import { CARD_PADDING_TOP } from '@/constants/search-layout';

// Ushuaia: lat=-54.8019, lon=-68.3030
// Fractional tile position at zoom 12:
//   x = (lon+180)/360 * 2^12 = 1270.790
//   y = 0.68340 * 2^12       = 2799.870
const BASE_ZOOM = 12;
const TILE_SIZE = 256;
const BASE_TILE_X = 1270.79;
const BASE_TILE_Y = 2799.87;
const BUFFER = 4;
const MIN_ZOOM = 5;
const MAX_ZOOM = 18;

interface MapState {
  zoom: number;
  panX: number;
  panY: number;
}

function calcTiles(state: MapState, width: number, height: number, baseUrl: string) {
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
        url: `${baseUrl}/${zoom}/${tx}/${ty}.png`,
        posX: width / 2 - subX + dx * TILE_SIZE,
        posY: height / 2 - subY + dy * TILE_SIZE,
      });
    }
  }
  return tiles;
}

export default function MapHome() {
  const { top, bottom } = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const baseUrl = isDark
    ? 'https://a.basemaps.cartocdn.com/dark_all'
    : 'https://tile.openstreetmap.org';

  const [committed, setCommitted] = useState<MapState>({ zoom: BASE_ZOOM, panX: 0, panY: 0 });
  const { searchOpen, setSearchOpen } = useHomeStore();

  // Animated values for smooth gesture feedback
  const animPanX = useRef(new Animated.Value(0)).current;
  const animPanY = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(1)).current;

  // Gesture refs
  const gesture = useRef({
    isPinching: false,
    pinchStartDist: 0,
    pinchCurrentScale: 1,
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
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
          animPanX.setOffset((animPanX as any)._value);
          animPanY.setOffset((animPanY as any)._value);
          animPanX.setValue(0);
          animPanY.setValue(0);
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2 && gesture.current.isPinching) {
          const dist = Math.hypot(
            touches[1].pageX - touches[0].pageX,
            touches[1].pageY - touches[0].pageY,
          );
          const scale = dist / gesture.current.pinchStartDist;
          gesture.current.pinchCurrentScale = scale;
          animScale.setValue(scale);
        } else if (!gesture.current.isPinching) {
          animPanX.setValue(gestureState.dx);
          animPanY.setValue(gestureState.dy);
        }
      },

      onPanResponderRelease: () => {
        if (gesture.current.isPinching) {
          const rawScale = gesture.current.pinchCurrentScale;
          const deltaZoom = Math.round(Math.log2(rawScale));
          animScale.setValue(1);
          gesture.current.isPinching = false;

          setCommitted((prev) => {
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom + deltaZoom));
            const panMult = Math.pow(2, newZoom - prev.zoom);
            return { zoom: newZoom, panX: prev.panX * panMult, panY: prev.panY * panMult };
          });

          animPanX.setOffset(0);
          animPanY.setOffset(0);
          animPanX.setValue(0);
          animPanY.setValue(0);
        } else {
          animPanX.flattenOffset();
          animPanY.flattenOffset();
          const dx = (animPanX as any)._value;
          const dy = (animPanY as any)._value;
          animPanX.setValue(0);
          animPanY.setValue(0);
          animPanX.setOffset(0);
          animPanY.setOffset(0);

          setCommitted((prev) => ({
            ...prev,
            panX: prev.panX + dx,
            panY: prev.panY + dy,
          }));
        }
      },
    }),
  ).current;

  const tiles = calcTiles(committed, width, height, baseUrl);

  const zoomIn = () =>
    setCommitted((p) =>
      p.zoom < MAX_ZOOM ? { zoom: p.zoom + 1, panX: p.panX * 2, panY: p.panY * 2 } : p,
    );

  const zoomOut = () =>
    setCommitted((p) =>
      p.zoom > MIN_ZOOM ? { zoom: p.zoom - 1, panX: p.panX / 2, panY: p.panY / 2 } : p,
    );

  return (
    <View style={styles.container}>
      {/* Tile layer */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            transform: [
              { translateX: animPanX },
              { translateY: animPanY },
              { scale: animScale },
            ],
          },
        ]}
        {...panResponder.panHandlers}>
        {tiles.map((t) => (
          <Image
            key={t.key}
            source={{ uri: t.url }}
            style={[styles.tile, { left: t.posX, top: t.posY }]}
            fadeDuration={0}
          />
        ))}
      </Animated.View>

      {/* Search bar */}
      <View style={[styles.searchOverlay, { paddingTop: top + CARD_PADDING_TOP }]}>
        <SearchBar
          onPress={() => setSearchOpen(true)}
          isActive={searchOpen}
        />
      </View>

      {/* Zoom buttons, location, bottom sheet */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <View style={[styles.zoomButtons, { bottom: bottom + 300 }]} pointerEvents="box-none">
          <TouchableOpacity style={styles.zoomBtn} onPress={zoomIn} activeOpacity={0.8}>
            <IconSymbol name="plus" size={18} color="rgba(0,0,0,0.5)" />
          </TouchableOpacity>
          <View style={styles.zoomDivider} />
          <TouchableOpacity style={styles.zoomBtn} onPress={zoomOut} activeOpacity={0.8}>
            <IconSymbol name="minus" size={18} color="rgba(0,0,0,0.5)" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.locationButton, { bottom: bottom + 220, borderColor: colors.tint }]}
          activeOpacity={0.8}>
          <IconSymbol name="location.fill" size={20} color={colors.tint} />
        </TouchableOpacity>

        <TrailsBottomSheet />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8e4dc',
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
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  zoomButtons: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  zoomBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 8,
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
});
