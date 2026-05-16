import ReviewSelectedPhotosStrip from '@/components/review-selected-photos-strip';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { REVIEW_GALLERY_MAX_PHOTOS } from '@/lib/review-constants';
import { pickReviewImagesToAppend } from '@/lib/review-image-picker';
import { createTrailReview, uploadReviewImages } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      setError(t('celebration.noAuthError'));
      return;
    }
    if (!trailId) return;
    const text = comment.trim();
    if (rating < 1 || rating > 5) {
      setError(t('celebration.validationRating'));
      return;
    }
    if (!text) {
      setError(t('celebration.validationComment'));
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
      setError(e instanceof Error ? e.message : t('celebration.submitError'));
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
        <Pressable style={StyleSheet.absoluteFill} onPress={backdropPress} accessibilityLabel={t('common.close')} />
        <View style={[styles.card, { backgroundColor: cardBg }]} accessibilityViewIsModal>
          <View style={[styles.iconWrap, { backgroundColor: colors.tint + '22' }]}>
            <Ionicons name="trophy" size={44} color={colors.tint} />
          </View>

          <ThemedText style={styles.title}>{t('celebration.title')}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: sub }]}>
            {trailName.trim()
              ? t('celebration.subtitle', { name: trailName.trim() })
              : t('celebration.subtitleDefault')}
          </ThemedText>

          {submitted ? (
            <>
              <ThemedText style={[styles.thanks, { color: colors.text }]}>
                {t('celebration.thanks')}
              </ThemedText>
              <Pressable
                style={({ pressed }) => [
                  { opacity: pressed ? 0.85 : 1 },
                  styles.cta,
                  { backgroundColor: colors.tint, marginTop: 8 },
                ]}
                onPress={onClose}>
                <ThemedText style={styles.ctaLabel}>{t('celebration.done')}</ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <ThemedText style={[styles.reviewLabel, { color: colors.text }]}>{t('celebration.reviewLabel')}</ThemedText>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setRating(i)}
                    activeOpacity={0.75}
                    disabled={!token || submitting}
                    accessibilityRole="button"
                    accessibilityLabel={t('celebration.starLabel', { count: i })}
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
                  placeholder={t('celebration.reviewPlaceholder')}
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
                    disabled={submitting || photoUris.length >= REVIEW_GALLERY_MAX_PHOTOS}
                    style={styles.reviewAttachBtn}
                    hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('celebration.attachPhotos')}>
                    <Ionicons
                      name="image-outline"
                      size={24}
                      color={colors.tint}
                      style={{
                        opacity:
                          submitting || photoUris.length >= REVIEW_GALLERY_MAX_PHOTOS ? 0.35 : 1,
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
                  {t('celebration.noAuth')}
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
                  <ThemedText style={styles.ctaLabel}>{t('celebration.submit')}</ThemedText>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={onClose}
                disabled={submitting}
                hitSlop={8}>
                <ThemedText style={[styles.skipLabel, { color: sub }]}>{t('celebration.skipBtn')}</ThemedText>
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
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    alignItems: 'center',
    zIndex: 1,
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
    marginBottom: 22,
  },
  reviewLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    alignSelf: 'stretch',
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
    alignSelf: 'stretch',
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
    alignSelf: 'stretch',
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
    alignSelf: 'stretch',
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
    width: '100%',
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
