import { IconSymbol } from '@/components/ui/icon-symbol';
import { CARD_PADDING_TOP } from '@/constants/search-layout';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHomeStore } from '@/store/home-store';
import { Image } from 'expo-image';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchBar from './search-bar';
import TrailsBottomSheet from './trails-bottom-sheet';

const BASE_ZOOM = 12;
const TILE_SIZE = 256;
// Ushuaia city center: lat=-54.8019, lon=-68.3030 (Web Mercator / OSM formula at zoom 12)
const BASE_TILE_X = 1270.8636;
const BASE_TILE_Y = 2796.524;
const BUFFER = 4;
const MIN_ZOOM = 11;
const MAX_ZOOM = 18;

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

function lonToTileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function latToTileY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
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
    : 'https://a.basemaps.cartocdn.com/light_all';

  const [committed, setCommitted] = useState<MapState>({ zoom: BASE_ZOOM, panX: 0, panY: 0 });
  const { searchOpen, setSearchOpen, setMapPanning } = useHomeStore();

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
    () => calcTiles(committed, width, height, baseUrl),
    [committed.zoom, committed.panX, committed.panY, width, height, baseUrl],
  );

  const zoomIn = () =>
    setCommitted((p) => {
      if (p.zoom >= MAX_ZOOM) return p;
      const newState = clampPan({ zoom: p.zoom + 1, panX: p.panX * 2, panY: p.panY * 2 });
      committedRef.current = newState;
      return newState;
    });

  const zoomOut = () =>
    setCommitted((p) => {
      if (p.zoom <= MIN_ZOOM) return p;
      const newState = clampPan({ zoom: p.zoom - 1, panX: p.panX / 2, panY: p.panY / 2 });
      committedRef.current = newState;
      return newState;
    });

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
            source={t.url}
            style={[styles.tile, { left: t.posX, top: t.posY }]}
            cachePolicy="memory-disk"
            transition={0}
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
        <View style={[styles.zoomButtons, { bottom: bottom + (Platform.OS === 'android' ? 268 : 240) }]} pointerEvents="box-none">
          <TouchableOpacity style={styles.zoomBtn} onPress={zoomIn} activeOpacity={0.8}>
            <IconSymbol name="add" size={18} color="rgba(0,0,0,0.5)" />
          </TouchableOpacity>
          <View style={styles.zoomDivider} />
          <TouchableOpacity style={styles.zoomBtn} onPress={zoomOut} activeOpacity={0.8}>
            <IconSymbol name="remove-outline" size={18} color="rgba(0,0,0,0.5)" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.locationButton, { bottom: bottom + (Platform.OS === 'android' ? 188 : 160), borderColor: colors.tint }]}
          activeOpacity={0.8}>
          <IconSymbol name="location" size={20} color={colors.tint} />
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
