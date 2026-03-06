import { Trail } from '@/constants/mock-trails';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

const DIFFICULTY_COLOR: Record<Trail['difficulty'], string> = {
  Fácil: '#34c759',
  Media: '#ff9500',
  Difícil: '#ff3b30',
};

interface Props {
  trail: Trail;
  onPress?: (trail: Trail) => void;
  onMapPress?: (trail: Trail) => void;
}

export default function TrailListCard({ trail, onPress, onMapPress }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1c1c1e' : '#fff',
          borderColor: 'rgba(0,0,0,0.2)',
        },
      ]}
      onPress={() => onPress?.(trail)}
      activeOpacity={0.82}>

      {/* Header: icon + title + bookmark */}
      <View style={styles.header}>
        <View style={[styles.typeIcon, { backgroundColor: colors.tint + '18' }]}>
          <IconSymbol name="figure.hiking" size={22} color={colors.tint} />
        </View>
        <View style={styles.titleBlock}>
          <ThemedText style={styles.name} numberOfLines={2}>{trail.name}</ThemedText>
          <View style={styles.metaRow}>
            <ThemedText style={[styles.type, { color: colors.icon }]}>{trail.type}</ThemedText>
            <View style={[styles.difficultyPill, { backgroundColor: DIFFICULTY_COLOR[trail.difficulty] + '20' }]}>
              <ThemedText style={[styles.difficultyText, { color: DIFFICULTY_COLOR[trail.difficulty] }]}>
                {trail.difficulty}
              </ThemedText>
            </View>
          </View>
        </View>
        <TouchableOpacity hitSlop={12} activeOpacity={0.7}>
          <IconSymbol name="heart" size={20} color={isDark ? '#555' : '#ccc'} />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]} />

      {/* Stats + image */}
      <View style={styles.body}>
        <View style={styles.stats}>
          <View style={styles.statRow}>
            <ThemedText style={[styles.statLabel, { color: colors.icon }]}>Distancia</ThemedText>
            <ThemedText style={styles.statValue}>{trail.distance}</ThemedText>
          </View>
          <View style={styles.statRow}>
            <ThemedText style={[styles.statLabel, { color: colors.icon }]}>Desnivel</ThemedText>
            <ThemedText style={styles.statValue}>{trail.elevationGain}</ThemedText>
          </View>
          <View style={styles.statRow}>
            <ThemedText style={[styles.statLabel, { color: colors.icon }]}>Duración</ThemedText>
            <ThemedText style={styles.statValue}>{trail.duration}</ThemedText>
          </View>
        </View>
        <Image source={{ uri: trail.image }} style={styles.image} resizeMode="cover" />
      </View>

      {/* Footer: rating + CTA */}
      <View style={[styles.footer, { borderTopColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
        <View style={styles.ratingRow}>
          <IconSymbol name="star.fill" size={13} color={colors.accent} />
          <ThemedText style={styles.rating}>{trail.rating.toFixed(1)}</ThemedText>
          <ThemedText style={[styles.reviewCount, { color: colors.icon }]}>
            · {trail.reviewCount} reseñas
          </ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.mapButton, { backgroundColor: colors.tint }]}
          onPress={() => onMapPress?.(trail)}
          activeOpacity={0.85}>
          <IconSymbol name="map.fill" size={13} color="#fff" />
          <ThemedText style={styles.mapButtonText}>Ver Mapa</ThemedText>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    paddingBottom: 12,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: 5,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  type: {
    fontSize: 13,
  },
  difficultyPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  body: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  stats: {
    flex: 1,
    gap: 10,
    justifyContent: 'center',
  },
  statRow: {
    gap: 1,
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  image: {
    width: 110,
    height: 90,
    borderRadius: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '700',
  },
  reviewCount: {
    fontSize: 12,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
