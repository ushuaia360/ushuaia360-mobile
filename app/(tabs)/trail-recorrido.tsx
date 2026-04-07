import TrailActiveNavigationMap, {
  type TrailActiveNavigationMapRef,
} from '@/components/trail-active-navigation-map';
import TrailCompletionCelebrationModal from '@/components/trail-completion-celebration-modal';
import TrailFinishConfirmModal from '@/components/trail-finish-confirm-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { logRecorridoTimer } from '@/lib/recorrido-timer-debug';
import { normalizeSessionStartedAtToISO } from '@/lib/session-started-at';
import { ensureTrailMapLocationPermission, alertLocationDenied } from '@/lib/trail-location-permission';
import {
  beginTrailHistoryRecorrido,
  completeUserTrailHistory,
  startUserTrailHistory,
  trailHistoryEntryStartedAt,
} from '@/services/api';
import { useAuthStore } from '@/store/auth-store';
import { useActiveTrailSessionStore } from '@/store/active-trail-session-store';
import { Ionicons } from '@expo/vector-icons';
import { router, Tabs, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TrailRecorridoScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { top, bottom } = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const mapRef = useRef<TrailActiveNavigationMapRef>(null);

  const hydrated = useActiveTrailSessionStore((s) => s.hydrated);
  const session = useActiveTrailSessionStore((s) => s.session);
  const setMinimized = useActiveTrailSessionStore((s) => s.setMinimized);
  const clearSession = useActiveTrailSessionStore((s) => s.clearSession);
  const setSession = useActiveTrailSessionStore((s) => s.setSession);

  /** Una sola petición POST /start por par trail+id local (evita spam si el servidor devolvía 404). */
  const localHistorySyncAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !session || !token) return;
    if (!session.historyEntryId.startsWith('local-')) {
      localHistorySyncAttemptedRef.current = null;
      return;
    }
    const key = `${session.trailId}:${session.historyEntryId}`;
    if (localHistorySyncAttemptedRef.current === key) return;
    localHistorySyncAttemptedRef.current = key;

    void (async () => {
      try {
        const snap = useActiveTrailSessionStore.getState().session;
        if (!snap?.historyEntryId.startsWith('local-')) return;
        const entry = await startUserTrailHistory(token, snap.trailId);
        logRecorridoTimer('local→server /start OK', {
          entryId: entry.id,
          startedRaw: trailHistoryEntryStartedAt(entry),
          trailId: snap.trailId,
        });
        await setSession({
          ...snap,
          historyEntryId: entry.id,
          startedAtISO: normalizeSessionStartedAtToISO(
            trailHistoryEntryStartedAt(entry) ?? snap.startedAtISO,
          ),
          beganRecorridoSynced: false,
        });
      } catch (e) {
        logRecorridoTimer('local→server /start error', e instanceof Error ? e.message : e);
      }
    })();
  }, [hydrated, session, token, setSession]);

  /**
   * Una sola vez por entrada de servidor: alinea `started_at` (DB) en la sesión.
   * `beganRecorridoSynced === true` → ya listo. `undefined` / `false` disparan (incl. snapshots viejos).
   */
  useEffect(() => {
    if (!hydrated || !session || !token) return;
    if (session.historyEntryId.startsWith('local-')) return;
    if (session.beganRecorridoSynced === true) return;

    const historyId = session.historyEntryId;
    logRecorridoTimer('begin-recorrido → request', {
      historyId,
      beganRecorridoSynced: session.beganRecorridoSynced,
      startedAtISO: session.startedAtISO,
    });
    let cancelled = false;
    void (async () => {
      try {
        const { entry } = await beginTrailHistoryRecorrido(token, historyId);
        if (cancelled) {
          logRecorridoTimer('begin-recorrido → cancelled (unmount)');
          return;
        }
        const snap = useActiveTrailSessionStore.getState().session;
        if (!snap || snap.historyEntryId !== historyId) {
          logRecorridoTimer('begin-recorrido → stale session after response', {
            expected: historyId,
            got: snap?.historyEntryId,
          });
          return;
        }
        const startedRaw = trailHistoryEntryStartedAt(entry);
        const hasStartedAt =
          startedRaw != null &&
          (typeof startedRaw === 'number' ||
            (typeof startedRaw === 'string' && startedRaw.trim() !== ''));
        logRecorridoTimer('begin-recorrido → response', {
          startedRaw,
          hasStartedAt,
          entryId: entry.id,
        });
        await setSession({
          ...snap,
          beganRecorridoSynced: true,
          ...(hasStartedAt
            ? { startedAtISO: normalizeSessionStartedAtToISO(startedRaw) }
            : {}),
        });
      } catch (e) {
        logRecorridoTimer('begin-recorrido → error', e instanceof Error ? e.message : e);
        if (!cancelled) {
          const snap = useActiveTrailSessionStore.getState().session;
          if (snap?.historyEntryId === historyId) {
            await setSession({ ...snap, beganRecorridoSynced: true });
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, session?.historyEntryId, session?.beganRecorridoSynced, token, setSession]);

  const [isPaused, setIsPaused] = useState(false);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationTrailName, setCelebrationTrailName] = useState('');
  const [completing, setCompleting] = useState(false);
  const [finishConfirmVisible, setFinishConfirmVisible] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; message: string } | null>(null);

  const minimizeAndLeave = useCallback(() => {
    void setMinimized(true);
    router.back();
  }, [setMinimized]);

  useFocusEffect(
    useCallback(() => {
      void setMinimized(false);
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        minimizeAndLeave();
        return true;
      });
      return () => sub.remove();
    }, [minimizeAndLeave, setMinimized]),
  );

  const ensureLocation = useCallback(async () => {
    const ok = await ensureTrailMapLocationPermission();
    if (!ok) {
      alertLocationDenied();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void ensureLocation();
    }, [ensureLocation]),
  );

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResumeNav = () => {
    setIsPaused(false);
  };

  const openFinishConfirm = () => {
    if (completing || !session) return;
    setFinishConfirmVisible(true);
  };

  const runCompleteAfterConfirm = async () => {
    setFinishConfirmVisible(false);
    if (!session) return;

    if (!token) {
      setInfoModal({
        title: 'Sesión',
        message: 'Tenés que iniciar sesión para guardar el recorrido.',
      });
      return;
    }

    setCompleting(true);
    try {
      const snap = useActiveTrailSessionStore.getState().session ?? session;
      let historyEntryId = snap.historyEntryId;
      if (historyEntryId.startsWith('local-')) {
        const entry = await startUserTrailHistory(token, snap.trailId);
        historyEntryId = entry.id;
      }
      await completeUserTrailHistory(token, historyEntryId);
      setCelebrationTrailName(snap.trailName);
      setCelebrationVisible(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos guardar la finalización. Intentá de nuevo.';
      setInfoModal({ title: 'Error', message: msg });
    } finally {
      setCompleting(false);
    }
  };

  const closeCelebration = () => {
    setCelebrationVisible(false);
    void clearSession().then(() => router.replace('/(tabs)' as any));
  };

  if (!hydrated) {
    return (
      <>
        <Tabs.Screen options={{ href: null }} />
        <ThemedView style={[styles.empty, { paddingTop: top }]}>
          <ActivityIndicator size="large" color={colors.tint} />
        </ThemedView>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Tabs.Screen options={{ href: null }} />
        <ThemedView style={[styles.empty, { paddingTop: top }]}>
          <ThemedText style={{ color: colors.icon }}>No hay un recorrido activo.</ThemedText>
          <Pressable
            style={[styles.ctaMuted, { marginTop: 16, borderColor: colors.tint }]}
            onPress={() => router.back()}>
            <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>Volver</ThemedText>
          </Pressable>
        </ThemedView>
      </>
    );
  }

  const chipBg = isDark ? 'rgba(44,44,46,0.94)' : 'rgba(255,255,255,0.94)';

  return (
    <>
      <Tabs.Screen options={{ href: null }} />
      <ThemedView style={styles.container}>
      <View style={styles.mapShell}>
        <TrailActiveNavigationMap
          ref={mapRef}
          lineCoordinates={session.lineCoordinates}
          interestPoints={session.interestPoints}
          fallbackCenter={session.fallbackCenter}
          isDark={isDark}
        />

        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={[styles.topRow, { paddingTop: top + 14 }]}>
            <View style={styles.zoomCol}>
              <Pressable
                style={[styles.zoomBtn, { backgroundColor: chipBg }]}
                onPress={() => mapRef.current?.zoomIn()}
                accessibilityLabel="Acercar mapa">
                <Ionicons name="add" size={22} color={isDark ? '#fff' : '#111'} />
              </Pressable>
              <Pressable
                style={[styles.zoomBtn, { backgroundColor: chipBg, marginTop: 8 }]}
                onPress={() => mapRef.current?.zoomOut()}
                accessibilityLabel="Alejar mapa">
                <Ionicons name="remove" size={22} color={isDark ? '#fff' : '#111'} />
              </Pressable>
            </View>

            <View style={[styles.trailTitleChip, { backgroundColor: chipBg }]}>
              <View style={styles.trailTitleRow}>
                <Ionicons name="map" size={22} color={colors.tint} style={styles.trailTitleIcon} />
                <View style={styles.trailTitleTextCol}>
                  <ThemedText
                    style={[styles.trailTitleName, { color: isDark ? '#fff' : '#111' }]}
                    numberOfLines={2}>
                    {session.trailName.trim() || 'Sendero'}
                  </ThemedText>
                  <ThemedText
                    style={[styles.trailTitleSubtitle, { color: isDark ? '#aaa' : '#666' }]}
                    numberOfLines={1}>
                    {isPaused ? 'En pausa' : 'Navegación activa'}
                  </ThemedText>
                </View>
              </View>
            </View>

            <Pressable
              style={[styles.minimizeBtn, { backgroundColor: chipBg }]}
              onPress={minimizeAndLeave}
              accessibilityLabel="Minimizar recorrido">
              <Ionicons name="chevron-down" size={22} color={isDark ? '#fff' : '#111'} />
            </Pressable>
          </View>

          <View style={[styles.bottomLeft, { paddingBottom: Math.max(bottom, 12) + 6 }]} pointerEvents="box-none">
            {!isPaused ? (
              <Pressable
                style={[styles.pauseFab, { backgroundColor: colors.tint }]}
                onPress={handlePause}
                accessibilityLabel="Pausar recorrido">
                <Ionicons name="pause" size={26} color="#fff" />
              </Pressable>
            ) : (
              <View style={styles.pausedActions}>
                <Pressable
                  style={[
                    styles.resumeBtn,
                    {
                      borderColor: colors.tint,
                      backgroundColor: isDark ? 'rgba(44,44,46,0.96)' : 'rgba(255,255,255,0.96)',
                    },
                  ]}
                  onPress={handleResumeNav}>
                  <Ionicons name="play" size={20} color={colors.tint} />
                  <ThemedText style={[styles.resumeBtnLabel, { color: colors.tint }]}>Reanudar</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.finishBtn, { backgroundColor: colors.tint, opacity: completing ? 0.7 : 1 }]}
                  onPress={openFinishConfirm}
                  disabled={completing}>
                  {completing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="flag" size={18} color="#fff" />
                      <ThemedText style={styles.finishBtnLabel}>Finalizar</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>

      <TrailFinishConfirmModal
        visible={finishConfirmVisible}
        title="Finalizar recorrido"
        message="¿Marcar este sendero como completado? Se guardará en tu historial."
        cancelLabel="Cancelar"
        confirmLabel="Finalizar"
        onCancel={() => setFinishConfirmVisible(false)}
        onConfirm={() => void runCompleteAfterConfirm()}
      />

      <TrailFinishConfirmModal
        visible={infoModal != null}
        variant="info"
        title={infoModal?.title ?? ''}
        message={infoModal?.message ?? ''}
        cancelLabel=""
        confirmLabel="Entendido"
        onCancel={() => setInfoModal(null)}
        onConfirm={() => setInfoModal(null)}
      />

      <TrailCompletionCelebrationModal
        visible={celebrationVisible}
        trailName={celebrationTrailName || session.trailName}
        onClose={closeCelebration}
      />
    </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapShell: { flex: 1, position: 'relative' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  ctaMuted: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    zIndex: 20,
    minHeight: 88,
  },
  zoomCol: {
    width: 48,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  trailTitleChip: {
    flex: 1,
    marginHorizontal: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    justifyContent: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  trailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trailTitleIcon: {
    marginRight: 10,
  },
  trailTitleTextCol: {
    flex: 1,
    minWidth: 0,
  },
  trailTitleName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  trailTitleSubtitle: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    lineHeight: 14,
  },
  minimizeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomLeft: {
    position: 'absolute',
    left: 16,
    bottom: 0,
    zIndex: 20,
  },
  pauseFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  pausedActions: {
    gap: 10,
    alignItems: 'flex-start',
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 100,
    borderWidth: 2,
  },
  resumeBtnLabel: { fontWeight: '700', fontSize: 15 },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 100,
  },
  finishBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
