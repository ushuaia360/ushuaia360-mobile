import { ThemedText } from "@/components/themed-text";
import { Trail } from "@/constants/mock-trails";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useHomeStore } from "@/store/home-store";
import { useTrailsStore } from "@/store/trails-store";
import type { MapMarker } from "@/services/api";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import MapMarkerBottomCard from "./map-marker-bottom-card";
import TrailFeaturedCard from "./trail-featured-card";

interface Props {
  onTrailPress?: (trail: Trail) => void;
  selectedMapMarker?: MapMarker | null;
  onClearMapMarker?: () => void;
}

export default function TrailsBottomSheet({
  onTrailPress,
  selectedMapMarker,
  onClearMapMarker,
}: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const { featuredTrails, loadingFeatured, fetchFeaturedTrails, fetchTrails } = useTrailsStore();
  const { setMode, mapPanning, bottomSheetIndex, setBottomSheetIndex } = useHomeStore();

  useEffect(() => {
    fetchFeaturedTrails();
  }, [fetchFeaturedTrails]);

  useEffect(() => {
    if (selectedMapMarker) {
      setBottomSheetIndex(2);
    }
  }, [selectedMapMarker, setBottomSheetIndex]);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => [90, 180, "72%"], []);
  const handleSheetChanges = useCallback((index: number) => {
    // Reset the store index when user manually changes the sheet
    if (bottomSheetIndex !== null && index !== bottomSheetIndex) {
      setBottomSheetIndex(null);
    }
  }, [bottomSheetIndex, setBottomSheetIndex]);

  useEffect(() => {
    // Con ficha abierta no colapsar al mover el mapa: si no, el marcador suele quedar tapado atrás del sheet en index 0.
    if (mapPanning && !selectedMapMarker) {
      bottomSheetRef.current?.snapToIndex(0);
    }
    if (mapPanning) return;

    if (bottomSheetIndex !== null) {
      bottomSheetRef.current?.snapToIndex(bottomSheetIndex);
    } else {
      bottomSheetRef.current?.snapToIndex(1);
    }
  }, [mapPanning, bottomSheetIndex, selectedMapMarker]);

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
        {selectedMapMarker ? (
          <MapMarkerBottomCard
            marker={selectedMapMarker}
            onClose={() => {
              onClearMapMarker?.();
              setBottomSheetIndex(null);
            }}
          />
        ) : null}

        {selectedMapMarker ? (
          <View
            style={[
              styles.sectionDivider,
              { backgroundColor: isDark ? "#2a2a2a" : "#E8ecf0" },
            ]}
          />
        ) : null}

        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.title}>
              {selectedMapMarker ? t("trailsSheet.titleNearby") : t("trailsSheet.title")}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
              {selectedMapMarker
                ? t("trailsSheet.subtitleNearby", { count: featuredTrails.length })
                : t("trailsSheet.subtitle", { count: featuredTrails.length })}
            </ThemedText>
          </View>
          <TouchableOpacity
            style={[styles.viewAllButton, { backgroundColor: colors.tint }]}
            onPress={() => { fetchTrails(true); setMode("list"); }}
            activeOpacity={0.8}
          >
            <ThemedText style={[styles.viewAllText, { color: "#fff" }]}>{t("trailsSheet.viewAll")}</ThemedText>
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
          {loadingFeatured ? (
            <ActivityIndicator style={{ marginVertical: 24 }} />
          ) : (
            featuredTrails.map((trail) => (
              <TrailFeaturedCard
                key={trail.id}
                trail={trail}
                onPress={onTrailPress}
              />
            ))
          )}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={[styles.ctaButton, { borderColor: colors.tint }]}
          onPress={() => { fetchTrails(true); setMode("list"); }}
          activeOpacity={0.85}
        >
          <ThemedText style={[styles.ctaText, { color: colors.tint }]}>
            {t("trailsSheet.exploreAll")}
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
  sectionDivider: {
    height: StyleSheet.hairlineWidth * 2,
    marginHorizontal: 20,
    marginBottom: 10,
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
    fontWeight: "600",
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
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "500",
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
    fontWeight: "500",
  },
});
