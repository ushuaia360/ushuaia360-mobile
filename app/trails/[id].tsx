import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { redirectToLogin } from '@/lib/needAuth';
import { useAuthStore } from '@/store/auth-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useTrailsStore } from '@/store/trails-store';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams, usePathname } from 'expo-router';
import { ComponentProps, useEffect, useMemo, useState } from 'react';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming, withSpring, interpolate, Extrapolation } from 'react-native-reanimated';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_WIDTH = SCREEN_WIDTH - 32;

const REVIEWS: { id: string; user: string; avatar: string; rating: number; date: Date; text: string }[] = [];

function relativeDate(date: Date): string {
  const DAY = 86400000;
  const days = Math.floor((Date.now() - date.getTime()) / DAY);
  if (days < 7) return days <= 1 ? 'Hace 1 día' : `Hace ${days} días`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`;
  const years = Math.floor(days / 365);
  return years === 1 ? 'Hace 1 año' : `Hace ${years} años`;
}

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

function starDist(rating: number): number[] {
  // returns [pct5, pct4, pct3, pct2, pct1]
  const r = rating / 5;
  const p5 = Math.round(r * r * 90 + 5);
  const p4 = Math.round((1 - r) * 25 + r * 6);
  const p3 = Math.round((1 - r) * 15 + 2);
  const p2 = Math.round((1 - r) * 8 + 1);
  const p1 = Math.max(0, 100 - p5 - p4 - p3 - p2);
  return [p5, p4, p3, p2, p1];
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Fácil: '#34c759',
  Media: '#ff9500',
  Difícil: '#ff3b30',
};

interface MetricProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  iconColor: string;
}

function Metric({ icon, label, value, iconColor }: MetricProps) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
    </View>
  );
}

export default function TrailDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { top } = useSafeAreaInsets();

  const { id } = useLocalSearchParams<{ id?: string }>();
  const trailId = typeof id === 'string' ? id : undefined;

  const { trails, featuredTrails, fetchTrails, loading } = useTrailsStore();
  const token = useAuthStore((s) => s.token);
  const pathname = usePathname();
  const trailFavorited = useFavoritesStore((s) => (trailId ? s.isFavorite(trailId) : false));
  const toggleTrailFavorite = useFavoritesStore((s) => s.toggleTrail);

  const [activeImage, setActiveImage] = useState(0);
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const topBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [80, 160], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [80, 160], [-10, 0], Extrapolation.CLAMP) }],
  }));

  const trail = useMemo(() => {
    if (!trailId) return undefined;
    return (
      trails.find((t) => t.id === trailId) ??
      featuredTrails.find((t) => t.id === trailId)
    );
  }, [trailId, trails, featuredTrails]);

  useEffect(() => {
    if (!trailId) return;
    if (trail) return;
    fetchTrails(true);
  }, [trailId, trail, fetchTrails]);

  const images = trail?.images?.length ? trail.images : trail?.image ? [trail.image] : [];
  const heroHeight = Math.round(GALLERY_WIDTH * 0.75) + top + 10;

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {!trailId ? (
        <View style={styles.center}>
          <ThemedText style={{ color: colors.icon }}>Trail inválido</ThemedText>
        </View>
      ) : !trail ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.tint} />
          <ThemedText style={{ marginTop: 10, color: colors.icon }}>
            {loading ? 'Cargando sendero…' : 'Buscando sendero…'}
          </ThemedText>
        </View>
      ) : (
        <>
        <Animated.FlatList
          data={[trail.id]}
          keyExtractor={(k) => k}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          renderItem={() => (
            <View>
              {/* Gallery + botones flotantes */}
              <View style={styles.galleryWrap}>
                <View style={[styles.gallery, { height: heroHeight, backgroundColor: isDark ? '#1c1c1e' : '#e0e4ea' }]}>
                  <FlatList
                    data={images}
                    keyExtractor={(_, i) => String(i)}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                      const index = Math.round(e.nativeEvent.contentOffset.x / GALLERY_WIDTH);
                      if (index !== activeImage) setActiveImage(index);
                    }}
                    scrollEventThrottle={16}
                    renderItem={({ item }) => (
                      <Image
                        source={{ uri: item }}
                        style={{ width: GALLERY_WIDTH, height: heroHeight }}
                        resizeMode="cover"
                      />
                    )}
                  />

                  {images.length > 1 && (
                    <View style={styles.dots}>
                      {images.map((_, i) => (
                        <AnimatedDot key={i} active={i === activeImage} />
                      ))}
                    </View>
                  )}
                </View>

                {/* Botones flotantes sobre la foto */}
                <View style={[styles.floatRow, { top: top - 40 }]} pointerEvents="box-none">
                  <TouchableOpacity
                    style={[styles.floatBtn, { backgroundColor: '#fff' }]}
                    onPress={() => router.back()}
                    hitSlop={12}
                    pointerEvents="auto">
                    <Ionicons name="chevron-back" size={22} color="#000" />
                  </TouchableOpacity>
                  <View style={styles.floatRightGroup}>
                    <TouchableOpacity
                      style={[styles.floatBtn, { backgroundColor: '#fff' }]}
                      onPress={() => Share.share({ message: `Mirá este sendero: ${trail.name}` })}
                      hitSlop={12}
                      pointerEvents="auto">
                      <Ionicons name="share-outline" size={20} color="#000" />
                    </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.floatBtn, { backgroundColor: '#fff' }, trailFavorited && styles.floatBtnLiked]}
                    onPress={async () => {
                      if (!token) {
                        redirectToLogin(pathname || '/(tabs)');
                        return;
                      }
                      await toggleTrailFavorite(trailId!, token, !trailFavorited);
                    }}
                    hitSlop={12}
                    pointerEvents="auto">
                    <Ionicons
                      name={trailFavorited ? 'heart' : 'heart-outline'}
                      size={20}
                      color={trailFavorited ? '#ff3b30' : '#000'}
                    />
                  </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Card unificada: nombre + métricas */}
              <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff', padding: 0, overflow: 'hidden' }]}>
                {/* Nombre + meta */}
                <View style={styles.nameSection}>
                  <ThemedText style={styles.name}>{trail.name}</ThemedText>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#000" />
                    <ThemedText style={[styles.ratingText, { color: '#000', fontWeight: '500' }]}>
                      {trail.rating.toFixed(1)}
                    </ThemedText>
                    <ThemedText style={[styles.ratingText, { color: colors.icon }]}>
                      ({trail.reviewCount})
                    </ThemedText>
                    <ThemedText style={[styles.ratingDot, { color: colors.icon }]}>·</ThemedText>
                    <Ionicons name="heart" size={16} color="#ff3b30" />
                    <ThemedText style={[styles.ratingText, { color: colors.icon }]}>
                      ({Math.round(trail.rating * 100)})
                    </ThemedText>
                  </View>
                </View>

                {/* Divisor */}
                <View style={[styles.cardDivider, { backgroundColor: isDark ? '#2a2a2a' : '#F2F4F7' }]} />

                {/* Métricas */}
                <View style={styles.metricsRow}>
                  <Metric icon="map-outline" label="Distancia" value={trail.distance} iconColor={colors.tint} />
                  <View style={[styles.metricSep, { backgroundColor: isDark ? '#2a2a2a' : '#EDF0F5' }]} />
                  <Metric icon="time-outline" label="Duración" value={trail.duration} iconColor={colors.tint} />
                  <View style={[styles.metricSep, { backgroundColor: isDark ? '#2a2a2a' : '#EDF0F5' }]} />
                  <Metric icon="trending-up-outline" label="Desnivel" value={trail.elevationGain} iconColor={colors.tint} />
                  <View style={[styles.metricSep, { backgroundColor: isDark ? '#2a2a2a' : '#EDF0F5' }]} />
                  <Metric
                    icon="flag-outline"
                    label="Dificultad"
                    value={trail.difficulty}
                    iconColor={DIFFICULTY_COLOR[trail.difficulty] ?? colors.icon}
                  />
                </View>

                {/* Descripción */}
                <ThemedText style={[styles.descInline, { color: colors.icon, paddingHorizontal: 16, paddingBottom: 20 }]}>
                  {trail.description?.trim() ? trail.description : ''}
                </ThemedText>

                {/* Mapa */}
                <View style={styles.mapSection}>
                  <View style={styles.mapWrap}>
                    <TouchableOpacity
                      style={styles.mapExpandBtn}
                      onPress={() =>
                        Linking.openURL(
                          `maps://?ll=${trail.coordinate.latitude},${trail.coordinate.longitude}&q=${encodeURIComponent(trail.name)}`,
                        )
                      }
                      pointerEvents="auto">
                      <Ionicons name="scan-outline" size={22} color="#000" />
                    </TouchableOpacity>
                    <MapView
                      provider={PROVIDER_DEFAULT}
                      style={styles.map}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      pitchEnabled={false}
                      rotateEnabled={false}
                      initialRegion={{
                        latitude: trail.coordinate.latitude,
                        longitude: trail.coordinate.longitude,
                        latitudeDelta: 0.04,
                        longitudeDelta: 0.04,
                      }}>
                      <Marker coordinate={trail.coordinate}>
                        <View style={styles.mapMarker}>
                          <Ionicons name="location" size={28} color={colors.tint} />
                        </View>
                      </Marker>
                    </MapView>
                  </View>
                </View>

                {/* Rating breakdown */}
                {REVIEWS.length > 0 && <View style={styles.ratingBreakdown}>
                  <View style={styles.rbLeft}>
                    <ThemedText style={[styles.rbScore, { color: colors.tint }]}>
                      {trail.rating.toFixed(1)}
                    </ThemedText>
                    <View style={styles.rbStars}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons
                          key={i}
                          name="star"
                          size={20}
                          color={i <= Math.round(trail.rating) ? '#FFB800' : '#D1D1D6'}
                        />
                      ))}
                    </View>
                  </View>
                  <View style={styles.rbBars}>
                    {[5, 4, 3, 2, 1].map((star, idx) => {
                      const pcts = starDist(trail.rating);
                      return (
                        <View key={star} style={styles.rbBarRow}>
                          <View style={[styles.rbTrack, { backgroundColor: isDark ? '#2a2a2a' : '#E5E5EA' }]}>
                            <View
                              style={[
                                styles.rbFill,
                                {
                                  width: `${pcts[idx]}%` as any,
                                  backgroundColor: isDark ? '#fff' : '#1C1C1E',
                                },
                              ]}
                            />
                          </View>
                          <ThemedText style={[styles.rbLabel, { color: colors.icon }]}>{star}</ThemedText>
                          <Ionicons name="star" size={10} color={isDark ? '#555' : '#C7C7CC'} />
                        </View>
                      );
                    })}
                  </View>
                </View>}
              </View>

              {/* Reseñas */}
              <View style={styles.reviewsCard}>
                {REVIEWS.length > 0 && (
                  <View style={styles.reviewsHeader}>
                    <ThemedText style={[styles.reviewsTitle, { color: '#808080' }]}>
                      Reseñas ({REVIEWS.length})
                    </ThemedText>
                    <View style={[styles.reviewsHeaderSep, { backgroundColor: '#808080' }]} />
                    <View style={styles.reviewsRating}>
                      <Ionicons name="star" size={15} color="#808080" />
                      <ThemedText style={[styles.reviewsCount, { color: '#808080' }]}>
                        {trail.rating.toFixed(1)}
                      </ThemedText>
                    </View>
                  </View>
                )}
                {REVIEWS.length === 0 ? (
                  <View style={styles.reviewEmpty}>
                    <Ionicons name="chatbubble-outline" size={32} color={colors.icon} />
                    <ThemedText style={[styles.reviewEmptyTitle, { color: colors.text }]}>
                      Sin reseñas aún
                    </ThemedText>
                    <ThemedText style={[styles.reviewEmptySubtitle, { color: colors.icon }]}>
                      Sé el primero en compartir tu experiencia en este sendero.
                    </ThemedText>
                  </View>
                ) : REVIEWS.map((review, idx) => (
                  <View key={review.id}>
                    {idx > 0 && (
                      <View style={[styles.reviewDivider, { backgroundColor: isDark ? '#2a2a2a' : '#F2F4F7' }]} />
                    )}
                    <View style={styles.reviewItem}>
                      <Image source={{ uri: review.avatar }} style={styles.reviewAvatar} />
                      <View style={styles.reviewBody}>
                        <View style={styles.reviewHeader}>
                          <ThemedText style={styles.reviewUser}>{review.user}</ThemedText>
                          <ThemedText style={[styles.reviewDate, { color: colors.icon }]}>
                            {relativeDate(review.date)}
                          </ThemedText>
                        </View>
                        <View style={styles.reviewStars}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Ionicons
                              key={i}
                              name="star"
                              size={12}
                              color={i <= review.rating ? '#FFB800' : '#D1D1D6'}
                            />
                          ))}
                        </View>
                        <ThemedText style={[styles.reviewText, { color: colors.icon }]}>
                          {review.text}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                ))}
              </View>


<View style={{ height: 32 }} />
            </View>
          )}
        />

        {/* Top bar animada */}
        {trail && (
          <Animated.View
            style={[
              styles.topBar,
              { backgroundColor: isDark ? '#000' : '#fff', paddingTop: top },
              topBarStyle,
            ]}
            pointerEvents="box-none">
            <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()} pointerEvents="auto">
              <Ionicons name="chevron-back" size={22} color={isDark ? '#fff' : '#000'} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <View style={styles.topBarRight} pointerEvents="auto">
              <TouchableOpacity
                style={styles.topBarBtn}
                onPress={() => Share.share({ message: `Mirá este sendero: ${trail.name}` })}>
                <Ionicons name="share-outline" size={20} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.topBarBtn}
                onPress={async () => {
                  if (!token) { redirectToLogin(pathname || '/(tabs)'); return; }
                  await toggleTrailFavorite(trailId!, token, !trailFavorited);
                }}>
                <Ionicons
                  name={trailFavorited ? 'heart' : 'heart-outline'}
                  size={20}
                  color={trailFavorited ? '#ff3b30' : isDark ? '#fff' : '#000'}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 10,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  topBarBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { flex: 1, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  topBarRight: { flexDirection: 'row', marginRight: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  galleryWrap: {
    marginHorizontal: 16,
    marginTop: 80,
  },
  gallery: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },

  floatRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  floatBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatBtnLiked: {
    backgroundColor: '#fff',
  },
  floatRightGroup: {
    flexDirection: 'row',
    gap: 8,
  },

  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  nameSection: {
    padding: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  name: { fontSize: 22, fontWeight: '500', lineHeight: 27, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  diffBadgeText: { fontSize: 12, fontWeight: '700' },
  metaDot: { fontSize: 12, opacity: 0.4 },
  type: { fontSize: 18 },
  descInline: { fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  ratingText: { fontSize: 18 },
  ratingDot: { fontSize: 24, opacity: 0.4 },

  cardDivider: { height: 1, marginHorizontal: 0 },

  metricsRow: {
    flexDirection: 'row',
    paddingTop: 24,
    paddingBottom: 14,
    paddingHorizontal: 8,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 0,
    paddingVertical: 2,
  },
  metricSep: {
    width: 1,
    marginVertical: 4,
  },
  metricValue: { fontSize: 16, fontWeight: '500', textAlign: 'center', marginTop: 10 },
  metricLabel: { fontSize: 14, opacity: 0.55, textAlign: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 15, lineHeight: 22 },

  reviewsCard: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 16,
  },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 48 },
  reviewsTitle: { fontSize: 14, fontWeight: '500' },
  reviewsHeaderSep: { flex: 1, height: 1 },
  reviewsRating: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewsCount: { fontSize: 14, fontWeight: '500' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 100,
  },
  filterBtnText: { fontSize: 15 },
  filterMenu: {
    position: 'absolute',
    right: 0,
    top: 36,
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterOptionText: { fontSize: 14, color: '#000' },
  reviewDivider: { height: 1, marginVertical: 24 },
  reviewItem: { flexDirection: 'row', gap: 12 },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20 },
  reviewBody: { flex: 1, gap: 4 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewUser: { fontSize: 14, fontWeight: '600' },
  reviewDate: { fontSize: 12 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewText: { fontSize: 14, lineHeight: 20 },

  mapSection: { padding: 16, paddingTop: 20, paddingBottom: 24, gap: 12 },
  mapTitle: { fontSize: 16, fontWeight: '500' },
  mapWrap: { borderRadius: 12, overflow: 'hidden', aspectRatio: 1 },
  map: { flex: 1 },
  mapMarker: { alignItems: 'center', justifyContent: 'center' },
  mapExpandBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  reviewEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  reviewEmptyTitle: { fontSize: 16, fontWeight: '500' },
  reviewEmptySubtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 260 },

  ratingBreakdown: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rbLeft: { width: 130, alignItems: 'center', gap: 8, marginLeft: -5 },
  rbScore: { fontSize: 72, fontWeight: '500', lineHeight: 80 },
  rbStars: { flexDirection: 'row', gap: 4 },
  rbCount: { fontSize: 14, textAlign: 'center', marginTop: 2 },
  rbBars: { width: 195, gap: 1 },
  rbBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rbTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  rbFill: { height: 6, borderRadius: 3 },
  rbLabel: { fontSize: 12, width: 10, textAlign: 'right' },
});
