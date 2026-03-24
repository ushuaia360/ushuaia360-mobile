import TrailImage from '@/components/home/trail-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchPlace, type BackendPlace } from '@/services/api';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
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

  const images =
    place?.image_urls?.length ? place.image_urls : [];

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
              {images.length > 0 ? (
                <FlatList
                  data={images}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(u, i) => `${i}-${u}`}
                  renderItem={({ item }) => (
                    <TrailImage
                      uri={item}
                      style={{ width: SCREEN_WIDTH, height: HERO_H }}
                      contentFit="cover"
                    />
                  )}
                />
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
  body: { padding: 16, gap: 10 },
  name: { fontSize: 24, fontWeight: '700' },
  meta: { fontSize: 15 },
  desc: { fontSize: 15, lineHeight: 22, marginTop: 4 },
});
