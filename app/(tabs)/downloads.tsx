import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveApiMediaUrl } from '@/lib/resolve-api-media-url';
import { formatPlaceCategoryLabel } from '@/lib/place-category-map';
import {
  listManualDownloads,
  removeManualPlaceDownload,
  removeManualTrailDownload,
  type ManualPlaceEntry,
  type ManualTrailEntry,
} from '@/lib/offline-pack';
import { openTrail } from '@/lib/trail-premium-gate';
import { useAuthStore } from '@/store/auth-store';
import { usePurchasesStore } from '@/store/purchases-store';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Helpers ──────────────────────────────────────────────────────────────────

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  easy:   { label: 'Fácil',   color: '#34c759' },
  medium: { label: 'Media',   color: '#ff9500' },
  hard:   { label: 'Difícil', color: '#ff3b30' },
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const ANIM_DURATION = 260;
const SHEET_HEIGHT = 220;

// ── Delete modal ──────────────────────────────────────────────────────────────

interface DeleteModalProps {
  name: string;
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDark: boolean;
  bottom: number;
}

function DeleteModal({ name, visible, onClose, onConfirm, isDark, bottom }: DeleteModalProps) {
  const sheetBg = isDark ? '#1c1c1e' : '#fff';
  const cancelBg = isDark ? '#2c2c2e' : '#f2f2f7';
  const cancelColor = isDark ? '#fff' : '#000';

  const overlayOpacity = useSharedValue(0);
  const translateY = useSharedValue(SHEET_HEIGHT);
  const mountedRef = useRef(false);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const animateIn = useCallback(() => {
    overlayOpacity.value = withTiming(1, { duration: ANIM_DURATION, easing: Easing.out(Easing.ease) });
    translateY.value = withTiming(0, { duration: ANIM_DURATION, easing: Easing.out(Easing.cubic) });
  }, []);

  const animateOut = useCallback((cb: () => void) => {
    overlayOpacity.value = withTiming(0, { duration: ANIM_DURATION, easing: Easing.in(Easing.ease) });
    translateY.value = withTiming(SHEET_HEIGHT, { duration: ANIM_DURATION, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(cb)();
    });
  }, []);

  // Trigger enter animation when modal becomes visible
  if (visible && !mountedRef.current) {
    mountedRef.current = true;
    // schedule for next frame
    setTimeout(animateIn, 0);
  }
  if (!visible) {
    mountedRef.current = false;
  }

  const handleClose = () => animateOut(onClose);
  const handleConfirm = () => animateOut(onConfirm);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleClose}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, overlayStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { backgroundColor: sheetBg, paddingBottom: bottom + 12 }, sheetStyle]}>
        {/* Handle */}
        <View style={styles.sheetHandle} />

        {/* Trail name */}
        <ThemedText style={styles.sheetTrailName} numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText style={styles.sheetQuestion}>
          ¿Eliminás esta descarga?
        </ThemedText>

        {/* Buttons */}
        <TouchableOpacity
          style={styles.deleteBtn}
          activeOpacity={0.82}
          onPress={handleConfirm}>
          <ThemedText style={styles.deleteBtnText}>Eliminar descarga</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: cancelBg }]}
          activeOpacity={0.82}
          onPress={handleClose}>
          <ThemedText style={[styles.cancelBtnText, { color: cancelColor }]}>Cancelar</ThemedText>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

type PendingDeletion =
  | { kind: 'trail'; id: string; name: string }
  | { kind: 'place'; id: string; name: string };

export default function DownloadsScreen() {
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const headerBg = isDark ? '#1c1c1e' : '#fff';
  const headerBorder = isDark ? '#2a2a2a' : '#EDF0F5';
  const pageBg = isDark ? '#000' : '#fff';
  const user = useAuthStore((s) => s.user);
  const isPro = usePurchasesStore((s) => s.isPro);

  const [trailEntries, setTrailEntries] = useState<ManualTrailEntry[]>([]);
  const [placeEntries, setPlaceEntries] = useState<ManualPlaceEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    const { trails, places } = await listManualDownloads();
    setTrailEntries(trails);
    setPlaceEntries(places);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const totalTrails = trailEntries.length;
  const totalPlaces = placeEntries.length;
  const total = totalTrails + totalPlaces;

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, []);

  const headerSubtitle =
    total === 0
      ? t('downloads.empty')
      : t(total === 1 ? 'downloads.itemsSaved_one' : 'downloads.itemsSaved_other', { count: total });

  const openDeleteModal = (pending: PendingDeletion) => {
    setPendingDeletion(pending);
    setModalVisible(true);
  };

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setPendingDeletion(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDeletion) return;
    const { kind, id } = pendingDeletion;
    setModalVisible(false);
    setPendingDeletion(null);
    if (kind === 'trail') {
      await removeManualTrailDownload(id);
    } else {
      await removeManualPlaceDownload(id);
    }
    await load();
  }, [pendingDeletion, load]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.headerBack}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel={t('downloads.back')}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <ThemedText style={styles.headerTitle}>{t('downloads.title')}</ThemedText>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }>

        {trailEntries.length > 0 ? (
          <>
            {/* Section header */}
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionTitle, { color: colors.icon }]}>
                {t('downloads.sectionTrails')}
              </ThemedText>
              <View style={[styles.countBadge, { backgroundColor: colors.tint + '18' }]}>
                <ThemedText style={[styles.countBadgeText, { color: colors.tint }]}>{totalTrails}</ThemedText>
              </View>
            </View>

            {/* Trail cards */}
            {trailEntries.map((entry) => {
              const thumb =
                resolveApiMediaUrl(entry.detail.thumbnail_url ?? entry.detail.image_urls?.[0] ?? null) ??
                entry.detail.thumbnail_url ??
                entry.detail.image_urls?.[0] ??
                '';
              const diff = DIFFICULTY_MAP[entry.detail.difficulty] ?? DIFFICULTY_MAP.medium;

              const statParts: string[] = [];
              if (entry.detail.distance_km != null) statParts.push(`${entry.detail.distance_km} km`);
              if (entry.detail.duration_minutes != null) statParts.push(formatDuration(entry.detail.duration_minutes));
              if (entry.detail.elevation_gain != null) statParts.push(`↑${entry.detail.elevation_gain} m`);
              const stats = statParts.join('  ·  ');

              return (
                <View key={entry.id} style={[styles.card, { backgroundColor: cardBg }]}>
                  <TouchableOpacity
                    style={styles.cardMain}
                    activeOpacity={0.85}
                    onPress={() => openTrail(entry.id, user, isPro)}>

                    {thumb ? (
                      <ExpoImage
                        source={{ uri: thumb }}
                        style={styles.cardImg}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={150}
                      />
                    ) : (
                      <View style={[styles.cardImg, styles.cardImgPlaceholder, { backgroundColor: isDark ? '#2a2a2a' : '#e8eaed' }]}>
                        <Ionicons name="trail-sign-outline" size={26} color={colors.icon} />
                      </View>
                    )}

                    <View style={styles.cardInfo}>
                      <ThemedText style={styles.cardTitle} numberOfLines={2}>
                        {entry.detail.name ?? t('downloads.defaultTrailName')}
                      </ThemedText>

                      <View style={styles.cardMeta}>
                        <View style={[styles.diffBadge, { backgroundColor: diff.color + '22' }]}>
                          <ThemedText style={[styles.diffLabel, { color: diff.color }]}>{diff.label}</ThemedText>
                        </View>
                        {entry.detail.region ? (
                          <ThemedText style={[styles.cardRegion, { color: colors.icon }]} numberOfLines={1}>
                            {entry.detail.region}
                          </ThemedText>
                        ) : null}
                      </View>

                      {stats ? (
                        <ThemedText style={[styles.cardStats, { color: colors.icon }]} numberOfLines={1}>
                          {stats}
                        </ThemedText>
                      ) : null}

                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cardDelete}
                    onPress={() =>
                      openDeleteModal({
                        kind: 'trail',
                        id: entry.id,
                        name: entry.detail.name ?? t('downloads.defaultTrailName'),
                      })
                    }
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={t('downloads.removeTitle')}>
                    <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        ) : null}

        {placeEntries.length > 0 ? (
          <>
            {/* Section header */}
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionTitle, { color: colors.icon }]}>
                {t('downloads.sectionPlaces')}
              </ThemedText>
              <View style={[styles.countBadge, { backgroundColor: colors.tint + '18' }]}>
                <ThemedText style={[styles.countBadgeText, { color: colors.tint }]}>{totalPlaces}</ThemedText>
              </View>
            </View>

            {/* Place cards */}
            {placeEntries.map((entry) => {
              const thumb =
                resolveApiMediaUrl(entry.place.image_urls?.[0] ?? null) ?? entry.place.image_urls?.[0] ?? '';
              const categoryLabel = entry.place.category ? formatPlaceCategoryLabel(entry.place.category) : null;

              return (
                <View key={entry.id} style={[styles.card, { backgroundColor: cardBg }]}>
                  <TouchableOpacity
                    style={styles.cardMain}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({ pathname: '/places/[id]', params: { id: entry.id } } as never)
                    }>

                    {thumb ? (
                      <ExpoImage
                        source={{ uri: thumb }}
                        style={styles.cardImg}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={150}
                      />
                    ) : (
                      <View style={[styles.cardImg, styles.cardImgPlaceholder, { backgroundColor: isDark ? '#2a2a2a' : '#e8eaed' }]}>
                        <Ionicons name="location-outline" size={26} color={colors.icon} />
                      </View>
                    )}

                    <View style={styles.cardInfo}>
                      <ThemedText style={styles.cardTitle} numberOfLines={2}>
                        {entry.place.name ?? t('downloads.defaultPlaceName')}
                      </ThemedText>

                      <View style={styles.cardMeta}>
                        {categoryLabel ? (
                          <View style={[styles.diffBadge, { backgroundColor: colors.tint + '22' }]}>
                            <ThemedText style={[styles.diffLabel, { color: colors.tint }]}>{categoryLabel}</ThemedText>
                          </View>
                        ) : null}
                        {entry.place.region ? (
                          <ThemedText style={[styles.cardRegion, { color: colors.icon }]} numberOfLines={1}>
                            {entry.place.region}
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cardDelete}
                    onPress={() =>
                      openDeleteModal({
                        kind: 'place',
                        id: entry.id,
                        name: entry.place.name ?? t('downloads.defaultPlaceName'),
                      })
                    }
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={t('downloads.removeTitle')}>
                    <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        ) : null}

        {total === 0 && !refreshing ? (
          <View style={styles.empty}>
            {/* Icon */}
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.tint + '12' }]}>
              <Ionicons name="arrow-down-circle-outline" size={52} color={colors.tint} />
            </View>

            <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
              Sin descargas
            </ThemedText>
            <ThemedText style={[styles.emptySub, { color: colors.icon }]}>
              Guardá senderos y lugares para recorrerlos sin internet, incluso en las zonas más remotas.
            </ThemedText>

            {/* Steps */}
            <View style={[styles.stepsCard, { backgroundColor: isDark ? '#1c1c1e' : '#f7f7f9' }]}>
              {[
                { icon: 'search-outline' as const,         text: 'Encontrá un sendero o lugar' },
                { icon: 'arrow-down-circle-outline' as const, text: 'Tocá el botón de descarga' },
                { icon: 'navigate-outline' as const,       text: 'Caminá sin conexión' },
              ].map((step, i, arr) => (
                <View key={i}>
                  <View style={styles.step}>
                    <View style={[styles.stepIconWrap, { backgroundColor: colors.tint + '18' }]}>
                      <Ionicons name={step.icon} size={18} color={colors.tint} />
                    </View>
                    <ThemedText style={[styles.stepText, { color: colors.text }]}>{step.text}</ThemedText>
                  </View>
                  {i < arr.length - 1 && (
                    <View style={[styles.stepDivider, { backgroundColor: isDark ? '#2a2a2a' : '#e8e8ed' }]} />
                  )}
                </View>
              ))}
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: colors.tint }]}
              activeOpacity={0.85}
              onPress={() => router.replace('/(tabs)')}>
              <ThemedText style={styles.ctaBtnText}>Explorar</ThemedText>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      <DeleteModal
        name={pendingDeletion?.name ?? ''}
        visible={modalVisible}
        onClose={closeModal}
        onConfirm={confirmDelete}
        isDark={isDark}
        bottom={bottom}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40, paddingTop: 16 },

  // Header
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

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  countBadgeText: { fontSize: 12, fontWeight: '700' },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 6,
  },
  cardImg: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#e8eaed',
    flexShrink: 0,
  },
  cardImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, minWidth: 0, gap: 0 },
  cardTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginTop: 10 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  diffLabel: { fontSize: 11, fontWeight: '700' },
  cardRegion: { fontSize: 12, fontWeight: '500', flexShrink: 1 },
  cardStats: { fontSize: 12, fontWeight: '500', marginTop: 10 },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  offlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#34c759' },
  offlineLabel: { fontSize: 11, fontWeight: '600', color: '#34c759' },
  cardDelete: { paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },

  // Empty state
  empty: { paddingHorizontal: 24, paddingTop: 56, alignItems: 'center', gap: 16 },
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
  stepsCard: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepText: { fontSize: 14, fontWeight: '500', flex: 1 },
  stepDivider: { height: StyleSheet.hairlineWidth, marginLeft: 50 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 52,
    borderRadius: 14,
    marginTop: 4,
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Delete modal
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120,120,128,0.3)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTrailName: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sheetQuestion: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteBtn: {
    backgroundColor: '#ff3b30',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
