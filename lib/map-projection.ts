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
