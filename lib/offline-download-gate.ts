import type { User } from '@/store/auth-store';

/** True when the user has an active Pro entitlement (live RevenueCat state or backend-confirmed). */
export function hasPremiumAccess(user: User | null, isPro: boolean): boolean {
  return isPro || Boolean(user?.is_premium);
}

/** Alias for offline-download call sites. */
export const canDownloadForOffline = hasPremiumAccess;
