import { useCallback, useEffect, useMemo } from 'react';
import { useCategories, useCoupons, useCustomer, useProducts, useSettings } from '@/shared/hooks/live';
import { computeBill } from '@/shared/lib/bill';
import { services } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import type { Product } from '@/shared/types';
import { useCart } from './store/cart';
import { useSession } from './store/session';
import { useUi } from './store/ui';

export function useCatalog() {
  const [all, pLoading] = useProducts();
  const [cats, cLoading] = useCategories();
  return useMemo(() => {
    const categories = cats.filter((c) => c.active);
    const catIds = new Set(categories.map((c) => c.id));
    const products = all.filter((p) => p.active && catIds.has(p.categoryId));
    const byId = new Map(all.map((p) => [p.id, p]));
    return { products, all, categories, byId, loading: pLoading || cLoading };
  }, [all, cats, pLoading, cLoading]);
}

export interface CartItem { product: Product; qty: number }

export function useCartDetails() {
  const { byId, loading } = useCatalog();
  const [settings] = useSettings();
  const [coupons] = useCoupons();
  const lines = useCart((s) => s.lines);
  const couponCode = useCart((s) => s.couponCode);
  return useMemo(() => {
    const items: CartItem[] = Object.entries(lines)
      .map(([id, qty]) => ({ product: byId.get(id)!, qty }))
      .filter((x) => x.product);
    const coupon = couponCode ? coupons.find((c) => c.code === couponCode) : undefined;
    const usable = items.filter((i) => i.product.active && i.product.stock > 0);
    const { bill, coupon: couponCheck } = computeBill(
      usable.map((i) => ({ price: i.product.price, mrp: i.product.mrp, qty: Math.min(i.qty, i.product.stock) })),
      settings,
      coupon
    );
    const count = items.reduce((a, i) => a + i.qty, 0);
    const issues = items.filter((i) => !i.product.active || i.product.stock < i.qty);
    return { items, bill, coupon, couponCheck, coupons, count, issues, settings, loading };
  }, [lines, couponCode, byId, coupons, settings, loading]);
}

export function useAddToCart() {
  const add = useCart((s) => s.add);
  const fly = useUi((s) => s.fly);
  return useCallback(
    (p: Product, e?: React.MouseEvent<HTMLElement>) => {
      if (p.stock <= 0 || !p.active) {
        toast({ title: `${p.name} is out of stock`, emoji: '😿' });
        return;
      }
      if (add(p.id, p.stock) === 'max') {
        toast({ title: `That's all we have`, body: `Only ${p.stock} of ${p.name} in stock.`, emoji: '🫣' });
        return;
      }
      if (e) {
        const src = (e.currentTarget as HTMLElement).closest('[data-fly-src]');
        const img = src?.querySelector('[data-fly-img]') ?? e.currentTarget;
        fly(p.id, img.getBoundingClientRect());
      }
      navigator.vibrate?.(8);
    },
    [add, fly]
  );
}

/**
 * Google/email sign-in creates a Firebase Auth user but not a customer
 * record (only the phone-OTP flow used to do that explicitly). Sessions
 * that logged in before that was fixed — or any future gap like it — would
 * otherwise be stuck forever with `customer: null`. Self-heal here instead
 * of requiring everyone to log out and back in.
 */
const recovering = new Set<string>();

export function useCurrentUser() {
  const userId = useSession((s) => s.userId);
  const [customer, loading] = useCustomer(userId);

  useEffect(() => {
    if (!userId || loading || customer || recovering.has(userId)) return;
    recovering.add(userId);
    services.customers
      .saveProfile({ id: userId, name: 'Night Owl', phone: '', addresses: [], blocked: false, joinedAt: Date.now() })
      .catch((e) => console.error('[useCurrentUser] could not recover missing customer record', e))
      .finally(() => recovering.delete(userId));
  }, [userId, loading, customer]);

  return { userId, customer, loading };
}
