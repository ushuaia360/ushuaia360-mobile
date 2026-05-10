import type { User } from '@/store/auth-store';

/** Cuando sea sólo premium: devolver `Boolean(user?.is_premium)`. */
export function canDownloadForOffline(user: User | null): boolean {
  void user;
  return true;
}
