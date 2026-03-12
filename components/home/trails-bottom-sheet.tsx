import { ThemedText } from "@/components/themed-text";
import { Trail } from "@/constants/mock-trails";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTrailsStore } from "@/store/trails-store";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import TrailFeaturedCard from "./trail-featured-card";
import { useHomeStore } from "@/store/home-store";

interface Props {
  onTrailPress?: (trail: Trail) => void;
}

export default function TrailsBottomSheet({ onTrailPress }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const { featuredTrails } = useTrailsStore();
  const { setMode, mapPanning } = useHomeStore();

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => [90, 180, "72%"], []);
  const handleSheetChanges = useCallback((_index: number) => {}, []);

  useEffect(() => {
    if (mapPanning) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.snapToIndex(1);
    }
  }, [mapPanning]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backgroundStyle={[
        styles.sheetBackground,
        { backgroundColor: isDark ? "#1c1c1e" : "#FFFFFF" },
      ]}
      handleIndicatorStyle={[
        styles.handle,
        { backgroundColor: isDark ? "#48484a" : "#D1D5DB" },
      ]}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.title}>Puntos Cercanos</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
              {featuredTrails.length} Puntos cerca tuyo
            </ThemedText>
          </View>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => setMode("list")}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.viewAllText}>Ver todos</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View
          style={[
            styles.headerDivider,
            { backgroundColor: isDark ? "#2a2a2a" : "#F0F2F5" },
          ]}
        />

        {/* Cards */}
        <View style={styles.cardList}>
          {featuredTrails.map((trail) => (
            <TrailFeaturedCard
              key={trail.id}
              trail={trail}
              onPress={onTrailPress}
            />
          ))}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={[styles.ctaButton, { borderColor: colors.tint }]}
          onPress={() => setMode("list")}
          activeOpacity={0.85}
        >
          <ThemedText style={[styles.ctaText, { color: colors.tint }]}>
            Explorar todos los senderos
          </ThemedText>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  viewAllButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(0,0,0,0.5)",
  },
  headerDivider: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  cardList: {
    gap: 0,
  },
  ctaButton: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 100,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
  },
  ctaText: {
    color: "rgba(0,0,0,0.5)",
    fontSize: 15,
    fontWeight: "600",
  },
});
