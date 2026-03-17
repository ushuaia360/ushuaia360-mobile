import { Trail } from '@/constants/mock-trails';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import TrailImage from './trail-image';

const DIFFICULTY_COLOR: Record<Trail['difficulty'], string> = {
  Fácil: '#34c759',
  Media: '#ff9500',
  Difícil: '#ff3b30',
};

interface Props {
  trail: Trail;
  onPress?: (trail: Trail) => void;
}

export default function TrailFeaturedCard({ trail, onPress }: Props) {
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
      onPress={() => onPress?.(trail)}
      activeOpacity={0.82}>

      <TrailImage
        uri={trail.image || trail.images?.[0]}
        style={styles.image}
        contentFit="cover"
      />

      <View style={styles.info}>
        {/* Name + difficulty */}
        <View style={styles.topRow}>
          <ThemedText style={styles.name} numberOfLines={1}>{trail.name}</ThemedText>
          <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLOR[trail.difficulty] + '22' }]}>
            <ThemedText style={[styles.difficultyText, { color: DIFFICULTY_COLOR[trail.difficulty] }]}>
              {trail.difficulty}
            </ThemedText>
          </View>
        </View>

        {/* Type label */}
        <ThemedText style={[styles.type, { color: colors.icon }]}>{trail.type}</ThemedText>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <IconSymbol name="walk-outline" size={12} color={colors.tint} />
            <ThemedText style={styles.statText}>{trail.distance}</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? '#3a3a3a' : '#ddd' }]} />
          <View style={styles.stat}>
            <IconSymbol name="time-outline" size={12} color={colors.tint} />
            <ThemedText style={styles.statText}>{trail.duration}</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? '#3a3a3a' : '#ddd' }]} />
          <View style={styles.stat}>
            <IconSymbol name="trending-up-outline" size={12} color={colors.tint} />
            <ThemedText style={styles.statText}>{trail.elevationGain}</ThemedText>
          </View>
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
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  type: {
    fontSize: 12,
    marginTop: -2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '400',
  },
  statDivider: {
    width: 1,
    height: 12,
  },
});
