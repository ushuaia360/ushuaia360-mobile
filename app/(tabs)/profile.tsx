import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Link, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ThemedView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <ThemedText type="title">Perfil</ThemedText>
        </View>
        <View style={styles.content}>
          <Link href="/login" asChild>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.tint }]}>
              <ThemedText style={[styles.buttonText, { color: '#fff' }]}>
                Iniciar Sesión
              </ThemedText>
            </TouchableOpacity>
          </Link>
          <Link href="/register" asChild>
            <TouchableOpacity style={[styles.button, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.tint }]}>
              <ThemedText style={[styles.buttonText, { color: colors.tint }]}>
                Registrarse
              </ThemedText>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
