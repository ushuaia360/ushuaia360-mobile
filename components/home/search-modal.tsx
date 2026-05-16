import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useHomeStore } from "@/store/home-store";
import { useTrailsStore } from "@/store/trails-store";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SUGGESTED = [
  {
    name: "Laguna Esmeralda",
    icon: "walk-outline",
    stats: [
      { icon: "map-outline", value: "14 km" },
      { icon: "time-outline", value: "5h 30m" },
      { icon: "trending-up-outline", value: "520 m" },
    ],
  },
  {
    name: "Glaciar Martial",
    icon: "walk-outline",
    stats: [
      { icon: "map-outline", value: "6.2 km" },
      { icon: "time-outline", value: "2h 45m" },
      { icon: "trending-up-outline", value: "340 m" },
    ],
  },
  {
    name: "Cerro Guanaco",
    icon: "walk-outline",
    stats: [
      { icon: "map-outline", value: "20 km" },
      { icon: "time-outline", value: "8h" },
      { icon: "trending-up-outline", value: "970 m" },
    ],
  },
  {
    name: "Paso Garibaldi",
    icon: "camera-outline",
    stats: [
      { icon: "heart-outline", value: "1.2k likes" },
      { icon: "eye-outline", value: "8.4k visitas" },
      { icon: "star-outline", value: "4.8" },
    ],
  },
  {
    name: "Bahía Lapataia",
    icon: "camera-outline",
    stats: [
      { icon: "heart-outline", value: "3.1k likes" },
      { icon: "eye-outline", value: "21k visitas" },
      { icon: "star-outline", value: "4.9" },
    ],
  },
  {
    name: "Cerro Castor",
    icon: "walk-outline",
    stats: [
      { icon: "map-outline", value: "9 km" },
      { icon: "time-outline", value: "3h 30m" },
      { icon: "trending-up-outline", value: "410 m" },
    ],
  },
  {
    name: "Laguna Negra",
    icon: "walk-outline",
    stats: [
      { icon: "map-outline", value: "11 km" },
      { icon: "time-outline", value: "4h" },
      { icon: "trending-up-outline", value: "280 m" },
    ],
  },
  {
    name: "Mirador del Beagle",
    icon: "camera-outline",
    stats: [
      { icon: "heart-outline", value: "2.4k likes" },
      { icon: "eye-outline", value: "15k visitas" },
      { icon: "star-outline", value: "4.7" },
    ],
  },
  {
    name: "Sendero de la Costa",
    icon: "walk-outline",
    stats: [
      { icon: "map-outline", value: "7.5 km" },
      { icon: "time-outline", value: "3h" },
      { icon: "trending-up-outline", value: "120 m" },
    ],
  },
  {
    name: "Lago Fagnano",
    icon: "camera-outline",
    stats: [
      { icon: "heart-outline", value: "4.2k likes" },
      { icon: "eye-outline", value: "32k visitas" },
      { icon: "star-outline", value: "4.9" },
    ],
  },
  {
    name: "Cerro Vinciguerra",
    icon: "walk-outline",
    stats: [
      { icon: "map-outline", value: "16 km" },
      { icon: "time-outline", value: "7h" },
      { icon: "trending-up-outline", value: "890 m" },
    ],
  },
  {
    name: "Valle de Andorra",
    icon: "walk-outline",
    stats: [
      { icon: "map-outline", value: "12 km" },
      { icon: "time-outline", value: "4h 30m" },
      { icon: "trending-up-outline", value: "460 m" },
    ],
  },
  {
    name: "Puerto Williams",
    icon: "camera-outline",
    stats: [
      { icon: "heart-outline", value: "1.8k likes" },
      { icon: "eye-outline", value: "11k visitas" },
      { icon: "star-outline", value: "4.6" },
    ],
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SearchModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const { searchQuery, setSearchQuery, recentSearches, addRecentSearch } =
    useTrailsStore();
  const { setMode } = useHomeStore();
  const inputRef = useRef<TextInput>(null);
  const lastScrollY = useRef(0);
  const dragStartY = useRef(0);
  const [isRendered, setIsRendered] = useState(false);

  const translateY = useSharedValue(-300);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.88);
  const scrollHeight = useSharedValue(320);
  const cardMargin = useSharedValue(12);
  const actionsOpacity = useSharedValue(1);
  const fadeOpacity = useSharedValue(1);

  const animateOut = (callback?: () => void) => {
    opacity.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) });
    translateY.value = withTiming(-300, { duration: 300, easing: Easing.in(Easing.exp) });
    scale.value = withTiming(0.88, { duration: 300, easing: Easing.in(Easing.exp) });
    setTimeout(() => {
      setIsRendered(false);
      callback?.();
    }, 310);
  };

  const handleClose = () => {
    animateOut(onClose);
  };

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
      translateY.value = withSpring(0, { damping: 20, stiffness: 160, mass: 0.9 });
      scale.value = withSpring(1, { damping: 20, stiffness: 160, mass: 0.9 });
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const scrollStyle = useAnimatedStyle(() => ({
    height: scrollHeight.value,
  }));

  const cardWrapperStyle = useAnimatedStyle(() => ({
    left: cardMargin.value,
    right: cardMargin.value,
  }));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
    pointerEvents: actionsOpacity.value === 0 ? "none" : "auto",
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleSubmit = () => {
    if (searchQuery.trim()) {
      addRecentSearch(searchQuery.trim());
      onClose();
      setMode("list");
    }
  };

  const handleSelectRecent = (q: string) => {
    setSearchQuery(q);
    addRecentSearch(q);
    onClose();
    setMode("list");
  };

  const handleSelectNearby = () => {
    onClose();
  };

  const dividerColor = isDark ? "#2a2a2a" : "#f0f0f0";
  const cardBg = isDark ? "#1c1c1e" : "#fff";

  if (!isRendered && !visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      {/* Blurred backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]}>
          <BlurView
            style={StyleSheet.absoluteFillObject}
            intensity={80}
            tint={isDark ? "dark" : "light"}
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.12)" },
            ]}
          />
        </Animated.View>
      </TouchableWithoutFeedback>

      {/* Sliding cards */}
      <Animated.View
        style={[
          styles.cardWrapper,
          { paddingTop: top + 40 },
          cardStyle,
          cardWrapperStyle,
        ]}
      >
        {/* Card 1: Search input + Recientes + Sugeridas */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {/* Input fijo */}
          <View style={styles.inputRow}>
            <View
              style={[
                styles.inputWrapper,
                { borderColor: isDark ? "#3a3a3a" : "#e8e8e8" },
              ]}
            >
              <Ionicons name="search-outline" size={18} color={colors.icon} />
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: isDark ? "#fff" : "#212121" }]}
                placeholder={t('search.modal.placeholder')}
                placeholderTextColor={colors.icon}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={handleSubmit}
                clearButtonMode="while-editing"
              />
            </View>
          </View>

          <Animated.View style={[styles.suggestedScroll, scrollStyle]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
              onScrollBeginDrag={(e) => {
                dragStartY.current = e.nativeEvent.contentOffset.y;
                fadeOpacity.value = withTiming(0, { duration: 200 });
                scrollHeight.value = withTiming(screenHeight, {
                  duration: 500,
                  easing: Easing.out(Easing.exp),
                });
                cardMargin.value = withTiming(0, {
                  duration: 500,
                  easing: Easing.out(Easing.exp),
                });
                actionsOpacity.value = withTiming(0, {
                  duration: 250,
                  easing: Easing.out(Easing.cubic),
                });
              }}
              onScrollEndDrag={(e) => {
                const currentY = e.nativeEvent.contentOffset.y;
                const velocityY = e.nativeEvent.velocity?.y ?? 0;
                if (currentY <= 0 && velocityY < -0.5) {
                  scrollHeight.value = withTiming(320, {
                    duration: 420,
                    easing: Easing.out(Easing.exp),
                  });
                  cardMargin.value = withTiming(12, {
                    duration: 420,
                    easing: Easing.out(Easing.exp),
                  });
                  actionsOpacity.value = withTiming(1, {
                    duration: 350,
                    easing: Easing.out(Easing.cubic),
                  });
                  fadeOpacity.value = withTiming(1, { duration: 350 });
                }
              }}
            >
              <View
                style={[styles.divider, { backgroundColor: dividerColor }]}
              />
              <ThemedText style={[styles.sectionLabel, { color: colors.icon }]}>
                {t('search.modal.recent')}
              </ThemedText>
              {recentSearches.length === 0 ? (
                <View style={styles.emptySmall}>
                  <ThemedText
                    style={[styles.emptyText, { color: colors.icon }]}
                  >
                    {t('search.modal.noRecent')}
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
                    <View
                      style={[
                        styles.iconWrap,
                        { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
                      ]}
                    >
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={colors.icon}
                      />
                    </View>
                    <ThemedText style={styles.rowTitle}>{q}</ThemedText>
                  </TouchableOpacity>
                ))
              )}

              <View
                style={[styles.divider, { backgroundColor: dividerColor }]}
              />
              <ThemedText style={[styles.sectionLabel, { color: colors.icon }]}>
                {t('search.modal.suggested')}
              </ThemedText>
              {SUGGESTED.map((s) => (
                <TouchableOpacity
                  key={s.name}
                  style={styles.row}
                  onPress={() => handleSelectRecent(s.name)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: colors.tint + "18" },
                    ]}
                  >
                    <Ionicons
                      name={s.icon as any}
                      size={18}
                      color={colors.tint}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <ThemedText style={styles.rowTitle}>{s.name}</ThemedText>
                    <View style={styles.suggestionStats}>
                      {s.stats.map((stat, i) => (
                        <View key={i} style={styles.suggestionStat}>
                          {i > 0 && (
                            <ThemedText
                              style={[
                                styles.statSeparator,
                                { color: colors.icon },
                              ]}
                            >
                              |
                            </ThemedText>
                          )}
                          <Ionicons
                            name={stat.icon as any}
                            size={11}
                            color={colors.icon}
                          />
                          <ThemedText
                            style={[
                              styles.suggestionStatText,
                              { color: colors.icon },
                            ]}
                          >
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
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.40)']}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </Animated.View>
        </View>

        {/* Card 2: Puntos cercanos */}
        <View
          style={[styles.card, styles.cardGap, { backgroundColor: cardBg }]}
        >
          <TouchableOpacity
            style={styles.row}
            onPress={handleSelectNearby}
            activeOpacity={0.75}
          >
            <View
              style={[styles.iconWrap, { backgroundColor: colors.tint + "18" }]}
            >
              <Ionicons name="location-outline" size={18} color={colors.tint} />
            </View>
            <View style={styles.rowText}>
              <ThemedText style={styles.rowTitle}>{t('search.modal.nearby')}</ThemedText>
              <ThemedText style={[styles.rowSub, { color: colors.icon }]}>
                {t('search.modal.nearbySubtitle')}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.icon} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Bottom actions — fixed at screen bottom */}
      <Animated.View
        style={[styles.bottomActions, { bottom: bottom + 24 }, actionsStyle]}
      >
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.cancelText}>{t('search.modal.cancel')}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: colors.tint }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Ionicons name="search" size={16} color="#fff" />
          <ThemedText style={styles.searchBtnText}>{t('search.modal.search')}</ThemedText>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    position: "absolute",
    top: 0,
  },
  card: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    height: 54,
    borderRadius: 24,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  bottomActions: {
    position: "absolute",
    left: 32,
    right: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cancelBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100,
    backgroundColor: "#212121",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100,
  },
  searchBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  cardGap: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 0,
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  rowSub: {
    fontSize: 14,
  },
  suggestionStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 3,
  },
  suggestionStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  suggestionStatText: {
    fontSize: 14,
  },
  statSeparator: {
    fontSize: 12,
    opacity: 0.4,
  },
  suggestedScroll: {
    overflow: "hidden",
  },
  fadeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  emptySmall: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 13,
  },
});
