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
  query, where, orderBy, writeBatch, runTransaction, type Unsubscribe
} from 'firebase/firestore';
import { authReady, firestore } from '../lib/firebase';
import { computeBill } from '../lib/bill';
import { getStoreStatus } from '../lib/time';
import { newOrderId, uid } from '../lib/format';
import { APP } from '../config/app';
import {
  SEED_VERSION, buildCoupons, buildCustomers, buildFeed, buildOrders, buildProducts,
  defaultSettings, seedBanners, seedCategories
} from '../data/seed';
import type {
  AppNotification, Banner, BroadcastLog, Category, Coupon, Customer, Order, OrderStatus,
  Product, StockAlert, StoreSettings, Unsub
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
  alerts: 'stockAlerts'
} as const;

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
  const orders = buildOrders(now, products, customers);
  const coupons = buildCoupons(now);
  const { feed, broadcasts } = buildFeed(now);

  const writes: { path: [string, string]; data: unknown }[] = [
    ...seedCategories.map((c) => ({ path: [COL.categories, c.id] as [string, string], data: c })),
    ...products.map((p) => ({ path: [COL.products, p.id] as [string, string], data: p })),
    ...customers.map((c) => ({ path: [COL.customers, c.id] as [string, string], data: c })),
    ...orders.map((o) => ({ path: [COL.orders, o.id] as [string, string], data: o })),
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
      await authed(() => updateDoc(doc(firestore, COL.products, id), { active }));
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
        await runTransaction(firestore, async (tx) => {
          const ref = doc(firestore, COL.products, id);
          const snap = await tx.get(ref);
          if (!snap.exists()) return;
          tx.update(ref, { stock: Math.max(0, (snap.data() as Product).stock + delta) });
        });
      });
    },
    async setStock(id, qty) {
      await authed(() => updateDoc(doc(firestore, COL.products, id), { stock: Math.max(0, qty) }));
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
          items,
          bill,
          instructions: input.instructions.trim(),
          status: 'placed',
          createdAt: now,
          updatedAt: now,
          history: [{ status: 'placed', at: now }],
          etaMinutes: settings.etaMax,
          paymentMode: 'upi_qr'
        };

        const batch = writeBatch(firestore);
        input.items.forEach(({ productId, qty }, i) => {
          const p = products[i]!;
          batch.update(doc(firestore, COL.products, productId), { stock: p.stock - qty, popularity: p.popularity + qty });
        });
        if (coupon && cc?.ok) batch.update(doc(firestore, COL.coupons, coupon.code), { used: coupon.used + 1 });
        batch.set(doc(firestore, COL.orders, order.id), order);
        pushNotification(batch, {
          id: `ord_${order.id}_placed`, type: 'order', ...STATUS_COPY.placed(order), at: now,
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
        if (Date.now() - o.createdAt > APP.cancelWindowSeconds * 1000)
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

  auth: {
    async requestOtp(phone) {
      await authReady;
      if (!/^[6-9]\d{9}$/.test(phone)) throw new ServiceError('Enter a valid 10-digit mobile number.');
      const devCode = String(Math.floor(1000 + Math.random() * 9000));
      sessionStorage.setItem(`no:otp:${phone}`, devCode);
      return { devCode };
    },
    async verifyOtp(phone, code) {
      await authReady;
      const expected = sessionStorage.getItem(`no:otp:${phone}`);
      if (!expected || expected !== code) throw new ServiceError('That code doesn’t match. Check and try again.', 'otp');
      sessionStorage.removeItem(`no:otp:${phone}`);
      const snap = await getDoc(doc(firestore, COL.customers, phone));
      const customer = snap.exists() ? (snap.data() as Customer) : null;
      if (customer?.blocked) throw new ServiceError('This account is blocked. Contact support.', 'blocked');
      return { customer };
    },
    async adminLogin(email, password) {
      const a = APP.admins.find((x) => x.email === email.trim().toLowerCase() && x.password === password);
      if (!a) throw new ServiceError('Email or password is wrong.');
      return { name: a.name, email: a.email, role: a.role };
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
