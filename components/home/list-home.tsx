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
import { useTrailsStore } from '@/store/trails-store';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Animated, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchBar from './search-bar';
import TrailListCard from './trail-list-card';

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
    loading,
    loadingMore,
    fetchTrails,
    loadMoreTrails,
    total,
    trails,
    searchQuery,
  } = useTrailsStore();
  const { setMode, searchOpen, setSearchOpen } = useHomeStore();
  const { language, setLanguage } = useLanguageStore();
  const networkReachable = useNetworkReachable();

  const LANG_FLAG: Record<string, string> = { es: '🇦🇷', en: '🇺🇸', pt: '🇧🇷' };

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
    if (trails.length === 0) {
      fetchTrails(true);
    }
  }, [fetchTrails, trails.length]);

  const results = filteredTrails();

  const renderItem = useCallback(
    ({ item }: { item: Trail }) => (
      <TrailListCard
        trail={item}
        onMapPress={() => setMode('map')}
        onPress={(trail) => router.push({ pathname: '/trails/[id]', params: { id: trail.id } } as any)}
      />
    ),
    [setMode],
  );

  const keyExtractor = useCallback((item: Trail) => item.id, []);

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
              <ThemedText style={styles.langBtnText}>
                {LANG_FLAG[language] ?? language.toUpperCase()}
              </ThemedText>
            </TouchableOpacity>
          }
        />
        {total > 0 && (
          <ThemedText style={[styles.countText, { color: colors.icon }]}>
            {t('home.trailCount', { count: total })}
          </ThemedText>
        )}
      </View>

      {/* Skeleton o lista */}
      {loading ? (
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
  countText: {
    fontSize: 12,
    textAlign: 'center',
    paddingTop: 6,
    paddingBottom: 2,
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
  langBtnText: {
    fontSize: 22,
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
