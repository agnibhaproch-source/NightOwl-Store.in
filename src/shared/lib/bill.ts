import type { Bill, Coupon, StoreSettings } from '../types';

export interface BillLine { price: number; mrp: number; qty: number }
export interface CouponCheck { ok: boolean; discount: number; reason?: string }

export function checkCoupon(c: Coupon | undefined, itemTotal: number, now = Date.now()): CouponCheck {
  if (!c) return { ok: false, discount: 0, reason: 'That code does not exist.' };
  if (!c.active) return { ok: false, discount: 0, reason: 'This code is paused right now.' };
  if (c.expiresAt < now) return { ok: false, discount: 0, reason: 'This code has expired.' };
  if (c.used >= c.usageLimit) return { ok: false, discount: 0, reason: 'This code has been fully claimed.' };
  if (itemTotal < c.minOrder)
    return { ok: false, discount: 0, reason: `Add ₹${c.minOrder - itemTotal} more to use this code.` };
  let d = c.type === 'percent' ? Math.round((itemTotal * c.value) / 100) : c.value;
  if (c.maxDiscount) d = Math.min(d, c.maxDiscount);
  d = Math.min(d, itemTotal);
  return { ok: true, discount: d };
}

export type FeeSettings = Pick<StoreSettings, 'deliveryFee' | 'convenienceFee'>;

export function computeBill(lines: BillLine[], s: FeeSettings, coupon?: Coupon, now = Date.now()) {
  const itemTotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const mrpTotal = lines.reduce((a, l) => a + l.mrp * l.qty, 0);
  const empty = itemTotal === 0;
  // Delivery is never free and always applies once the cart is non-empty.
  const deliveryFee = empty ? 0 : s.deliveryFee;
  const convenienceFee = empty ? 0 : s.convenienceFee;
  const cc = coupon ? checkCoupon(coupon, itemTotal, now) : null;
  const couponDiscount = cc?.ok ? cc.discount : 0;
  const bill: Bill = {
    itemTotal,
    mrpTotal,
    productDiscount: mrpTotal - itemTotal,
    couponDiscount,
    couponCode: cc?.ok ? coupon!.code : undefined,
    deliveryFee,
    convenienceFee,
    grandTotal: Math.max(0, itemTotal - couponDiscount + deliveryFee + convenienceFee)
  };
  return { bill, coupon: cc };
}
