import { ThemedText } from "@/components/themed-text";
import {
  SB_INPUT_HEIGHT,
  SB_INPUT_RADIUS,
  SB_PADDING_H,
  CARD_MARGIN,
  CARD_PADDING_TOP,
  CARD_RADIUS,
  CARD_TARGET_HEIGHT,
} from "@/constants/search-layout";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useHomeStore } from "@/store/home-store";
import { useTrailsStore } from "@/store/trails-store";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SUGGESTED = [
  { name: "Laguna Esmeralda", icon: "walk-outline", stats: [{ icon: "map-outline", value: "14 km" }, { icon: "time-outline", value: "5h 30m" }, { icon: "trending-up-outline", value: "520 m" }] },
  { name: "Glaciar Martial", icon: "walk-outline", stats: [{ icon: "map-outline", value: "6.2 km" }, { icon: "time-outline", value: "2h 45m" }, { icon: "trending-up-outline", value: "340 m" }] },
  { name: "Cerro Guanaco", icon: "walk-outline", stats: [{ icon: "map-outline", value: "20 km" }, { icon: "time-outline", value: "8h" }, { icon: "trending-up-outline", value: "970 m" }] },
  { name: "Paso Garibaldi", icon: "camera-outline", stats: [{ icon: "heart-outline", value: "1.2k likes" }, { icon: "eye-outline", value: "8.4k visitas" }, { icon: "star-outline", value: "4.8" }] },
  { name: "Bahía Lapataia", icon: "camera-outline", stats: [{ icon: "heart-outline", value: "3.1k likes" }, { icon: "eye-outline", value: "21k visitas" }, { icon: "star-outline", value: "4.9" }] },
  { name: "Cerro Castor", icon: "walk-outline", stats: [{ icon: "map-outline", value: "9 km" }, { icon: "time-outline", value: "3h 30m" }, { icon: "trending-up-outline", value: "410 m" }] },
  { name: "Laguna Negra", icon: "walk-outline", stats: [{ icon: "map-outline", value: "11 km" }, { icon: "time-outline", value: "4h" }, { icon: "trending-up-outline", value: "280 m" }] },
  { name: "Mirador del Beagle", icon: "camera-outline", stats: [{ icon: "heart-outline", value: "2.4k likes" }, { icon: "eye-outline", value: "15k visitas" }, { icon: "star-outline", value: "4.7" }] },
  { name: "Sendero de la Costa", icon: "walk-outline", stats: [{ icon: "map-outline", value: "7.5 km" }, { icon: "time-outline", value: "3h" }, { icon: "trending-up-outline", value: "120 m" }] },
  { name: "Lago Fagnano", icon: "camera-outline", stats: [{ icon: "heart-outline", value: "4.2k likes" }, { icon: "eye-outline", value: "32k visitas" }, { icon: "star-outline", value: "4.9" }] },
  { name: "Cerro Vinciguerra", icon: "walk-outline", stats: [{ icon: "map-outline", value: "16 km" }, { icon: "time-outline", value: "7h" }, { icon: "trending-up-outline", value: "890 m" }] },
  { name: "Valle de Andorra", icon: "walk-outline", stats: [{ icon: "map-outline", value: "12 km" }, { icon: "time-outline", value: "4h 30m" }, { icon: "trending-up-outline", value: "460 m" }] },
  { name: "Puerto Williams", icon: "camera-outline", stats: [{ icon: "heart-outline", value: "1.8k likes" }, { icon: "eye-outline", value: "11k visitas" }, { icon: "star-outline", value: "4.6" }] },
];

const CLOSE_DURATION = 220;
const EASE_OUT   = Easing.out(Easing.cubic);
const EASE_CLOSE = Easing.bezier(0.4, 0, 1, 1);
const EXPAND_THRESHOLD = 40;

const SP_DROP     = { damping: 22, stiffness: 300, mass: 0.85 } as const;
const SP_MARGIN   = { damping: 24, stiffness: 320, mass: 0.8  } as const;
const SP_EXPAND   = { damping: 26, stiffness: 280, mass: 0.9  } as const;
const SP_COLLAPSE = { damping: 24, stiffness: 260, mass: 0.85 } as const;

export default function SearchPanel() {
  const { top, bottom } = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const { searchQuery, setSearchQuery, recentSearches, addRecentSearch } = useTrailsStore();
  const { searchOpen, setSearchOpen, setMode } = useHomeStore();
  const inputRef = useRef<TextInput>(null);
  const [mounted, setMounted] = useState(false);
  const isExpanded = useRef(false);

  const targetTop = top + CARD_PADDING_TOP;

  // Animated values
  const cardHeight      = useSharedValue(SB_INPUT_HEIGHT);
  const cardHMargin     = useSharedValue(SB_PADDING_H);
  const cardRadius      = useSharedValue(SB_INPUT_RADIUS);
  const backdropOpacity = useSharedValue(0);
  const contentOpacity  = useSharedValue(0);
  const fadeOpacity     = useSharedValue(1);

  const focusInput = useCallback(() => inputRef.current?.focus(), []);
  const unmount    = useCallback(() => setMounted(false), []);

  const open = () => {
    cardHeight.value      = SB_INPUT_HEIGHT;
    cardHMargin.value     = SB_PADDING_H;
    cardRadius.value      = SB_INPUT_RADIUS;
    backdropOpacity.value = 0;
    contentOpacity.value  = 0;
    fadeOpacity.value     = 1;
    isExpanded.current    = false;

    backdropOpacity.value = withTiming(1, { duration: 180, easing: EASE_OUT });
    cardHeight.value      = withSpring(CARD_TARGET_HEIGHT, SP_DROP);
    cardHMargin.value     = withSpring(CARD_MARGIN, SP_MARGIN);
    cardRadius.value      = withTiming(CARD_RADIUS, { duration: 360, easing: EASE_OUT });

    contentOpacity.value = withDelay(
      160,
      withTiming(1, { duration: 200, easing: EASE_OUT }, (finished) => {
        if (finished) runOnJS(focusInput)();
      })
    );
  };

  const close = (cb?: () => void) => {
    const opt = { duration: CLOSE_DURATION, easing: EASE_CLOSE };

    contentOpacity.value  = withTiming(0, { duration: 80 });
    backdropOpacity.value = withTiming(0, opt);
    cardHMargin.value     = withTiming(SB_PADDING_H, opt);
    cardRadius.value      = withTiming(SB_INPUT_RADIUS, opt);

    cardHeight.value = withTiming(SB_INPUT_HEIGHT, opt, (finished) => {
      if (finished) {
        if (cb) runOnJS(cb)();
        runOnJS(unmount)();
      }
    });
  };

  // Mount when store opens, play open animation after mount
  useEffect(() => {
    if (searchOpen) {
      setMounted(true);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (mounted) open();
  }, [mounted]);

  // Animated styles
  const cardStyle     = useAnimatedStyle(() => ({
    top: targetTop,
    left: cardHMargin.value,
    right: cardHMargin.value,
    height: cardHeight.value,
    borderRadius: cardRadius.value,
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const contentStyle  = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const fadeStyle     = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));

  // Handlers
  const handleClose = () => close(() => setSearchOpen(false));

  const handleSubmit = () => {
    if (searchQuery.trim()) {
      addRecentSearch(searchQuery.trim());
      close(() => { setSearchOpen(false); setMode("list"); });
    }
  };

  const handleSelectRecent = (q: string) => {
    setSearchQuery(q);
    addRecentSearch(q);
    close(() => { setSearchOpen(false); setMode("list"); });
  };

  // Scroll expand
  const handleScroll = useCallback((e: any) => {
    if (!isExpanded.current && e.nativeEvent.contentOffset.y > EXPAND_THRESHOLD) {
      isExpanded.current = true;
      const fullHeight = screenHeight - targetTop;
      fadeOpacity.value = withTiming(0, { duration: 150 });
      cardHeight.value  = withSpring(fullHeight, SP_EXPAND);
      cardHMargin.value = withSpring(0, SP_EXPAND);
    }
  }, [screenHeight, targetTop]);

  const handleScrollEndDrag = useCallback((e: any) => {
    if (
      isExpanded.current &&
      e.nativeEvent.contentOffset.y <= 0 &&
      (e.nativeEvent.velocity?.y ?? 0) < -0.5
    ) {
      isExpanded.current = false;
      cardHeight.value  = withSpring(CARD_TARGET_HEIGHT, SP_COLLAPSE);
      cardHMargin.value = withSpring(CARD_MARGIN, SP_COLLAPSE);
      fadeOpacity.value = withTiming(1, { duration: 250 });
    }
  }, []);

  if (!mounted) return null;

  const dividerColor = isDark ? "#2a2a2a" : "#f0f0f0";
  const cardBg = isDark ? "#1c1c1e" : "#fff";

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">

      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]}>
          <BlurView
            style={StyleSheet.absoluteFillObject}
            intensity={80}
            tint={isDark ? "dark" : "light"}
          />
          <View style={[StyleSheet.absoluteFillObject, styles.backdropOverlay]} />
        </Animated.View>
      </TouchableWithoutFeedback>

      {/* Card — drops down from search bar position */}
      <Animated.View style={[styles.card, { backgroundColor: cardBg }, cardStyle]}>

        {/* Input — always visible at top */}
        <View style={styles.inputRow}>
          <View style={[styles.inputWrapper, { borderColor: isDark ? "#3a3a3a" : "#e8e8e8" }]}>
            <Ionicons name="search-outline" size={18} color={colors.icon} />
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: isDark ? "#fff" : "#212121" }]}
              placeholder="Buscar senderos..."
              placeholderTextColor={colors.icon}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSubmit}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* Content — fades in after card expands */}
        <Animated.View style={[styles.contentArea, contentStyle]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            scrollEventThrottle={16}
            contentContainerStyle={styles.scrollContent}
            onScroll={handleScroll}
            onScrollEndDrag={handleScrollEndDrag}
          >
            <View style={[styles.divider, { backgroundColor: dividerColor }]} />
            <ThemedText style={[styles.sectionLabel, { color: colors.icon }]}>
              Búsquedas recientes
            </ThemedText>
            {recentSearches.length === 0 ? (
              <View style={styles.emptySmall}>
                <ThemedText style={[styles.emptyText, { color: colors.icon }]}>
                  No tienes búsquedas recientes
                </ThemedText>
              </View>
            ) : (
              recentSearches.slice(0, 3).map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.row}
                  onPress={() => handleSelectRecent(q)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.iconWrap, { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" }]}>
                    <Ionicons name="time-outline" size={18} color={colors.icon} />
                  </View>
                  <ThemedText style={styles.rowTitle}>{q}</ThemedText>
                </TouchableOpacity>
              ))
            )}
            <View style={[styles.divider, { backgroundColor: dividerColor }]} />
            <ThemedText style={[styles.sectionLabel, { color: colors.icon }]}>Sugeridas</ThemedText>
            {SUGGESTED.map((s) => (
              <TouchableOpacity
                key={s.name}
                style={styles.row}
                onPress={() => handleSelectRecent(s.name)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.tint + "18" }]}>
                  <Ionicons name={s.icon as any} size={18} color={colors.tint} />
                </View>
                <View style={styles.rowText}>
                  <ThemedText style={styles.rowTitle}>{s.name}</ThemedText>
                  <View style={styles.suggestionStats}>
                    {s.stats.map((stat, i) => (
                      <View key={i} style={styles.suggestionStat}>
                        {i > 0 && (
                          <ThemedText style={[styles.statSeparator, { color: colors.icon }]}>|</ThemedText>
                        )}
                        <Ionicons name={stat.icon as any} size={11} color={colors.icon} />
                        <ThemedText style={[styles.suggestionStatText, { color: colors.icon }]}>
                          {stat.value}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Animated.View style={[styles.fadeOverlay, fadeStyle]} pointerEvents="none">
            <LinearGradient
              colors={isDark
                ? ["rgba(28,28,30,0)", "rgba(28,28,30,0.6)"]
                : ["rgba(255,255,255,0)", "rgba(255,255,255,0.5)"]
              }
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Bottom actions — fade in with content */}
      <Animated.View
        style={[styles.bottomActions, { bottom: bottom + 24 }, contentStyle]}
        pointerEvents="auto"
      >
        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
          <ThemedText style={styles.cancelText}>Cancelar</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: colors.tint }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Ionicons name="search" size={16} color="#fff" />
          <ThemedText style={styles.searchBtnText}>Buscar</ThemedText>
        </TouchableOpacity>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  backdropOverlay: {
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  card: {
    position: "absolute",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 18,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 22,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15 },
  contentArea: { flex: 1, overflow: "hidden" },
  scrollContent: { paddingBottom: 40 },
  fadeOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 48 },
  divider: { height: 1, marginHorizontal: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 4,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 11 },
  iconWrap: { width: 42, height: 42, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: "600" },
  suggestionStats: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 3 },
  suggestionStat: { flexDirection: "row", alignItems: "center", gap: 3 },
  suggestionStatText: { fontSize: 14 },
  statSeparator: { fontSize: 12, opacity: 0.4 },
  emptySmall: { paddingHorizontal: 16, paddingVertical: 12 },
  emptyText: { fontSize: 13 },
  bottomActions: {
    position: "absolute",
    left: 32,
    right: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cancelBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 100, backgroundColor: "#212121" },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  searchBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 100 },
  searchBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
