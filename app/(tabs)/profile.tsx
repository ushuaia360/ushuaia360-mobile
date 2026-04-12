import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { redirectToLogin } from '@/lib/needAuth';
import { fetchProfileStats, type ProfileStatsResponse } from '@/services/api';
import { useAuthStore } from '@/store/auth-store';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200';

const SETTINGS = [
  { icon: 'person-outline',        label: 'Información personal' },
  { icon: 'notifications-outline', label: 'Notificaciones' },
  { icon: 'lock-closed-outline',   label: 'Privacidad y seguridad' },
  { icon: 'help-circle-outline',   label: 'Centro de ayuda' },
  { icon: 'log-out-outline',       label: 'Cerrar sesión', danger: true },
];

type ProfileSkelProps = { cardBg: string; skelBg: string; divider: string };

/** Tarjeta superior: mismos contenedores que el perfil cargado (sin borde vertical extra). */
function ProfileDataSectionSkeleton({ cardBg, skelBg, divider }: ProfileSkelProps) {
  return (
    <View
      accessibilityLabel="Cargando datos del perfil"
      style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.profileRow}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: skelBg }]} />
          <View style={[styles.skelBlock, { marginTop: 14, width: 112, height: 22, backgroundColor: skelBg }]} />
          <View style={[styles.skelBlock, { marginTop: 12, width: 156, height: 15, backgroundColor: skelBg }]} />
        </View>
        <View style={[styles.stats, styles.statsSkel]}>
          {[0, 1, 2].flatMap((i) => {
            const block = (
              <View key={`sk-stat-${i}`} style={styles.statItem}>
                <View
                  style={[styles.skelBlock, styles.skelBlockStats, { width: 36, height: 22, backgroundColor: skelBg }]}
                />
                <View
                  style={[
                    styles.skelBlock,
                    styles.skelBlockStats,
                    { marginTop: 8, width: 76, height: 13, backgroundColor: skelBg },
                  ]}
                />
              </View>
            );
            if (i === 0) return [block];
            return [
              <View
                key={`sk-div-${i}`}
                style={[styles.statDivider, styles.statDividerSkel, { backgroundColor: divider }]}
              />,
              block,
            ];
          })}
        </View>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { user, token, logout, isInitialized } = useAuthStore();
  const skelBg = isDark ? '#2c2c2e' : '#e8e8ed';
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  const [profileStats, setProfileStats] = useState<ProfileStatsResponse | null>(null);

  const loadProfileStats = useCallback(async () => {
    if (!token) return;
    try {
      const s = await fetchProfileStats(token);
      setProfileStats(s);
    } catch {
      setProfileStats({
        completed_trails_count: 0,
        reviews_count: 0,
        favorites_count: 0,
      });
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadProfileStats();
    }, [loadProfileStats]),
  );

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      redirectToLogin('/(tabs)/profile');
    }
  }, [user, isInitialized]);

  const isVerified = useMemo(() => Boolean(user?.email_verified), [user?.email_verified]);

  const statsPending = Boolean(user && profileStats === null);

  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const divider = isDark ? '#2a2a2a' : '#f0f0f0';
  const textSub = colors.icon;

  if (!isInitialized) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[styles.scroll, { paddingTop: top + 48 }]}>
          <ProfileDataSectionSkeleton cardBg={cardBg} skelBg={skelBg} divider={divider} />
          <View style={styles.grid}>
            <View style={[styles.gridCard, { backgroundColor: cardBg }]}>
              <View style={[styles.completedIconWrap, { backgroundColor: skelBg, marginTop: 20 }]} />
              <View style={[styles.skelBlock, { width: '70%', height: 18, marginTop: 12, backgroundColor: skelBg }]} />
            </View>
            <View style={[styles.gridCard, { backgroundColor: cardBg }]}>
              <View style={[styles.favImgs, { marginTop: 20 }]}>
                <View style={[styles.favImg, { backgroundColor: skelBg }]} />
                <View style={[styles.favImg, styles.favImgOverlap, { backgroundColor: skelBg }]} />
              </View>
              <View style={[styles.skelBlock, { width: '70%', height: 18, marginTop: 12, backgroundColor: skelBg }]} />
            </View>
          </View>
          <View style={[styles.ctaCard, { backgroundColor: cardBg }]}>
            <View style={[styles.ctaIcon, { backgroundColor: skelBg }]} />
            <View style={styles.ctaText}>
              <View style={[styles.skelBlock, { width: '55%', height: 17, backgroundColor: skelBg }]} />
              <View style={[styles.skelBlock, { width: '88%', height: 14, marginTop: 8, backgroundColor: skelBg }]} />
            </View>
            <View style={[styles.skelBlock, { width: 14, height: 14, borderRadius: 4, backgroundColor: skelBg }]} />
          </View>
          <View style={[styles.settingsCard, { backgroundColor: cardBg }]}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i}>
                <View style={styles.settingRow}>
                  <View style={[styles.settingIconWrap, { backgroundColor: skelBg }]} />
                  <View style={[styles.skelBlock, { flex: 1, height: 16, backgroundColor: skelBg }]} />
                  <View style={[styles.skelBlock, { width: 12, height: 12, borderRadius: 3, backgroundColor: skelBg }]} />
                </View>
                {i < 4 && <View style={[styles.rowDivider, { backgroundColor: divider }]} />}
              </View>
            ))}
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  if (!user) return null;

  const goToFavorites = () => {
    router.push('/(tabs)/favorites');
  };

  const goToCompletedTrails = () => {
    router.push('/(tabs)/completed-trails');
  };

  const senderosN = profileStats?.completed_trails_count ?? 0;
  const resenasN = profileStats?.reviews_count ?? 0;
  const favoritosN = profileStats?.favorites_count ?? 0;

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
          redirectToLogin('/(tabs)/profile');
        },
      },
    ]);
  };

  if (personalInfoOpen) {
    const premiumLabel = user?.is_premium ? 'Premium' : 'No premium';
    const emailForWrap = (user?.email ?? '').replace(/[@.]/g, (ch) => `${ch}\u200B`);
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[styles.scroll, { paddingTop: top + 12 }]}>
          <View style={[styles.personalHeader, { backgroundColor: cardBg }]}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() => setPersonalInfoOpen(false)}>
              <Ionicons name="chevron-back" size={20} color={textSub} />
            </TouchableOpacity>
            <ThemedText style={[styles.personalTitle, { color: colors.text }]}>
              Información personal
            </ThemedText>
          </View>

          <View style={[styles.personalCard, { backgroundColor: cardBg }]}>
            <View style={styles.personalAvatarRow}>
              <View style={styles.personalAvatarWrap}>
                <Image
                  source={{ uri: user?.avatar_url ?? DEFAULT_AVATAR }}
                  style={styles.personalAvatar}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              </View>
            </View>

            <View style={styles.fieldList}>
              <View style={[styles.fieldRow, { alignItems: 'flex-start' }]}>
                <ThemedText style={styles.fieldLabel}>Email</ThemedText>
                <ThemedText style={[styles.fieldValue, { flex: 1, textAlign: 'right' }]}>
                  {emailForWrap}
                </ThemedText>
              </View>

              <View style={styles.fieldRow}>
                <ThemedText style={styles.fieldLabel}>Verificado</ThemedText>
                <View style={styles.valueBadgeWrap}>
                  <Ionicons
                    name={isVerified ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={isVerified ? '#34c759' : '#ff3b30'}
                  />
                  <ThemedText
                    style={[
                      styles.valueBadgeText,
                      { color: isVerified ? '#34c759' : '#ff3b30' },
                    ]}>
                    {isVerified ? 'Sí' : 'No'}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.fieldRow}>
                <ThemedText style={styles.fieldLabel}>Nombre completo</ThemedText>
                <ThemedText style={[styles.fieldValue, { flex: 1, textAlign: 'right' }]}>
                  {user?.full_name ?? ''}
                </ThemedText>
              </View>

              <View style={styles.fieldRow}>
                <ThemedText style={styles.fieldLabel}>Plan</ThemedText>
                <View style={styles.valueBadgeWrap}>
                  <Ionicons
                    name={user?.is_premium ? 'star' : 'star-outline'}
                    size={16}
                    color={user?.is_premium ? colors.tint : textSub}
                  />
                  <ThemedText style={[styles.valueBadgeText, { color: user?.is_premium ? colors.tint : textSub }]}>
                    {premiumLabel}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[styles.scroll, { paddingTop: top + 48 }]}>

        {/* ── Profile card (toda la sección de datos en skeleton hasta tener stats) ── */}
        {statsPending ? (
          <ProfileDataSectionSkeleton cardBg={cardBg} skelBg={skelBg} divider={divider} />
        ) : (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.profileRow}>
              <View style={styles.avatarWrap}>
                <Image
                  source={{ uri: user?.avatar_url ?? DEFAULT_AVATAR }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
                <ThemedText style={[styles.userName, { marginTop: 10 }]}>
                  {user?.full_name ?? 'Usuario'}
                </ThemedText>
                <ThemedText style={[styles.userLocation, { color: textSub }]}>
                  {user?.email ?? ''}
                </ThemedText>
              </View>
              <View style={styles.stats}>
                <TouchableOpacity
                  style={styles.statItem}
                  activeOpacity={0.65}
                  onPress={goToCompletedTrails}
                  accessibilityRole="button"
                  accessibilityLabel="Ver senderos completados">
                  <ThemedText style={styles.statNum}>{senderosN}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: textSub }]}>Senderos</ThemedText>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: divider }]} />
                <View style={styles.statItem}>
                  <ThemedText style={styles.statNum}>{resenasN}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: textSub }]}>Reseñas</ThemedText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: divider }]} />
                <TouchableOpacity
                  style={styles.statItem}
                  activeOpacity={0.65}
                  onPress={goToFavorites}
                  accessibilityRole="button"
                  accessibilityLabel="Ver favoritos">
                  <ThemedText style={styles.statNum}>{favoritosN}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: textSub }]}>Favoritos</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Grid cards ── */}
        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: cardBg, justifyContent: 'space-between' }]}
            activeOpacity={0.85}
            onPress={goToCompletedTrails}
            accessibilityRole="button"
            accessibilityLabel="Senderos completados">
            <View style={[styles.completedIconWrap, { backgroundColor: '#fff', borderWidth: 2, borderColor: colors.tint, marginTop: 20 }]}>
              <Ionicons name="trail-sign-outline" size={32} color={colors.tint} />
            </View>
            <ThemedText style={styles.gridLabel}>Completados</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: cardBg, justifyContent: 'space-between' }]}
            activeOpacity={0.85}
            onPress={goToFavorites}
            accessibilityRole="button"
            accessibilityLabel="Favoritos">
            <View style={styles.favImgs}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200' }}
                style={styles.favImg}
              />
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200' }}
                style={[styles.favImg, styles.favImgOverlap]}
              />
            </View>
            <ThemedText style={styles.gridLabel}>Favoritos</ThemedText>
          </TouchableOpacity>
        </View>

        {/* ── Premium CTA ── */}
        <TouchableOpacity style={[styles.ctaCard, { backgroundColor: cardBg }]} activeOpacity={0.88}>
          <View style={[styles.ctaIcon, { backgroundColor: colors.tint + '18' }]}>
            <Ionicons name="download-outline" size={28} color={colors.tint} />
          </View>
          <View style={styles.ctaText}>
            <ThemedText style={styles.ctaTitle}>Modo sin conexión</ThemedText>
            <ThemedText style={[styles.ctaSubtitle, { color: textSub }]}>
              Descargá senderos para usarlos sin internet
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={textSub} />
        </TouchableOpacity>

        {/* ── Settings ── */}
        <View style={[styles.settingsCard, { backgroundColor: cardBg }]}>
          {SETTINGS.map(({ icon, label, danger }, i) => (
            <View key={label}>
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={
                  label === 'Cerrar sesión'
                    ? handleLogout
                    : label === 'Información personal'
                      ? () => setPersonalInfoOpen(true)
                      : undefined
                }>
                <View style={styles.settingIconWrap}>
                  <Ionicons name={icon as any} size={24} color={danger ? '#ff3b30' : colors.text} />
                </View>
                <ThemedText style={[styles.settingLabel, danger && { color: '#ff3b30' }]}>{label}</ThemedText>
                {!danger && <Ionicons name="chevron-forward" size={16} color={textSub} />}
              </TouchableOpacity>
              {i < SETTINGS.length - 1 && <View style={[styles.rowDivider, { backgroundColor: divider }]} />}
            </View>
          ))}
        </View>


      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 32, fontWeight: '600' },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile card
  card: {
    borderRadius: 20,
    padding: 14,
    paddingTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  avatarWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flex: 1, minWidth: 0, gap: 8, paddingLeft: 16 },
  /** Stats angostas en skeleton: centrar en la mitad derecha y gutter simétrico (stats ya trae paddingLeft). */
  statsSkel: {
    alignItems: 'center',
    paddingRight: 16,
  },
  statDividerSkel: {
    alignSelf: 'stretch',
  },
  statItem: { gap: 1 },
  statNum: { fontSize: 20, fontWeight: '600' },
  statLabel: { fontSize: 13 },
  statDivider: { height: 1 },
  userName: { fontSize: 22, fontWeight: '600', marginBottom: 4 },
  userLocation: { fontSize: 14 },

  // Grid
  grid: { flexDirection: 'row', gap: 12 },
  gridCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    paddingTop: 10,
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4,
    gap: 10,
    alignItems: 'center',
  },
  newBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  newText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  gridImg: { width: '100%', height: 70, borderRadius: 10 },
  gridIconWrap: { width: '100%', height: 70, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  completedIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  favImgs: { flexDirection: 'row', height: 70, marginTop: 20 },
  favImg: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: '#fff' },
  favImgOverlap: { width: 52, height: 52, borderRadius: 26, marginLeft: -12, marginTop: 4 },
  gridLabel: { fontSize: 17, fontWeight: '600', marginTop: 4 },

  // CTA
  ctaCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4,
  },
  ctaIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { flex: 1, gap: 0 },
  ctaTitle: { fontSize: 16, fontWeight: '600' },
  ctaSubtitle: { fontSize: 13, marginTop: -1, lineHeight: 17 },

  // Settings
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { flex: 1, fontSize: 15 },
  rowDivider: { height: 1, marginLeft: 66 },

  // Personal info
  personalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalTitle: { fontSize: 18, fontWeight: '700' },
  personalCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4,
    gap: 14,
  },
  personalAvatarRow: { alignItems: 'center' },
  personalAvatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalAvatar: {
    width: 96,
    height: 96,
  },
  fieldList: { gap: 18 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  fieldLabel: {
    fontSize: 15,
    opacity: 0.7,
    flex: 1,
    fontWeight: '600',
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  valueBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  valueBadgeText: { fontSize: 15, fontWeight: '800' },

  skelBlock: {
    borderRadius: 6,
    alignSelf: 'center',
  },
  /** Misma alineación que `statItem` (números / labels a la izquierda). */
  skelBlockStats: {
    alignSelf: 'flex-start',
  },

  // Auth
  authRow: { flexDirection: 'row', gap: 12 },
  authBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authBtnText: { fontSize: 15, fontWeight: '500', color: '#fff' },
});
