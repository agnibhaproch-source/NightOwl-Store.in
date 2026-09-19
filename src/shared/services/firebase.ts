/**
 * Firestore-backed implementation of the `Services` contract. This is the
 * real shared backend: every browser (a customer's phone, the owner's
 * laptop) reads and writes the same Firestore project, so admin actions
 * (accepting an order, editing stock) and customer actions (placing an
 * order) show up for everyone instantly, on any device.
 *
 * Firestore rules require `request.auth != null`; see lib/firebase.ts for
 * the anonymous sign-in that satisfies that on every tab.
 */
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, orderBy, writeBatch, runTransaction, increment, arrayUnion, type Unsubscribe
} from 'firebase/firestore';
import { PhoneAuthProvider, RecaptchaVerifier, createUserWithEmailAndPassword, signInAnonymously, signInWithCredential, signInWithEmailAndPassword, signInWithPhoneNumber, signOut, type ConfirmationResult } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { isNative } from '../lib/native';
import { auth, authReady, firestore } from '../lib/firebase';
import { computeBill } from '../lib/bill';
import { getStoreStatus } from '../lib/time';
import { newOrderId, uid } from '../lib/format';
import { APP } from '../config/app';
import {
  SEED_VERSION, buildCoupons, buildCustomers, buildFeed, buildProducts,
  defaultSettings, seedBanners, seedCategories
} from '../data/seed';
import type {
  AppNotification, Banner, BroadcastLog, Category, Coupon, Customer, Order, OrderStatus,
  OrderMessage, Product, Receiver, Rider, RiderInfo, RiderStatus, StockAlert, StoreSettings, Unsub, WalletTopup, WalletTxn
} from '../types';
import { STATUS_LABEL } from '../types';
import { ServiceError, type Services } from './contracts';

const COL = {
  products: 'products',
  categories: 'categories',
  orders: 'orders',
  coupons: 'coupons',
  banners: 'banners',
  customers: 'customers',
  feed: 'feed',
  broadcasts: 'broadcasts',
  alerts: 'stockAlerts',
  topups: 'walletTopups',
  txns: 'walletTxns',
  riders: 'riders',
  secrets: 'orderSecrets'
} as const;

let recaptcha: RecaptchaVerifier | null = null;
let smsConfirmation: ConfirmationResult | null = null;
let nativeVerificationId: string | null = null;

/** Android/iOS app: SMS is requested through the OS (no reCAPTCHA, which doesn't work inside a WebView). */
async function sendNativeOtp(phone: string) {
  const handles: { remove: () => Promise<void> }[] = [];
  try {
    const sent = new Promise<string>((resolve, reject) => {
      void FirebaseAuthentication.addListener('phoneCodeSent', (e) => resolve(e.verificationId)).then((h) => handles.push(h));
      void FirebaseAuthentication.addListener('phoneVerificationFailed', (e) => reject(Object.assign(new Error(e.message), { code: 'auth/native-failed' }))).then((h) => handles.push(h));
      setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'auth/network-request-failed' })), 60000);
    });
    await FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber: `+91${phone}` });
    nativeVerificationId = await sent;
  } finally {
    await Promise.all(handles.map((h) => h.remove()));
  }
}

function otpSendError(code?: string) {
  switch (code) {
    case 'auth/invalid-phone-number': return 'That mobile number doesn’t look right.';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/quota-exceeded': return 'SMS limit reached for today. Try again later.';
    case 'auth/captcha-check-failed': return 'Could not verify this device. Refresh and try again.';
    case 'auth/billing-not-enabled': return 'SMS sending isn’t enabled for this project yet.';
    case 'auth/operation-not-allowed': return 'Phone sign-in is turned off for this region.';
    default: return `Couldn’t send the code${code ? ` (${code})` : ''}. Try again.`;
  }
}

const SETTINGS_DOC = ['settings', 'config'] as const;
const SEED_DOC = ['meta', 'seed'] as const;

/** Runs `fn` once Firestore's auth token is attached, so writes aren't rejected by rules. */
async function authed<T>(fn: () => Promise<T>): Promise<T> {
  await authReady;
  return fn();
}

/** Subscribes once auth is ready; unsubscribing before that just cancels the wait. */
function watchCollection<T>(name: string, cb: (v: T[]) => void, ...clauses: Parameters<typeof query>[1][]): Unsub {
  let alive = true;
  let stop: Unsubscribe | undefined;
  authReady.then(() => {
    if (!alive) return;
    const q = clauses.length ? query(collection(firestore, name), ...clauses) : collection(firestore, name);
    stop = onSnapshot(q, (snap) => cb(snap.docs.map((d) => d.data() as T)), (err) => console.error(`[firestore] watch ${name} failed`, err));
  });
  return () => {
    alive = false;
    stop?.();
  };
}

function watchDoc<T>(path: readonly [string, string], cb: (v: T | null) => void): Unsub {
  let alive = true;
  let stop: Unsubscribe | undefined;
  authReady.then(() => {
    if (!alive) return;
    stop = onSnapshot(doc(firestore, ...path), (snap) => cb(snap.exists() ? (snap.data() as T) : null), (err) => console.error(`[firestore] watch ${path.join('/')} failed`, err));
  });
  return () => {
    alive = false;
    stop?.();
  };
}

/** Cached last-known settings so the synchronous getSettings() contract can be satisfied. */
let cachedSettings: StoreSettings = defaultSettings;
watchDoc<Partial<StoreSettings>>(SETTINGS_DOC, (v) => {
  cachedSettings = { ...defaultSettings, ...v };
});

async function fetchSettings(): Promise<StoreSettings> {
  await authReady;
  const snap = await getDoc(doc(firestore, ...SETTINGS_DOC));
  return { ...defaultSettings, ...(snap.exists() ? (snap.data() as Partial<StoreSettings>) : {}) };
}

function pushNotification(batch: ReturnType<typeof writeBatch>, n: AppNotification) {
  batch.set(doc(firestore, COL.feed, n.id), n);
}

/** Wallet-paid orders that get cancelled put the money straight back. */
function refundWalletOrder(batch: ReturnType<typeof writeBatch>, o: Order) {
  if (o.paymentMode !== 'wallet' || o.paymentStatus === 'pending') return;
  const at = Date.now();
  batch.update(doc(firestore, COL.customers, o.userId), { walletBalance: increment(o.bill.grandTotal) });
  const txn: WalletTxn = { id: uid('wtx'), userId: o.userId, type: 'refund', amount: o.bill.grandTotal, note: `Refund for order ${o.shortCode}`, at, orderId: o.id };
  batch.set(doc(firestore, COL.txns, txn.id), txn);
  pushNotification(batch, {
    id: `ord_${o.id}_refund`, type: 'order', title: 'Refunded to your wallet 💸',
    body: `₹${o.bill.grandTotal} for order ${o.shortCode} is back in your wallet.`, at,
    audience: { kind: 'user', userId: o.userId }, link: '/wallet'
  });
}

const riderInfo = (r: Rider): RiderInfo => ({ id: r.id, name: r.name, phone: r.phone, vehicle: r.vehicle, vehicleNumber: r.vehicleNumber });

const authErrorText = (code?: string) => {
  switch (code) {
    case 'auth/email-already-in-use': return 'That email already has an account. Sign in instead.';
    case 'auth/weak-password': return 'Choose a password with at least 8 characters.';
    case 'auth/invalid-email': return 'That email address doesn’t look right.';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/network-request-failed': return 'No connection. Check your internet and try again.';
    default: return 'Email or password is wrong.';
  }
};

const firstItem = (o: Order) => {
  const n = o.items[0]?.name ?? 'order';
  return n.split(' ').slice(0, 2).join(' ');
};

const STATUS_COPY: Record<OrderStatus, (o: Order) => { title: string; body: string }> = {
  placed: (o) => ({ title: 'Order placed 🦉', body: `We got order #${o.id}. Waiting for the store to accept it.` }),
  accepted: () => ({ title: 'Order accepted ✅', body: "The store's on it. Packing starts in a moment." }),
  packing: (o) => ({ title: 'Packing your stash 📦', body: `${o.items.reduce((a, i) => a + i.qty, 0)} items going into the bag.` }),
  out_for_delivery: (o) => ({
    title: `Your ${firstItem(o)} has left the building 🏃`,
    body: `Heading to Block ${o.address.block}, room ${o.address.room}. Keep your phone close.`
  }),
  delivered: () => ({ title: 'Delivered. Go feast 🎉', body: 'Tell us how it went, it takes five seconds.' }),
  cancelled: (o) => ({ title: 'Order cancelled', body: o.cancelReason ? `Reason: ${o.cancelReason}` : 'Your order was cancelled.' })
};

/** Firestore caps batched writes at 500 ops; seeding can exceed that. */
async function commitInChunks(writes: { path: [string, string]; data: unknown }[]) {
  for (let i = 0; i < writes.length; i += 450) {
    const batch = writeBatch(firestore);
    for (const w of writes.slice(i, i + 450)) batch.set(doc(firestore, ...w.path), w.data as object);
    await batch.commit();
  }
}

async function seedAll() {
  const now = Date.now();
  const products = buildProducts(now);
  const customers = buildCustomers(now);
  // No demo orders: the admin board should only ever show orders real customers placed.
  const coupons = buildCoupons(now);
  const { feed, broadcasts } = buildFeed(now);

  const writes: { path: [string, string]; data: unknown }[] = [
    ...seedCategories.map((c) => ({ path: [COL.categories, c.id] as [string, string], data: c })),
    ...products.map((p) => ({ path: [COL.products, p.id] as [string, string], data: p })),
    ...customers.map((c) => ({ path: [COL.customers, c.id] as [string, string], data: c })),
    ...coupons.map((c) => ({ path: [COL.coupons, c.code] as [string, string], data: c })),
    ...seedBanners.map((b) => ({ path: [COL.banners, b.id] as [string, string], data: b })),
    ...feed.map((f) => ({ path: [COL.feed, f.id] as [string, string], data: f })),
    ...broadcasts.map((b) => ({ path: [COL.broadcasts, b.id] as [string, string], data: b })),
    { path: [SETTINGS_DOC[0], SETTINGS_DOC[1]] as [string, string], data: defaultSettings }
  ];
  await commitInChunks(writes);
  await setDoc(doc(firestore, ...SEED_DOC), { version: SEED_VERSION });
}

/** Random 4-digit code, unique across every order ever placed (checked against Firestore). */
async function generateUniqueShortCode(): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const existing = await getDocs(query(collection(firestore, COL.orders), where('shortCode', '==', code)));
    if (existing.empty) return code;
  }
  throw new ServiceError('Could not generate a unique order code, try again.');
}

async function wipeCollection(name: string) {
  const snap = await getDocs(collection(firestore, name));
  const ids = snap.docs.map((d) => d.id);
  for (let i = 0; i < ids.length; i += 450) {
    const batch = writeBatch(firestore);
    for (const id of ids.slice(i, i + 450)) batch.delete(doc(firestore, name, id));
    await batch.commit();
  }
}

export const firebaseServices: Services = {
  system: {
    ensureSeed() {
      void authed(async () => {
        const snap = await getDoc(doc(firestore, ...SEED_DOC));
        if (!snap.exists() || snap.data().version !== SEED_VERSION) await seedAll();
      });
    },
    resetDemo() {
      void authed(async () => {
        await Promise.all(Object.values(COL).map(wipeCollection));
        await seedAll();
      });
    },
    async refresh() {
      // Firestore listeners are already live; nothing to force.
    }
  },

  products: {
    watchProducts: (cb) => watchCollection<Product>(COL.products, cb),
    watchCategories: (cb) => watchCollection<Category>(COL.categories, (l) => cb([...l].sort((a, b) => a.order - b.order)), orderBy('order')),
    async saveProduct(p) {
      return authed(async () => {
        if (!p.name.trim()) throw new ServiceError('Give the product a name.');
        if (p.price > p.mrp) throw new ServiceError('Selling price cannot be higher than MRP.');
        const clean = { ...p, stock: Math.max(0, Math.round(p.stock)) };
        const prevSnap = await getDoc(doc(firestore, COL.products, clean.id));
        await setDoc(doc(firestore, COL.products, clean.id), clean);
        if (prevSnap.exists() && (prevSnap.data() as Product).stock <= 0 && clean.stock > 0) await fireBackInStock(clean);
        return clean;
      });
    },
    async deleteProduct(id) {
      await authed(() => deleteDoc(doc(firestore, COL.products, id)));
    },
    async duplicateProduct(id) {
      return authed(async () => {
        const snap = await getDoc(doc(firestore, COL.products, id));
        if (!snap.exists()) throw new ServiceError('Product not found.');
        const src = snap.data() as Product;
        const copy: Product = { ...src, id: uid('prd'), name: `${src.name} (copy)`, active: false, createdAt: Date.now() };
        await setDoc(doc(firestore, COL.products, copy.id), copy);
        return copy;
      });
    },
    async setActive(id, active) {
      await authed(async () => {
        const ref = doc(firestore, COL.products, id);
        const snap = await getDoc(ref);
        await updateDoc(ref, { active });
        if (snap.exists() && active && !(snap.data() as Product).active && (snap.data() as Product).stock > 0) await fireBackInStock(snap.data() as Product);
      });
    },
    async saveCategory(c) {
      await authed(async () => {
        const snap = await getDoc(doc(firestore, COL.categories, c.id));
        const order = snap.exists() ? (snap.data() as Category).order : (await getDocs(collection(firestore, COL.categories))).size;
        await setDoc(doc(firestore, COL.categories, c.id), { ...c, order });
      });
    },
    async deleteCategory(id) {
      await authed(async () => {
        const inUse = await getDocs(query(collection(firestore, COL.products), where('categoryId', '==', id)));
        if (!inUse.empty) throw new ServiceError('Move or delete the products in this category first.');
        await deleteDoc(doc(firestore, COL.categories, id));
      });
    },
    async reorderCategories(ids) {
      await authed(async () => {
        const batch = writeBatch(firestore);
        ids.forEach((id, i) => batch.update(doc(firestore, COL.categories, id), { order: i }));
        await batch.commit();
      });
    }
  },

  inventory: {
    async adjustStock(id, delta) {
      await authed(async () => {
        let restocked: Product | null = null;
        await runTransaction(firestore, async (tx) => {
          const ref = doc(firestore, COL.products, id);
          const snap = await tx.get(ref);
          if (!snap.exists()) return;
          const p = snap.data() as Product;
          const next = Math.max(0, p.stock + delta);
          tx.update(ref, { stock: next });
          if (p.stock <= 0 && next > 0) restocked = { ...p, stock: next };
        });
        if (restocked) await fireBackInStock(restocked);
      });
    },
    async setStock(id, qty) {
      await authed(async () => {
        const ref = doc(firestore, COL.products, id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const p = snap.data() as Product;
        const next = Math.max(0, qty);
        await updateDoc(ref, { stock: next });
        if (p.stock <= 0 && next > 0) await fireBackInStock({ ...p, stock: next });
      });
    },
    async bulkStock(ids, mode, qty) {
      await authed(async () => {
        const batch = writeBatch(firestore);
        for (const id of ids) {
          const snap = await getDoc(doc(firestore, COL.products, id));
          if (!snap.exists()) continue;
          const p = snap.data() as Product;
          const before = p.stock;
          const after = Math.max(0, mode === 'set' ? qty : before + qty);
          batch.update(doc(firestore, COL.products, id), { stock: after });
          if (before <= 0 && after > 0) void fireBackInStock({ ...p, stock: after });
        }
        await batch.commit();
      });
    },
    watchStockAlerts: (cb) => watchCollection<StockAlert>(COL.alerts, cb),
    async toggleStockAlert(productId, userId) {
      return authed(async () => {
        const id = `${productId}_${userId}`;
        const ref = doc(firestore, COL.alerts, id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await deleteDoc(ref);
          return false;
        }
        await setDoc(ref, { productId, userId, at: Date.now() } satisfies StockAlert);
        return true;
      });
    }
  },

  orders: {
    watchOrders: (cb) => watchCollection<Order>(COL.orders, cb),
    watchUserOrders: (userId, cb) => watchCollection<Order>(COL.orders, cb, where('userId', '==', userId)),

    async placeOrder(input) {
      return authed(async () => {
        const now = Date.now();
        const settings = await fetchSettings();
        if (!getStoreStatus(now, settings).isOpen)
          throw new ServiceError('The store is closed right now. Your cart is saved for when we open.', 'closed');
        if (!input.items.length) throw new ServiceError('Your cart is empty.');

        const customerSnap = await getDoc(doc(firestore, COL.customers, input.userId));
        if (!customerSnap.exists()) throw new ServiceError('Log in again to place this order.', 'auth');
        const customer = customerSnap.data() as Customer;
        if (customer.blocked) throw new ServiceError('This account cannot place orders. Contact support.', 'blocked');
        const address = customer.addresses.find((a) => a.id === input.addressId);
        if (!address) throw new ServiceError('Pick a delivery room first.', 'address');
        const hostel = settings.hostels.find((h) => h.id === address.hostelId);
        if (!hostel?.active || !hostel.blocks.includes(address.block))
          throw new ServiceError('We don’t deliver to this block yet.', 'area');

        const productSnaps = await Promise.all(input.items.map((i) => getDoc(doc(firestore, COL.products, i.productId))));
        const products = productSnaps.map((s) => (s.exists() ? (s.data() as Product) : null));
        const items = input.items.map(({ productId, qty }, i) => {
          const p = products[i];
          if (!p || !p.active) throw new ServiceError('An item in your cart is no longer available.', 'stock');
          if (p.stock < qty)
            throw new ServiceError(p.stock === 0 ? `${p.name} just sold out.` : `Only ${p.stock} of ${p.name} left.`, 'stock');
          return { productId, name: p.name, unit: p.unit, price: p.price, mrp: p.mrp, qty };
        });

        let coupon: Coupon | undefined;
        if (input.couponCode) {
          const cSnap = await getDoc(doc(firestore, COL.coupons, input.couponCode));
          coupon = cSnap.exists() ? (cSnap.data() as Coupon) : undefined;
        }
        const { bill, coupon: cc } = computeBill(items, settings, coupon, now);
        if (input.couponCode && !cc?.ok) throw new ServiceError(cc?.reason ?? 'That coupon no longer applies.', 'coupon');
        if (bill.itemTotal < settings.minOrderValue) throw new ServiceError(`Minimum order is ₹${settings.minOrderValue}.`, 'min');
        const shortCode = await generateUniqueShortCode();

        const order: Order = {
          id: newOrderId(),
          shortCode,
          userId: customer.id,
          customerName: customer.name,
          phone: customer.phone,
          address,
          receiver: customer.receiver ?? { name: customer.name, phone: customer.phone },
          items,
          bill,
          instructions: input.instructions.trim(),
          status: 'placed',
          createdAt: now,
          updatedAt: now,
          history: [{ status: 'placed', at: now }],
          etaMinutes: settings.etaMax,
          paymentMode: 'upi_qr',
          paymentStatus: 'pending'
        };

        const batch = writeBatch(firestore);
        input.items.forEach(({ productId, qty }, i) => {
          const p = products[i]!;
          batch.update(doc(firestore, COL.products, productId), { stock: p.stock - qty, popularity: p.popularity + qty });
        });
        if (coupon && cc?.ok) batch.update(doc(firestore, COL.coupons, coupon.code), { used: coupon.used + 1 });
        batch.set(doc(firestore, COL.orders, order.id), order);
        // The delivery code is stored apart from the order: riders can't read it, and the database checks it at handover.
        batch.set(doc(firestore, COL.secrets, order.id), { otp: String(Math.floor(1000 + Math.random() * 9000)), userId: customer.id, createdAt: now });
        pushNotification(batch, {
          id: `ord_${order.id}_placed`, type: 'order', title: 'Order created 🦉',
          body: `Order ${shortCode} for ₹${bill.grandTotal} is waiting for your payment. Pay via the QR and we’ll confirm it here.`, at: now,
          audience: { kind: 'user', userId: customer.id }, link: `/orders/${order.id}`
        });
        await batch.commit();
        return order;
      });
    },

    async updateStatus(id, status, reason) {
      await authed(async () => {
        const now = Date.now();
        const ref = doc(firestore, COL.orders, id);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new ServiceError('Order not found.');
        const o = snap.data() as Order;
        if (o.status === status) return;
        if (o.paymentStatus === 'pending' && status !== 'cancelled')
          throw new ServiceError('Confirm the payment first. Nothing moves forward until the money is in.');
        if (o.status === 'delivered' || o.status === 'cancelled')
          throw new ServiceError(`This order is already ${STATUS_LABEL[o.status].toLowerCase()}.`);
        const next: Order = {
          ...o,
          status,
          updatedAt: now,
          history: [...o.history, { status, at: now }],
          ...(status === 'cancelled' ? { cancelReason: reason || 'Cancelled by the store', cancelledBy: 'store' as const } : {})
        };
        const batch = writeBatch(firestore);
        batch.set(ref, next);
        if (status === 'cancelled') {
          refundWalletOrder(batch, o);
          const productSnaps = await Promise.all(o.items.map((i) => getDoc(doc(firestore, COL.products, i.productId))));
          o.items.forEach((line, i) => {
            const s = productSnaps[i];
            if (s?.exists()) batch.update(doc(firestore, COL.products, line.productId), { stock: (s.data() as Product).stock + line.qty });
          });
        }
        pushNotification(batch, {
          id: `ord_${id}_${status}`, type: 'order', ...STATUS_COPY[status](next), at: now,
          audience: { kind: 'user', userId: o.userId }, link: `/orders/${id}`
        });
        await batch.commit();
      });
    },

    async cancelByUser(id, userId) {
      await authed(async () => {
        const ref = doc(firestore, COL.orders, id);
        const snap = await getDoc(ref);
        if (!snap.exists() || (snap.data() as Order).userId !== userId) throw new ServiceError('Order not found.');
        const o = snap.data() as Order;
        if (o.status !== 'placed') throw new ServiceError('The store already accepted this order, so it can’t be cancelled here. Call support.');
        if (o.paymentStatus === 'pending') throw new ServiceError('This order is still unpaid. Use “Cancel payment” instead.');
        if (o.paymentMode === 'wallet') throw new ServiceError('Wallet-paid orders are cancelled by the store so your refund is safe. Call customer care and we’ll do it right away.', 'wallet');
        if (Date.now() - (o.paidAt ?? o.createdAt) > APP.cancelWindowSeconds * 1000)
          throw new ServiceError(`The ${APP.cancelWindowSeconds}-second cancellation window has closed. Call support.`, 'window');
        await updateDoc(ref, {
          status: 'cancelled',
          updatedAt: Date.now(),
          history: [...o.history, { status: 'cancelled', at: Date.now() }],
          cancelReason: 'Cancelled by you',
          cancelledBy: 'user'
        });
        const productSnaps = await Promise.all(o.items.map((i) => getDoc(doc(firestore, COL.products, i.productId))));
        const batch = writeBatch(firestore);
        refundWalletOrder(batch, o);
        o.items.forEach((line, i) => {
          const s = productSnaps[i];
          if (s?.exists()) batch.update(doc(firestore, COL.products, line.productId), { stock: (s.data() as Product).stock + line.qty });
        });
        pushNotification(batch, {
          id: `ord_${id}_cancelled_user`, type: 'order', title: 'Order cancelled', body: 'You cancelled this order.', at: Date.now(),
          audience: { kind: 'user', userId }, link: `/orders/${id}`
        });
        await batch.commit();
      });
    },

    async confirmPayment(id) {
      await authed(async () => {
        const ref = doc(firestore, COL.orders, id);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new ServiceError('Order not found.');
        const o = snap.data() as Order;
        if (o.status === 'cancelled') throw new ServiceError('This order was cancelled. Refund the customer instead.');
        if (o.paymentStatus !== 'pending') return;
        const now = Date.now();
        const batch = writeBatch(firestore);
        batch.update(ref, { paymentStatus: 'paid', paidAt: now, updatedAt: now });
        pushNotification(batch, {
          id: `ord_${id}_paid`, type: 'order', title: 'Payment received ✅',
          body: `Your ₹${o.bill.grandTotal} payment for order ${o.shortCode} is confirmed. Tap to continue.`, at: now,
          audience: { kind: 'user', userId: o.userId }, link: `/checkout`
        });
        await batch.commit();
      });
    },

    async cancelUnpaid(id, userId) {
      await authed(async () => {
        const ref = doc(firestore, COL.orders, id);
        const snap = await getDoc(ref);
        if (!snap.exists() || (snap.data() as Order).userId !== userId) throw new ServiceError('Order not found.');
        const o = snap.data() as Order;
        if (o.paymentStatus !== 'pending' || o.status !== 'placed') throw new ServiceError('This order is already paid, so it can’t be dropped here.');
        const now = Date.now();
        const productSnaps = await Promise.all(o.items.map((i) => getDoc(doc(firestore, COL.products, i.productId))));
        const batch = writeBatch(firestore);
        batch.update(ref, {
          status: 'cancelled', updatedAt: now, history: [...o.history, { status: 'cancelled', at: now }],
          cancelReason: 'Payment not completed', cancelledBy: 'user'
        });
        o.items.forEach((line, i) => {
          const s = productSnaps[i];
          if (s?.exists()) batch.update(doc(firestore, COL.products, line.productId), { stock: (s.data() as Product).stock + line.qty });
        });
        await batch.commit();
      });
    },

    async assignRider(orderId, riderId) {
      await authed(async () => {
        const [oSnap, rSnap] = await Promise.all([getDoc(doc(firestore, COL.orders, orderId)), getDoc(doc(firestore, COL.riders, riderId))]);
        if (!oSnap.exists()) throw new ServiceError('Order not found.');
        if (!rSnap.exists()) throw new ServiceError('Rider not found.');
        const o = oSnap.data() as Order;
        const r = rSnap.data() as Rider;
        if (r.status !== 'approved') throw new ServiceError('Only approved riders can take deliveries.');
        if (o.paymentStatus === 'pending') throw new ServiceError('Confirm the payment before assigning a rider.');
        if (o.status === 'delivered' || o.status === 'cancelled') throw new ServiceError(`This order is already ${o.status}.`);
        if (o.status === 'placed') throw new ServiceError('Accept the order first.');
        if (o.riderId === riderId) return;
        const now = Date.now();
        const batch = writeBatch(firestore);
        batch.update(doc(firestore, COL.orders, orderId), { riderId, rider: riderInfo(r), assignedAt: now, updatedAt: now });
        pushNotification(batch, {
          id: `ord_${orderId}_rider_${riderId}`, type: 'order', title: `${r.name} will deliver your order 🛵`,
          body: `Order ${o.shortCode} has a rider. You can call them or leave instructions.`, at: now,
          audience: { kind: 'user', userId: o.userId }, link: `/orders/${orderId}`
        });
        await batch.commit();
      });
    },

    async getDeliveryCode(orderId) {
      return authed(async () => {
        try {
          const snap = await getDoc(doc(firestore, COL.secrets, orderId));
          return snap.exists() ? String((snap.data() as { otp: string }).otp) : null;
        } catch {
          return null;
        }
      });
    },

    async sendMessage(orderId, from, text) {
      await authed(async () => {
        const clean = text.trim().slice(0, 200);
        if (!clean) throw new ServiceError('Write a message first.');
        const ref = doc(firestore, COL.orders, orderId);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new ServiceError('Order not found.');
        const o = snap.data() as Order;
        if (o.status === 'delivered' || o.status === 'cancelled') throw new ServiceError('This order is finished, so messages are closed.');
        const now = Date.now();
        const msg: OrderMessage = { id: uid('msg'), from, text: clean, at: now };
        const batch = writeBatch(firestore);
        batch.update(ref, { messages: arrayUnion(msg), updatedAt: now });
        if (from === 'rider') {
          pushNotification(batch, {
            id: `msg_${msg.id}`, type: 'order', title: `${o.rider?.name ?? 'Your rider'}: ${clean.slice(0, 60)}`,
            body: 'Tap to reply.', at: now, audience: { kind: 'user', userId: o.userId }, link: `/orders/${orderId}`
          });
        }
        await batch.commit();
      });
    },

    async riderPickup(orderId, riderId) {
      await authed(async () => {
        const ref = doc(firestore, COL.orders, orderId);
        const snap = await getDoc(ref);
        if (!snap.exists() || (snap.data() as Order).riderId !== riderId) throw new ServiceError('This delivery isn’t assigned to you.');
        const o = snap.data() as Order;
        if (o.status === 'out_for_delivery') return;
        if (o.status !== 'accepted' && o.status !== 'packing') throw new ServiceError('This order isn’t ready for pickup yet.');
        const now = Date.now();
        const next: Order = { ...o, status: 'out_for_delivery' };
        const batch = writeBatch(firestore);
        batch.update(ref, { status: 'out_for_delivery', history: [...o.history, { status: 'out_for_delivery', at: now }], pickedUpAt: now, updatedAt: now });
        pushNotification(batch, { id: `ord_${orderId}_out_for_delivery`, type: 'order', ...STATUS_COPY.out_for_delivery(next), at: now, audience: { kind: 'user', userId: o.userId }, link: `/orders/${orderId}` });
        await batch.commit();
      });
    },

    async riderArrived(orderId, riderId) {
      await authed(async () => {
        const ref = doc(firestore, COL.orders, orderId);
        const snap = await getDoc(ref);
        if (!snap.exists() || (snap.data() as Order).riderId !== riderId) throw new ServiceError('This delivery isn’t assigned to you.');
        const o = snap.data() as Order;
        if (o.status !== 'out_for_delivery') throw new ServiceError('Pick up the parcel first.');
        if (o.arrivedAt) return;
        const now = Date.now();
        const batch = writeBatch(firestore);
        batch.update(ref, { arrivedAt: now, updatedAt: now });
        pushNotification(batch, {
          id: `ord_${orderId}_arrived`, type: 'order', title: 'Your rider is at the door 🛵',
          body: `${o.rider?.name ?? 'Your rider'} has arrived. Have your delivery code ready.`, at: now,
          audience: { kind: 'user', userId: o.userId }, link: `/orders/${orderId}`
        });
        await batch.commit();
      });
    },

    async riderDeliver(orderId, riderId, code) {
      await authed(async () => {
        const clean = code.replace(/\D/g, '');
        if (clean.length !== 4) throw new ServiceError('Enter the customer’s 4-digit delivery code.', 'code');
        const ref = doc(firestore, COL.orders, orderId);
        try {
          // A transaction, not a batch: nothing shows as "delivered" on screen until the server has accepted the code.
          await runTransaction(firestore, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists() || (snap.data() as Order).riderId !== riderId) throw new ServiceError('This delivery isn’t assigned to you.');
            const o = snap.data() as Order;
            if (o.status === 'delivered') return;
            if (o.status !== 'out_for_delivery') throw new ServiceError('Pick up the parcel first.');
            const now = Date.now();
            tx.update(ref, { status: 'delivered', history: [...o.history, { status: 'delivered', at: now }], deliveredAt: now, updatedAt: now, deliveryCode: clean });
            const n: AppNotification = { id: `ord_${orderId}_delivered`, type: 'order', ...STATUS_COPY.delivered({ ...o, status: 'delivered' }), at: now, audience: { kind: 'user', userId: o.userId }, link: `/orders/${orderId}` };
            tx.set(doc(firestore, COL.feed, n.id), n);
          });
        } catch (e) {
          if (e instanceof ServiceError) throw e;
          if ((e as { code?: string }).code === 'permission-denied')
            throw new ServiceError('That code doesn’t match. Ask the customer to read the code from their order screen.', 'code');
          throw e;
        }
      });
    },

    async setDonation(id, userId, amount) {
      await authed(async () => {
        if (![0, 2, 5, 10].includes(amount)) throw new ServiceError('Pick ₹2, ₹5 or ₹10.');
        const ref = doc(firestore, COL.orders, id);
        const snap = await getDoc(ref);
        if (!snap.exists() || (snap.data() as Order).userId !== userId) throw new ServiceError('Order not found.');
        const o = snap.data() as Order;
        if (o.paymentStatus !== 'pending' || o.status !== 'placed') throw new ServiceError('This order is already paid, so the bill can’t change.');
        const base = o.bill.grandTotal - (o.bill.donation ?? 0);
        await updateDoc(ref, { bill: { ...o.bill, donation: amount, grandTotal: base + amount }, updatedAt: Date.now() });
      });
    },

    async setReceiver(id, userId, receiver) {
      await authed(async () => {
        const ref = doc(firestore, COL.orders, id);
        const snap = await getDoc(ref);
        if (!snap.exists() || (snap.data() as Order).userId !== userId) throw new ServiceError('Order not found.');
        if ((snap.data() as Order).status !== 'placed') return;
        await updateDoc(ref, { receiver });
      });
    },

    async payWithWallet(id, userId) {
      await authed(async () => {
        await runTransaction(firestore, async (tx) => {
          const oRef = doc(firestore, COL.orders, id);
          const cRef = doc(firestore, COL.customers, userId);
          const [oSnap, cSnap] = await Promise.all([tx.get(oRef), tx.get(cRef)]);
          if (!oSnap.exists() || !cSnap.exists()) throw new ServiceError('Order not found.');
          const o = oSnap.data() as Order;
          const c = cSnap.data() as Customer;
          if (o.userId !== userId) throw new ServiceError('Order not found.');
          if (o.paymentStatus !== 'pending' || o.status !== 'placed') throw new ServiceError('This order is already paid.');
          const balance = c.walletBalance ?? 0;
          if (balance < o.bill.grandTotal) throw new ServiceError(`Your wallet has ₹${balance}. This order is ₹${o.bill.grandTotal}.`, 'wallet');
          const now = Date.now();
          tx.update(cRef, { walletBalance: balance - o.bill.grandTotal });
          tx.update(oRef, { paymentStatus: 'paid', paidAt: now, updatedAt: now, paymentMode: 'wallet' });
          const txn: WalletTxn = { id: uid('wtx'), userId, type: 'spend', amount: o.bill.grandTotal, note: `Order ${o.shortCode}`, at: now, orderId: id };
          tx.set(doc(firestore, COL.txns, txn.id), txn);
          const n: AppNotification = {
            id: `ord_${id}_paid`, type: 'order', title: 'Paid from your wallet ✅',
            body: `₹${o.bill.grandTotal} paid for order ${o.shortCode}. Waiting for the store to accept it.`, at: now,
            audience: { kind: 'user', userId }, link: `/orders/${id}`
          };
          tx.set(doc(firestore, COL.feed, n.id), n);
        });
      });
    },

    async rateOrder(id, rating) {
      await authed(() => updateDoc(doc(firestore, COL.orders, id), { rating }));
    }
  },

  notifications: {
    watchFeed: (cb) => watchCollection<AppNotification>(COL.feed, (l) => cb([...l].sort((a, b) => b.at - a.at).slice(0, 400))),
    watchBroadcasts: (cb) => watchCollection<BroadcastLog>(COL.broadcasts, (l) => cb([...l].sort((a, b) => b.at - a.at))),
    async push(n) {
      await authed(() => setDoc(doc(firestore, COL.feed, n.id), n));
    },
    async broadcast(input) {
      await authed(async () => {
        const log: BroadcastLog = { ...input, id: uid('bc'), at: Date.now() };
        const batch = writeBatch(firestore);
        batch.set(doc(firestore, COL.broadcasts, log.id), log);
        pushNotification(batch, {
          id: log.id, type: log.type, title: log.title, body: log.body, at: log.at,
          audience: log.hostelIds?.length ? { kind: 'hostels', hostelIds: log.hostelIds } : { kind: 'all' }
        });
        await batch.commit();
      });
    }
  },

  settings: {
    watchSettings: (cb) => watchDoc<Partial<StoreSettings>>(SETTINGS_DOC, (v) => cb({ ...defaultSettings, ...v })),
    getSettings: () => cachedSettings,
    async updateSettings(patch) {
      await authed(async () => {
        const current = await fetchSettings();
        if (patch.openTime !== undefined && patch.openTime === (patch.closeTime ?? current.closeTime))
          throw new ServiceError('Opening and closing time cannot be the same.');
        await setDoc(doc(firestore, ...SETTINGS_DOC), { ...current, ...patch });
      });
    }
  },

  coupons: {
    watchCoupons: (cb) => watchCollection<Coupon>(COL.coupons, cb),
    async saveCoupon(c, originalCode) {
      await authed(async () => {
        const code = c.code.trim().toUpperCase();
        if (!/^[A-Z0-9]{3,16}$/.test(code)) throw new ServiceError('Codes use 3–16 letters or numbers, no spaces.');
        if (c.value <= 0) throw new ServiceError('Discount must be more than zero.');
        if (c.type === 'percent' && c.value > 90) throw new ServiceError('Percent discounts are capped at 90%.');
        if (code !== originalCode) {
          const existing = await getDoc(doc(firestore, COL.coupons, code));
          if (existing.exists()) throw new ServiceError(`${code} already exists.`);
        }
        const clean = { ...c, code };
        if (originalCode && originalCode !== code) await deleteDoc(doc(firestore, COL.coupons, originalCode));
        await setDoc(doc(firestore, COL.coupons, code), clean);
      });
    },
    async deleteCoupon(code) {
      await authed(() => deleteDoc(doc(firestore, COL.coupons, code)));
    }
  },

  banners: {
    watchBanners: (cb) => watchCollection<Banner>(COL.banners, (l) => cb([...l].sort((a, b) => a.order - b.order)), orderBy('order')),
    async saveBanner(b) {
      await authed(async () => {
        const snap = await getDoc(doc(firestore, COL.banners, b.id));
        const order = snap.exists() ? (snap.data() as Banner).order : (await getDocs(collection(firestore, COL.banners))).size;
        await setDoc(doc(firestore, COL.banners, b.id), { ...b, order });
      });
    },
    async deleteBanner(id) {
      await authed(() => deleteDoc(doc(firestore, COL.banners, id)));
    },
    async reorderBanners(ids) {
      await authed(async () => {
        const batch = writeBatch(firestore);
        ids.forEach((id, i) => batch.update(doc(firestore, COL.banners, id), { order: i }));
        await batch.commit();
      });
    }
  },

  customers: {
    watchCustomers: (cb) => watchCollection<Customer>(COL.customers, cb),
    watchCustomer: (id, cb) => watchDoc<Customer>([COL.customers, id], cb),
    async getCustomer(id) {
      return authed(async () => {
        const snap = await getDoc(doc(firestore, COL.customers, id));
        return snap.exists() ? (snap.data() as Customer) : null;
      });
    },
    async saveProfile(c) {
      await authed(async () => {
        if (!c.name.trim()) throw new ServiceError('Add your name.');
        await setDoc(doc(firestore, COL.customers, c.id), c);
      });
    },
    async saveReceiver(userId, receiver: Receiver) {
      await authed(async () => {
        const name = receiver.name.trim();
        const phone = receiver.phone.replace(/\D/g, '');
        if (!name) throw new ServiceError('Add the receiver’s name.');
        if (!/^[6-9]\d{9}$/.test(phone)) throw new ServiceError('Enter a valid 10-digit mobile number.');
        await setDoc(doc(firestore, COL.customers, userId), { receiver: { name, phone } }, { merge: true });
      });
    },
    async saveAddress(userId, a, makeDefault) {
      await authed(async () => {
        if (!a.room.trim()) throw new ServiceError('Add your room number.');
        await runTransaction(firestore, async (tx) => {
          const ref = doc(firestore, COL.customers, userId);
          const snap = await tx.get(ref);
          if (!snap.exists()) return;
          const c = snap.data() as Customer;
          const exists = c.addresses.some((x) => x.id === a.id);
          const addresses = exists ? c.addresses.map((x) => (x.id === a.id ? a : x)) : [...c.addresses, a];
          tx.update(ref, { addresses, defaultAddressId: makeDefault || !c.defaultAddressId ? a.id : c.defaultAddressId });
        });
      });
    },
    async deleteAddress(userId, addressId) {
      await authed(async () => {
        await runTransaction(firestore, async (tx) => {
          const ref = doc(firestore, COL.customers, userId);
          const snap = await tx.get(ref);
          if (!snap.exists()) return;
          const c = snap.data() as Customer;
          const addresses = c.addresses.filter((a) => a.id !== addressId);
          tx.update(ref, { addresses, defaultAddressId: c.defaultAddressId === addressId ? (addresses[0]?.id ?? null) : c.defaultAddressId });
        });
      });
    },
    async setBlocked(id, blocked) {
      await authed(() => updateDoc(doc(firestore, COL.customers, id), { blocked }));
    }
  },

  riders: {
    watchRiders: (cb) => watchCollection<Rider>(COL.riders, (l) => cb([...l].sort((a, b) => b.createdAt - a.createdAt))),
    watchRider: (id, cb) => watchDoc<Rider>([COL.riders, id], cb),
    watchRiderOrders: (riderId, cb) => watchCollection<Order>(COL.orders, (l) => cb([...l].sort((a, b) => (b.assignedAt ?? b.createdAt) - (a.assignedAt ?? a.createdAt))), where('riderId', '==', riderId)),

    async register(input) {
      await authReady;
      const name = input.name.trim();
      const phone = input.phone.replace(/\D/g, '');
      const ePhone = input.emergencyPhone.replace(/\D/g, '');
      if (name.length < 2) throw new ServiceError('Enter your full name.');
      if (!/^[6-9]\d{9}$/.test(phone)) throw new ServiceError('Enter a valid 10-digit mobile number.');
      if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) throw new ServiceError('That email address doesn’t look right.');
      if (input.password.length < 8) throw new ServiceError('Choose a password with at least 8 characters.');
      if (input.idNumber.trim().length < 4) throw new ServiceError('Enter your ID number so the store can verify you.');
      if ((input.vehicle === 'bike' || input.vehicle === 'scooter') && !input.vehicleNumber?.trim()) throw new ServiceError('Enter your vehicle number plate.');
      if (input.emergencyName.trim().length < 2 || !/^[6-9]\d{9}$/.test(ePhone)) throw new ServiceError('Add an emergency contact with a valid mobile number.');
      let uidNew: string;
      try {
        uidNew = (await createUserWithEmailAndPassword(auth, input.email.trim().toLowerCase(), input.password)).user.uid;
      } catch (e) {
        throw new ServiceError(authErrorText((e as { code?: string }).code));
      }
      const rider: Rider = {
        id: uidNew, name, phone, email: input.email.trim().toLowerCase(), vehicle: input.vehicle,
        vehicleNumber: input.vehicleNumber?.trim().toUpperCase(), idType: input.idType, idNumber: input.idNumber.trim(),
        emergencyName: input.emergencyName.trim(), emergencyPhone: ePhone, area: input.area?.trim() || undefined, photo: input.photo,
        status: 'pending', online: false, createdAt: Date.now()
      };
      await setDoc(doc(firestore, COL.riders, uidNew), rider);
      return rider;
    },

    async login(email, password) {
      await authReady;
      let id: string;
      try {
        id = (await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)).user.uid;
      } catch (e) {
        throw new ServiceError(authErrorText((e as { code?: string }).code));
      }
      const snap = await getDoc(doc(firestore, COL.riders, id));
      if (!snap.exists()) {
        await signOut(auth);
        await signInAnonymously(auth);
        throw new ServiceError('No rider account uses this email. Register first.');
      }
      return snap.data() as Rider;
    },

    async logout() {
      await signOut(auth);
      await signInAnonymously(auth);
    },

    async setStatus(id, status, reason) {
      await authed(async () => {
        const now = Date.now();
        await updateDoc(doc(firestore, COL.riders, id), {
          status, statusReason: reason?.trim() || null, updatedAt: now,
          ...(status === 'approved' ? { approvedAt: now } : { online: false })
        });
      });
    },

    async setOnline(id, online) {
      await authed(() => updateDoc(doc(firestore, COL.riders, id), { online, updatedAt: Date.now() }));
    }
  },

  wallet: {
    watchTopups: (cb) => watchCollection<WalletTopup>(COL.topups, (l) => cb([...l].sort((a, b) => b.createdAt - a.createdAt))),
    watchUserTopups: (userId, cb) => watchCollection<WalletTopup>(COL.topups, (l) => cb([...l].sort((a, b) => b.createdAt - a.createdAt)), where('userId', '==', userId)),
    watchUserTxns: (userId, cb) => watchCollection<WalletTxn>(COL.txns, (l) => cb([...l].sort((a, b) => b.at - a.at)), where('userId', '==', userId)),
    async createTopup(userId, amount) {
      return authed(async () => {
        if (!Number.isInteger(amount) || amount < 10 || amount > 5000) throw new ServiceError('Add between ₹10 and ₹5000.');
        const cSnap = await getDoc(doc(firestore, COL.customers, userId));
        if (!cSnap.exists()) throw new ServiceError('Log in again to add money.', 'auth');
        const c = cSnap.data() as Customer;
        let code = '';
        for (let i = 0; i < 30; i++) {
          const cand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
          const hit = await getDocs(query(collection(firestore, COL.topups), where('code', '==', cand)));
          if (hit.empty) { code = cand; break; }
        }
        if (!code) throw new ServiceError('Could not start the top-up, try again.');
        const topup: WalletTopup = { id: uid('top'), userId, customerName: c.name, phone: c.phone, amount, code, status: 'pending', createdAt: Date.now() };
        await setDoc(doc(firestore, COL.topups, topup.id), topup);
        return topup;
      });
    },
    async confirmTopup(id) {
      await authed(async () => {
        await runTransaction(firestore, async (tx) => {
          const tRef = doc(firestore, COL.topups, id);
          const tSnap = await tx.get(tRef);
          if (!tSnap.exists()) throw new ServiceError('Top-up not found.');
          const t = tSnap.data() as WalletTopup;
          if (t.status !== 'pending') throw new ServiceError(`This top-up is already ${t.status}.`);
          const cRef = doc(firestore, COL.customers, t.userId);
          const cSnap = await tx.get(cRef);
          if (!cSnap.exists()) throw new ServiceError('Customer account not found.');
          const now = Date.now();
          tx.update(cRef, { walletBalance: ((cSnap.data() as Customer).walletBalance ?? 0) + t.amount });
          tx.update(tRef, { status: 'paid', paidAt: now });
          const txn: WalletTxn = { id: uid('wtx'), userId: t.userId, type: 'topup', amount: t.amount, note: 'Added via GPay', at: now };
          tx.set(doc(firestore, COL.txns, txn.id), txn);
          const n: AppNotification = {
            id: `wal_${id}`, type: 'order', title: `₹${t.amount} added to your wallet 💰`,
            body: 'Your top-up is confirmed. Use it at checkout.', at: now, audience: { kind: 'user', userId: t.userId }, link: '/wallet'
          };
          tx.set(doc(firestore, COL.feed, n.id), n);
        });
      });
    },
    async cancelTopup(id, userId) {
      await authed(async () => {
        const ref = doc(firestore, COL.topups, id);
        const snap = await getDoc(ref);
        if (!snap.exists() || (snap.data() as WalletTopup).userId !== userId) throw new ServiceError('Top-up not found.');
        if ((snap.data() as WalletTopup).status !== 'pending') throw new ServiceError('This top-up was already confirmed.');
        await updateDoc(ref, { status: 'cancelled' });
      });
    }
  },

  auth: {
    async requestOtp(phone) {
      await authReady;
      if (!/^[6-9]\d{9}$/.test(phone)) throw new ServiceError('Enter a valid 10-digit mobile number.');
      // Local development only: the seeded demo account skips SMS so the app is testable without a phone.
      if (import.meta.env.DEV && phone === APP.demoUserPhone) {
        const devCode = String(Math.floor(100000 + Math.random() * 900000));
        sessionStorage.setItem(`no:otp:${phone}`, devCode);
        return { devCode };
      }
      if (isNative) {
        try {
          await sendNativeOtp(phone);
        } catch (e) {
          throw new ServiceError(otpSendError((e as { code?: string }).code), 'otp-send');
        }
        return {};
      }
      recaptcha?.clear();
      document.getElementById('recaptcha-container')?.remove();
      const holder = document.createElement('div');
      holder.id = 'recaptcha-container';
      document.body.appendChild(holder);
      recaptcha = new RecaptchaVerifier(auth, holder, { size: 'invisible' });
      try {
        smsConfirmation = await signInWithPhoneNumber(auth, `+91${phone}`, recaptcha);
      } catch (e) {
        recaptcha.clear();
        recaptcha = null;
        throw new ServiceError(otpSendError((e as { code?: string }).code), 'otp-send');
      }
      return {};
    },
    async verifyOtp(phone, code) {
      await authReady;
      const demoCode = sessionStorage.getItem(`no:otp:${phone}`);
      if (import.meta.env.DEV && demoCode) {
        if (demoCode !== code) throw new ServiceError('That code doesn’t match. Check and try again.', 'otp');
        sessionStorage.removeItem(`no:otp:${phone}`);
      } else if (isNative) {
        if (!nativeVerificationId) throw new ServiceError('Request a new code first.', 'otp');
        try {
          await signInWithCredential(auth, PhoneAuthProvider.credential(nativeVerificationId, code));
        } catch (e) {
          const c = (e as { code?: string }).code;
          if (c === 'auth/code-expired') throw new ServiceError('That code expired. Request a new one.', 'otp');
          throw new ServiceError('That code doesn’t match. Check and try again.', 'otp');
        }
        nativeVerificationId = null;
      } else {
        if (!smsConfirmation) throw new ServiceError('Request a new code first.', 'otp');
        try {
          await smsConfirmation.confirm(code);
        } catch (e) {
          const c = (e as { code?: string }).code;
          if (c === 'auth/code-expired') throw new ServiceError('That code expired. Request a new one.', 'otp');
          throw new ServiceError('That code doesn’t match. Check and try again.', 'otp');
        }
        smsConfirmation = null;
      }
      const snap = await getDoc(doc(firestore, COL.customers, phone));
      const customer = snap.exists() ? (snap.data() as Customer) : null;
      if (customer?.blocked) throw new ServiceError('This account is blocked. Contact support.', 'blocked');
      return { customer };
    },
    async adminLogin(email, password) {
      await authReady;
      let uid: string;
      try {
        uid = (await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)).user.uid;
      } catch {
        throw new ServiceError('Email or password is wrong.');
      }
      const admin = APP.adminAccounts.find((a) => a.uid === uid);
      if (!admin) {
        await signOut(auth);
        await signInAnonymously(auth);
        throw new ServiceError('This account doesn’t have store access.');
      }
      return { name: admin.name, email: email.trim().toLowerCase(), role: admin.role };
    },
    async adminLogout() {
      await signOut(auth);
      await signInAnonymously(auth);
    }
  }
};

async function fireBackInStock(p: Product) {
  await authed(async () => {
    const waiting = await getDocs(query(collection(firestore, COL.alerts), where('productId', '==', p.id)));
    if (waiting.empty) return;
    const now = Date.now();
    const batch = writeBatch(firestore);
    waiting.docs.forEach((d) => {
      const a = d.data() as StockAlert;
      pushNotification(batch, {
        id: uid('ntf'),
        type: 'stock',
        title: `${p.name} is back 🎉`,
        body: `You asked us to ping you. ${p.stock <= p.lowStockAt ? `Only ${p.stock} in stock, so be quick.` : 'Grab it before it vanishes again.'}`,
        at: now,
        audience: { kind: 'user', userId: a.userId },
        link: `/search?q=${encodeURIComponent(p.name)}`
      });
      batch.delete(d.ref);
    });
    await batch.commit();
  });
}
