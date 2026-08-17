import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNeedsAuthScreen } from '@/lib/needAuth';
import { getOfferings, isPurchasesReady, purchasePackage } from '@/services/purchases';
import { useAuthStore } from '@/store/auth-store';
import { usePurchasesStore } from '@/store/purchases-store';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRO_BENEFITS = [
  { icon: 'cloud-download-outline' as const,  text: 'Senderos y mapas sin conexión' },
  { icon: 'navigate-outline' as const,         text: 'GPS offline en la montaña' },
  { icon: 'image-outline' as const,            text: 'Wallpapers exclusivos de Ushuaia' },
  { icon: 'headset-outline' as const,          text: 'Soporte prioritario 24/7' },
];

export default function PremiumScreen() {
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const pageBg = isDark ? '#000' : '#fff';
  const divider = isDark ? '#2a2a2a' : '#f0f0f0';
  const textSub = colors.icon;
  const headerBg = isDark ? '#1c1c1e' : '#fff';
  const headerBorder = isDark ? '#2a2a2a' : '#EDF0F5';

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.push('/(tabs)/profile');
  }, []);

  const isAuthed = useNeedsAuthScreen('/premium');
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [purchaseBusy, setPurchaseBusy] = useState(false);

  const handlePurchase = useCallback(async () => {
    if (purchaseBusy) return;
    if (!isPurchasesReady()) {
      Alert.alert(t('common.error'), t('premium.purchaseError'));
      return;
    }
    setPurchaseBusy(true);
    try {
      const offerings = await getOfferings();
      const pkg =
        offerings?.current?.monthly ?? offerings?.current?.availablePackages[0] ?? null;
      if (!pkg) {
        Alert.alert(t('premium.noOfferingTitle'), t('premium.noOfferingBody'));
        return;
      }
      const { customerInfo } = await purchasePackage(pkg);
      usePurchasesStore.getState().setCustomerInfo(customerInfo);
      void refreshUser();
      Alert.alert(t('premium.welcomeTitle'), t('premium.welcomeBody'));
      goBack();
    } catch (e) {
      const userCancelled = Boolean((e as { userCancelled?: boolean })?.userCancelled);
      if (!userCancelled) {
        Alert.alert(t('common.error'), t('premium.purchaseError'));
      }
    } finally {
      setPurchaseBusy(false);
    }
  }, [purchaseBusy, refreshUser, goBack, t]);

  if (!isAuthed) {
    return (
      <ThemedView style={[styles.container, styles.centered, { backgroundColor: pageBg }]}>
        <ActivityIndicator color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.headerBack}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>{t('premium.title')}</ThemedText>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(bottom + 140, 160) }]}>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.tint + '12' }]}>
          <View style={[styles.heroIconWrap, { backgroundColor: colors.tint + '20' }]}>
            <MaterialCommunityIcons name="crown" size={36} color={colors.tint} />
          </View>
          <ThemedText style={styles.heroTitle}>Explorá sin límites</ThemedText>
          <ThemedText style={[styles.heroSub, { color: textSub }]}>
            Todo lo que necesitás para recorrer Ushuaia, incluso sin señal.
          </ThemedText>
        </View>

        {/* Price card */}
        <View style={[styles.priceCard, { backgroundColor: cardBg, borderColor: colors.tint + '40' }]}>
          <View style={[styles.popularBadge, { backgroundColor: colors.tint }]}>
            <ThemedText style={styles.popularText}>
              {Platform.OS === 'ios' ? t('premium.comingSoonTitle') : t('premium.popular')}
            </ThemedText>
          </View>
          {Platform.OS === 'ios' ? (
            <ThemedText style={[styles.priceAmount, { fontSize: 22, textAlign: 'center' }]}>
              {t('premium.comingSoonBody')}
            </ThemedText>
          ) : (
            <View style={styles.priceRow}>
              <ThemedText style={styles.priceCurrency}>$</ThemedText>
              <ThemedText style={styles.priceAmount}>6.99</ThemedText>
              <ThemedText style={[styles.pricePeriod, { color: textSub }]}>/ mes</ThemedText>
            </View>
          )}
          {Platform.OS !== 'ios' && (
            <ThemedText style={[styles.priceSub, { color: textSub }]}>
              Cancelá en cualquier momento
            </ThemedText>
          )}
        </View>

        {/* Benefits */}
        <View style={[styles.benefitsCard, { backgroundColor: cardBg }]}>
          {PRO_BENEFITS.map((b, i) => (
            <View key={b.text}>
              <View style={styles.benefitRow}>
                <View style={[styles.benefitIconWrap, { backgroundColor: colors.tint + '15' }]}>
                  <Ionicons name={b.icon} size={20} color={colors.tint} />
                </View>
                <ThemedText style={styles.benefitText}>{b.text}</ThemedText>
                <Ionicons name="checkmark-circle" size={20} color="#34c759" />
              </View>
              {i < PRO_BENEFITS.length - 1 && (
                <View style={[styles.divider, { backgroundColor: divider }]} />
              )}
            </View>
          ))}
        </View>

      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { backgroundColor: pageBg, paddingBottom: Math.max(bottom + 8, 20) }]}>
        {Platform.OS === 'ios' ? (
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.tint }]}
            activeOpacity={0.85}
            onPress={goBack}>
            <ThemedText style={styles.ctaBtnText}>{t('common.ok')}</ThemedText>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: colors.tint, opacity: purchaseBusy ? 0.7 : 1 }]}
              activeOpacity={0.85}
              disabled={purchaseBusy}
              onPress={handlePurchase}>
              {purchaseBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="crown" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <ThemedText style={styles.ctaBtnText}>
                    {t('premium.tiers.pro.cta')}
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={goBack} activeOpacity={0.6}>
              <ThemedText style={[styles.declineText, { color: textSub }]}>
                No gracias, quedarme en el plan gratis
              </ThemedText>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    paddingBottom: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  headerBack: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },

  // Scroll
  scroll: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },

  // Hero
  hero: {
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  heroSub: { fontSize: 14, lineHeight: 20, textAlign: 'center' },

  // Price card
  priceCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'visible',
  },
  popularBadge: {
    position: 'absolute',
    top: -14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  popularText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 2, marginTop: 6 },
  priceCurrency: { fontSize: 20, fontWeight: '700', marginTop: 6 },
  priceAmount: { fontSize: 48, fontWeight: '800', letterSpacing: -2, lineHeight: 52 },
  pricePeriod: { fontSize: 16, fontWeight: '500', marginTop: 28 },
  priceSub: { fontSize: 12, fontWeight: '500' },

  // Benefits
  benefitsCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  benefitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  benefitText: { flex: 1, fontSize: 14, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 70 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(120,120,128,0.2)',
    gap: 10,
    alignItems: 'center',
  },
  ctaBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  declineText: { fontSize: 14, fontWeight: '500' },
  restoreText: { fontSize: 12, textDecorationLine: 'underline' },
});
