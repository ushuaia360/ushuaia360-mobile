import ReviewSelectedPhotosStrip from '@/components/review-selected-photos-strip';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { REVIEW_GALLERY_MAX_PHOTOS } from '@/lib/review-constants';
import { pickReviewImagesToAppend } from '@/lib/review-image-picker';
import { createTrailReview, uploadReviewImages } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
<<<<<<< HEAD
import { Modal, Pressable, StyleSheet, View } from 'react-native';
=======
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
>>>>>>> ba3bb53693e69e0a7c7527d570f63ae80470ef75

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
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setRating(5);
    setComment('');
    setPhotoUris([]);
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
      let image_urls: string[] | undefined;
      if (photoUris.length > 0) {
        image_urls = await uploadReviewImages(token, photoUris);
      }
      await createTrailReview(trailId, token, {
        rating,
        comment: text,
        ...(image_urls?.length ? { image_urls } : {}),
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar la reseña');
    } finally {
      setSubmitting(false);
    }
  }, [comment, photoUris, rating, token, trailId]);

  const handlePickPhotos = useCallback(async () => {
    if (submitting) return;
    const next = await pickReviewImagesToAppend(photoUris);
    if (next) setPhotoUris(next);
  }, [submitting, photoUris]);

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
            <Ionicons name="trophy" size={44} color={colors.tint} />
          </View>

          <ThemedText style={styles.title}>¡Felicitaciones!</ThemedText>
          <ThemedText style={[styles.subtitle, { color: sub }]}>
<<<<<<< HEAD
            Completaste {trailName.trim() ? `«${trailName.trim()}»` : 'el sendero'}.{'\n'}
            El recorrido fue guardado en tu historial.
          </ThemedText>

          <Pressable
            style={({ pressed }) => [styles.cta, { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 }]}
            onPress={onClose}>
            <ThemedText style={styles.ctaLabel}>Listo</ThemedText>
          </Pressable>
=======
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
              <View
                style={[
                  styles.reviewInputRow,
                  {
                    borderColor: isDark ? '#3a3a3c' : '#e5e5ea',
                    backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7',
                    opacity: submitting ? 0.6 : 1,
                  },
                ]}>
                <TextInput
                  style={[styles.reviewInputFlex, { color: colors.text }]}
                  placeholder="Contá cómo fue tu experiencia…"
                  placeholderTextColor={isDark ? '#636366' : '#8e8e93'}
                  multiline
                  editable={!!token && !submitting}
                  value={comment}
                  onChangeText={setComment}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <View style={styles.reviewAttachBtnWrap} pointerEvents="box-none">
                  <TouchableOpacity
                    onPress={() => void handlePickPhotos()}
                    disabled={
                      submitting || photoUris.length >= REVIEW_GALLERY_MAX_PHOTOS
                    }
                    style={styles.reviewAttachBtn}
                    hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Adjuntar fotos">
                    <Ionicons
                      name="image-outline"
                      size={24}
                      color={colors.tint}
                      style={{
                        opacity:
                          submitting || photoUris.length >= REVIEW_GALLERY_MAX_PHOTOS
                            ? 0.35
                            : 1,
                      }}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <ReviewSelectedPhotosStrip
                value={photoUris}
                onChange={setPhotoUris}
                disabled={submitting}
                isDark={isDark}
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
>>>>>>> ba3bb53693e69e0a7c7527d570f63ae80470ef75
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
<<<<<<< HEAD
    alignItems: 'center',
=======
    zIndex: 1,
>>>>>>> ba3bb53693e69e0a7c7527d570f63ae80470ef75
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
<<<<<<< HEAD
    marginBottom: 28,
=======
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
  reviewInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    minHeight: 88,
    paddingLeft: 14,
    paddingRight: 4,
    paddingTop: 4,
    paddingBottom: 4,
    marginBottom: 8,
  },
  reviewInputFlex: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 78,
    paddingVertical: 10,
    paddingRight: 6,
    fontSize: 15,
  },
  reviewAttachBtnWrap: {
    flexShrink: 0,
    justifyContent: 'flex-end',
  },
  reviewAttachBtn: {
    padding: 10,
    alignSelf: 'flex-end',
    marginBottom: 2,
    zIndex: 2,
    elevation: 4,
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
>>>>>>> ba3bb53693e69e0a7c7527d570f63ae80470ef75
  },
  cta: {
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
<<<<<<< HEAD
    width: '100%',
=======
    minHeight: 50,
    justifyContent: 'center',
>>>>>>> ba3bb53693e69e0a7c7527d570f63ae80470ef75
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
