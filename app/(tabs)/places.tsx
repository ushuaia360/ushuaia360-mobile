import { ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function PlacesScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <ThemedText type="title">Lugares Turísticos</ThemedText>
          <ThemedText style={styles.subtitle}>
            Descubre los lugares más emblemáticos de Ushuaia
          </ThemedText>
        </View>
        <View style={styles.content}>
          <ThemedText>Lista de lugares próximamente...</ThemedText>
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
