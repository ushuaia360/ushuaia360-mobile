import { useHomeStore } from '@/store/home-store';
import MapHome from '@/components/home/map-home';
import ListHome from '@/components/home/list-home';

export default function HomeScreen() {
  const { mode } = useHomeStore();
  return mode === 'map' ? <MapHome /> : <ListHome />;
}
