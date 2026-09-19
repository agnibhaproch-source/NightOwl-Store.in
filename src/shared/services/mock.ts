import { db } from '../lib/db';
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

const live = () => new ServiceError('This needs the live backend.');

const K = {
  products: 'products',
  categories: 'categories',
  orders: 'orders',
  coupons: 'coupons',
  banners: 'banners',
  settings: 'settings',
  customers: 'customers',
  feed: 'feed',
  broadcasts: 'broadcasts',
  alerts: 'stockAlerts',
  version: 'seedVersion'
} as const;

const E: never[] = [];
const wait = (ms = 220) => new Promise((r) => setTimeout(r, ms));

/** First read of each collection is delayed slightly so loading states are real. */
const warmed = new Set<string>();
function watch<T>(key: string, fallback: T, cb: (v: T) => void, map?: (v: T) => T): Unsub {
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const emit = () => {
    if (!alive) return;
    const v = db.get(key, fallback);
    cb(map ? map(v) : v);
  };
  const unsub = db.subscribe(key, emit);
  if (warmed.has(key)) emit();
  else
    timer = setTimeout(() => {
      warmed.add(key);
      emit();
    }, 320);
  return () => {
    alive = false;
    clearTimeout(timer);
    unsub();
  };
}

const get = {
  products: () => db.get<Product[]>(K.products, E),
  orders: () => db.get<Order[]>(K.orders, E),
  settings: () => ({ ...defaultSettings, ...db.get<Partial<StoreSettings>>(K.settings, defaultSettings) }),
  customers: () => db.get<Customer[]>(K.customers, E),
  coupons: () => db.get<Coupon[]>(K.coupons, E),
  alerts: () => db.get<StockAlert[]>(K.alerts, E)
};

function pushNotification(n: AppNotification) {
  db.update<AppNotification[]>(K.feed, E, (list) =>
    list.some((x) => x.id === n.id) ? list : [n, ...list].slice(0, 400)
  );
}

function fireBackInStock(p: Product) {
  const alerts = get.alerts();
  const waiting = alerts.filter((a) => a.productId === p.id);
  if (!waiting.length) return;
  const now = Date.now();
  waiting.forEach((a) =>
    pushNotification({
      id: uid('ntf'),
      type: 'stock',
      title: `${p.name} is back 🎉`,
      body: `You asked us to ping you. ${p.stock <= p.lowStockAt ? `Only ${p.stock} in stock, so be quick.` : 'Grab it before it vanishes again.'}`,
      at: now,
      audience: { kind: 'user', userId: a.userId },
      link: `/search?q=${encodeURIComponent(p.name)}`
    })
  );
  db.set(K.alerts, alerts.filter((a) => a.productId !== p.id));
}

function writeProduct(next: Product) {
  const list = get.products();
  const prev = list.find((x) => x.id === next.id);
  const clean = { ...next, stock: Math.max(0, Math.round(next.stock)) };
  db.set(K.products, prev ? list.map((x) => (x.id === next.id ? clean : x)) : [clean, ...list]);
  if (prev && prev.stock <= 0 && clean.stock > 0) fireBackInStock(clean);
  return clean;
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

function seedAll() {
  const now = Date.now();
  const products = buildProducts(now);
  const customers = buildCustomers(now);
  const orders = buildOrders(now, products, customers);
  const { feed, broadcasts } = buildFeed(now);
  db.set(K.categories, seedCategories);
  db.set(K.products, products);
  db.set(K.customers, customers);
  db.set(K.orders, orders);
  db.set(K.coupons, buildCoupons(now));
  db.set(K.banners, seedBanners);
  db.set(K.settings, defaultSettings);
  db.set(K.feed, feed);
  db.set(K.broadcasts, broadcasts);
  db.set(K.alerts, []);
  db.set(K.version, SEED_VERSION);
}

export const mockServices: Services = {
  system: {
    ensureSeed() {
      if (db.get<number>(K.version, 0) !== SEED_VERSION) seedAll();
    },
    resetDemo() {
      db.clearAll();
      seedAll();
    },
    async refresh() {
      await wait(500);
      db.refreshAll();
    }
  },

  products: {
    watchProducts: (cb) => watch(K.products, E as Product[], cb),
    watchCategories: (cb) =>
      watch(K.categories, E as Category[], cb, (l) => [...l].sort((a, b) => a.order - b.order)),
    async saveProduct(p) {
      await wait();
      if (!p.name.trim()) throw new ServiceError('Give the product a name.');
      if (p.price > p.mrp) throw new ServiceError('Selling price cannot be higher than MRP.');
      return writeProduct(p);
    },
    async deleteProduct(id) {
      await wait();
      db.update<Product[]>(K.products, E, (l) => l.filter((p) => p.id !== id));
    },
    async duplicateProduct(id) {
      await wait();
      const src = get.products().find((p) => p.id === id);
      if (!src) throw new ServiceError('Product not found.');
      const copy: Product = { ...src, id: uid('prd'), name: `${src.name} (copy)`, active: false, createdAt: Date.now() };
      db.set(K.products, [copy, ...get.products()]);
      return copy;
    },
    async setActive(id, active) {
      const p = get.products().find((x) => x.id === id);
      if (p) writeProduct({ ...p, active });
    },
    async saveCategory(c) {
      await wait(120);
      db.update<Category[]>(K.categories, E, (l) =>
        l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c : x)) : [...l, { ...c, order: l.length }]
      );
    },
    async deleteCategory(id) {
      await wait(120);
      if (get.products().some((p) => p.categoryId === id))
        throw new ServiceError('Move or delete the products in this category first.');
      db.update<Category[]>(K.categories, E, (l) => l.filter((c) => c.id !== id));
    },
    async reorderCategories(ids) {
      db.update<Category[]>(K.categories, E, (l) =>
        l.map((c) => ({ ...c, order: ids.indexOf(c.id) === -1 ? 99 : ids.indexOf(c.id) }))
      );
    }
  },

  inventory: {
    async adjustStock(id, delta) {
      const p = get.products().find((x) => x.id === id);
      if (p) writeProduct({ ...p, stock: p.stock + delta });
    },
    async setStock(id, qty) {
      const p = get.products().find((x) => x.id === id);
      if (p) writeProduct({ ...p, stock: qty });
    },
    async bulkStock(ids, mode, qty) {
      await wait();
      const set = new Set(ids);
      const before = get.products();
      const after = before.map((p) =>
        set.has(p.id) ? { ...p, stock: Math.max(0, mode === 'set' ? qty : p.stock + qty) } : p
      );
      db.set(K.products, after);
      after.forEach((p, i) => {
        if (before[i]!.stock <= 0 && p.stock > 0) fireBackInStock(p);
      });
    },
    watchStockAlerts: (cb) => watch(K.alerts, E as StockAlert[], cb),
    async toggleStockAlert(productId, userId) {
      const list = get.alerts();
      const exists = list.some((a) => a.productId === productId && a.userId === userId);
      db.set(
        K.alerts,
        exists
          ? list.filter((a) => !(a.productId === productId && a.userId === userId))
          : [...list, { productId, userId, at: Date.now() }]
      );
      return !exists;
    }
  },

  orders: {
    watchOrders: (cb) => watch(K.orders, E as Order[], cb),
    watchUserOrders: (userId, cb) =>
      watch(K.orders, E as Order[], cb, (l) => l.filter((o) => o.userId === userId)),

    async placeOrder(input) {
      await wait(700);
      const now = Date.now();
      const settings = get.settings();
      if (!getStoreStatus(now, settings).isOpen)
        throw new ServiceError('The store is closed right now. Your cart is saved for when we open.', 'closed');
      const customer = get.customers().find((c) => c.id === input.userId);
      if (!customer) throw new ServiceError('Log in again to place this order.', 'auth');
      if (customer.blocked) throw new ServiceError('This account cannot place orders. Contact support.', 'blocked');
      const address = customer.addresses.find((a) => a.id === input.addressId);
      if (!address) throw new ServiceError('Pick a delivery room first.', 'address');
      const hostel = settings.hostels.find((h) => h.id === address.hostelId);
      if (!hostel?.active || !hostel.blocks.includes(address.block))
        throw new ServiceError('We don’t deliver to this block yet.', 'area');
      if (!input.items.length) throw new ServiceError('Your cart is empty.');

      const products = get.products();
      const items = input.items.map(({ productId, qty }) => {
        const p = products.find((x) => x.id === productId);
        if (!p || !p.active) throw new ServiceError('An item in your cart is no longer available.', 'stock');
        if (p.stock < qty)
          throw new ServiceError(
            p.stock === 0 ? `${p.name} just sold out.` : `Only ${p.stock} of ${p.name} left.`,
            'stock'
          );
        return { productId, name: p.name, unit: p.unit, price: p.price, mrp: p.mrp, qty };
      });

      const coupons = get.coupons();
      const coupon = input.couponCode ? coupons.find((c) => c.code === input.couponCode) : undefined;
      const { bill, coupon: cc } = computeBill(items, settings, coupon, now);
      if (input.couponCode && !cc?.ok) throw new ServiceError(cc?.reason ?? 'That coupon no longer applies.', 'coupon');
      if (bill.itemTotal < settings.minOrderValue)
        throw new ServiceError(`Minimum order is ₹${settings.minOrderValue}.`, 'min');

      db.set(
        K.products,
        products.map((p) => {
          const line = input.items.find((i) => i.productId === p.id);
          return line ? { ...p, stock: p.stock - line.qty, popularity: p.popularity + line.qty } : p;
        })
      );
      if (coupon && cc?.ok)
        db.set(K.coupons, coupons.map((c) => (c.code === coupon.code ? { ...c, used: c.used + 1 } : c)));

      const usedCodes = new Set(get.orders().map((o) => o.shortCode));
      let shortCode = '';
      do {
        shortCode = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      } while (usedCodes.has(shortCode));

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
        paymentMode: 'upi_qr',
        paymentStatus: 'pending'
      };
      db.set(K.orders, [order, ...get.orders()]);
      pushNotification({
        id: `ord_${order.id}_placed`, type: 'order', ...STATUS_COPY.placed(order), at: now,
        audience: { kind: 'user', userId: customer.id }, link: `/orders/${order.id}`
      });
      return order;
    },

    async updateStatus(id, status, reason) {
      const now = Date.now();
      const orders = get.orders();
      const o = orders.find((x) => x.id === id);
      if (!o) throw new ServiceError('Order not found.');
      if (o.status === status) return;
      if (o.paymentStatus === 'pending' && status !== 'cancelled') throw new ServiceError('Confirm the payment first.');
      if (o.status === 'delivered' || o.status === 'cancelled')
        throw new ServiceError(`This order is already ${STATUS_LABEL[o.status].toLowerCase()}.`);
      const next: Order = {
        ...o,
        status,
        updatedAt: now,
        history: [...o.history, { status, at: now }],
        ...(status === 'cancelled' ? { cancelReason: reason || 'Cancelled by the store', cancelledBy: 'store' as const } : {})
      };
      db.set(K.orders, orders.map((x) => (x.id === id ? next : x)));
      if (status === 'cancelled') {
        db.set(
          K.products,
          get.products().map((p) => {
            const line = o.items.find((i) => i.productId === p.id);
            return line ? { ...p, stock: p.stock + line.qty } : p;
          })
        );
      }
      pushNotification({
        id: `ord_${id}_${status}`, type: 'order', ...STATUS_COPY[status](next), at: now,
        audience: { kind: 'user', userId: o.userId }, link: `/orders/${id}`
      });
    },

    async cancelByUser(id, userId) {
      await wait(400);
      const o = get.orders().find((x) => x.id === id);
      if (!o || o.userId !== userId) throw new ServiceError('Order not found.');
      if (o.status !== 'placed') throw new ServiceError('The store already accepted this order, so it can’t be cancelled here. Call support.');
      if (Date.now() - o.createdAt > APP.cancelWindowSeconds * 1000)
        throw new ServiceError(`The ${APP.cancelWindowSeconds}-second cancellation window has closed. Call support.`, 'window');
      await mockServices.orders.updateStatus(id, 'cancelled', 'Cancelled by you');
      db.update<Order[]>(K.orders, E, (l) => l.map((x) => (x.id === id ? { ...x, cancelledBy: 'user' } : x)));
    },

    async confirmPayment(id) {
      const now = Date.now();
      db.update<Order[]>(K.orders, E, (l) => l.map((o) => (o.id === id && o.paymentStatus === 'pending' ? { ...o, paymentStatus: 'paid' as const, paidAt: now, updatedAt: now } : o)));
    },

    async cancelUnpaid(id, userId) {
      const o = get.orders().find((x) => x.id === id);
      if (!o || o.userId !== userId || o.paymentStatus !== 'pending') throw new ServiceError('Order not found.');
      await mockServices.orders.updateStatus(id, 'cancelled', 'Payment not completed');
    },

    async assignRider() {
      throw live();
    },
    async getDeliveryCode() {
      return null;
    },
    async sendMessage() {
      throw live();
    },
    async riderPickup() {
      throw live();
    },
    async riderArrived() {
      throw live();
    },
    async riderDeliver() {
      throw live();
    },

    async setDonation() {
      throw live();
    },

    async setReceiver() {
      throw live();
    },

    async payWithWallet() {
      throw live();
    },

    async rateOrder(id, rating) {
      await wait(300);
      db.update<Order[]>(K.orders, E, (l) => l.map((o) => (o.id === id ? { ...o, rating } : o)));
    }
  },

  notifications: {
    watchFeed: (cb) => watch(K.feed, E as AppNotification[], cb),
    watchBroadcasts: (cb) => watch(K.broadcasts, E as BroadcastLog[], cb),
    async push(n) {
      pushNotification(n);
    },
    async broadcast(input) {
      await wait(500);
      const log: BroadcastLog = { ...input, id: uid('bc'), at: Date.now() };
      db.update<BroadcastLog[]>(K.broadcasts, E, (l) => [log, ...l]);
      pushNotification({
        id: log.id, type: log.type, title: log.title, body: log.body, at: log.at,
        audience: log.hostelIds?.length ? { kind: 'hostels', hostelIds: log.hostelIds } : { kind: 'all' }
      });
    }
  },

  settings: {
    watchSettings: (cb) =>
      watch(K.settings, defaultSettings, cb, (s) => ({ ...defaultSettings, ...s })),
    getSettings: get.settings,
    async updateSettings(patch) {
      await wait(150);
      if (patch.openTime !== undefined && patch.openTime === (patch.closeTime ?? get.settings().closeTime))
        throw new ServiceError('Opening and closing time cannot be the same.');
      db.set(K.settings, { ...get.settings(), ...patch });
    }
  },

  coupons: {
    watchCoupons: (cb) => watch(K.coupons, E as Coupon[], cb),
    async saveCoupon(c, originalCode) {
      await wait();
      const code = c.code.trim().toUpperCase();
      if (!/^[A-Z0-9]{3,16}$/.test(code)) throw new ServiceError('Codes use 3–16 letters or numbers, no spaces.');
      if (c.value <= 0) throw new ServiceError('Discount must be more than zero.');
      if (c.type === 'percent' && c.value > 90) throw new ServiceError('Percent discounts are capped at 90%.');
      const list = get.coupons();
      if (code !== originalCode && list.some((x) => x.code === code))
        throw new ServiceError(`${code} already exists.`);
      const clean = { ...c, code };
      db.set(
        K.coupons,
        originalCode ? list.map((x) => (x.code === originalCode ? clean : x)) : [clean, ...list]
      );
    },
    async deleteCoupon(code) {
      db.update<Coupon[]>(K.coupons, E, (l) => l.filter((c) => c.code !== code));
    }
  },

  banners: {
    watchBanners: (cb) =>
      watch(K.banners, E as Banner[], cb, (l) => [...l].sort((a, b) => a.order - b.order)),
    async saveBanner(b) {
      await wait(150);
      db.update<Banner[]>(K.banners, E, (l) =>
        l.some((x) => x.id === b.id) ? l.map((x) => (x.id === b.id ? b : x)) : [...l, { ...b, order: l.length }]
      );
    },
    async deleteBanner(id) {
      db.update<Banner[]>(K.banners, E, (l) => l.filter((b) => b.id !== id));
    },
    async reorderBanners(ids) {
      db.update<Banner[]>(K.banners, E, (l) => l.map((b) => ({ ...b, order: ids.indexOf(b.id) })));
    }
  },

  customers: {
    watchCustomers: (cb) => watch(K.customers, E as Customer[], cb),
    watchCustomer: (id, cb) =>
      watch(K.customers, E as Customer[], (l) => cb(l.find((c) => c.id === id) ?? null)),
    async getCustomer(id) {
      await wait(150);
      return get.customers().find((c) => c.id === id) ?? null;
    },
    async saveProfile(c) {
      await wait(300);
      if (!c.name.trim()) throw new ServiceError('Add your name.');
      db.update<Customer[]>(K.customers, E, (l) =>
        l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c : x)) : [...l, c]
      );
    },
    async saveReceiver() {
      throw live();
    },
    async saveAddress(userId, a, makeDefault) {
      await wait(200);
      if (!a.room.trim()) throw new ServiceError('Add your room number.');
      db.update<Customer[]>(K.customers, E, (l) =>
        l.map((c) => {
          if (c.id !== userId) return c;
          const exists = c.addresses.some((x) => x.id === a.id);
          const addresses = exists ? c.addresses.map((x) => (x.id === a.id ? a : x)) : [...c.addresses, a];
          return { ...c, addresses, defaultAddressId: makeDefault || !c.defaultAddressId ? a.id : c.defaultAddressId };
        })
      );
    },
    async deleteAddress(userId, addressId) {
      db.update<Customer[]>(K.customers, E, (l) =>
        l.map((c) => {
          if (c.id !== userId) return c;
          const addresses = c.addresses.filter((a) => a.id !== addressId);
          return {
            ...c,
            addresses,
            defaultAddressId: c.defaultAddressId === addressId ? addresses[0]?.id : c.defaultAddressId
          };
        })
      );
    },
    async setBlocked(id, blocked) {
      db.update<Customer[]>(K.customers, E, (l) => l.map((c) => (c.id === id ? { ...c, blocked } : c)));
    }
  },

  riders: {
    watchRiders: (cb) => watch('riders', E as never[], cb),
    watchRider: (_id, cb) => watch('riders', E as never[], () => cb(null)),
    watchRiderOrders: (_id, cb) => watch('riderOrders', E as never[], cb),
    async register() {
      throw live();
    },
    async login() {
      throw live();
    },
    async logout() {},
    async setStatus() {
      throw live();
    },
    async setOnline() {
      throw live();
    }
  },

  wallet: {
    watchTopups: (cb) => watch('walletTopups', E as never[], cb),
    watchUserTopups: (_u, cb) => watch('walletTopups', E as never[], cb),
    watchUserTxns: (_u, cb) => watch('walletTxns', E as never[], cb),
    async createTopup() {
      throw live();
    },
    async confirmTopup() {
      throw live();
    },
    async cancelTopup() {
      throw live();
    }
  },

  auth: {
    async requestOtp(phone) {
      await wait(600);
      if (!/^[6-9]\d{9}$/.test(phone)) throw new ServiceError('Enter a valid 10-digit mobile number.');
      const devCode = String(Math.floor(1000 + Math.random() * 9000));
      sessionStorage.setItem(`no:otp:${phone}`, devCode);
      return { devCode };
    },
    async verifyOtp(phone, code) {
      await wait(600);
      const expected = sessionStorage.getItem(`no:otp:${phone}`);
      if (!expected || expected !== code) throw new ServiceError('That code doesn’t match. Check and try again.', 'otp');
      sessionStorage.removeItem(`no:otp:${phone}`);
      const customer = get.customers().find((c) => c.id === phone) ?? null;
      if (customer?.blocked) throw new ServiceError('This account is blocked. Contact support.', 'blocked');
      return { customer };
    },
    async adminLogin() {
      throw live();
    },
    async adminLogout() {},
  }
};
