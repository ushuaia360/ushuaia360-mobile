import HomeConnectivityLoader from '@/components/home/home-connectivity-loader';
import OfflineHomePlaceholder from '@/components/home/offline-home-placeholder';
import ResumeActiveTrailBar from '@/components/home/resume-active-trail-bar';
import TrailImage from '@/components/home/trail-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { recheckNetworkReachable, useNetworkReachable } from '@/hooks/use-network-reachable';
import { redirectToLogin } from '@/lib/needAuth';
import { toTitleCase } from '@/lib/title-case';
import { useAuthStore } from '@/store/auth-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useHomeStore } from '@/store/home-store';
import { formatPlaceCategoryLabel } from '@/lib/place-category-map';
import { FeaturedListItem, useTrailsStore } from '@/store/trails-store';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HERO_IMAGE = require('@/assets/images/bannerinicio.jpeg');
/** Debe coincidir con `styles.hero.top` — usado para calcular el gap dinámico con la searchbar. */
const HERO_TOP = -36;

interface CategoryDef {
  key: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  fg: string;
  filterKind: string[];
  filterCategory: string[];
}

const CATEGORIES: CategoryDef[] = [
  { key: 'senderos', labelKey: 'homeTab.categories.senderos', icon: 'walk-outline', bg: '#DCFCE7', fg: '#16A34A', filterKind: ['trail'], filterCategory: [] },
  { key: 'turismo', labelKey: 'homeTab.categories.turismo', icon: 'compass-outline', bg: '#E0E7FF', fg: '#4F46E5', filterKind: ['place'], filterCategory: ['turismo'] },
  { key: 'nature', labelKey: 'homeTab.categories.nature', icon: 'leaf-outline', bg: '#FEF3C7', fg: '#CA8A04', filterKind: ['place'], filterCategory: ['naturaleza'] },
  { key: 'history', labelKey: 'homeTab.categories.history', icon: 'business-outline', bg: '#EDE9FE', fg: '#7C3AED', filterKind: ['place'], filterCategory: ['historia'] },
  { key: 'viewpoints', labelKey: 'homeTab.categories.viewpoints', icon: 'telescope-outline', bg: '#FDE4EC', fg: '#DB2777', filterKind: ['place'], filterCategory: ['miradores'] },
  { key: 'gastronomy', labelKey: 'homeTab.categories.gastronomy', icon: 'restaurant-outline', bg: '#FFE4D5', fg: '#EA580C', filterKind: ['place'], filterCategory: ['gastronomia'] },
  { key: 'hospedaje', labelKey: 'homeTab.categories.hospedaje', icon: 'bed-outline', bg: '#CCFBF1', fg: '#0D9488', filterKind: ['place'], filterCategory: ['hospedaje'] },
  { key: 'compras', labelKey: 'homeTab.categories.compras', icon: 'bag-handle-outline', bg: '#FFE4E6', fg: '#E11D48', filterKind: ['place'], filterCategory: ['compras'] },
];

function FeaturedCard({ item, large }: { item: FeaturedListItem; large?: boolean }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const token = useAuthStore((s) => s.token);
  const pathname = usePathname();
  const isPlace = item.kind === 'place';
  const liked = useFavoritesStore((s) => (isPlace ? s.isPlaceFavorite(item.id) : s.isFavorite(item.id)));
  const toggleTrailFavorite = useFavoritesStore((s) => s.toggleTrail);
  const togglePlaceFavorite = useFavoritesStore((s) => s.togglePlace);

  const onHeartPress = async () => {
    if (!token) {
      redirectToLogin(pathname || '/(tabs)');
      return;
    }
    if (isPlace) {
      await togglePlaceFavorite(item.id, token, !liked);
    } else {
      await toggleTrailFavorite(item.id, token, !liked);
    }
  };

  const image = isPlace ? item.thumbnail_url ?? undefined : item.image;
  const name = isPlace ? item.name ?? 'Punto turístico' : item.name;

  return (
    <TouchableOpacity
      style={[large ? styles.featuredLarge : styles.featuredSmall, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}
      activeOpacity={0.9}
      onPress={() =>
        router.push(
          isPlace
            ? ({ pathname: '/places/[id]', params: { id: item.id } } as any)
            : ({ pathname: '/trails/[id]', params: { id: item.id } } as any),
        )
      }>
      <TrailImage uri={image} style={StyleSheet.absoluteFillObject as object} contentFit="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={StyleSheet.absoluteFillObject}
      />
      <TouchableOpacity
        style={styles.featuredHeart}
        hitSlop={10}
        activeOpacity={0.8}
        onPress={onHeartPress}>
        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#ff3b30' : '#fff'} />
      </TouchableOpacity>
      <View style={styles.featuredInfo}>
        <ThemedText
          style={[styles.featuredName, large ? styles.featuredNameLarge : undefined]}
          numberOfLines={large ? 1 : 2}
          lightColor="#fff"
          darkColor="#fff">
          {toTitleCase(name ?? '')}
        </ThemedText>
        <View style={styles.featuredStats}>
          {isPlace ? (
            <View style={styles.featuredStat}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.9)" />
              <ThemedText style={styles.featuredStatText} lightColor="#fff" darkColor="#fff">
                {formatPlaceCategoryLabel(item.category) || item.region || 'Punto turístico'}
              </ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.featuredStat}>
                <Ionicons name="map-outline" size={12} color="rgba(255,255,255,0.9)" />
                <ThemedText style={styles.featuredStatText} lightColor="#fff" darkColor="#fff">
                  {item.distance}
                </ThemedText>
              </View>
              <View style={styles.featuredStat}>
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.9)" />
                <ThemedText style={styles.featuredStatText} lightColor="#fff" darkColor="#fff">
                  {item.duration}
                </ThemedText>
              </View>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function HomeContent() {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const user = useAuthStore((s) => s.user);
  const { setMode, setPendingListFilters } = useHomeStore();
  const { featured, loadingFeatured, fetchFeatured } = useTrailsStore();
  const [searchTop, setSearchTop] = useState(top + 44);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (featured.length === 0) fetchFeatured();
  }, [featured.length, fetchFeatured]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([recheckNetworkReachable(), fetchFeatured()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFeatured]);

  const goToList = (filters?: { filterKind: string[]; filterCategory: string[] }) => {
    setPendingListFilters({
      filterKind: filters?.filterKind ?? [],
      filterCategory: filters?.filterCategory ?? [],
      resetAll: true,
    });
    setMode('list');
    router.push('/(tabs)/explorer');
  };

  const firstName = user?.full_name?.trim().split(' ')[0];
  const greeting = firstName ? t('homeTab.greetingNamed', { name: firstName }) : t('homeTab.greeting');
  const destacados = featured;

  return (
    <ThemedView style={styles.container}>
      <ResumeActiveTrailBar offsetTop={top + 8} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={Palette.primary} />
        }>
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={HERO_IMAGE} style={styles.heroImage as object} contentFit="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
            style={styles.heroImage}
          />

          <View
            style={[styles.heroBottom, { marginTop: top + 150 }]}
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              setSearchTop(HERO_TOP + y + height + 10);
            }}>
            <ThemedText style={styles.heroGreeting} lightColor="#fff" darkColor="#fff" numberOfLines={2}>
              {greeting}
            </ThemedText>
            <ThemedText style={styles.heroSubtitle} lightColor="#fff" darkColor="#fff">
              {t('homeTab.subtitle')}
            </ThemedText>
          </View>
        </View>

        {/* Search bar (overlapping hero) */}
        <View style={[styles.searchWrap, { marginTop: searchTop }]}>
          <TouchableOpacity
            style={[styles.searchBar, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}
            activeOpacity={0.9}
            onPress={() => useHomeStore.getState().setSearchOpen(true)}>
            <Ionicons name="search-outline" size={18} color={colors.icon} />
            <ThemedText style={[styles.searchPlaceholder, { color: colors.icon }]} numberOfLines={1}>
              {t('homeTab.searchPlaceholder')}
            </ThemedText>
            <TouchableOpacity
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                goToList();
              }}>
              <Ionicons name="options-outline" size={20} color={colors.icon} />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Categorías */}
        <View style={[styles.section, styles.categorySection]}>
          <View style={[styles.sectionHeader, styles.categoryHeader]}>
            <ThemedText style={styles.sectionTitle}>{t('homeTab.categoriesTitle')}</ThemedText>
            <TouchableOpacity onPress={() => goToList()} hitSlop={8}>
              <ThemedText style={[styles.sectionLink, { color: colors.tint }]}>{t('homeTab.viewAll')}</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={styles.categoryItem}
                activeOpacity={0.85}
                onPress={() => goToList({ filterKind: cat.filterKind, filterCategory: cat.filterCategory })}>
                <View style={[styles.categoryIcon, { backgroundColor: cat.bg }]}>
                  <Ionicons name={cat.icon} size={24} color={cat.fg} />
                </View>
                <ThemedText style={styles.categoryLabel} numberOfLines={1}>
                  {t(cat.labelKey)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Lugares destacados */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>{t('homeTab.featuredTitle')}</ThemedText>
          </View>

          {!loadingFeatured && destacados.length === 0 ? (
            <ThemedText style={[styles.emptyFeatured, { color: colors.icon }]}>
              {t('homeTab.emptyFeatured')}
            </ThemedText>
          ) : (
            <View style={styles.featuredWrap}>
              {destacados[0] && <FeaturedCard item={destacados[0]} large />}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredRow}>
                {destacados.slice(1).map((item) => (
                  <FeaturedCard key={`${item.kind}-${item.id}`} item={item} />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

export default function HomeScreen() {
  const reachable = useNetworkReachable();

  if (reachable === null) {
    return <HomeConnectivityLoader />;
  }

  if (reachable === false) {
    return <OfflineHomePlaceholder />;
  }

  return <HomeContent />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingTop: 0, paddingBottom: 40 },
  // ── Hero ──
  hero: {
    position: 'absolute',
    top: -36,
    left: 0,
    right: 0,
    height: 420,
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    justifyContent: 'flex-start',
    backgroundColor: '#fff',
    zIndex: 0,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroBottom: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 4,
  },
  heroGreeting: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    opacity: 0.92,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  // ── Search ──
  searchWrap: {
    paddingHorizontal: 16,
    marginBottom: 10,
    zIndex: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
  },
  // ── Sections ──
  section: {
    paddingHorizontal: 16,
    marginTop: 26,
  },
  categorySection: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 24,
    marginTop: 20,
    zIndex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  categoryHeader: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  // ── Categories ──
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    width: '22%',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  // ── Featured ──
  emptyFeatured: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  featuredWrap: {
    gap: 10,
  },
  featuredRow: {
    flexDirection: 'row',
    gap: 10,
  },
  featuredLarge: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredSmall: {
    width: 160,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredHeart: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredInfo: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    gap: 4,
  },
  featuredName: {
    fontSize: 14,
    fontWeight: '700',
  },
  featuredNameLarge: {
    fontSize: 18,
  },
  featuredStats: {
    flexDirection: 'row',
    gap: 12,
  },
  featuredStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
