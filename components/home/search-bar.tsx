import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTrailsStore } from "@/store/trails-store";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, View } from "react-native";

export default function SearchBar() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const { searchQuery, setSearchQuery } = useTrailsStore();

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <Ionicons name="search-outline" size={18} color="rgba(0,0,0,0.5)" />
        <TextInput
          style={[styles.input, { color: "rgba(0,0,0,0.5)" }]}
          placeholder="Buscar..."
          placeholderTextColor="rgba(0,0,0,0.5)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    backgroundColor: "#fff",
    borderColor: "rgba(0,0,0,0.2)",
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
});
