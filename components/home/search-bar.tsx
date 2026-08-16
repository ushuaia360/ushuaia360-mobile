import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTrailsStore } from "@/store/trails-store";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface Props {
  onPress?: () => void;
  isActive?: boolean;
  rightSlot?: React.ReactNode;
  offline?: boolean;
}

export default function SearchBar({ onPress, isActive, rightSlot, offline }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { searchQuery, setSearchQuery } = useTrailsStore();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.inputWrapper, isActive && { opacity: 0 }, offline && styles.inputWrapperOffline]}
        onPress={() => { if (!offline) onPress?.(); }}
        activeOpacity={offline ? 1 : 0.9}
        disabled={offline}
        accessibilityState={{ disabled: !!offline }}
      >
        <Ionicons
          name={offline ? "cloud-offline-outline" : "search-outline"}
          size={18}
          color="rgba(0,0,0,0.5)"
        />
        {offline ? (
          <Text style={styles.input} numberOfLines={1}>
            {t('home.searchOffline')}
          </Text>
        ) : (
          <TextInput
            style={styles.input}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor="rgba(0,0,0,0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            editable={false}
            pointerEvents="none"
          />
        )}
      </TouchableOpacity>
      {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 0,
    paddingBottom: 16,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 22,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  inputWrapperOffline: {
    opacity: 0.75,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "rgba(0,0,0,0.5)",
    fontFamily: Platform.OS === "android" ? "Inter" : undefined,
  },
  rightSlot: {
    flexShrink: 0,
  },
});
