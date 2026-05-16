import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getProOffering, purchasePro, restorePurchases } from '@/services/purchases';
import { useAuthStore } from '@/store/auth-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tier = {
  id: string;
  name: string;
  price: string;
  period: string;
  accentColor: string;
  crownName: 'crown-outline' | 'crown';
  cta: string;
  isFree?: boolean;
  popular?: boolean;
  features?: string[];
  missing?: string[];
};

export default function PremiumScreen() {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const [selected, setSelected] = useState<string>('pro');
  const [purchasing, setPurchasing] = useState(false);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const TIERS = useMemo<Tier[]>(() => [
    {
      id: 'explorer',
      name: t('premium.tiers.explorer.name'),
      price: t('premium.tiers.explorer.price'),
      period: t('premium.tiers.explorer.period'),
      accentColor: '#687076',
      crownName: 'crown-outline',
      missing: [
        t('premium.tiers.explorer.features.offline'),
        t('premium.tiers.explorer.features.wallpapers'),
        t('premium.tiers.explorer.features.support'),
      ],
      cta: t('premium.tiers.explorer.cta'),
      isFree: true,
    },
    {
      id: 'pro',
      name: t('premium.tiers.pro.name'),
      price: '$4.99',
      period: t('premium.tiers.pro.period'),
      accentColor: '#3FA9F5',
      crownName: 'crown',
      features: [
        t('premium.tiers.pro.features.offline'),
        t('premium.tiers.pro.features.wallpapers'),
        t('premium.tiers.pro.features.support'),
      ],
      cta: t('premium.tiers.pro.cta'),
      popular: true,
    },
  ], [t]);

  const activeTier = TIERS.find((tier) => tier.id === selected)!;

  const handlePurchase = useCallback(async () => {
    if (activeTier.isFree) return;
    setPurchasing(true);
    try {
      const pkg = await getProOffering();
      if (!pkg) {
        Alert.alert(t('premium.noOfferingTitle'), t('premium.noOfferingBody'));
        return;
      }
      const success = await purchasePro(pkg);
      if (success) {
        await refreshUser();
        Alert.alert(t('premium.welcomeTitle'), t('premium.welcomeBody'), [
          { text: t('premium.continue'), onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      if (e?.userCancelled) return;
      Alert.alert(t('common.error'), t('premium.purchaseError'));
    } finally {
      setPurchasing(false);
    }
  }, [activeTier, refreshUser, t]);

  const handleRestore = useCallback(async () => {
    setPurchasing(true);
    try {
      const active = await restorePurchases();
      await refreshUser();
      Alert.alert(
        active ? t('premium.restoredTitle') : t('premium.noPurchasesTitle'),
        active ? t('premium.restoredBody') : t('premium.noPurchasesBody'),
      );
    } catch {
      Alert.alert(t('common.error'), t('premium.restoreError'));
    } finally {
      setPurchasing(false);
    }
  }, [refreshUser, t]);

  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const divider = isDark ? '#2a2a2a' : '#f0f0f0';
  const textSub = colors.icon;
  const headerBg = isDark ? '#1c1c1e' : '#fff';
  const headerBorder = isDark ? '#2a2a2a' : '#EDF0F5';
  const pageBg = isDark ? '#151718' : '#f2f2f7';

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.push('/(tabs)/profile');
  }, []);

  return (
    <ThemedView style={styles.container}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { paddingTop: top + 8, backgroundColor: headerBg, borderBottomColor: headerBorder },
        ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.headerBack}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <ThemedText style={styles.headerTitle}>{t('premium.title')}</ThemedText>
          </View>
          <View style={[styles.headerIconWrap, { backgroundColor: '#F5C51818' }]}>
            <MaterialCommunityIcons name="crown" size={22} color="#F5C518" />
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { backgroundColor: pageBg }]}>

        {/* ── Tiers ── */}
        {TIERS.map((tier, idx) => {
          const isSelected = selected === tier.id;
          const isLast = idx === TIERS.length - 1;
          return (
            <View key={tier.id}>
              <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
                {/* Card header row */}
                <TouchableOpacity
                  style={styles.tierHeaderRow}
                  activeOpacity={0.75}
                  onPress={() => setSelected(tier.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('premium.selectPlan', { name: tier.name })}>
                  <View style={[styles.tierIconWrap, { backgroundColor: tier.accentColor + '18' }]}>
                    <MaterialCommunityIcons
                      name={tier.crownName}
                      size={20}
                      color={tier.accentColor}
                    />
                  </View>
                  <View style={styles.tierNameBlock}>
                    <View style={styles.tierNameRow}>
                      <ThemedText style={styles.tierName}>{tier.name}</ThemedText>
                      {tier.popular && (
                        <View style={[styles.popularBadge, { backgroundColor: tier.accentColor + '18' }]}>
                          <Text style={[styles.popularText, { color: tier.accentColor }]}>
                            {t('premium.popular')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <ThemedText style={[styles.tierPriceLine, { color: textSub }]}>
                      <Text style={[styles.tierPrice, { color: tier.accentColor }]}>
                        {tier.price}
                      </Text>
                      {!tier.isFree && `  ·  ${tier.period}`}
                      {tier.isFree && `  ·  ${tier.period}`}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected
                        ? { borderColor: tier.accentColor }
                        : { borderColor: divider },
                    ]}>
                    {isSelected && (
                      <View style={[styles.radioInner, { backgroundColor: tier.accentColor }]} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Features / Missing */}
                {(tier.missing ?? tier.features ?? []).map((f) => {
                  const isMissing = 'missing' in tier;
                  return (
                    <View key={f}>
                      <View style={[styles.divider, { backgroundColor: divider }]} />
                      <View style={styles.featureRow}>
                        <View style={[
                          styles.featureIconWrap,
                          { backgroundColor: isMissing ? '#ff3b3015' : tier.accentColor + '15' },
                        ]}>
                          <Ionicons
                            name={isMissing ? 'close' : 'checkmark'}
                            size={14}
                            color={isMissing ? '#ff3b30' : tier.accentColor}
                          />
                        </View>
                        <ThemedText style={[styles.featureText, isMissing && styles.featureTextMissing]}>
                          {f}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>

              {!isLast && <View style={styles.cardGap} />}
            </View>
          );
        })}

        {/* ── CTA ── */}
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: activeTier.accentColor, opacity: purchasing ? 0.6 : 1 }]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={activeTier.cta}
          disabled={purchasing}
          onPress={activeTier.isFree ? goBack : handlePurchase}>
          {!activeTier.isFree && (
            <MaterialCommunityIcons
              name="crown"
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={styles.ctaBtnText}>
            {purchasing ? t('premium.processing') : activeTier.cta}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRestore} disabled={purchasing}>
          <ThemedText style={[styles.restoreText, { color: textSub }]}>
            {t('premium.restore')}
          </ThemedText>
        </TouchableOpacity>

        <ThemedText style={[styles.legalText, { color: textSub }]}>
          {t('premium.legal')}
        </ThemedText>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header — idéntico al de personal-info / privacy-security
  header: {
    paddingBottom: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 0,
    flexGrow: 1,
  },

  // Section card
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardGap: { height: 16 },

  // Tier header inside card
  tierHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tierIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tierNameBlock: { flex: 1, gap: 3 },
  tierNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  popularBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  popularText: { fontSize: 11, fontWeight: '700' },
  tierPriceLine: { fontSize: 13 },
  tierPrice: { fontWeight: '700', fontSize: 15 },

  // Radio button
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Feature rows
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 70,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  featureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: { fontSize: 14, flex: 1 },
  featureTextMissing: { opacity: 0.45, textDecorationLine: 'line-through' },

  // CTA
  ctaBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  restoreText: {
    fontSize: 13,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  legalText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
