import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createTrailReview } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  visible: boolean;
  trailId: string;
  token: string | null;
  trailName: string;
  onClose: () => void;
}

export default function TrailCompletionCelebrationModal({
  visible,
  trailId,
  token,
  trailName,
  onClose,
}: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const sub = isDark ? '#8e8e93' : '#636366';

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setRating(5);
    setComment('');
    setError(null);
    setSubmitted(false);
    setSubmitting(false);
  }, [visible]);

  const handleSubmit = useCallback(async () => {
    if (!token) {
      setError('Necesitás iniciar sesión para enviar una reseña.');
      return;
    }
    if (!trailId) return;
    const text = comment.trim();
    if (rating < 1 || rating > 5) {
      setError('Seleccioná una calificación entre 1 y 5.');
      return;
    }
    if (!text) {
      setError('Escribí un comentario para enviar la reseña.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createTrailReview(trailId, token, { rating, comment: text });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar la reseña');
    } finally {
      setSubmitting(false);
    }
  }, [comment, rating, token, trailId]);

  const backdropPress = useCallback(() => {
    if (submitting) return;
    onClose();
  }, [onClose, submitting]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={backdropPress}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={backdropPress} accessibilityLabel="Cerrar" />
        <View style={[styles.card, { backgroundColor: cardBg }]} accessibilityViewIsModal>
          <View style={[styles.iconWrap, { backgroundColor: colors.tint + '22' }]}>
            <Ionicons name="trophy" size={40} color={colors.tint} />
          </View>
          <ThemedText style={styles.title}>¡Felicitaciones!</ThemedText>
          <ThemedText style={[styles.subtitle, { color: sub }]}>
            Completaste {trailName.trim() ? `«${trailName.trim()}»` : 'el sendero'}
          </ThemedText>

          {submitted ? (
            <>
              <ThemedText style={[styles.thanks, { color: colors.text }]}>
                ¡Gracias por tu reseña!
              </ThemedText>
              <Pressable
                style={({ pressed }) => [
                  { opacity: pressed ? 0.85 : 1 },
                  styles.cta,
                  { backgroundColor: colors.tint, marginTop: 8 },
                ]}
                onPress={onClose}>
                <ThemedText style={styles.ctaLabel}>Listo</ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <ThemedText style={[styles.reviewLabel, { color: colors.text }]}>Dejá una reseña</ThemedText>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setRating(i)}
                    activeOpacity={0.75}
                    disabled={!token || submitting}
                    accessibilityRole="button"
                    accessibilityLabel={`Calificar con ${i} estrella${i > 1 ? 's' : ''}`}
                    accessibilityState={{ selected: i <= rating }}>
                    <Ionicons
                      name="star"
                      size={28}
                      color={i <= rating ? '#FFB800' : isDark ? '#555' : '#D1D1D6'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[
                  styles.reviewInput,
                  {
                    color: colors.text,
                    borderColor: isDark ? '#3a3a3c' : '#e5e5ea',
                    backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7',
                    opacity: !token || submitting ? 0.6 : 1,
                  },
                ]}
                placeholder="Contá cómo fue tu experiencia…"
                placeholderTextColor={isDark ? '#636366' : '#8e8e93'}
                multiline
                editable={!!token && !submitting}
                value={comment}
                onChangeText={setComment}
                textAlignVertical="top"
                maxLength={500}
              />
              {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
              {!token ? (
                <ThemedText style={[styles.hint, { color: sub }]}>
                  Iniciá sesión para publicar reseñas.
                </ThemedText>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  { opacity: pressed || submitting ? 0.85 : 1 },
                  styles.cta,
                  { backgroundColor: colors.tint },
                ]}
                onPress={() => void handleSubmit()}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={styles.ctaLabel}>Enviar reseña</ThemedText>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={onClose}
                disabled={submitting}
                hitSlop={8}>
                <ThemedText style={[styles.skipLabel, { color: sub }]}>Ahora no</ThemedText>
              </Pressable>
            </>
          )}
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
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#ff3b30',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  thanks: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 4,
  },
  cta: {
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  ctaLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipBtn: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
});
