import type { User } from '@/store/auth-store';
import { router } from 'expo-router';
import { hasPremiumAccess } from './offline-download-gate';

/** Navega al detalle de un sendero, o al paywall si el usuario no tiene acceso premium. */
export function openTrail(trailId: string, user: User | null, isPro: boolean): void {
  if (!hasPremiumAccess(user, isPro)) {
    router.push('/premium');
    return;
  }
  router.push({ pathname: '/trails/[id]', params: { id: trailId } } as any);
}
