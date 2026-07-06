import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { router, Stack } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';
import type { CustomerInfo, PurchasesStoreTransaction } from 'react-native-purchases';
import { useAuthStore } from '@/store/auth-store';
import { usePurchasesStore } from '@/store/purchases-store';
import { isPurchasesReady } from '@/services/purchases';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PurchaseEvent = { customerInfo: CustomerInfo; storeTransaction: PurchasesStoreTransaction };
type RestoreEvent = { customerInfo: CustomerInfo };

export default function PremiumScreen() {
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const setCustomerInfo = usePurchasesStore((s) => s.setCustomerInfo);
  const { top } = useSafeAreaInsets();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.push('/(tabs)/profile');
  }

  async function handlePurchaseCompleted({ customerInfo }: PurchaseEvent) {
    setCustomerInfo(customerInfo);
    await refreshUser();
    goBack();
  }

  async function handleRestoreCompleted({ customerInfo }: RestoreEvent) {
    setCustomerInfo(customerInfo);
    await refreshUser();
    goBack();
  }

  if (!isPurchasesReady()) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.notAvailableWrap, { paddingTop: top + 16 }]}>
          <TouchableOpacity onPress={goBack} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <View style={styles.notAvailableContent}>
            <Ionicons name="star-outline" size={52} color="#0d6ebd" />
            <ThemedText style={styles.notAvailableTitle}>Próximamente</ThemedText>
            <ThemedText style={styles.notAvailableSub}>
              Las suscripciones premium estarán disponibles muy pronto.
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <RevenueCatUI.Paywall
        onPurchaseCompleted={handlePurchaseCompleted}
        onRestoreCompleted={handleRestoreCompleted}
        onDismiss={goBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notAvailableWrap: { flex: 1, paddingHorizontal: 24 },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  notAvailableContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 80,
  },
  notAvailableTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  notAvailableSub: { fontSize: 15, textAlign: 'center', opacity: 0.6, lineHeight: 22 },
});
