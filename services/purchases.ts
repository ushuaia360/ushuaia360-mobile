/**
 * Wrapper sobre react-native-purchases (RevenueCat).
 *
 * Uso:
 *   configurePurchases(userId)  → llamar al hacer login / initialize
 *   getProOffering()            → obtener el paquete Pro
 *   purchasePro(pkg)            → comprar
 *   restorePurchases()          → restaurar compras anteriores
 */
import Purchases, {
  LOG_LEVEL,
  type PurchasesPackage,
} from 'react-native-purchases';
import { NativeModules, Platform } from 'react-native';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

function isAvailable(): boolean {
  return Boolean(NativeModules.RNPurchases);
}

export async function configurePurchases(userId?: string): Promise<void> {
  if (!isAvailable()) return;
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) return;
  try {
    Purchases.setLogLevel(LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey });
    if (userId) await Purchases.logIn(userId);
  } catch {
    // native module no disponible (Expo Go / sin prebuild)
  }
}

export async function getProOffering(): Promise<PurchasesPackage | null> {
  if (!isAvailable()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.monthly ?? null;
  } catch {
    return null;
  }
}

export async function purchasePro(pkg: PurchasesPackage): Promise<boolean> {
  const result = await Purchases.purchasePackage(pkg);
  return Boolean(result.customerInfo.entitlements.active['pro']);
}

export async function restorePurchases(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  return Boolean(info.entitlements.active['pro']);
}
