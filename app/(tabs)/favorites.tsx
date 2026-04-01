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
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const SKEL_IMAGE_WIDTH = CARD_WIDTH - 20;

function FavoritesListSkeleton({ isDark, skelBg }: { isDark: boolean; skelBg: string }) {
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  return (
    <View style={styles.skelList}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.skelCard, { backgroundColor: cardBg }]}>
          <View style={styles.skelImageWrap}>
            <View style={[styles.skelImage, { width: SKEL_IMAGE_WIDTH, backgroundColor: skelBg }]} />
          </View>
          <View style={styles.skelInfo}>
            <View style={[styles.skelBar, { width: '74%', backgroundColor: skelBg }]} />
            <View style={[styles.skelBar, { width: '40%', height: 14, backgroundColor: skelBg }]} />
            <View style={[styles.skelBar, { width: '90%', height: 14, backgroundColor: skelBg }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function FavoritesScreen() {
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const skelBg = isDark ? '#2c2c2e' : '#e8e8ed';

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

  const header = (
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
    </View>
  );

  if (!isAuthed) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        {header}
        <FavoritesListSkeleton isDark={isDark} skelBg={skelBg} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {header}

      {loading ? (
        <FavoritesListSkeleton isDark={isDark} skelBg={skelBg} />
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
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  list: {
    paddingTop: 10,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  skelList: {
    paddingTop: 10,
    paddingBottom: 24,
  },
  skelCard: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  skelImageWrap: {
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  skelImage: {
    height: 200,
    borderRadius: 10,
  },
  skelInfo: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
  },
  skelBar: {
    height: 17,
    borderRadius: 6,
  },
});
