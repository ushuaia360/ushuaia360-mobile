import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { NativeModules, Platform } from 'react-native';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

export const PRO_ENTITLEMENT_ID = 'Ushuaia360 Pro';

export { PAYWALL_RESULT };

function isAvailable(): boolean {
  return Boolean(NativeModules.RNPurchases);
}

/**
 * Call once on app init (and whenever userId changes) to configure the SDK
 * and bind the RevenueCat identity to your backend user.
 * Passing undefined switches RevenueCat to an anonymous user (on logout).
 */
export async function configurePurchases(userId?: string): Promise<void> {
  if (!isAvailable()) return;
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) return;
  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey });
    if (userId) {
      await Purchases.logIn(userId);
    } else {
      // Switch to anonymous identity when user logs out
      try { await Purchases.logOut(); } catch { /* already anonymous */ }
    }
  } catch {
    // native module unavailable (Expo Go / no prebuild)
  }
}

/** Fetch the latest CustomerInfo from RevenueCat. */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isAvailable()) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

/** Returns true if the given CustomerInfo has the Pro entitlement active. */
export function isPro(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
}

/**
 * Subscribe to real-time CustomerInfo updates from RevenueCat.
 * Returns a cleanup function — call it when the subscription is no longer needed.
 */
export function addCustomerInfoListener(
  listener: (info: CustomerInfo) => void,
): () => void {
  if (!isAvailable()) return () => {};
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

/** Restore previous purchases and return updated CustomerInfo. */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!isAvailable()) return null;
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}

// ─── RevenueCat Paywall UI ────────────────────────────────────────────────────

/**
 * Present the paywall configured in the RevenueCat dashboard as a native modal.
 * Returns a PAYWALL_RESULT indicating how the user exited.
 */
export function presentPaywall(): Promise<PAYWALL_RESULT> {
  return RevenueCatUI.presentPaywall({ displayCloseButton: true });
}

/**
 * Present the paywall only if the user doesn't already have the Pro entitlement.
 * Returns a PAYWALL_RESULT — PAYWALL_RESULT.NOT_PRESENTED means already subscribed.
 */
export function presentPaywallIfNeeded(): Promise<PAYWALL_RESULT> {
  return RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID,
    displayCloseButton: true,
  });
}

/**
 * Present the RevenueCat Customer Center modal.
 * Lets users manage subscriptions, request refunds, and restore purchases.
 */
export function presentCustomerCenter(): Promise<void> {
  return RevenueCatUI.presentCustomerCenter();
}
