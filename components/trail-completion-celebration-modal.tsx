import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

interface Props {
  visible: boolean;
  trailName: string;
  onClose: () => void;
}

export default function TrailCompletionCelebrationModal({ visible, trailName, onClose }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const sub = isDark ? '#8e8e93' : '#636366';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.card, { backgroundColor: cardBg }]} accessibilityViewIsModal>
          <View style={[styles.iconWrap, { backgroundColor: colors.tint + '22' }]}>
            <Ionicons name="trophy" size={44} color={colors.tint} />
          </View>

          <ThemedText style={styles.title}>¡Felicitaciones!</ThemedText>
          <ThemedText style={[styles.subtitle, { color: sub }]}>
            Completaste {trailName.trim() ? `«${trailName.trim()}»` : 'el sendero'}.{'\n'}
            El recorrido fue guardado en tu historial.
          </ThemedText>

          <Pressable
            style={({ pressed }) => [styles.cta, { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 }]}
            onPress={onClose}>
            <ThemedText style={styles.ctaLabel}>Listo</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  cta: {
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  ctaLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
