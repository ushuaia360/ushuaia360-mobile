import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchLegalDocument, type LegalDocument } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from './themed-text';

type Props = {
  type: 'terms' | 'privacy' | null;
  onClose: () => void;
};

export function LegalDocModal({ type, onClose }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!type) return;
    setDoc(null);
    setError(false);
    setLoading(true);
    fetchLegalDocument(type)
      .then(setDoc)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [type]);

  const title = type === 'terms'
    ? t('auth.register.legalTerms')
    : t('auth.register.legalPrivacy');

  return (
    <Modal
      visible={type != null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
        <View style={[styles.header, { borderBottomColor: isDark ? '#2a2a2a' : '#e5e5ea' }]}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.icon} />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator>
          {loading ? (
            <Animated.View entering={FadeIn} style={styles.center}>
              <ActivityIndicator size="large" color={colors.tint} />
            </Animated.View>
          ) : error ? (
            <Animated.View entering={FadeIn} style={styles.center}>
              <Ionicons name="alert-circle-outline" size={44} color={colors.icon} />
              <ThemedText style={[styles.emptyText, { color: colors.icon }]}>
                {t('auth.register.legalError')}
              </ThemedText>
            </Animated.View>
          ) : doc?.content ? (
            <Animated.View entering={FadeIn}>
              <ThemedText style={[styles.body, { color: colors.text }]}>
                {doc.content}
              </ThemedText>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn} style={styles.center}>
              <Ionicons name="document-text-outline" size={44} color={colors.icon} />
              <ThemedText style={[styles.emptyText, { color: colors.icon }]}>
                {t('auth.register.legalEmpty')}
              </ThemedText>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17, fontWeight: '700', flex: 1, marginRight: 12 },
  content: { padding: 20, paddingBottom: 48 },
  center: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  body: { fontSize: 14, lineHeight: 22 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
