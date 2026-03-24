import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { redirectToLogin } from '@/lib/needAuth';
import { useAuthStore } from '@/store/auth-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useTrailsStore } from '@/store/trails-store';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Stack, useLocalSearchParams, usePathname } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
    </View>
  );
}

export default function TrailDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation();

  const { id } = useLocalSearchParams<{ id?: string }>();
  const trailId = typeof id === 'string' ? id : undefined;

  const { trails, featuredTrails, fetchTrails, loading } = useTrailsStore();
  const token = useAuthStore((s) => s.token);
  const pathname = usePathname();
  const trailFavorited = useFavoritesStore((s) => (trailId ? s.isFavorite(trailId) : false));
  const toggleTrailFavorite = useFavoritesStore((s) => s.toggleTrail);

  const [activeImage, setActiveImage] = useState(0);
  const galleryRef = useRef<FlatList<string>>(null);

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
    // If user landed here via deep link, ensure we have data.
    fetchTrails(true);
  }, [trailId, trail, fetchTrails]);

  const images = trail?.images?.length ? trail.images : trail?.image ? [trail.image] : [];
  const heroHeight = Math.round(SCREEN_WIDTH * 0.62);

  useLayoutEffect(() => {
    if (!trailId) return;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={async () => {
            if (!token) {
              redirectToLogin(pathname || '/(tabs)');
              return;
            }
            await toggleTrailFavorite(trailId, token, !trailFavorited);
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ marginRight: 4 }}>
          <Ionicons
            name={trailFavorited ? 'heart' : 'heart-outline'}
            size={24}
            color={trailFavorited ? '#ff3b30' : colors.tint}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, trailId, token, trailFavorited, toggleTrailFavorite, colors.tint, pathname]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: trail?.name ?? 'Sendero',
          headerShown: true,
          headerTintColor: colors.tint,
          headerStyle: { backgroundColor: isDark ? '#000' : '#fff' },
          headerShadowVisible: false,
        }}
      />

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
        <FlatList
          data={[trail.id]}
          keyExtractor={(k) => k}
          renderItem={() => (
            <View style={styles.content}>
              {/* Gallery */}
              <View style={[styles.hero, { height: heroHeight, backgroundColor: isDark ? '#0b0b0c' : '#F2F4F7' }]}>
                <FlatList
                  ref={galleryRef}
                  data={images}
                  keyExtractor={(_, i) => String(i)}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    if (index !== activeImage) setActiveImage(index);
                  }}
                  scrollEventThrottle={16}
                  renderItem={({ item }) => (
                    <Image
                      source={{ uri: item }}
                      style={{ width: SCREEN_WIDTH, height: heroHeight }}
                      resizeMode="cover"
                    />
                  )}
                />

                {images.length > 1 && (
                  <View style={styles.dots}>
                    {images.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          { opacity: i === activeImage ? 1 : 0.45, backgroundColor: '#fff' },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>

              {/* Header */}
              <View style={styles.header}>
                <ThemedText style={styles.name}>{trail.name}</ThemedText>
                  <ThemedText style={styles.type}>{trail.type}</ThemedText>
              </View>

              {/* Metrics */}
              <View style={[styles.metricsCard, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
                <View style={styles.metricsRow}>
                  <Metric label="Dificultad" value={trail.difficulty} />
                  <Metric label="Distancia" value={trail.distance} />
                </View>
                <View style={styles.metricsRow}>
                  <Metric label="Duración" value={trail.duration} />
                  <Metric label="Desnivel" value={trail.elevationGain} />
                </View>
              </View>

              {/* Description */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Descripción</ThemedText>
                <ThemedText style={[styles.description, { color: colors.text }]}>
                  {trail.description?.trim() ? trail.description : 'Sin descripción.'}
                </ThemedText>
              </View>

              <View style={{ height: 24 }} />
            </View>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { flex: 1 },
  hero: { width: SCREEN_WIDTH, overflow: 'hidden' },
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
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 4 },
  name: { fontSize: 25, fontWeight: '700', lineHeight: 28 },
  type: { fontSize: 16, fontWeight: '400' },
  metricsCard: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  metricsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  metric: { flex: 1, gap: 4 },
  metricLabel: { fontSize: 12, opacity: 0.7 },
  metricValue: { fontSize: 16, fontWeight: '600' },
  section: { paddingHorizontal: 16, paddingTop: 18, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  description: { fontSize: 15, lineHeight: 21 },

});
