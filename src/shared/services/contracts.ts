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
  Order, OrderRating, OrderStatus, Product, Receiver, Rider, RiderIdType, RiderStatus, RiderVehicle, StockAlert, StoreSettings, Unsub, WalletTopup, WalletTxn
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
  /** Admin: the UPI payment showed up in the store's account. Unlocks the order and notifies the customer. */
  confirmPayment(id: string): Promise<void>;
  /** Customer abandons an order whose payment was never confirmed. */
  cancelUnpaid(id: string, userId: string): Promise<void>;
  rateOrder(id: string, rating: OrderRating): Promise<void>;
  /** Optional Feeding India contribution (0, 2, 5 or 10) on an order that hasn't been paid yet. */
  setDonation(id: string, userId: string, amount: number): Promise<void>;
  /** Keeps the delivery contact on a not-yet-accepted order in step with the customer's receiver details. */
  setReceiver(id: string, userId: string, receiver: Receiver): Promise<void>;
  /** Admin: hand a paid, accepted order to an approved rider. */
  assignRider(orderId: string, riderId: string): Promise<void>;
  /** The 4-digit code the customer reads out to the rider at the door. */
  getDeliveryCode(orderId: string): Promise<string | null>;
  sendMessage(orderId: string, from: 'user' | 'rider', text: string): Promise<void>;
  riderPickup(orderId: string, riderId: string): Promise<void>;
  riderArrived(orderId: string, riderId: string): Promise<void>;
  /** Completes the delivery. Fails unless `code` is the customer's delivery code. */
  riderDeliver(orderId: string, riderId: string, code: string): Promise<void>;
  /** Pay an unpaid order out of the customer's wallet balance. */
  payWithWallet(id: string, userId: string): Promise<void>;
}

export interface RegisterRiderInput {
  name: string;
  phone: string;
  email: string;
  password: string;
  vehicle: RiderVehicle;
  vehicleNumber?: string;
  idType: RiderIdType;
  idNumber: string;
  emergencyName: string;
  emergencyPhone: string;
  area?: string;
  photo?: string;
}

export interface RiderService {
  watchRiders: Watch<Rider[]>;
  watchRider(id: string, cb: (r: Rider | null) => void): Unsub;
  watchRiderOrders(riderId: string, cb: (o: Order[]) => void): Unsub;
  register(input: RegisterRiderInput): Promise<Rider>;
  login(email: string, password: string): Promise<Rider>;
  logout(): Promise<void>;
  /** Admin: approve, reject or suspend a rider. */
  setStatus(id: string, status: RiderStatus, reason?: string): Promise<void>;
  setOnline(id: string, online: boolean): Promise<void>;
}

export interface WalletService {
  watchTopups: Watch<WalletTopup[]>;
  watchUserTopups(userId: string, cb: (t: WalletTopup[]) => void): Unsub;
  watchUserTxns(userId: string, cb: (t: WalletTxn[]) => void): Unsub;
  createTopup(userId: string, amount: number): Promise<WalletTopup>;
  /** Admin: the GPay payment landed. Credits the customer's wallet. */
  confirmTopup(id: string): Promise<void>;
  cancelTopup(id: string, userId: string): Promise<void>;
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
  saveReceiver(userId: string, receiver: Receiver): Promise<void>;
  saveAddress(userId: string, a: Address, makeDefault?: boolean): Promise<void>;
  deleteAddress(userId: string, addressId: string): Promise<void>;
  setBlocked(id: string, blocked: boolean): Promise<void>;
}

export interface AuthService {
  /** `devCode` is only returned by the mock backend and the dev-only demo account; real SMS never exposes the code. */
  requestOtp(phone: string): Promise<{ devCode?: string }>;
  verifyOtp(phone: string, code: string): Promise<{ customer: Customer | null }>;
  adminLogin(email: string, password: string): Promise<AdminSession>;
  adminLogout(): Promise<void>;
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
  wallet: WalletService;
  riders: RiderService;
  auth: AuthService;
  system: SystemService;
}
