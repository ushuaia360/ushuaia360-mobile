import AsyncStorage from '@react-native-async-storage/async-storage';

export type RecordedLatLng = { latitude: number; longitude: number };

const key = (trailId: string) => `recorded_trail_path_v1_${trailId}`;

export async function saveRecordedPath(trailId: string, path: RecordedLatLng[]): Promise<void> {
  if (!trailId || path.length < 2) return;
  await AsyncStorage.setItem(key(trailId), JSON.stringify(path));
}

export async function loadRecordedPath(trailId: string): Promise<RecordedLatLng[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key(trailId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const valid = parsed.filter(
      (p): p is RecordedLatLng =>
        p != null && typeof p.latitude === 'number' && typeof p.longitude === 'number',
    );
    return valid.length >= 2 ? valid : null;
  } catch {
    return null;
  }
}
