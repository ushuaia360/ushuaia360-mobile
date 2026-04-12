import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { selectActiveSession, useActiveTrailSessionStore } from '@/store/active-trail-session-store';
import { useAuthStore } from '@/store/auth-store';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

interface Props {
  /** Espacio desde el borde superior del contenedor padre (incluye safe area si aplica) */
  offsetTop: number;
}

export default function ResumeActiveTrailBar({ offsetTop }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const token = useAuthStore((s) => s.token);
  const hydrated = useActiveTrailSessionStore((s) => s.hydrated);
  const sessions = useActiveTrailSessionStore((s) => s.sessions);
  const activeHistoryEntryId = useActiveTrailSessionStore((s) => s.activeHistoryEntryId);
  const setMinimized = useActiveTrailSessionStore((s) => s.setMinimized);
  const setActiveHistoryEntryId = useActiveTrailSessionStore((s) => s.setActiveHistoryEntryId);

  const [menuOpen, setMenuOpen] = useState(false);

  const activeSession = selectActiveSession({ sessions, activeHistoryEntryId });

  const openRecorrido = useCallback(
    async (historyEntryId: string) => {
      await setActiveHistoryEntryId(historyEntryId);
      await setMinimized(false);
      setMenuOpen(false);
      router.push('/(tabs)/trail-recorrido');
    },
    [setActiveHistoryEntryId, setMinimized],
  );

  if (!token || !hydrated || !activeSession || sessions.length === 0) return null;

  const bg = isDark ? '#2c2c2e' : '#fff';
  const border = isDark ? '#3a3a3c' : '#e5e5ea';
  const multi = sessions.length > 1;

  const barShadow = {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  };

  const thumbBlock = activeSession.thumbnailUrl ? (
    <Image source={{ uri: activeSession.thumbnailUrl }} style={styles.thumb} contentFit="cover" />
  ) : (
    <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.tint + '33' }]}>
      <Ionicons name="map-outline" size={22} color={colors.tint} />
    </View>
  );

  const textBlock = (
    <View style={styles.textCol}>
      <ThemedText style={styles.label} numberOfLines={1}>
        {multi ? 'Recorridos en curso' : 'Recorrido en curso'}
      </ThemedText>
      <ThemedText style={[styles.trailName, { color: colors.tint }]} numberOfLines={1}>
        {activeSession.trailName.trim() || 'Sendero'}
      </ThemedText>
      {multi && sessions.length > 1 ? (
        <ThemedText style={[styles.moreLabel, { color: colors.icon }]} numberOfLines={1}>
          {sessions.length - 1 === 1
            ? '1 sin terminar más'
            : `${sessions.length - 1} sin terminar más`}
        </ThemedText>
      ) : null}
    </View>
  );

  const resumePillInner = (
    <>
      <Ionicons name="play" size={14} color="#fff" />
      <ThemedText style={styles.resumeText}>Resumir</ThemedText>
      {multi ? <Ionicons name="chevron-down" size={16} color="#fff" /> : null}
    </>
  );

  const resumePill = multi ? (
    <Pressable
      style={({ pressed }) => [
        styles.resumePill,
        { backgroundColor: colors.tint, opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={() => setMenuOpen(true)}
      accessibilityRole="button"
      accessibilityLabel="Elegir recorrido para resumir">
      {resumePillInner}
    </Pressable>
  ) : (
    <View style={[styles.resumePill, { backgroundColor: colors.tint }]} accessibilityElementsHidden>
      {resumePillInner}
    </View>
  );

  return (
    <>
      <View style={[styles.wrap, { top: offsetTop, zIndex: 25 }]} pointerEvents="box-none">
        {multi ? (
          <View style={[styles.bar, { backgroundColor: bg, borderColor: border }, barShadow]}>
            <Pressable
              style={({ pressed }) => [styles.barMain, { opacity: pressed ? 0.92 : 1 }]}
              onPress={() => void openRecorrido(activeSession.historyEntryId)}
              accessibilityRole="button"
              accessibilityLabel={`Resumir sendero ${activeSession.trailName}`}>
              {thumbBlock}
              {textBlock}
            </Pressable>
            {resumePill}
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.bar,
              { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.92 : 1 },
              barShadow,
            ]}
            onPress={() => void openRecorrido(activeSession.historyEntryId)}
            accessibilityRole="button"
            accessibilityLabel={`Resumir sendero ${activeSession.trailName}`}>
            {thumbBlock}
            {textBlock}
            {resumePill}
          </Pressable>
        )}
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.modalFill}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setMenuOpen(false)}
            accessibilityLabel="Cerrar lista de recorridos"
          />
          <View style={styles.modalCenter} pointerEvents="box-none">
            <View
              style={[styles.menuCard, { backgroundColor: bg, borderColor: border }]}
              accessibilityViewIsModal>
            <ThemedText style={[styles.menuTitle, { color: colors.text }]}>
              Elegí un recorrido
            </ThemedText>
            <ScrollView
              style={styles.menuScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={sessions.length > 4}>
              {sessions.map((s) => {
                const isActive = s.historyEntryId === activeHistoryEntryId;
                return (
                  <Pressable
                    key={s.historyEntryId}
                    style={({ pressed }) => [
                      styles.menuRow,
                      {
                        backgroundColor: pressed
                          ? isDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.04)'
                          : 'transparent',
                        borderColor: border,
                      },
                    ]}
                    onPress={() => void openRecorrido(s.historyEntryId)}>
                    {s.thumbnailUrl ? (
                      <Image
                        source={{ uri: s.thumbnailUrl }}
                        style={styles.menuThumb}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.menuThumb,
                          styles.menuThumbPh,
                          { backgroundColor: colors.tint + '28' },
                        ]}>
                        <Ionicons name="map-outline" size={20} color={colors.tint} />
                      </View>
                    )}
                    <View style={styles.menuRowText}>
                      <ThemedText style={styles.menuRowName} numberOfLines={2}>
                        {s.trailName.trim() || 'Sendero'}
                      </ThemedText>
                      {isActive ? (
                        <ThemedText style={[styles.menuRowHint, { color: colors.tint }]}>
                          Activo
                        </ThemedText>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.icon} />
                  </Pressable>
                );
              })}
            </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    /** Por debajo del BottomSheet del mapa; el modal de búsqueda sigue tapando por ser `Modal`. */
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  barMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.75,
  },
  trailName: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  moreLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
    opacity: 0.85,
  },
  resumePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  resumeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalFill: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  menuCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 12,
    maxHeight: '72%',
    overflow: 'hidden',
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuScroll: {
    maxHeight: 320,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  menuThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  menuThumbPh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowText: {
    flex: 1,
    minWidth: 0,
  },
  menuRowName: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuRowHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
