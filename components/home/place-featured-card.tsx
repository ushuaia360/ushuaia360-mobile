import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import TrailImage from './trail-image';
import { toTitleCase } from '@/lib/title-case';
import { formatPlaceCategoryLabel } from '@/lib/place-category-map';
import type { FeaturedPlace } from '@/store/trails-store';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  place: FeaturedPlace;
  onPress?: (place: FeaturedPlace) => void;
}

export default function PlaceFeaturedCard({ place, onPress }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#2a2a2a' : '#F7F9FC',
          borderColor: isDark ? '#3a3a3a' : '#EDF0F5',
        },
      ]}
      onPress={() => onPress?.(place)}
      activeOpacity={0.82}>

      <TrailImage uri={place.thumbnail_url ?? undefined} style={styles.image} contentFit="cover" />

      <View style={styles.info}>
        <ThemedText style={styles.name} numberOfLines={1}>
          {toTitleCase(place.name ?? 'Punto turístico')}
        </ThemedText>

        <ThemedText style={[styles.category, { color: colors.icon }]} numberOfLines={1}>
          {formatPlaceCategoryLabel(place.category)}
        </ThemedText>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={colors.tint} />
          <ThemedText style={styles.metaText} numberOfLines={1}>
            {[place.region, place.country].filter(Boolean).join(' · ') || 'Ushuaia'}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: 90,
    height: 100,
  },
  info: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 4,
    justifyContent: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  category: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '400',
  },
});
