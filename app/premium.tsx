import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';
import type { CustomerInfo, PurchasesStoreTransaction } from 'react-native-purchases';
import { useAuthStore } from '@/store/auth-store';
import { usePurchasesStore } from '@/store/purchases-store';

type PurchaseEvent = { customerInfo: CustomerInfo; storeTransaction: PurchasesStoreTransaction };
type RestoreEvent = { customerInfo: CustomerInfo };

export default function PremiumScreen() {
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const setCustomerInfo = usePurchasesStore((s) => s.setCustomerInfo);

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

  return (
    <View style={styles.container}>
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
});
