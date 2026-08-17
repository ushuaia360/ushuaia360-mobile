import { create } from 'zustand';
import { Platform } from 'react-native';
import type { CustomerInfo } from 'react-native-purchases';
import { addCustomerInfoListener, getCustomerInfo, isPro } from '@/services/purchases';

/**
 * IAP is disabled on iOS for now (App Store rejection — RevenueCat iOS key
 * not configured yet). Until it's re-enabled, unlock Pro features for free
 * on iOS instead of showing a paywall nobody can pay through.
 */
const IOS_IAP_DISABLED = Platform.OS === 'ios';

interface PurchasesStore {
  customerInfo: CustomerInfo | null;
  /** True when the "Ushuaia360 Pro" entitlement is active. */
  isPro: boolean;
  /**
   * Attach the SDK's CustomerInfo listener. Idempotent — safe to call multiple times.
   * Should be called once after configurePurchases() resolves.
   */
  setup: () => void;
  /** Pull the latest CustomerInfo from RevenueCat (e.g. after a purchase). */
  refresh: () => Promise<void>;
  /** Directly update the store with a CustomerInfo already in hand. */
  setCustomerInfo: (info: CustomerInfo) => void;
}

let listenerCleanup: (() => void) | null = null;

export const usePurchasesStore = create<PurchasesStore>((set) => ({
  customerInfo: null,
  isPro: IOS_IAP_DISABLED,

  setup: () => {
    if (IOS_IAP_DISABLED || listenerCleanup) return;
    listenerCleanup = addCustomerInfoListener((info) => {
      set({ customerInfo: info, isPro: isPro(info) });
    });
  },

  refresh: async () => {
    if (IOS_IAP_DISABLED) return;
    const info = await getCustomerInfo();
    if (info) set({ customerInfo: info, isPro: isPro(info) });
  },

  setCustomerInfo: (info) => set({ customerInfo: info, isPro: isPro(info) }),
}));
