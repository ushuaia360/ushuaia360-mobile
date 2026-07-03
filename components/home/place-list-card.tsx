import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BackendPlaceListItem } from '@/store/trails-store';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import TrailImage from './trail-image';
import { toTitleCase } from '@/lib/title-case';
import { formatPlaceCategoryLabel, getPlaceCategoryVisual } from '@/lib/place-category-map';

interface Props {
  place: BackendPlaceListItem;
  onPress?: (place: BackendPlaceListItem) => void;
}

export default function PlaceListCard({ place, onPress }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const categoryVisual = getPlaceCategoryVisual(place.category, isDark);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}
      onPress={() => onPress?.(place)}
      activeOpacity={0.92}>

      <View style={styles.imageContainer}>
        <TrailImage uri={place.thumbnail_url ?? undefined} style={styles.image} contentFit="cover" />
        {place.category && (
          <View style={[styles.badge, { backgroundColor: categoryVisual.accent }]}>
            <ThemedText style={styles.badgeText}>
              {formatPlaceCategoryLabel(place.category)}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <ThemedText style={styles.name} numberOfLines={1}>{toTitleCase(place.name ?? 'Punto turístico')}</ThemedText>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={colors.icon} />
          <ThemedText style={[styles.meta, { color: colors.icon }]} numberOfLines={1}>
            {[place.region, place.country].filter(Boolean).join(' · ') || 'Ushuaia'}
          </ThemedText>
        </View>
        {place.description ? (
          <ThemedText style={[styles.description, { color: colors.icon }]} numberOfLines={2}>
            {place.description}
          </ThemedText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  info: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 6,
  },
  name: {
    fontSize: 17,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    fontSize: 14,
    flex: 1,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
