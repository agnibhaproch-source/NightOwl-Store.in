/**
 * Service contracts. The UI only ever imports `services` from ./index.ts,
 * which satisfies these interfaces. To move to Firebase, write a second
 * implementation (e.g. ./firebase.ts) and switch the export in ./index.ts.
 *
 * watch* methods map 1:1 to Firestore onSnapshot listeners.
 * Mutations return Promises and throw ServiceError with a user-facing message.
 */
import type {
  Address, AdminSession, AppNotification, Banner, BroadcastLog, Category, Coupon, Customer,
  Order, OrderRating, OrderStatus, Product, StockAlert, StoreSettings, Unsub
} from '../types';

export class ServiceError extends Error {
  constructor(message: string, public code = 'failed') {
    super(message);
  }
}

type Watch<T> = (cb: (value: T) => void) => Unsub;

export interface ProductService {
  watchProducts: Watch<Product[]>;
  watchCategories: Watch<Category[]>;
  saveProduct(p: Product): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  duplicateProduct(id: string): Promise<Product>;
  setActive(id: string, active: boolean): Promise<void>;
  saveCategory(c: Category): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  reorderCategories(ids: string[]): Promise<void>;
}

export interface InventoryService {
  adjustStock(id: string, delta: number): Promise<void>;
  setStock(id: string, qty: number): Promise<void>;
  bulkStock(ids: string[], mode: 'set' | 'add', qty: number): Promise<void>;
  watchStockAlerts: Watch<StockAlert[]>;
  toggleStockAlert(productId: string, userId: string): Promise<boolean>;
}

export interface PlaceOrderInput {
  userId: string;
  addressId: string;
  items: { productId: string; qty: number }[];
  couponCode?: string;
  instructions: string;
}

export interface OrderService {
  watchOrders: Watch<Order[]>;
  watchUserOrders(userId: string, cb: (o: Order[]) => void): Unsub;
  placeOrder(input: PlaceOrderInput): Promise<Order>;
  updateStatus(id: string, status: OrderStatus, reason?: string): Promise<void>;
  cancelByUser(id: string, userId: string): Promise<void>;
  rateOrder(id: string, rating: OrderRating): Promise<void>;
}

export interface NotificationService {
  watchFeed: Watch<AppNotification[]>;
  watchBroadcasts: Watch<BroadcastLog[]>;
  push(n: AppNotification): Promise<void>;
  broadcast(input: Omit<BroadcastLog, 'id' | 'at'>): Promise<void>;
}

export interface SettingsService {
  watchSettings: Watch<StoreSettings>;
  getSettings(): StoreSettings;
  updateSettings(patch: Partial<StoreSettings>): Promise<void>;
}

export interface CouponService {
  watchCoupons: Watch<Coupon[]>;
  saveCoupon(c: Coupon, originalCode?: string): Promise<void>;
  deleteCoupon(code: string): Promise<void>;
}

export interface BannerService {
  watchBanners: Watch<Banner[]>;
  saveBanner(b: Banner): Promise<void>;
  deleteBanner(id: string): Promise<void>;
  reorderBanners(ids: string[]): Promise<void>;
}

export interface CustomerService {
  watchCustomers: Watch<Customer[]>;
  watchCustomer(id: string, cb: (c: Customer | null) => void): Unsub;
  getCustomer(id: string): Promise<Customer | null>;
  saveProfile(c: Customer): Promise<void>;
  saveAddress(userId: string, a: Address, makeDefault?: boolean): Promise<void>;
  deleteAddress(userId: string, addressId: string): Promise<void>;
  setBlocked(id: string, blocked: boolean): Promise<void>;
}

export interface AuthService {
  requestOtp(phone: string): Promise<{ devCode: string }>;
  verifyOtp(phone: string, code: string): Promise<{ customer: Customer | null }>;
  adminLogin(email: string, password: string): Promise<AdminSession>;
}

export interface SystemService {
  ensureSeed(): void;
  resetDemo(): void;
  /** Force listeners to re-read (pull-to-refresh). Firebase: no-op, snapshots are live. */
  refresh(): Promise<void>;
}

export interface Services {
  products: ProductService;
  inventory: InventoryService;
  orders: OrderService;
  notifications: NotificationService;
  settings: SettingsService;
  coupons: CouponService;
  banners: BannerService;
  customers: CustomerService;
  auth: AuthService;
  system: SystemService;
}
