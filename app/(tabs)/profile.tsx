import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hasPremiumAccess } from '@/lib/offline-download-gate';
import { redirectToLogin } from '@/lib/needAuth';
import { fetchProfileStats, type ProfileStatsResponse } from '@/services/api';
import { presentCustomerCenter } from '@/services/purchases';
import { useAuthStore } from '@/store/auth-store';
import { usePurchasesStore } from '@/store/purchases-store';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200';

type ProfileSkelProps = { cardBg: string; skelBg: string; divider: string };

function ProfileDataSectionSkeleton({ cardBg, skelBg, divider }: ProfileSkelProps) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityLabel={t('profile.loadingProfile')}
      style={[styles.card, { backgroundColor: cardBg, borderColor: divider }]}>
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
                <View style={[styles.skelBlock, styles.skelBlockStats, { width: 36, height: 22, backgroundColor: skelBg }]} />
                <View style={[styles.skelBlock, styles.skelBlockStats, { marginTop: 8, width: 76, height: 13, backgroundColor: skelBg }]} />
              </View>
            );
            if (i === 0) return [block];
            return [
              <View key={`sk-div-${i}`} style={[styles.statDivider, styles.statDividerSkel, { backgroundColor: divider }]} />,
              block,
            ];
          })}
        </View>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { user, token, logout, isInitialized } = useAuthStore();
  const isPro = usePurchasesStore((s) => s.isPro);
  const isAlreadyPro = hasPremiumAccess(user, isPro);
  const skelBg = isDark ? '#2c2c2e' : '#e8e8ed';
  const [profileStats, setProfileStats] = useState<ProfileStatsResponse | null>(null);

  const loadProfileStats = useCallback(async () => {
    if (!token) return;
    try {
      const s = await fetchProfileStats(token);
      setProfileStats(s);
    } catch {
      setProfileStats({ completed_trails_count: 0, reviews_count: 0, favorites_count: 0 });
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (isInitialized && !user) {
        redirectToLogin('/(tabs)/profile');
        return;
      }
      loadProfileStats();
    }, [isInitialized, user, loadProfileStats]),
  );

  const statsPending = Boolean(user && profileStats === null);

  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const divider = isDark ? '#2a2a2a' : '#f0f0f0';
  const textSub = colors.icon;

  const SETTINGS = useMemo(() => [
    { icon: 'person-outline',        label: t('profile.settings.personalInfo'),       key: 'personalInfo' },
    { icon: 'lock-closed-outline',   label: t('profile.settings.privacySecurity'),    key: 'privacySecurity' },
    // Subscriptions are disabled on iOS for now — no IAP configured there yet.
    ...(Platform.OS === 'ios' ? [] : [
      { icon: 'receipt-outline',     label: t('profile.settings.manageSubscription'), key: 'manageSubscription' },
    ]),
    { icon: 'trash-outline',         label: t('profile.settings.deleteAccount'),      key: 'deleteAccount', danger: true },
    { icon: 'log-out-outline',       label: t('profile.settings.logout'),             key: 'logout', danger: true },
  ], [t]);

  if (!isInitialized) {
    return (
      <ThemedView style={styles.container} lightColor="#F6F7F9">
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[styles.scroll, { paddingTop: top + 48 }]}>
          <ProfileDataSectionSkeleton cardBg={cardBg} skelBg={skelBg} divider={divider} />
          <View style={styles.grid}>
            <View style={[styles.gridCard, { backgroundColor: cardBg, borderColor: divider }]}>
              <View style={[styles.completedIconWrap, { backgroundColor: skelBg, marginTop: 20 }]} />
              <View style={[styles.skelBlock, { width: '70%', height: 18, marginTop: 12, backgroundColor: skelBg }]} />
            </View>
            <View style={[styles.gridCard, { backgroundColor: cardBg, borderColor: divider }]}>
              <View style={[styles.favImgs, { marginTop: 20 }]}>
                <View style={[styles.favImg, { backgroundColor: skelBg }]} />
                <View style={[styles.favImg, styles.favImgOverlap, { backgroundColor: skelBg }]} />
              </View>
              <View style={[styles.skelBlock, { width: '70%', height: 18, marginTop: 12, backgroundColor: skelBg }]} />
            </View>
          </View>
          <View style={[styles.ctaCard, { backgroundColor: cardBg, borderColor: divider }]}>
            <View style={[styles.ctaIcon, { backgroundColor: skelBg }]} />
            <View style={styles.ctaText}>
              <View style={[styles.skelBlock, { width: '55%', height: 17, backgroundColor: skelBg }]} />
              <View style={[styles.skelBlock, { width: '88%', height: 14, marginTop: 8, backgroundColor: skelBg }]} />
            </View>
            <View style={[styles.skelBlock, { width: 14, height: 14, borderRadius: 4, backgroundColor: skelBg }]} />
          </View>
          <View style={[styles.settingsCard, { backgroundColor: cardBg, borderColor: divider }]}>
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

  if (!user) return <ThemedView style={styles.container} lightColor="#F6F7F9" />;

  const senderosN = profileStats?.completed_trails_count ?? 0;
  const resenasN = profileStats?.reviews_count ?? 0;
  const favoritosN = profileStats?.favorites_count ?? 0;

  const handleLogout = () => {
    Alert.alert(t('profile.logoutTitle'), t('profile.logoutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.settings.logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          redirectToLogin('/(tabs)/profile');
        },
      },
    ]);
  };

  const handleSettingPress = (key: string) => {
    if (key === 'logout') return handleLogout();
    if (key === 'personalInfo') return router.push('/personal-info');
    if (key === 'privacySecurity') return router.push('/privacy-security');
    if (key === 'deleteAccount') return router.push('/delete-account');
    if (key === 'manageSubscription') return void presentCustomerCenter();
  };

  return (
    <ThemedView style={styles.container} lightColor="#F6F7F9">
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[styles.scroll, { paddingTop: top + 48 }]}>

        {statsPending ? (
          <ProfileDataSectionSkeleton cardBg={cardBg} skelBg={skelBg} divider={divider} />
        ) : (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: divider }]}>
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
                  {user?.full_name ?? t('profile.defaultUser')}
                </ThemedText>
                {isAlreadyPro && (
                  <View
                    style={styles.proBadge}
                    accessibilityLabel={t('profile.accessibility.isPro')}>
                    <MaterialCommunityIcons name="crown" size={12} color="#fff" />
                    <ThemedText style={styles.proBadgeText}>{t('profile.proBadge')}</ThemedText>
                  </View>
                )}
              </View>
              <View style={styles.stats}>
                <TouchableOpacity
                  style={styles.statItem}
                  activeOpacity={0.65}
                  onPress={() => router.push('/(tabs)/completed-trails')}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.accessibility.completedTrails')}>
                  <ThemedText style={styles.statNum}>{senderosN}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: textSub }]}>{t('profile.stats.trails')}</ThemedText>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: divider }]} />
                <View style={styles.statItem}>
                  <ThemedText style={styles.statNum}>{resenasN}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: textSub }]}>{t('profile.stats.reviews')}</ThemedText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: divider }]} />
                <TouchableOpacity
                  style={styles.statItem}
                  activeOpacity={0.65}
                  onPress={() => router.push('/(tabs)/favorites')}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.accessibility.favorites')}>
                  <ThemedText style={styles.statNum}>{favoritosN}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: textSub }]}>{t('profile.stats.favorites')}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Premium banner — CTA routes to /premium, where iOS purchasing stays disabled until IAP is approved */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => (isAlreadyPro ? void presentCustomerCenter() : router.push('/premium'))}
          accessibilityRole="button"
          accessibilityLabel={isAlreadyPro ? t('profile.accessibility.isPro') : t('profile.accessibility.premium')}
          style={styles.premiumBannerWrap}>
          <LinearGradient
            colors={['#1a3a5c', '#0d6ebd', '#1a3a5c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumBanner}>
            {/* Glow orbs */}
            <View style={[styles.premiumGlow, { top: -40, right: 20 }]} />
            <View style={[styles.premiumGlow, { bottom: -30, left: 30, width: 80, height: 80 }]} />

            {/* Crown + title */}
            <View style={styles.premiumTop}>
              <View style={styles.premiumCrownWrap}>
                <MaterialCommunityIcons name="crown" size={28} color="#fff" />
              </View>
              <View style={styles.premiumTitleBlock}>
                <ThemedText style={styles.premiumTitle}>
                  {isAlreadyPro ? t('premium.activeTitle') : t('profile.premium.title')}
                </ThemedText>
                <ThemedText style={styles.premiumSub}>
                  {isAlreadyPro ? t('premium.activeSub') : 'Explorá Ushuaia sin límites'}
                </ThemedText>
              </View>
            </View>

            {/* Feature pills */}
            {!isAlreadyPro && (
              <View style={styles.premiumPills}>
                {['Senderos', 'Wallpapers', 'Soporte 24/7'].map((pill) => (
                  <View key={pill} style={styles.premiumPill}>
                    <ThemedText style={styles.premiumPillText}>{pill}</ThemedText>
                  </View>
                ))}
              </View>
            )}

            {/* CTA */}
            <View style={styles.premiumCta}>
              <ThemedText style={styles.premiumCtaText}>
                {isAlreadyPro ? t('premium.manageSubscription') : 'Ver planes'}
              </ThemedText>
              <Ionicons name="arrow-forward" size={14} color="#0d6ebd" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Grid cards */}
        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: cardBg, borderColor: divider, justifyContent: 'space-between' }]}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/completed-trails')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.grid.completed')}>
            <View style={[styles.completedIconWrap, { backgroundColor: '#fff', borderWidth: 2, borderColor: colors.tint, marginTop: 20 }]}>
              <Ionicons name="trail-sign-outline" size={32} color={colors.tint} />
            </View>
            <ThemedText style={styles.gridLabel}>{t('profile.grid.completed')}</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: cardBg, borderColor: divider, justifyContent: 'space-between' }]}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/favorites')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.grid.favorites')}>
            <View style={styles.favImgs}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200' }} style={styles.favImg} />
              <Image source={{ uri: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200' }} style={[styles.favImg, styles.favImgOverlap]} />
            </View>
            <ThemedText style={styles.gridLabel}>{t('profile.grid.favorites')}</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Offline CTA */}
        <TouchableOpacity
          style={[styles.ctaCard, { backgroundColor: cardBg, borderColor: divider }]}
          activeOpacity={0.88}
          onPress={() => router.push('/(tabs)/downloads')}
          accessibilityRole="button"
          accessibilityLabel={t('profile.accessibility.offline')}>
          <View style={[styles.ctaIcon, { backgroundColor: colors.tint + '18' }]}>
            <Ionicons name="download-outline" size={28} color={colors.tint} />
          </View>
          <View style={styles.ctaText}>
            <ThemedText style={styles.ctaTitle}>{t('profile.offline.title')}</ThemedText>
            <ThemedText style={[styles.ctaSubtitle, { color: textSub }]}>{t('profile.offline.subtitle')}</ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={textSub} />
        </TouchableOpacity>

        {/* Wallpapers */}
        <TouchableOpacity
          style={[styles.ctaCard, { backgroundColor: cardBg, borderColor: divider }]}
          activeOpacity={0.88}
          onPress={() => router.push('/wallpapers')}
          accessibilityRole="button"
          accessibilityLabel={t('profile.accessibility.wallpapers')}>
          <View style={[styles.ctaIcon, { backgroundColor: colors.tint + '18' }]}>
            <Ionicons name="image-outline" size={28} color={colors.tint} />
          </View>
          <View style={styles.ctaText}>
            <ThemedText style={styles.ctaTitle}>{t('profile.wallpapers.title')}</ThemedText>
            <ThemedText style={[styles.ctaSubtitle, { color: textSub }]}>{t('profile.wallpapers.subtitle')}</ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={textSub} />
        </TouchableOpacity>

        {/* Settings */}
        <View style={[styles.settingsCard, { backgroundColor: cardBg, borderColor: divider }]}>
          {SETTINGS.map(({ icon, label, key, danger }, i) => (
            <View key={key}>
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={() => handleSettingPress(key)}>
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
  card: {
    borderRadius: 20,
    padding: 14,
    paddingTop: 24,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
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
  stats: { flex: 1, minWidth: 0, gap: 8, paddingLeft: 16 },
  statsSkel: { alignItems: 'center', paddingRight: 16 },
  statDividerSkel: { alignSelf: 'stretch' },
  statItem: { gap: 1 },
  statNum: { fontSize: 20, fontWeight: '600' },
  statLabel: { fontSize: 13 },
  statDivider: { height: 1 },
  userName: { fontSize: 22, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  userLocation: { fontSize: 14 },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#0d6ebd',
  },
  proBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  premiumBannerWrap: {
    borderRadius: 20,
    shadowColor: '#0d6ebd',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  premiumBanner: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
    overflow: 'hidden',
  },
  premiumGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  premiumTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumCrownWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  premiumTitleBlock: { gap: 3, flex: 1 },
  premiumTitle: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  premiumSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  premiumPills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  premiumPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  premiumPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  premiumCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
  },
  premiumCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0d6ebd',
  },
  grid: { flexDirection: 'row', gap: 12 },
  gridCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    paddingTop: 10,
    minHeight: 160,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    gap: 10,
    alignItems: 'center',
  },
  completedIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  favImgs: { flexDirection: 'row', height: 70, marginTop: 20 },
  favImg: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: '#fff' },
  favImgOverlap: { width: 52, height: 52, borderRadius: 26, marginLeft: -12, marginTop: 4 },
  gridLabel: { fontSize: 17, fontWeight: '600', marginTop: 4 },
  ctaCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
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
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
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

  skelBlock: { borderRadius: 6, alignSelf: 'center' },
  skelBlockStats: { alignSelf: 'flex-start' },
});
