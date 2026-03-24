import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import TrailListCard from '@/components/home/trail-list-card';
import { Trail } from '@/constants/mock-trails';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNeedsAuthScreen } from '@/lib/needAuth';
import { fetchFavoriteTrails } from '@/services/api';
import { useAuthStore } from '@/store/auth-store';
import { mapBackendTrail } from '@/store/trails-store';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const token = useAuthStore((s) => s.token);
  const isAuthed = useNeedsAuthScreen('/(tabs)/favorites');
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async (isRefresh: boolean) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchFavoriteTrails(token);
      setTrails(data.trails.map(mapBackendTrail));
    } catch {
      if (!isRefresh) setTrails([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        setTrails([]);
        setLoading(false);
        return;
      }
      loadFavorites(false);
    }, [token, loadFavorites]),
  );

  if (!isAuthed) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: top + 16, backgroundColor: isDark ? '#1c1c1e' : '#fff', borderBottomColor: isDark ? '#2a2a2a' : '#EDF0F5' }]}>
          <ThemedText type="title">Favoritos</ThemedText>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.tint} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: top + 16,
            backgroundColor: isDark ? '#1c1c1e' : '#fff',
            borderBottomColor: isDark ? '#2a2a2a' : '#EDF0F5',
          },
        ]}>
        <ThemedText type="title">Favoritos</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
          Tus lugares y senderos favoritos
        </ThemedText>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.tint} />
        </View>
      ) : trails.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={{ color: colors.icon }}>
            No tenés favoritos todavía. Tocá el corazón en un sendero para guardarlo.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={trails}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFavorites(true)}
              tintColor={colors.tint}
            />
          }
          renderItem={({ item }) => (
            <TrailListCard
              trail={item}
              onPress={(t) =>
                router.push({ pathname: '/trails/[id]', params: { id: t.id } } as never)
              }
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
  },
  list: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
});
