import { create } from 'zustand';
import type { CustomerInfo } from 'react-native-purchases';
import { addCustomerInfoListener, getCustomerInfo, isPro } from '@/services/purchases';

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
  isPro: false,

  setup: () => {
    if (listenerCleanup) return;
    listenerCleanup = addCustomerInfoListener((info) => {
      set({ customerInfo: info, isPro: isPro(info) });
    });
  },

  refresh: async () => {
    const info = await getCustomerInfo();
    if (info) set({ customerInfo: info, isPro: isPro(info) });
  },

  setCustomerInfo: (info) => set({ customerInfo: info, isPro: isPro(info) }),
}));
