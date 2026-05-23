import { ThemedText } from '@/components/themed-text';
import { phoneToWhatsAppUrl } from '@/lib/whatsapp';
import { ActiveTrailEmergencyPoint } from '@/store/active-trail-session-store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

interface Props {
  visible: boolean;
  points: ActiveTrailEmergencyPoint[];
  onClose: () => void;
  onViewOnMap?: (point: ActiveTrailEmergencyPoint) => void;
}

export default function TrailEmergencyModal({
  visible,
  points,
  onClose,
  onViewOnMap,
}: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const sub = isDark ? '#aeaeb2' : '#636366';
  const border = isDark ? '#3a3a3c' : '#e5e5ea';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = points.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (!visible) {
      setSelectedId(null);
    }
  }, [visible]);

  const handleClose = () => {
    setSelectedId(null);
    onClose();
  };

  const openWhatsApp = async (phone: string) => {
    const url = phoneToWhatsAppUrl(phone);
    if (!url) return;
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityLabel={t('common.close')}
        />
        <View style={[styles.sheet, { backgroundColor: cardBg }]}>
          <View style={[styles.handle, { backgroundColor: border }]} />

          {!selected ? (
            <>
              <View style={styles.headerRow}>
                <View style={styles.headerIconWrap}>
                  <Ionicons name="warning" size={24} color="#fff" />
                </View>
                <View style={styles.headerTextCol}>
                  <ThemedText style={styles.title}>{t('trailEmergency.title')}</ThemedText>
                  <ThemedText style={[styles.subtitle, { color: sub }]}>
                    {points.length > 0
                      ? t('trailEmergency.subtitleWithPoints')
                      : t('trailEmergency.subtitleEmpty')}
                  </ThemedText>
                </View>
                <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
                  <Ionicons name="close" size={24} color={sub} />
                </Pressable>
              </View>

              {points.length === 0 ? (
                <ThemedText style={[styles.emptyText, { color: sub }]}>
                  {t('trailEmergency.noPointsConfigured')}
                </ThemedText>
              ) : (
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                  {points.map((point) => (
                    <Pressable
                      key={point.id}
                      style={[styles.listItem, { borderColor: border }]}
                      onPress={() => setSelectedId(point.id)}>
                      <View style={styles.listItemMain}>
                        <ThemedText style={styles.listItemTitle}>{point.name}</ThemedText>
                        {point.phone ? (
                          <ThemedText style={[styles.listItemPhone, { color: sub }]}>
                            {point.phone}
                          </ThemedText>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={sub} />
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </>
          ) : (
            <>
              <Pressable onPress={() => setSelectedId(null)} style={styles.backRow}>
                <Ionicons name="chevron-back" size={20} color={colors.tint} />
                <ThemedText style={[styles.backLabel, { color: colors.tint }]}>
                  {t('trailEmergency.backToList')}
                </ThemedText>
              </Pressable>

              <ThemedText style={styles.detailTitle}>{selected.name}</ThemedText>
              {selected.description ? (
                <ThemedText style={[styles.detailDescription, { color: sub }]}>
                  {selected.description}
                </ThemedText>
              ) : null}
              <ThemedText style={[styles.coords, { color: sub }]}>
                {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
              </ThemedText>

              <Pressable
                style={[styles.mapBtn, { borderColor: colors.tint }]}
                onPress={() => onViewOnMap?.(selected)}>
                <Ionicons name="map-outline" size={20} color={colors.tint} />
                <ThemedText style={[styles.mapBtnLabel, { color: colors.tint }]}>
                  {t('trailEmergency.viewOnMap')}
                </ThemedText>
              </Pressable>

              {selected.phone ? (
                <Pressable
                  style={styles.whatsappBtn}
                  onPress={() => void openWhatsApp(selected.phone)}>
                  <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                  <ThemedText style={styles.whatsappLabel}>
                    {t('trailEmergency.contactWhatsApp')}
                  </ThemedText>
                </Pressable>
              ) : null}
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
    maxHeight: '78%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E65C00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  closeBtn: {
    padding: 4,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  list: {
    maxHeight: 360,
  },
  listContent: {
    gap: 10,
    paddingBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  listItemMain: {
    flex: 1,
    marginRight: 8,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  listItemPhone: {
    marginTop: 2,
    fontSize: 13,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  backLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  coords: {
    fontSize: 13,
    marginBottom: 16,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  mapBtnLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  whatsappLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
