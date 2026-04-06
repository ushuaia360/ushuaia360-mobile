import TrailImage from '@/components/home/trail-image';
import TrailGalleryLightbox from '@/components/trail-gallery-lightbox';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { imageUrlsToGallerySlides, placeMediaToGallerySlides } from '@/lib/gallery-slides';
import { fetchPlace, type BackendPlace } from '@/services/api';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_H = Math.round(SCREEN_WIDTH * 0.48);

export default function PlaceDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { id } = useLocalSearchParams<{ id?: string }>();
  const placeId = typeof id === 'string' ? id : undefined;

  const [place, setPlace] = useState<BackendPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);

  const load = useCallback(async () => {
    if (!placeId) return;
    setLoading(true);
    setError(null);
    try {
      const p = await fetchPlace(placeId);
      setPlace(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el lugar');
      setPlace(null);
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    load();
  }, [load]);

  const gallerySlides = useMemo(() => {
    if (!place) return [];
    const typed = place.media?.length ? placeMediaToGallerySlides(place.media) : [];
    if (typed.length > 0) return typed;
    return imageUrlsToGallerySlides(place.image_urls ?? []);
  }, [place]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: place?.name ?? 'Lugar',
          headerShown: true,
          headerTintColor: colors.tint,
          headerStyle: { backgroundColor: isDark ? '#000' : '#fff' },
          headerShadowVisible: false,
        }}
      />

      {!placeId ? (
        <View style={styles.center}>
          <ThemedText style={{ color: colors.icon }}>Lugar inválido</ThemedText>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.tint} />
          <ThemedText style={[styles.muted, { color: colors.icon }]}>Cargando…</ThemedText>
        </View>
      ) : error || !place ? (
        <View style={styles.center}>
          <ThemedText style={{ color: colors.icon }}>{error ?? 'No encontrado'}</ThemedText>
        </View>
      ) : (
        <FlatList
          data={[place.id]}
          keyExtractor={(k) => k}
          renderItem={() => (
            <View>
              {gallerySlides.length > 0 ? (
                <View>
                  <FlatList
                    data={gallerySlides}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(_, i) => String(i)}
                    onMomentumScrollEnd={(e) => {
                      const x = e.nativeEvent.contentOffset.x;
                      setHeroIndex(Math.round(x / SCREEN_WIDTH));
                    }}
                    renderItem={({ item, index }) => (
                      <Pressable
                        onPress={() => {
                          setLightboxIndex(index);
                          setLightboxOpen(true);
                        }}
                        style={styles.heroPress}>
                        <View style={styles.heroSlide}>
                          <TrailImage
                            uri={item.uri}
                            style={{ width: SCREEN_WIDTH, height: HERO_H }}
                            contentFit="cover"
                          />
                          {item.mode === 'panorama' ? (
                            <View
                              style={[
                                styles.panoBadge,
                                {
                                  backgroundColor: item.panoramaHalf
                                    ? 'rgba(80,80,120,0.85)'
                                    : 'rgba(0,0,0,0.55)',
                                },
                              ]}>
                              <ThemedText style={styles.panoBadgeText}>
                                {item.panoramaHalf ? '180°' : '360°'}
                              </ThemedText>
                            </View>
                          ) : null}
                        </View>
                      </Pressable>
                    )}
                  />
                  {gallerySlides.length > 1 ? (
                    <View style={styles.dots}>
                      {gallerySlides.map((_, i) => (
                        <View
                          key={i}
                          style={[styles.dot, i === heroIndex ? styles.dotActive : styles.dotInactive]}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={[styles.heroPlaceholder, { backgroundColor: isDark ? '#1c1c1e' : '#F2F4F7' }]}>
                  <ThemedText style={{ color: colors.icon }}>Sin fotos</ThemedText>
                </View>
              )}

              <View style={styles.body}>
                <ThemedText style={styles.name}>{place.name ?? place.slug}</ThemedText>
                <ThemedText style={[styles.meta, { color: colors.icon }]}>
                  {[place.category, place.region, place.country].filter(Boolean).join(' · ')}
                </ThemedText>
                <ThemedText style={[styles.desc, { color: colors.text }]}>
                  {place.description?.trim() ? place.description : 'Sin descripción.'}
                </ThemedText>
              </View>
            </View>
          )}
        />
      )}

      {gallerySlides.length > 0 ? (
        <TrailGalleryLightbox
          visible={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          items={gallerySlides}
          initialIndex={lightboxIndex}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  muted: { marginTop: 8, fontSize: 15 },
  heroPlaceholder: {
    width: SCREEN_WIDTH,
    height: HERO_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPress: { width: SCREEN_WIDTH },
  heroSlide: { width: SCREEN_WIDTH, height: HERO_H, position: 'relative' },
  panoBadge: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  panoBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dotInactive: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  body: { padding: 16, gap: 10 },
  name: { fontSize: 24, fontWeight: '700' },
  meta: { fontSize: 15 },
  desc: { fontSize: 15, lineHeight: 22, marginTop: 4 },
});
