import { Trail } from '@/constants/mock-trails';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { redirectToLogin } from '@/lib/needAuth';
import { useAuthStore } from '@/store/auth-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import TrailImage from './trail-image';
import { toTitleCase } from '@/lib/title-case';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const IMAGE_WIDTH = CARD_WIDTH - 20;
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

function AnimatedDot({ active }: { active: boolean }) {
  const width = useSharedValue(active ? 18 : 6);

  useEffect(() => {
    width.value = withSpring(active ? 18 : 6, { damping: 20, stiffness: 300, mass: 0.6 });
  }, [active]);

  const style = useAnimatedStyle(() => ({
    height: 6,
    width: width.value,
    borderRadius: 3,
    backgroundColor: active ? '#fff' : 'rgba(255,255,255,0.55)',
  }));

  return <Animated.View style={style} />;
}

const DIFFICULTY_COLOR: Record<Trail['difficulty'], string> = {
  Fácil:   '#34c759',
  Media:   '#ff9500',
  Difícil: '#ff3b30',
};

interface Props {
  trail: Trail;
  onPress?: (trail: Trail) => void;
  onMapPress?: (trail: Trail) => void;
}

function TrailListCard({ trail, onPress, onMapPress }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const diffColor = DIFFICULTY_COLOR[trail.difficulty];

  const token = useAuthStore((s) => s.token);
  const pathname = usePathname();
  const liked = useFavoritesStore((s) => s.isFavorite(trail.id));
  const toggleTrailFavorite = useFavoritesStore((s) => s.toggleTrail);

  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const images = (trail.images?.length ? trail.images : [trail.image].filter(Boolean)) as string[];
  const displayImages = images.length > 0 ? images : [''];
  const heartRotate = useSharedValue(0);
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${heartRotate.value}deg` }],
  }));

  const w = (deg: number, ms: number) =>
    withTiming(deg, { duration: ms, easing: Easing.inOut(Easing.sin) });

  const onHeartPress = async () => {
    if (!token) {
      redirectToLogin(pathname || '/(tabs)');
      return;
    }
    const next = !liked;
    heartRotate.value = withSequence(
      w(-18, 120), w(14, 100), w(-10, 90), w(6, 80), w(-3, 70), w(0, 60),
    );
    await toggleTrailFavorite(trail.id, token, next);
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}
      onPress={() => onPress?.(trail)}
      activeOpacity={0.92}>

      {/* Carousel */}
      <View style={styles.imageContainer}>
        <FlatList
          ref={flatListRef}
          data={displayImages}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / IMAGE_WIDTH);
            if (index !== activeIndex) setActiveIndex(index);
          }}
          renderItem={({ item }) => (
            <TrailImage uri={item || undefined} style={styles.image} contentFit="cover" />
          )}
        />

        {/* Difficulty — top left */}
        <View style={[styles.diffBadge, { backgroundColor: diffColor, position: 'absolute', top: 10, left: 10 }]}>
          <ThemedText style={styles.diffText}>{trail.difficulty}</ThemedText>
        </View>

        {/* Heart */}
        <TouchableOpacity
          style={[styles.heartBtn, { backgroundColor: liked ? '#fff' : 'rgba(0,0,0,0.3)' }]}
          hitSlop={12}
          activeOpacity={0.8}
          onPress={onHeartPress}>
          <Animated.View style={heartStyle}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={20}
              color={liked ? '#ff3b30' : '#fff'}
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Dots */}
        {displayImages.length > 1 && (
          <View style={styles.dots}>
            {displayImages.map((_, i) => (
              <AnimatedDot key={i} active={i === activeIndex} />
            ))}
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>

        {/* Name + rating */}
        <View style={styles.nameRow}>
          <ThemedText style={styles.name} numberOfLines={1}>{toTitleCase(trail.name)}</ThemedText>
          <View style={styles.ratingBlock}>
            <Ionicons name="star" size={13} color={isDark ? '#fff' : '#000'} />
            <ThemedText style={styles.ratingText}>{trail.rating.toFixed(1)} ({trail.reviewCount})</ThemedText>
          </View>
        </View>

        {/* Type + difficulty */}
        <View style={styles.metaRow}>
          <ThemedText style={[styles.type, { color: colors.icon }]}>{trail.type}</ThemedText>
          <View style={styles.dot} />
          <ThemedText style={[styles.type, { color: colors.icon }]}>
            Dificultad {trail.difficulty.toLowerCase()}
          </ThemedText>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="map-outline" size={13} color={colors.icon} />
            <ThemedText style={[styles.statText, { color: colors.icon }]}>{trail.distance}</ThemedText>
          </View>
          <View style={styles.statDot} />
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={13} color={colors.icon} />
            <ThemedText style={[styles.statText, { color: colors.icon }]}>{trail.duration}</ThemedText>
          </View>
        </View>

      </View>
    </TouchableOpacity>
  );
}

export default TrailListCard;

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
    width: IMAGE_WIDTH,
    height: 200,
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
  },
  ratingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  type: {
    fontSize: 14,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  diffBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  diffText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
});
