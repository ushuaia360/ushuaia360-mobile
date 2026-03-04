import { ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function MapScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <ThemedText type="title">Mapa</ThemedText>
          <ThemedText style={styles.subtitle}>
            Explora Ushuaia en el mapa
          </ThemedText>
        </View>
        <View style={styles.content}>
          <ThemedText>Mapa interactivo próximamente...</ThemedText>
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
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
  },
  content: {
    padding: 20,
  },
});
