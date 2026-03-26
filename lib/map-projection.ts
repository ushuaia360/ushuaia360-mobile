/**
 * Proyección lat/lon ↔ posición en pantalla del mapa de tiles (Web Mercator).
 * Debe usar los mismos BASE_TILE_*, BASE_ZOOM y TILE_SIZE que `map-home.tsx`.
 */
export const MAP_TILE_SIZE = 256;
export const MAP_BASE_ZOOM = 12;
export const MAP_BASE_TILE_X = 1270.8636;
export const MAP_BASE_TILE_Y = 2796.524;

export interface MapPanState {
  zoom: number;
  panX: number;
  panY: number;
}

export function lonToTileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

export function latToTileY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

/**
 * Posición top-left del pin (centro del pin en left+PIN_OFFSET, top+PIN_OFFSET).
 */
/** Inversa de `lonToTileX` (coordenada de tile continua → longitud). */
export function tileXToLon(px: number, zoom: number): number {
  return (px / Math.pow(2, zoom)) * 360 - 180;
}

/** Inversa de `latToTileY` (coordenada de tile continua → latitud, Web Mercator). */
export function tileYToLat(py: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * py) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

/** Tocaste la pantalla del mapa de tiles → lat/lon bajo el dedo. */
export function mapPixelToLatLon(
  left: number,
  top: number,
  state: MapPanState,
  width: number,
  height: number,
): { latitude: number; longitude: number } {
  const { zoom, panX, panY } = state;
  const zoomScale = Math.pow(2, zoom - MAP_BASE_ZOOM);
  const worldX = MAP_BASE_TILE_X * zoomScale - panX / MAP_TILE_SIZE;
  const worldY = MAP_BASE_TILE_Y * zoomScale - panY / MAP_TILE_SIZE;
  const px = worldX + (left - width / 2) / MAP_TILE_SIZE;
  const py = worldY + (top - height / 2) / MAP_TILE_SIZE;
  return {
    latitude: tileYToLat(py, zoom),
    longitude: tileXToLon(px, zoom),
  };
}

export function latLonToMapPixel(
  lat: number,
  lon: number,
  state: MapPanState,
  width: number,
  height: number,
): { left: number; top: number } {
  const { zoom, panX, panY } = state;
  const zoomScale = Math.pow(2, zoom - MAP_BASE_ZOOM);
  const worldX = MAP_BASE_TILE_X * zoomScale - panX / MAP_TILE_SIZE;
  const worldY = MAP_BASE_TILE_Y * zoomScale - panY / MAP_TILE_SIZE;
  const px = lonToTileX(lon, zoom);
  const py = latToTileY(lat, zoom);
  return {
    left: width / 2 + (px - worldX) * MAP_TILE_SIZE,
    top: height / 2 + (py - worldY) * MAP_TILE_SIZE,
  };
}

const FIT_MIN_ZOOM = 11;
const FIT_MAX_ZOOM = 18;

/** Centra el viewport de tiles en lat/lon al zoom dado (mismo sistema que `map-home`). */
export function centerMapOnLatLon(lat: number, lon: number, zoom: number): MapPanState {
  const zoomScale = Math.pow(2, zoom - MAP_BASE_ZOOM);
  const px = lonToTileX(lon, zoom);
  const py = latToTileY(lat, zoom);
  const panX = (MAP_BASE_TILE_X * zoomScale - px) * MAP_TILE_SIZE;
  const panY = (MAP_BASE_TILE_Y * zoomScale - py) * MAP_TILE_SIZE;
  return { zoom, panX, panY };
}

/**
 * Zoom y pan para que todos los puntos entren en el rectángulo (padding incluido).
 */
export function fitMapStateToCoordinates(
  coords: { latitude: number; longitude: number }[],
  width: number,
  height: number,
  padding = 20,
): MapPanState {
  if (!coords.length || width < 32 || height < 32) {
    return { zoom: MAP_BASE_ZOOM, panX: 0, panY: 0 };
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
  const cLat = (minLat + maxLat) / 2;
  const cLon = (minLon + maxLon) / 2;

  for (let z = FIT_MAX_ZOOM; z >= FIT_MIN_ZOOM; z--) {
    const state = centerMapOnLatLon(cLat, cLon, z);
    let ok = true;
    for (const c of coords) {
      const { left, top } = latLonToMapPixel(c.latitude, c.longitude, state, width, height);
      if (left < padding || left > width - padding || top < padding || top > height - padding) {
        ok = false;
        break;
      }
    }
    if (ok) return state;
  }
  return centerMapOnLatLon(cLat, cLon, FIT_MIN_ZOOM);
}
