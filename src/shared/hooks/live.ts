import { useEffect, useState } from 'react';
import { services } from '../services';
import { defaultSettings } from '../data/seed';
import type {
  AppNotification, Banner, BroadcastLog, Category, Coupon, Customer, Order, Product, StockAlert, StoreSettings, Unsub, WalletTopup, WalletTxn, Rider
} from '../types';

/** Subscribes to a live query. Returns [value, loading]. */
export function useLive<T>(subscribe: ((cb: (v: T) => void) => Unsub) | null, initial: T, deps: unknown[] = []) {
  const [state, setState] = useState<{ v: T; loading: boolean }>({ v: initial, loading: !!subscribe });
  useEffect(() => {
    if (!subscribe) {
      setState({ v: initial, loading: false });
      return;
    }
    // A new subscription (e.g. a different user id) starts out loading; never reuse the previous result.
    setState({ v: initial, loading: true });
    return subscribe((v) => setState({ v, loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [state.v, state.loading] as const;
}

const P: Product[] = [];
const C: Category[] = [];
const O: Order[] = [];
const CP: Coupon[] = [];
const B: Banner[] = [];
const CU: Customer[] = [];
const N: AppNotification[] = [];
const BL: BroadcastLog[] = [];
const SA: StockAlert[] = [];

export const useProducts = () => useLive(services.products.watchProducts, P);
export const useCategories = () => useLive(services.products.watchCategories, C);
export const useOrders = () => useLive(services.orders.watchOrders, O);
export const useCoupons = () => useLive(services.coupons.watchCoupons, CP);
export const useBanners = () => useLive(services.banners.watchBanners, B);
export const useCustomers = () => useLive(services.customers.watchCustomers, CU);
export const useFeed = () => useLive(services.notifications.watchFeed, N);
export const useBroadcasts = () => useLive(services.notifications.watchBroadcasts, BL);
export const useStockAlerts = () => useLive(services.inventory.watchStockAlerts, SA);
export const useSettings = () => useLive<StoreSettings>(services.settings.watchSettings, defaultSettings);

export const useUserOrders = (userId: string | null) =>
  useLive<Order[]>(userId ? (cb) => services.orders.watchUserOrders(userId, cb) : null, O, [userId]);

export const useCustomer = (userId: string | null) =>
  useLive<Customer | null>(userId ? (cb) => services.customers.watchCustomer(userId, cb) : null, null, [userId]);

const WT: WalletTopup[] = [];
const WX: WalletTxn[] = [];
export const useTopups = () => useLive(services.wallet.watchTopups, WT);
export const useUserTopups = (userId: string | null) =>
  useLive<WalletTopup[]>(userId ? (cb) => services.wallet.watchUserTopups(userId, cb) : null, WT, [userId]);
export const useUserTxns = (userId: string | null) =>
  useLive<WalletTxn[]>(userId ? (cb) => services.wallet.watchUserTxns(userId, cb) : null, WX, [userId]);

const RD: Rider[] = [];
export const useRiders = () => useLive(services.riders.watchRiders, RD);
export const useRiderOrders = (riderId: string | null) =>
  useLive<Order[]>(riderId ? (cb) => services.riders.watchRiderOrders(riderId, cb) : null, O, [riderId]);
