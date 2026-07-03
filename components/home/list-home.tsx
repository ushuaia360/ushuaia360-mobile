import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Trail } from '@/constants/mock-trails';
import { SB_INPUT_HEIGHT } from '@/constants/search-layout';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNetworkReachable } from '@/hooks/use-network-reachable';
import { useHomeStore } from '@/store/home-store';
import { useLanguageStore } from '@/store/language-store';
import { BackendPlaceListItem, useTrailsStore } from '@/store/trails-store';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Animated, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaceListCard from './place-list-card';
import SearchBar from './search-bar';
import TrailListCard from './trail-list-card';

type ListItem =
  | { kind: 'trail'; data: Trail }
  | { kind: 'place'; data: BackendPlaceListItem };

type FilterType = 'all' | 'trail' | 'place';

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

// ── Constantes de filtros ─────────────────────────────────────────────────────

const PLACE_CATEGORIES = [
  { key: 'turistico',   label: 'Turístico' },
  { key: 'naturaleza',  label: 'Naturaleza' },
  { key: 'patrimonio',  label: 'Patrimonio' },
  { key: 'miradores',   label: 'Miradores' },
  { key: 'costa',       label: 'Costa y mar' },
  { key: 'cultura',     label: 'Cultura' },
  { key: 'gastronomia', label: 'Gastronomía' },
  { key: 'otros',       label: 'Otros' },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  PLACE_CATEGORIES.map((c) => [c.key, c.label])
);

// ── Filter sub-components ─────────────────────────────────────────────────────

function FilterChip({
  label, active, open, onPress, isDark, colors,
}: {
  label: string; active: boolean; open: boolean;
  onPress: () => void; isDark: boolean; colors: any;
}) {
  const bg = active || open
    ? colors.tint
    : isDark ? '#2c2c2e' : '#F0F0F5';
  const textColor = active || open ? '#fff' : colors.icon;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[chipStyles.chip, { backgroundColor: bg }]}>
      <ThemedText style={[chipStyles.label, { color: textColor }]}>{label}</ThemedText>
      <ThemedText style={[chipStyles.arrow, { color: textColor }]}>
        {open ? '▲' : '▾'}
      </ThemedText>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  label: { fontSize: 13, fontWeight: '500' },
  arrow: { fontSize: 9, marginTop: 1 },
});

function OptionsPanel({
  options, selected, onSelect, isDark, colors,
}: {
  options: { key: string; label: string; color?: string }[];
  selected: string[];
  onSelect: (key: string) => void;
  isDark: boolean;
  colors: any;
}) {
  return (
    <View style={[panelStyles.panel, { backgroundColor: isDark ? '#1c1c1e' : '#fff', borderTopColor: isDark ? '#2a2a2a' : '#EDF0F5' }]}>
      <View style={panelStyles.wrap}>
        {options.map(({ key, label, color }) => {
          const active = selected.includes(key);
          const bg = active ? (color ?? colors.tint) : (isDark ? '#2c2c2e' : '#F0F0F5');
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onSelect(key)}
              activeOpacity={0.75}
              style={[panelStyles.option, { backgroundColor: bg }]}>
              <ThemedText style={[panelStyles.optionText, { color: active ? '#fff' : colors.icon }]}>
                {label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const panelStyles = StyleSheet.create({
  panel: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

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
  const { language, setLanguage } = useLanguageStore();
  const networkReachable = useNetworkReachable();
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string[]>([]);
  const [filterRouteType, setFilterRouteType] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [activePanel, setActivePanel] = useState<'type' | 'difficulty' | 'route' | 'category' | null>(null);

  const togglePanel = useCallback((panel: 'type' | 'difficulty' | 'route' | 'category') => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }, []);

  const openLanguagePicker = useCallback(() => {
    Alert.alert(
      t('languagePicker.title'),
      undefined,
      [
        { text: `${language === 'es' ? '✓ ' : ''}🇦🇷  ${t('languagePicker.es')}`, onPress: () => setLanguage('es') },
        { text: `${language === 'en' ? '✓ ' : ''}🇺🇸  ${t('languagePicker.en')}`, onPress: () => setLanguage('en') },
        { text: `${language === 'pt' ? '✓ ' : ''}🇧🇷  ${t('languagePicker.pt')}`, onPress: () => setLanguage('pt') },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  }, [t, language, setLanguage]);

  // Carga inicial
  useEffect(() => {
    if (trails.length === 0) fetchTrails(true);
  }, [fetchTrails, trails.length]);

  useEffect(() => {
    if (places.length === 0) fetchPlaces();
  }, [fetchPlaces, places.length]);

  let trailItems: ListItem[] = filteredTrails()
    .filter((t) => !filterDifficulty.length || filterDifficulty.includes(t.difficulty))
    .filter((t) => !filterRouteType.length || filterRouteType.includes(t.type))
    .map((t): ListItem => ({ kind: 'trail', data: t }));

  let placeItems: ListItem[] = filteredPlaces()
    .filter((p) => !filterCategory.length || filterCategory.includes(p.category ?? ''))
    .map((p): ListItem => ({ kind: 'place', data: p }));

  const results: ListItem[] =
    filterType === 'trail' ? trailItems :
    filterType === 'place' ? placeItems :
    filterCategory.length ? placeItems :
    [...trailItems, ...placeItems];

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
              style={[styles.langBtn, { backgroundColor: isDark ? '#2c2c2e' : '#fff' }]}
              onPress={openLanguagePicker}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('languagePicker.title')}>
              <Ionicons name="language-outline" size={22} color={isDark ? '#fff' : '#000'} />
            </TouchableOpacity>
          }
        />
        {/* Chips compactos */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {/* Tipo */}
          <FilterChip
            label={filterType === 'all' ? 'Tipo' : filterType === 'trail' ? 'Senderos' : 'Puntos'}
            active={filterType !== 'all'}
            open={activePanel === 'type'}
            onPress={() => togglePanel('type')}
            isDark={isDark}
            colors={colors}
          />
          {/* Dificultad */}
          {filterType !== 'place' && (
            <FilterChip
              label={filterDifficulty.length === 1 ? filterDifficulty[0] : filterDifficulty.length > 1 ? `Dificultad (${filterDifficulty.length})` : 'Dificultad'}
              active={filterDifficulty.length > 0}
              open={activePanel === 'difficulty'}
              onPress={() => togglePanel('difficulty')}
              isDark={isDark}
              colors={colors}
            />
          )}
          {/* Tipo de ruta */}
          {filterType !== 'place' && (
            <FilterChip
              label={filterRouteType.length === 1 ? filterRouteType[0] : filterRouteType.length > 1 ? `Ruta (${filterRouteType.length})` : 'Tipo de ruta'}
              active={filterRouteType.length > 0}
              open={activePanel === 'route'}
              onPress={() => togglePanel('route')}
              isDark={isDark}
              colors={colors}
            />
          )}
          {/* Categoría */}
          {filterType !== 'trail' && (
            <FilterChip
              label={filterCategory.length === 1 ? (CATEGORY_LABELS[filterCategory[0]] ?? filterCategory[0]) : filterCategory.length > 1 ? `Categoría (${filterCategory.length})` : 'Categoría'}
              active={filterCategory.length > 0}
              open={activePanel === 'category'}
              onPress={() => togglePanel('category')}
              isDark={isDark}
              colors={colors}
            />
          )}
        </ScrollView>

        {/* Panel de opciones */}
        {activePanel === 'type' && (
          <OptionsPanel
            options={[
              { key: 'all', label: 'Todos' },
              { key: 'trail', label: 'Senderos' },
              { key: 'place', label: 'Puntos' },
            ]}
            selected={[filterType]}
            onSelect={(k) => {
              setFilterType(k as FilterType);
              setFilterDifficulty([]);
              setFilterRouteType([]);
              setFilterCategory([]);
              setActivePanel(null);
            }}
            isDark={isDark}
            colors={colors}
          />
        )}
        {activePanel === 'difficulty' && (
          <OptionsPanel
            options={[
              { key: 'Fácil', label: 'Fácil', color: '#34c759' },
              { key: 'Media', label: 'Media', color: '#ff9500' },
              { key: 'Difícil', label: 'Difícil', color: '#ff3b30' },
            ]}
            selected={filterDifficulty}
            onSelect={(k) => setFilterDifficulty((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k])}
            isDark={isDark}
            colors={colors}
          />
        )}
        {activePanel === 'route' && (
          <OptionsPanel
            options={[
              { key: 'Circular', label: 'Circular' },
              { key: 'Lineal', label: 'Lineal' },
              { key: 'Ida y vuelta', label: 'Ida y vuelta' },
            ]}
            selected={filterRouteType}
            onSelect={(k) => setFilterRouteType((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k])}
            isDark={isDark}
            colors={colors}
          />
        )}
        {activePanel === 'category' && (
          <OptionsPanel
            options={PLACE_CATEGORIES}
            selected={filterCategory}
            onSelect={(k) => setFilterCategory((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k])}
            isDark={isDark}
            colors={colors}
          />
        )}
      </View>

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
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
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
  // ── Language pill ──
  langBtn: {
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
