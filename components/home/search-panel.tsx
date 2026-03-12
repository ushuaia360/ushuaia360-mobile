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
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
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

const EXPAND_THRESHOLD = 40;

/* ── Memoized row for suggested trails ── */
const SuggestedRow = React.memo(function SuggestedRow({
  item,
  iconColor,
  iconBg,
  statColor,
  onPress,
}: {
  item: (typeof SUGGESTED)[number];
  iconColor: string;
  iconBg: string;
  statColor: string;
  onPress: (name: string) => void;
}) {
  return (
    <TouchableOpacity
      style={memoStyles.row}
      onPress={() => onPress(item.name)}
      activeOpacity={0.75}
    >
      <View style={[memoStyles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={item.icon as any} size={18} color={iconColor} />
      </View>
      <View style={memoStyles.rowText}>
        <ThemedText style={memoStyles.rowTitle}>{item.name}</ThemedText>
        <View style={memoStyles.suggestionStats}>
          {item.stats.map((stat, i) => (
            <View key={i} style={memoStyles.suggestionStat}>
              {i > 0 && (
                <ThemedText style={[memoStyles.statSeparator, { color: statColor }]}>|</ThemedText>
              )}
              <Ionicons name={stat.icon as any} size={11} color={statColor} />
              <ThemedText style={[memoStyles.suggestionStatText, { color: statColor }]}>
                {stat.value}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const memoStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 11 },
  iconWrap: { width: 42, height: 42, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: "600" },
  suggestionStats: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 3 },
  suggestionStat: { flexDirection: "row", alignItems: "center", gap: 3 },
  suggestionStatText: { fontSize: 14 },
  statSeparator: { fontSize: 12, opacity: 0.4 },
});

// Smooth expo-out — arranca rápido, desacelera gradualmente
const EASE_DROP  = Easing.bezier(0.22, 1, 0.36, 1);
// Aceleración suave al cerrar
const EASE_CLOSE = Easing.bezier(0.4, 0, 1, 1);
const EASE_OUT   = Easing.out(Easing.cubic);

export default function SearchPanel() {
  const { top, bottom } = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const { searchQuery, setSearchQuery, recentSearches, addRecentSearch } = useTrailsStore();
  const { searchOpen, setSearchOpen, setMode, setBottomSheetIndex } = useHomeStore();
  const inputRef = useRef<TextInput>(null);
  const [mounted, setMounted] = useState(false);

  const targetTop = top + CARD_PADDING_TOP;

  // Animated values
  const cardHeight       = useSharedValue(SB_INPUT_HEIGHT);
  const cardHMargin      = useSharedValue(SB_PADDING_H);
  const cardRadius       = useSharedValue(SB_INPUT_RADIUS);
  const backdropOpacity  = useSharedValue(0);
  const contentOpacity   = useSharedValue(0);  // content inside card
  const externalOpacity  = useSharedValue(0);  // card2 + buttons
  const fadeOpacity      = useSharedValue(1);

  const focusInput = useCallback(() => inputRef.current?.focus(), []);
  const unmount    = useCallback(() => setMounted(false), []);

  const open = () => {
    cardHeight.value      = SB_INPUT_HEIGHT;
    cardHMargin.value     = SB_PADDING_H;
    cardRadius.value      = SB_INPUT_RADIUS;
    backdropOpacity.value  = 0;
    contentOpacity.value   = 0;
    externalOpacity.value  = 0;
    fadeOpacity.value      = 1;
    // Backdrop
    backdropOpacity.value = withTiming(1, { duration: 320, easing: EASE_OUT });

    // Card cae hacia abajo — expo-out, muy smooth
    cardHeight.value  = withTiming(CARD_TARGET_HEIGHT, { duration: 540, easing: EASE_DROP });
    cardHMargin.value = withTiming(CARD_MARGIN,        { duration: 500, easing: EASE_DROP });
    cardRadius.value  = withTiming(CARD_RADIUS,        { duration: 500, easing: EASE_DROP });

    // Contenido dentro de la card
    contentOpacity.value = withDelay(
      220,
      withTiming(1, { duration: 240, easing: EASE_OUT }, (finished) => {
        if (finished) runOnJS(focusInput)();
      })
    );

    // Card2 + botones — cuando la card ya está asentada
    externalOpacity.value = withDelay(460, withTiming(1, { duration: 200, easing: EASE_OUT }));
  };

  const close = (cb?: () => void) => {
    const opt = { duration: 300, easing: EASE_CLOSE };

    contentOpacity.value  = withTiming(0, { duration: 120 });
    externalOpacity.value = withTiming(0, { duration: 100 });
    backdropOpacity.value = withTiming(0, opt);
    cardHMargin.value     = withTiming(SB_PADDING_H,   opt);
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
  const backdropStyle  = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const contentStyle   = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const externalStyle  = useAnimatedStyle(() => ({ opacity: externalOpacity.value }));
  const fadeStyle      = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));

  // Handlers
  const handleClose = () => close(() => setSearchOpen(false));

  const handleSubmit = () => {
    if (searchQuery.trim()) {
      addRecentSearch(searchQuery.trim());
      close(() => { setSearchOpen(false); setMode("list"); });
    }
  };

  const handleSelectRecent = useCallback((q: string) => {
    setSearchQuery(q);
    addRecentSearch(q);
    close(() => { setSearchOpen(false); setMode("list"); });
  }, []);

  // Pre-compute stable colors for memoized rows
  const iconBg = colors.tint + "18";
  const suggestedRows = useMemo(
    () =>
      SUGGESTED.map((s) => (
        <SuggestedRow
          key={s.name}
          item={s}
          iconColor={colors.tint}
          iconBg={iconBg}
          statColor={colors.icon}
          onPress={handleSelectRecent}
        />
      )),
    [colors.tint, colors.icon, iconBg, handleSelectRecent],
  );

  // Scroll expand — runs entirely on UI thread via worklets
  const expanded = useSharedValue(false);
  const fullHeight = screenHeight - targetTop;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (!expanded.value && event.contentOffset.y > EXPAND_THRESHOLD) {
        expanded.value = true;
        fadeOpacity.value     = withTiming(0, { duration: 180 });
        externalOpacity.value = withTiming(0, { duration: 180 });
        cardHeight.value  = withTiming(fullHeight, { duration: 480, easing: EASE_DROP });
        cardHMargin.value = withTiming(0,          { duration: 460, easing: EASE_DROP });
      }
    },
    onEndDrag: (event) => {
      if (
        expanded.value &&
        event.contentOffset.y <= 0 &&
        (event.velocity?.y ?? 0) < -0.5
      ) {
        expanded.value = false;
        cardHeight.value      = withTiming(CARD_TARGET_HEIGHT, { duration: 420, easing: EASE_DROP });
        cardHMargin.value     = withTiming(CARD_MARGIN,        { duration: 400, easing: EASE_DROP });
        fadeOpacity.value     = withTiming(1, { duration: 300, easing: EASE_OUT });
        externalOpacity.value = withTiming(1, { duration: 280, easing: EASE_OUT });
      }
    },
  });

  if (!mounted) return null;

  const dividerColor = isDark ? "#2a2a2a" : "#f0f0f0";
  const cardBg = isDark ? "#1c1c1e" : "#fff";

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">

      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.backdrop,
            { backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.25)" },
            backdropStyle,
          ]}
        />
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
          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            scrollEventThrottle={16}
            contentContainerStyle={styles.scrollContent}
            onScroll={scrollHandler}
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
            {suggestedRows}
          </Animated.ScrollView>
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

      {/* Puntos cercanos */}
      <Animated.View
        style={[styles.card2, { top: targetTop + CARD_TARGET_HEIGHT + 10, left: CARD_MARGIN, right: CARD_MARGIN, backgroundColor: cardBg }, externalStyle]}
        pointerEvents="auto"
      >
        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            // Expand bottom sheet to max (index 2 = "72%") and close search panel
            setBottomSheetIndex(2);
            close(() => setSearchOpen(false));
          }}
          activeOpacity={0.75}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.tint + "18" }]}>
            <Ionicons name="location-outline" size={18} color={colors.tint} />
          </View>
          <View style={styles.rowText}>
            <ThemedText style={styles.rowTitle}>Puntos cercanos</ThemedText>
            <ThemedText style={[styles.rowSub, { color: colors.icon }]}>Senderos y lugares cerca tuyo</ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.icon} />
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom actions — fade in with content */}
      <Animated.View
        style={[styles.bottomActions, { bottom: bottom + 24 }, externalStyle]}
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
  backdrop: {},
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
  emptySmall: { paddingHorizontal: 16, paddingVertical: 12 },
  emptyText: { fontSize: 13 },
  card2: {
    position: "absolute",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  rowSub: { fontSize: 14 },
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
