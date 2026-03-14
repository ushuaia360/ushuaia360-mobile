/**
 * URL base del backend.
 *
 * Configurar en .env.local:
 *   EXPO_PUBLIC_API_URL=http://localhost:5050/api/v1      ← iOS Simulator (Xcode)
 *   EXPO_PUBLIC_API_URL=http://10.0.2.2:5050/api/v1      ← Android Emulator
 *   EXPO_PUBLIC_API_URL=http://192.168.x.x:5050/api/v1   ← Dispositivo físico (tu IP local)
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5050/api/v1';
