import { useNetworkReachable } from '@/hooks/use-network-reachable';
import { flushPendingTrailCompletions } from '@/lib/pending-trail-completion';
import { useAuthStore } from '@/store/auth-store';
import { useEffect } from 'react';

/**
 * Sube finalizaciones de recorrido pendientes cuando vuelve la conexión al API.
 */
export default function PendingTrailCompletionSync() {
  const reachable = useNetworkReachable();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (reachable !== true || !token) return;
    void flushPendingTrailCompletions(token);
  }, [reachable, token]);

  return null;
}
