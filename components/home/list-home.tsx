import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Trail } from '@/constants/mock-trails';
import { SB_INPUT_HEIGHT } from '@/constants/search-layout';
import { Colors, Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { recheckNetworkReachable, useNetworkReachable } from '@/hooks/use-network-reachable';
import { useHomeStore } from '@/store/home-store';
import { BackendPlaceListItem, useTrailsStore } from '@/store/trails-store';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FiltersOverlay from './filters-overlay';
import PlaceListCard from './place-list-card';
import SearchBar from './search-bar';
import TrailListCard from './trail-list-card';

type ListItem =
  | { kind: 'trail'; data: Trail }
  | { kind: 'place'; data: BackendPlaceListItem };

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard({ shimmer }: { shimmer: Animated.Value }) {
  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.9],
  });

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonInfo}>
        <View style={styles.skeletonRow}>
          <View style={[styles.skeletonBlock, { flex: 1, height: 14 }]} />
          <View style={[styles.skeletonBlock, { width: 48, height: 20, borderRadius: 6 }]} />
        </View>
        <View style={[styles.skeletonBlock, { width: '45%', height: 11, marginTop: 6 }]} />
        <View style={[styles.skeletonBlock, { width: '70%', height: 11, marginTop: 12 }]} />
      </View>
    </Animated.View>
  );
}

function SkeletonList() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [shimmer]);

  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} shimmer={shimmer} />
      ))}
    </>
  );
}

// ── ListHome ──────────────────────────────────────────────────────────────────

export default function ListHome() {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const {
    filteredTrails,
    filteredPlaces,
    loading,
    loadingMore,
    loadingPlaces,
    fetchTrails,
    loadMoreTrails,
    fetchPlaces,
    trails,
    places,
    searchQuery,
  } = useTrailsStore();
  const { setMode, searchOpen, setSearchOpen } = useHomeStore();
  const networkReachable = useNetworkReachable();
  const [filterKind, setFilterKind] = useState<string[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState<string[]>([]);
  const [filterRouteType, setFilterRouteType] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([recheckNetworkReachable(), fetchTrails(true), fetchPlaces()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchTrails, fetchPlaces]);

  // Filtros pendientes desde el Home (p. ej. tap en una categoría)
  useFocusEffect(useCallback(() => {
    const pending = useHomeStore.getState().consumePendingListFilters();
    if (!pending) return;
    if (pending.resetAll) {
      useTrailsStore.getState().setSearchQuery('');
      setFilterDifficulty([]);
      setFilterRouteType([]);
    }
    setFilterKind(pending.filterKind);
    setFilterCategory(pending.filterCategory);
  }, []));

  // Carga inicial
  useEffect(() => {
    if (trails.length === 0) fetchTrails(true);
  }, [fetchTrails, trails.length]);

  useEffect(() => {
    if (places.length === 0) fetchPlaces();
  }, [fetchPlaces, places.length]);

  const trailsBase = filteredTrails();
  const placesBase = filteredPlaces();

  const showTrails = !(filterKind.length === 1 && filterKind[0] === 'place');
  const showPlaces = !(filterKind.length === 1 && filterKind[0] === 'trail');

  const trailItems: ListItem[] = showTrails
    ? trailsBase
        .filter((t) => !filterDifficulty.length || filterDifficulty.includes(t.difficulty))
        .filter((t) => !filterRouteType.length || filterRouteType.includes(t.type))
        .map((t): ListItem => ({ kind: 'trail', data: t }))
    : [];

  const placeItems: ListItem[] = showPlaces
    ? placesBase
        .filter((p) => !filterCategory.length || filterCategory.includes(p.category ?? ''))
        .map((p): ListItem => ({ kind: 'place', data: p }))
    : [];

  const results: ListItem[] = [...trailItems, ...placeItems];

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.kind === 'place') {
        return (
          <PlaceListCard
            place={item.data}
            onPress={(place) => router.push({ pathname: '/places/[id]', params: { id: place.id } } as any)}
          />
        );
      }
      return (
        <TrailListCard
          trail={item.data}
          onMapPress={() => setMode('map')}
          onPress={(trail) => router.push({ pathname: '/trails/[id]', params: { id: trail.id } } as any)}
        />
      );
    },
    [setMode],
  );

  const keyExtractor = useCallback((item: ListItem) => `${item.kind}:${item.data.id}`, []);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }, [loadingMore, colors.tint]);

  const handleEndReached = useCallback(() => {
    if (!searchQuery.trim()) loadMoreTrails();
  }, [searchQuery, loadMoreTrails]);

  const activeFilterCount =
    filterKind.length +
    filterDifficulty.length +
    filterRouteType.length +
    filterCategory.length;

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[
        styles.header,
        {
          paddingTop: top + 16,
          backgroundColor: isDark ? '#1c1c1e' : '#fff',
          borderBottomColor: isDark ? '#2a2a2a' : '#EDF0F5',
        },
      ]}>
        <SearchBar
          onPress={() => setSearchOpen(true)}
          isActive={searchOpen}
          rightSlot={
            <TouchableOpacity
              style={[styles.filterBtn, { backgroundColor: isDark ? '#2c2c2e' : '#fff' }]}
              onPress={() => setFiltersOpen(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Filtros">
              <Ionicons name="options-outline" size={22} color={isDark ? '#fff' : '#000'} />
              {activeFilterCount > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: colors.tint }]}>
                  <ThemedText style={styles.filterBadgeText}>{activeFilterCount}</ThemedText>
                </View>
              )}
            </TouchableOpacity>
          }
        />
      </View>

      <FiltersOverlay
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        initial={{ filterKind, filterDifficulty, filterRouteType, filterCategory }}
        onApply={(next) => {
          setFilterKind(next.filterKind);
          setFilterDifficulty(next.filterDifficulty);
          setFilterRouteType(next.filterRouteType);
          setFilterCategory(next.filterCategory);
        }}
        trails={trailsBase}
        places={placesBase}
      />

      {/* Skeleton o lista */}
      {loading || loadingPlaces ? (
        <View style={styles.skeletonContainer}>
          <SkeletonList />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={Palette.primary} />
          }
          // ── Paginación ──
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          // ── Performance ──
          removeClippedSubviews={true}
          initialNumToRender={4}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={80}
          windowSize={7}
          ListEmptyComponent={
            <View style={styles.empty}>
              <IconSymbol name="search-outline" size={40} color={isDark ? '#444' : '#ccc'} />
              <ThemedText style={[styles.emptyText, { color: colors.icon }]}>
                {networkReachable === false
                  ? t('home.noConnectionList')
                  : t('home.noTrails')}
              </ThemedText>
            </View>
          }
        />
      )}

      {/* FAB Ver Mapa */}
      <TouchableOpacity
        style={[styles.mapFab, { borderColor: colors.tint }]}
        onPress={() => setMode('map')}
        activeOpacity={0.85}>
        <IconSymbol name="map" size={17} color={colors.tint} />
        <ThemedText style={[styles.mapFabText, { color: colors.tint }]}>{t('home.viewMap')}</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const SKELETON_BG = '#E0E0E0';

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  // ── Skeleton ──
  skeletonContainer: {
    flex: 1,
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  skeletonCard: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  skeletonImage: {
    width: '100%',
    height: 200,
    backgroundColor: SKELETON_BG,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  skeletonInfo: {
    flex: 1,
    padding: 14,
    marginTop: 200,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skeletonBlock: {
    backgroundColor: SKELETON_BG,
    borderRadius: 4,
    height: 12,
  },
  // ── Lista ──
  list: {
    paddingTop: 14,
    paddingBottom: 110,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: { fontSize: 15 },
  // ── Filter button ──
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  filterBadgeText: {
    fontSize: 10,
    lineHeight: Platform.OS === 'android' ? 12 : 14,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    includeFontPadding: false,
  },
  // ── FAB ──
  mapFab: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  mapFabText: {
    color: 'rgba(0,0,0,0.5)',
    fontSize: 15,
    fontWeight: '500',
  },
});
