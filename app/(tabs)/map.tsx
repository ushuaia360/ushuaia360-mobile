import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function MapScreen() {
  const { t } = useTranslation();

  return (
    <ThemedView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <ThemedText type="title">{t('map.title')}</ThemedText>
          <ThemedText style={styles.subtitle}>{t('map.subtitle')}</ThemedText>
        </View>
        <View style={styles.content}>
          <ThemedText>{t('map.comingSoon')}</ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
