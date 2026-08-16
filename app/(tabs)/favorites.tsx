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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
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
  const { t } = useTranslation();
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
      if (!token) { setTrails([]); setLoading(false); return; }
      loadFavorites(false);
    }, [token, loadFavorites]),
  );

  const headerSubtitle = useMemo(() => {
    if (loading && trails.length === 0) return null;
    if (trails.length === 0) return t('favorites.savedTrails');
    return t(trails.length === 1 ? 'favorites.trail_one' : 'favorites.trail_other', { count: trails.length });
  }, [loading, trails.length, t]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.push('/(tabs)/profile');
  }, []);

  const headerBg = isDark ? '#1c1c1e' : '#fff';
  const headerBorder = isDark ? '#2a2a2a' : '#EDF0F5';

  const header = (
    <View style={[styles.header, { paddingTop: top + 8, backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.headerBack}
          activeOpacity={0.65}
          accessibilityRole="button"
          accessibilityLabel={t('favorites.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <ThemedText style={styles.headerTitle}>{t('favorites.title')}</ThemedText>
          {headerSubtitle != null ? (
            <ThemedText style={[styles.headerSubtitle, { color: colors.icon }]} numberOfLines={1}>
              {headerSubtitle}
            </ThemedText>
          ) : null}
        </View>
        <View style={[styles.headerIconWrap, { backgroundColor: colors.tint + '18' }]}>
          <Ionicons name="heart-outline" size={22} color={colors.tint} />
        </View>
      </View>
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
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.tint + '12' }]}>
            <Ionicons name="heart-outline" size={52} color={colors.tint} />
          </View>
          <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
            Sin favoritos todavía
          </ThemedText>
          <ThemedText style={[styles.emptySub, { color: colors.icon }]}>
            Guardá los senderos que más te gusten tocando el corazón para encontrarlos fácilmente.
          </ThemedText>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/explorer' as never)}>
            <ThemedText style={styles.emptyBtnText}>Explorar senderos</ThemedText>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trails}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadFavorites(true)} tintColor={colors.tint} />
          }
          renderItem={({ item }) => (
            <TrailListCard
              trail={item}
              onPress={(t) => router.push({ pathname: '/trails/[id]', params: { id: t.id } } as never)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  headerBack: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitles: { flex: 1, minWidth: 0, justifyContent: 'center', paddingRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2, opacity: 0.92 },
  headerIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  list: { paddingTop: 10, paddingBottom: 24 },
  center: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyWrap: { flex: 1, paddingHorizontal: 24, paddingTop: 56, alignItems: 'center', gap: 16 },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  emptySub: { fontSize: 14, lineHeight: 21, textAlign: 'center', paddingHorizontal: 8 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 52,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skelList: { paddingTop: 10, paddingBottom: 24 },
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
  skelImageWrap: { marginHorizontal: 10, marginTop: 10, borderRadius: 10, overflow: 'hidden' },
  skelImage: { height: 200, borderRadius: 10 },
  skelInfo: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16, gap: 8 },
  skelBar: { height: 17, borderRadius: 6 },
});
