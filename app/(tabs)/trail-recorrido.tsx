import TrailActiveNavigationMap, {
  type TrailActiveNavigationMapRef,
} from '@/components/trail-active-navigation-map';
import TrailCompletionCelebrationModal from '@/components/trail-completion-celebration-modal';
import TrailEmergencyModal from '@/components/trail-emergency-modal';
import TrailFinishConfirmModal from '@/components/trail-finish-confirm-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { appAlert } from '@/lib/app-alert';
import { shouldQueueTrailCompletionError } from '@/lib/network-error';
import { enqueuePendingTrailCompletion } from '@/lib/pending-trail-completion';
import { normalizeSessionStartedAtToISO } from '@/lib/session-started-at';
import { logRecorridoTimer } from '@/lib/recorrido-timer-debug';
import { ensureTrailMapLocationPermission, alertLocationDenied } from '@/lib/trail-location-permission';
import {
  ApiHttpError,
  beginTrailHistoryRecorrido,
  completeUserTrailHistory,
  startUserTrailHistory,
  trailHistoryEntryStartedAt,
} from '@/services/api';
import { useAuthStore } from '@/store/auth-store';
import {
  type ActiveTrailEmergencyPoint,
  selectActiveSession,
  useActiveTrailSessionStore,
} from '@/store/active-trail-session-store';
import { Ionicons } from '@expo/vector-icons';
import { router, Tabs, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TrailRecorridoScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { top, bottom } = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const mapRef = useRef<TrailActiveNavigationMapRef>(null);

  const hydrated = useActiveTrailSessionStore((s) => s.hydrated);
  const session = useActiveTrailSessionStore((s) => selectActiveSession(s));
  const setMinimized = useActiveTrailSessionStore((s) => s.setMinimized);
  const removeSessionByHistoryId = useActiveTrailSessionStore((s) => s.removeSessionByHistoryId);
  const updateActiveSession = useActiveTrailSessionStore((s) => s.updateActiveSession);

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
        const snap = selectActiveSession(useActiveTrailSessionStore.getState());
        if (!snap?.historyEntryId.startsWith('local-')) return;
        const entry = await startUserTrailHistory(token, snap.trailId);
        logRecorridoTimer('local→server /start OK', {
          entryId: entry.id,
          startedRaw: trailHistoryEntryStartedAt(entry),
          trailId: snap.trailId,
        });
        await updateActiveSession({
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
  }, [hydrated, session, token, updateActiveSession]);

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
        if (cancelled) return;
        const snap = selectActiveSession(useActiveTrailSessionStore.getState());
        if (!snap || snap.historyEntryId !== historyId) return;
        const startedRaw = trailHistoryEntryStartedAt(entry);
        const hasStartedAt =
          startedRaw != null &&
          (typeof startedRaw === 'number' ||
            (typeof startedRaw === 'string' && startedRaw.trim() !== ''));
        await updateActiveSession({
          beganRecorridoSynced: true,
          ...(hasStartedAt
            ? { startedAtISO: normalizeSessionStartedAtToISO(startedRaw) }
            : {}),
        });
      } catch (e) {
        logRecorridoTimer('begin-recorrido → error', e instanceof Error ? e.message : e);
        if (!cancelled) {
          const snap = selectActiveSession(useActiveTrailSessionStore.getState());
          if (snap?.historyEntryId === historyId) {
            await updateActiveSession({ beganRecorridoSynced: true });
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, [hydrated, session?.historyEntryId, session?.beganRecorridoSynced, token, updateActiveSession]);

  const [isPaused, setIsPaused] = useState(false);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationTrailName, setCelebrationTrailName] = useState('');
  const [completing, setCompleting] = useState(false);
  const [finishConfirmVisible, setFinishConfirmVisible] = useState(false);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [highlightedEmergencyId, setHighlightedEmergencyId] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<{ title: string; message: string } | null>(null);

  // ─── Timer ────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (isPaused || !session?.startedAtISO) return;
    const tick = () =>
      setElapsed(Math.floor((Date.now() - new Date(session.startedAtISO).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isPaused, session?.startedAtISO]);

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
    if (!ok) alertLocationDenied();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void ensureLocation();
    }, [ensureLocation]),
  );

  const openFinishConfirm = () => {
    if (completing || !session) return;
    setFinishConfirmVisible(true);
  };

  const runCompleteAfterConfirm = async () => {
    setFinishConfirmVisible(false);
    if (!session) return;

    if (!token) {
      setInfoModal({ title: t('trailRecorrido.sessionTitle'), message: t('trailRecorrido.noAuthMessage') });
      return;
    }

    const snapBefore = selectActiveSession(useActiveTrailSessionStore.getState()) ?? session;

    setCompleting(true);
    let serverIdAfterStart: string | undefined;
    try {
      let historyEntryId = snapBefore.historyEntryId;
      if (historyEntryId.startsWith('local-')) {
        const entry = await startUserTrailHistory(token, snapBefore.trailId);
        historyEntryId = entry.id;
        serverIdAfterStart = entry.id;
      }
      await completeUserTrailHistory(token, historyEntryId);
      setCelebrationTrailName(snapBefore.trailName);
      setCelebrationVisible(true);
    } catch (e) {
      if (e instanceof ApiHttpError && e.status === 401) {
        setInfoModal({ title: t('trailRecorrido.sessionTitle'), message: t('trailRecorrido.noAuthMessage') });
        return;
      }
      if (shouldQueueTrailCompletionError(e)) {
        try {
          await enqueuePendingTrailCompletion({
            trailId: snapBefore.trailId,
            serverHistoryEntryId: serverIdAfterStart,
          });
          await removeSessionByHistoryId(snapBefore.historyEntryId);
          router.replace('/(tabs)' as any);
          setTimeout(() => {
            appAlert(
              t('common.noConnection'),
              t('trailRecorrido.noConnectionMessage'),
            );
          }, 400);
        } catch {
          const msg =
            e instanceof Error ? e.message : t('trailRecorrido.saveError');
          setInfoModal({ title: t('common.error'), message: msg });
        }
        return;
      }
      const msg = e instanceof Error ? e.message : t('trailRecorrido.saveError');
      setInfoModal({ title: t('common.error'), message: msg });
    } finally {
      setCompleting(false);
    }
  };

  const closeCelebration = () => {
    setCelebrationVisible(false);
    const hid = session?.historyEntryId;
    void (async () => {
      if (hid) await removeSessionByHistoryId(hid);
      router.replace('/(tabs)' as any);
    })();
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
          <ThemedText style={{ color: colors.icon }}>{t('trailRecorrido.noSession')}</ThemedText>
          <Pressable
            style={[styles.ctaMuted, { marginTop: 16, borderColor: colors.tint }]}
            onPress={() => router.back()}>
            <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{t('common.back')}</ThemedText>
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
            emergencyPoints={session.emergencyPoints ?? []}
            highlightedEmergencyId={highlightedEmergencyId}
            fallbackCenter={session.fallbackCenter}
            isDark={isDark}
            isPaused={isPaused}
          />

          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

            {/* ── Top row: chip + minimize ── */}
            <View style={[styles.topRow, { paddingTop: top + 14 }]}>
              <View style={[styles.trailTitleChip, { backgroundColor: chipBg }]}>
                <Ionicons name="map" size={20} color={colors.tint} style={styles.trailTitleIcon} />
                <View style={styles.trailTitleTextCol}>
                  <ThemedText
                    style={[styles.trailTitleName, { color: isDark ? '#fff' : '#111' }]}
                    numberOfLines={1}>
                    {session.trailName.trim() || 'Sendero'}
                  </ThemedText>
                  <ThemedText style={[styles.trailTitleTime, { color: isDark ? '#aaa' : '#666' }]}>
                    {isPaused ? t('trailRecorrido.paused') : t('trailRecorrido.navigating')}
                  </ThemedText>
                </View>
              </View>

              <Pressable
                style={[styles.minimizeBtn, { backgroundColor: chipBg }]}
                onPress={minimizeAndLeave}
                accessibilityLabel={t('trailRecorrido.minimize')}>
                <Ionicons name="chevron-down" size={22} color={isDark ? '#fff' : '#111'} />
              </Pressable>
            </View>

            {/* ── Bottom controls ── */}
            <View style={[styles.bottomBar, { paddingBottom: isPaused ? Math.max(bottom, 8) : Math.max(bottom, 16) + 8 }]} pointerEvents="box-none">
              {isPaused ? (
                <View style={styles.pausedRow}>
                  <Pressable
                    style={[
                      styles.actionBtn,
                      {
                        borderColor: colors.tint,
                        backgroundColor: isDark ? 'rgba(44,44,46,0.96)' : 'rgba(255,255,255,0.96)',
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => setIsPaused(false)}>
                    <Ionicons name="play" size={20} color={colors.tint} />
                    <ThemedText style={[styles.actionBtnLabel, { color: colors.tint }]}>{t('trailRecorrido.resume')}</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.actionBtn,
                      { backgroundColor: colors.tint, opacity: completing ? 0.7 : 1 },
                    ]}
                    onPress={openFinishConfirm}
                    disabled={completing}>
                    {completing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="flag" size={18} color="#fff" />
                        <ThemedText style={[styles.actionBtnLabel, { color: '#fff' }]}>{t('trailRecorrido.finish')}</ThemedText>
                      </>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View style={styles.bottomRow}>
                  <Pressable
                    style={styles.emergencyBtn}
                    onPress={() => setEmergencyModalVisible(true)}
                    accessibilityLabel={t('trailEmergency.button')}>
                    <Ionicons name="warning" size={26} color="#fff" />
                  </Pressable>
                  <View style={styles.bottomCenter}>
                    <View style={styles.pauseGroup}>
                      <Pressable
                        style={[styles.pauseFab, { backgroundColor: colors.tint }]}
                        onPress={() => setIsPaused(true)}
                        accessibilityLabel={t('trailRecorrido.pause')}>
                        <Ionicons name="pause" size={28} color="#fff" />
                      </Pressable>
                      <View style={[styles.timerBadge, { backgroundColor: colors.tint }]}>
                        <ThemedText style={styles.timerText}>{formatElapsed(elapsed)}</ThemedText>
                      </View>
                    </View>
                  </View>
                  <View style={styles.bottomSideSpacer} />
                </View>
              )}
            </View>

          </View>
        </View>

        <TrailFinishConfirmModal
          visible={finishConfirmVisible}
          title={t('trailRecorrido.finishTitle')}
          message={t('trailRecorrido.finishMessage')}
          cancelLabel={t('common.cancel')}
          confirmLabel={t('trailRecorrido.finish')}
          onCancel={() => setFinishConfirmVisible(false)}
          onConfirm={() => void runCompleteAfterConfirm()}
        />

        <TrailFinishConfirmModal
          visible={infoModal != null}
          variant="info"
          title={infoModal?.title ?? ''}
          message={infoModal?.message ?? ''}
          cancelLabel=""
          confirmLabel={t('trailRecorrido.understood')}
          onCancel={() => setInfoModal(null)}
          onConfirm={() => setInfoModal(null)}
        />

        <TrailCompletionCelebrationModal
          visible={celebrationVisible}
          trailId={session.trailId}
          token={token}
          trailName={celebrationTrailName || session.trailName}
          onClose={closeCelebration}
        />

        <TrailEmergencyModal
          visible={emergencyModalVisible}
          points={session.emergencyPoints ?? []}
          onClose={() => setEmergencyModalVisible(false)}
          onViewOnMap={(point: ActiveTrailEmergencyPoint) => {
            setHighlightedEmergencyId(point.id);
            mapRef.current?.focusCoordinate({
              latitude: point.latitude,
              longitude: point.longitude,
            });
            setEmergencyModalVisible(false);
          }}
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

  // ── Top row ──
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    gap: 10,
    zIndex: 20,
  },
  trailTitleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  trailTitleIcon: {
    marginRight: 10,
  },
  trailTitleTextCol: {
    flex: 1,
    minWidth: 0,
  },
  trailTitleName: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  trailTitleTime: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.2,
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

  // ── Bottom controls ──
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 20,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  bottomCenter: {
    flex: 1,
    alignItems: 'center',
  },
  bottomSideSpacer: {
    width: 52,
  },
  emergencyBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E65C00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 6,
  },
  pauseGroup: {
    alignItems: 'center',
    gap: 10,
  },
  pauseFab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  timerBadge: {
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  timerText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  pausedRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  actionBtnLabel: {
    fontWeight: '700',
    fontSize: 15,
    flexShrink: 1,
  },
});
