/**
 * Misma geometría de tiles y límites que `components/home/map-home.tsx`.
 */
import {
  MAP_BASE_TILE_X,
  MAP_BASE_TILE_Y,
  MAP_BASE_ZOOM,
  MAP_TILE_SIZE,
  centerMapOnLatLon,
  latLonToMapPixel,
  latToTileY,
  lonToTileX,
  type MapPanState,
} from '@/lib/map-projection';

export const TILE_BUFFER = 4;

export const TDF_BOUNDS = {
  minLat: -55.05,
  maxLat: -54.55,
  minLon: -68.85,
  maxLon: -68.15,
} as const;

const BASE_ZOOM = MAP_BASE_ZOOM;
const TILE_SIZE = MAP_TILE_SIZE;
const BASE_TILE_X = MAP_BASE_TILE_X;
const BASE_TILE_Y = MAP_BASE_TILE_Y;

export function clampPanToTdf(state: MapPanState): MapPanState {
  const { zoom, panX, panY } = state;
  const zoomScale = Math.pow(2, zoom - BASE_ZOOM);

  const minTileX = lonToTileX(TDF_BOUNDS.minLon, zoom);
  const maxTileX = lonToTileX(TDF_BOUNDS.maxLon, zoom);
  const minTileY = latToTileY(TDF_BOUNDS.maxLat, zoom);
  const maxTileY = latToTileY(TDF_BOUNDS.minLat, zoom);

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

/**
 * Esri ArcGIS Online: servicios públicos sin API key (mismo proveedor que ya se usaba para la
 * capa satelital). Reemplaza los basemaps de CartoDB, que ahora exigen key y marcan de agua
 * ("API KEY REQUIRED") los pedidos sin autenticar.
 */
const ESRI_SERVICES_BASE = 'https://server.arcgisonline.com/ArcGIS/rest/services';
export const ESRI_IMAGERY_TILE_BASE = `${ESRI_SERVICES_BASE}/World_Imagery/MapServer/tile`;
const ESRI_STREET_TILE_BASE = `${ESRI_SERVICES_BASE}/Canvas/World_Light_Gray_Base/MapServer/tile`;

/** Esquema de tesela Esri: `{nivel}/{fila}/{columna}` = z/y/x, sin extensión. */
function esriTileUrl(base: string, zoom: number, tx: number, ty: number): string {
  return `${base}/${zoom}/${ty}/${tx}`;
}

/** Calle: gris minimalista, mismo basemap en claro y oscuro — la app no tiene un tema oscuro real que atender. */
export function esriStreetTileUrl(zoom: number, tx: number, ty: number): string {
  return esriTileUrl(ESRI_STREET_TILE_BASE, zoom, tx, ty);
}

/** Satélite. */
export function esriImageryTileUrl(zoom: number, tx: number, ty: number): string {
  return esriTileUrl(ESRI_IMAGERY_TILE_BASE, zoom, tx, ty);
}

export function calcTilesLikeHome(
  state: MapPanState,
  width: number,
  height: number,
  tileUrl: (zoom: number, tx: number, ty: number) => string,
): { key: string; url: string; posX: number; posY: number }[] {
  const { zoom, panX, panY } = state;
  const zoomScale = Math.pow(2, zoom - BASE_ZOOM);

  const worldX = BASE_TILE_X * zoomScale - panX / TILE_SIZE;
  const worldY = BASE_TILE_Y * zoomScale - panY / TILE_SIZE;

  const centerX = Math.floor(worldX);
  const centerY = Math.floor(worldY);
  const subX = (worldX - centerX) * TILE_SIZE;
  const subY = (worldY - centerY) * TILE_SIZE;

  const halfX = Math.ceil(width / 2 / TILE_SIZE) + TILE_BUFFER;
  const halfY = Math.ceil(height / 2 / TILE_SIZE) + TILE_BUFFER;
  const maxTile = Math.pow(2, zoom) - 1;

  const tiles: { key: string; url: string; posX: number; posY: number }[] = [];
  for (let dy = -halfY; dy <= halfY; dy++) {
    for (let dx = -halfX; dx <= halfX; dx++) {
      const tx = centerX + dx;
      const ty = centerY + dy;
      if (tx < 0 || ty < 0 || tx > maxTile || ty > maxTile) continue;
      tiles.push({
        key: `${zoom}-${tx}-${ty}`,
        url: tileUrl(zoom, tx, ty),
        posX: width / 2 - subX + dx * TILE_SIZE,
        posY: height / 2 - subY + dy * TILE_SIZE,
      });
    }
  }
  return tiles;
}

const FIT_MIN_ZOOM = 11;
const FIT_MAX_ZOOM = 18;

/**
 * Igual que fitMapStateToCoordinates pero valida con el pan ya acotado a TDF.
 * Si primero ajustamos y luego clampeamos, el viewport real puede dejar la ruta fuera de cuadro.
 */
export function fitMapStateToCoordinatesInTdf(
  coords: { latitude: number; longitude: number }[],
  width: number,
  height: number,
  padding = 20,
): MapPanState {
  if (!coords.length || width < 32 || height < 32) {
    return clampPanToTdf({ zoom: MAP_BASE_ZOOM, panX: 0, panY: 0 });
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
    const state = clampPanToTdf(centerMapOnLatLon(cLat, cLon, z));
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
  return clampPanToTdf(centerMapOnLatLon(cLat, cLon, FIT_MIN_ZOOM));
}
