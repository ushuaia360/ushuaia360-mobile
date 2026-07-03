import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatPlaceCategoryLabel, PLACE_CATEGORY_ORDER } from '@/lib/place-category-map';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

const EASE_DROP = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_CLOSE = Easing.bezier(0.4, 0, 1, 1);

const PLACE_CATEGORIES = PLACE_CATEGORY_ORDER.map((key) => ({
  key,
  label: formatPlaceCategoryLabel(key),
}));

export interface FiltersState {
  /** Vacío = todos los tipos. Puede incluir 'trail' y/o 'place' simultáneamente. */
  filterKind: string[];
  filterDifficulty: string[];
  filterRouteType: string[];
  filterCategory: string[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  initial: FiltersState;
  onApply: (next: FiltersState) => void;
  /** Datos ya filtrados por búsqueda, sin aplicar los filtros de este panel — para previsualizar el conteo de resultados. */
  trails: { difficulty: string; type: string }[];
  places: { category?: string | null }[];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: colors.icon }]}>{title}</ThemedText>
      <View style={styles.pillWrap}>{children}</View>
    </View>
  );
}

function Pill({
  label,
  active,
  color,
  onPress,
  isDark,
  colors,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
  isDark: boolean;
  colors: any;
}) {
  const bg = active ? (color ?? colors.tint) : isDark ? '#2c2c2e' : '#F0F0F5';
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: withTiming(bg, { duration: 180 }),
  }));

  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      style={[styles.pill, animatedStyle]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.92, { damping: 16, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 260 });
        }}
        activeOpacity={1}
        style={styles.pillTap}
      >
        <ThemedText style={[styles.pillText, { color: active ? '#fff' : colors.icon }]}>
          {label}
        </ThemedText>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function FiltersOverlay({
  visible,
  onClose,
  initial,
  onApply,
  trails,
  places,
}: Props) {
  const { bottom } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const [mounted, setMounted] = useState(false);

  // Estado en borrador — solo se aplica al tocar "Ver resultados".
  const [filterKind, setFilterKind] = useState<string[]>(initial.filterKind);
  const [filterDifficulty, setFilterDifficulty] = useState<string[]>(initial.filterDifficulty);
  const [filterRouteType, setFilterRouteType] = useState<string[]>(initial.filterRouteType);
  const [filterCategory, setFilterCategory] = useState<string[]>(initial.filterCategory);

  const translateY = useSharedValue(PANEL_MAX_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const open = () => {
    translateY.value = PANEL_MAX_HEIGHT;
    backdropOpacity.value = 0;
    backdropOpacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 420, easing: EASE_DROP });
  };

  const close = (cb?: () => void) => {
    backdropOpacity.value = withTiming(0, { duration: 260, easing: EASE_CLOSE });
    translateY.value = withTiming(
      PANEL_MAX_HEIGHT,
      { duration: 300, easing: EASE_CLOSE },
      (finished) => {
        if (finished && cb) runOnJS(cb)();
      },
    );
  };

  useEffect(() => {
    if (visible) {
      // Refleja los filtros aplicados actualmente al abrir el panel.
      setFilterKind(initial.filterKind);
      setFilterDifficulty(initial.filterDifficulty);
      setFilterRouteType(initial.filterRouteType);
      setFilterCategory(initial.filterCategory);
      setMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (mounted && visible) open();
  }, [mounted]);

  const handleClose = () => {
    close(() => {
      setMounted(false);
      onClose();
    });
  };

  const handleApply = () => {
    onApply({ filterKind, filterDifficulty, filterRouteType, filterCategory });
    handleClose();
  };

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!mounted) return null;

  const clearAll = () => {
    setFilterKind([]);
    setFilterDifficulty([]);
    setFilterRouteType([]);
    setFilterCategory([]);
  };

  const activeCount =
    filterKind.length +
    filterDifficulty.length +
    filterRouteType.length +
    filterCategory.length;

  const showTrailFilters = !(filterKind.length === 1 && filterKind[0] === 'place');
  const showPlaceFilters = !(filterKind.length === 1 && filterKind[0] === 'trail');

  const trailCount = showTrailFilters
    ? trails
        .filter((tr) => !filterDifficulty.length || filterDifficulty.includes(tr.difficulty))
        .filter((tr) => !filterRouteType.length || filterRouteType.includes(tr.type)).length
    : 0;
  const placeCount = showPlaceFilters
    ? places.filter((p) => !filterCategory.length || filterCategory.includes(p.category ?? '')).length
    : 0;
  const resultCount = trailCount + placeCount;

  const dividerColor = isDark ? '#2a2a2a' : '#EDF0F5';
  const panelBg = isDark ? '#1c1c1e' : '#fff';

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <View style={StyleSheet.absoluteFillObject}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]}>
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' },
              ]}
            />
          </Animated.View>
        </TouchableWithoutFeedback>

        {/* Panel */}
        <Animated.View
          style={[
            styles.panel,
            { maxHeight: PANEL_MAX_HEIGHT, backgroundColor: panelBg },
            panelStyle,
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Filtros</ThemedText>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={10}
              style={[styles.closeBtn, { backgroundColor: isDark ? '#2c2c2e' : '#F0F0F5' }]}
            >
              <Ionicons name="close" size={18} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              activeCount === 0 && { paddingBottom: bottom + 24 },
            ]}
          >
            <Section title="Tipo">
              <Pill
                label="Todos"
                active={filterKind.length === 0}
                onPress={() => setFilterKind([])}
                isDark={isDark}
                colors={colors}
              />
              <Pill
                label="Senderos"
                active={filterKind.includes('trail')}
                onPress={() =>
                  setFilterKind((prev) =>
                    prev.includes('trail') ? prev.filter((x) => x !== 'trail') : [...prev, 'trail'],
                  )
                }
                isDark={isDark}
                colors={colors}
              />
              <Pill
                label="Puntos"
                active={filterKind.includes('place')}
                onPress={() =>
                  setFilterKind((prev) =>
                    prev.includes('place') ? prev.filter((x) => x !== 'place') : [...prev, 'place'],
                  )
                }
                isDark={isDark}
                colors={colors}
              />
            </Section>

            {showTrailFilters && (
              <Animated.View
                entering={FadeIn.duration(220)}
                exiting={FadeOut.duration(160)}
                layout={LinearTransition.duration(260)}
              >
                <View style={[styles.divider, { backgroundColor: dividerColor }]} />
                <Section title="Dificultad">
                  {[
                    { key: 'Fácil', color: '#34c759' },
                    { key: 'Media', color: '#ff9500' },
                    { key: 'Difícil', color: '#ff3b30' },
                  ].map(({ key, color }) => (
                    <Pill
                      key={key}
                      label={key}
                      color={color}
                      active={filterDifficulty.includes(key)}
                      onPress={() =>
                        setFilterDifficulty((prev) =>
                          prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
                        )
                      }
                      isDark={isDark}
                      colors={colors}
                    />
                  ))}
                </Section>

                <View style={[styles.divider, { backgroundColor: dividerColor }]} />
                <Section title="Tipo de ruta">
                  {['Circular', 'Lineal', 'Ida y vuelta'].map((key) => (
                    <Pill
                      key={key}
                      label={key}
                      active={filterRouteType.includes(key)}
                      onPress={() =>
                        setFilterRouteType((prev) =>
                          prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
                        )
                      }
                      isDark={isDark}
                      colors={colors}
                    />
                  ))}
                </Section>
              </Animated.View>
            )}

            {showPlaceFilters && (
              <Animated.View
                entering={FadeIn.duration(220)}
                exiting={FadeOut.duration(160)}
                layout={LinearTransition.duration(260)}
              >
                <View style={[styles.divider, { backgroundColor: dividerColor }]} />
                <Section title="Categoría">
                  {PLACE_CATEGORIES.map(({ key, label }) => (
                    <Pill
                      key={key}
                      label={label}
                      active={filterCategory.includes(key)}
                      onPress={() =>
                        setFilterCategory((prev) =>
                          prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
                        )
                      }
                      isDark={isDark}
                      colors={colors}
                    />
                  ))}
                </Section>
              </Animated.View>
            )}
          </ScrollView>

          {activeCount > 0 && (
            <Animated.View
              entering={FadeInDown.duration(240)}
              exiting={FadeOutDown.duration(180)}
              style={[styles.footer, { paddingBottom: bottom + 16, borderTopColor: dividerColor }]}
            >
              <TouchableOpacity onPress={clearAll} activeOpacity={0.7} style={styles.clearBtn}>
                <ThemedText style={[styles.clearText, { color: colors.icon }]}>
                  Limpiar ({activeCount})
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApply}
                activeOpacity={0.85}
                style={[styles.applyBtn, { backgroundColor: colors.tint }]}
              >
                <ThemedText style={styles.applyText}>Ver {resultCount} resultados</ThemedText>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  pillTap: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
  },
  applyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 100,
  },
  applyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
