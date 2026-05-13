import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTrailsStore } from "@/store/trails-store";
import { Ionicons } from "@expo/vector-icons";
// import { useEffect } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
// import Animated, {
//   Easing,
//   useAnimatedStyle,
//   useSharedValue,
//   withTiming,
// } from "react-native-reanimated";

interface Props {
  onPress?: () => void;
  isActive?: boolean;
}

export default function SearchBar({ onPress, isActive }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { searchQuery, setSearchQuery } = useTrailsStore();

  // const filterWidth = useSharedValue(46);
  // const filterOpacity = useSharedValue(1);
  // const filterMarginLeft = useSharedValue(10);

  // const filterStyle = useAnimatedStyle(() => ({
  //   width: filterWidth.value,
  //   opacity: filterOpacity.value,
  //   marginLeft: filterMarginLeft.value,
  //   overflow: "hidden",
  // }));

  // const ANIM_CONFIG = { duration: 350, easing: Easing.out(Easing.exp) };

  // useEffect(() => {
  //   if (isActive) {
  //     filterOpacity.value = withTiming(0, { duration: 200 });
  //     filterWidth.value = withTiming(0, ANIM_CONFIG);
  //     filterMarginLeft.value = withTiming(0, ANIM_CONFIG);
  //   } else {
  //     filterOpacity.value = withTiming(1, { duration: 250 });
  //     filterWidth.value = withTiming(46, ANIM_CONFIG);
  //     filterMarginLeft.value = withTiming(10, ANIM_CONFIG);
  //   }
  // }, [isActive]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.inputWrapper, isActive && { opacity: 0 }]}
        onPress={() => onPress?.()}
        activeOpacity={0.9}
      >
        <Ionicons name="search-outline" size={18} color="rgba(0,0,0,0.5)" />
        <TextInput
          style={styles.input}
          placeholder="Buscar..."
          placeholderTextColor="rgba(0,0,0,0.5)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
          editable={false}
          pointerEvents="none"
        />
      </TouchableOpacity>
      {/* Filtros ocultos temporalmente */}
      {/* <Animated.View style={[styles.filterBtn, filterStyle]}>
        <Ionicons name="options-outline" size={20} color="#212121" />
      </Animated.View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
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
  input: {
    flex: 1,
    fontSize: 15,
    color: "rgba(0,0,0,0.5)",
  },
});
