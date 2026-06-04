import { ThemedText } from "@/components/themed-text";
import { openContactLink } from "@/lib/open-contact-link";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

interface Props {
  contactLink: string;
}

export function ContactLinkRow({ contactLink }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const label = contactLink.trim();

  const onPress = async () => {
    const ok = await openContactLink(label);
    if (!ok) {
      Alert.alert(
        "No se pudo abrir",
        "Verificá que el enlace de contacto sea válido (URL, teléfono o red social).",
      );
    }
  };

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Contactar">
      <View style={[styles.iconWrap, { backgroundColor: colors.tint + "22" }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.tint} />
      </View>
      <View style={styles.textWrap}>
        <ThemedText style={styles.title}>Contacto</ThemedText>
        <ThemedText style={[styles.link, { color: colors.tint }]} numberOfLines={2}>
          {label}
        </ThemedText>
      </View>
      <Ionicons name="open-outline" size={20} color={colors.icon} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    backgroundColor: "#FAFAFA",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 12, fontWeight: "600", opacity: 0.7, marginBottom: 2 },
  link: { fontSize: 14, fontWeight: "500" },
});
