import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

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
            <Ionicons name="trophy" size={40} color={colors.tint} />
          </View>
          <ThemedText style={styles.title}>¡Felicitaciones!</ThemedText>
          <ThemedText style={[styles.subtitle, { color: sub }]}>
            Completaste {trailName.trim() ? `«${trailName.trim()}»` : 'el sendero'}
          </ThemedText>

          <ThemedText style={[styles.reviewLabel, { color: colors.text }]}>Dejá una reseña</ThemedText>
          <View style={styles.starsRow} accessibilityRole="text" accessibilityLabel="Valoración, próximamente">
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons key={i} name="star" size={28} color="#FFB800" style={{ opacity: 0.85 }} />
            ))}
          </View>
          <TextInput
            style={[
              styles.reviewInput,
              {
                color: colors.text,
                borderColor: isDark ? '#3a3a3c' : '#e5e5ea',
                backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7',
              },
            ]}
            placeholder="Contá cómo fue tu experiencia…"
            placeholderTextColor={isDark ? '#636366' : '#8e8e93'}
            multiline
            editable={false}
            pointerEvents="none"
          />
          <ThemedText style={[styles.comingSoon, { color: sub }]}>
            Las reseñas estarán disponibles pronto. Este campo es solo una vista previa.
          </ThemedText>

          <Pressable
            style={({ pressed }) => [
              { opacity: pressed ? 0.85 : 1 },
              styles.cta,
              { backgroundColor: colors.tint },
            ]}
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
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 22,
  },
  reviewLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  reviewInput: {
    minHeight: 88,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  comingSoon: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 20,
  },
  cta: {
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
