import OfflineHomePlaceholder from '@/components/home/offline-home-placeholder';
import ListHome from '@/components/home/list-home';
import MapHome from '@/components/home/map-home';
import { useNetworkReachable } from '@/hooks/use-network-reachable';
import { useHomeStore } from '@/store/home-store';

export default function HomeScreen() {
  const { mode } = useHomeStore();
  const reachable = useNetworkReachable();

  if (reachable !== true) {
    return <OfflineHomePlaceholder />;
  }

  return mode === 'map' ? <MapHome /> : <ListHome />;
}
