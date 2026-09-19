export type Unsub = () => void;
export type Tone = 'violet' | 'cyan' | 'lime' | 'pink' | 'amber';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  tone: Tone;
  order: number;
  active: boolean;
}

export type PackShape =
  | 'noodle' | 'cup' | 'chips' | 'tube' | 'biscuit' | 'cake'
  | 'bottle' | 'can' | 'tetra' | 'pasta' | 'bar' | 'box' | 'combo';

export interface ComboItem { productId: string; qty: number }

export interface Product {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  unit: string;
  mrp: number;
  price: number;
  cost: number;
  stock: number;
  lowStockAt: number;
  veg: boolean;
  active: boolean;
  tags: string[];
  popularity: number;
  createdAt: number;
  color: string;
  shape: PackShape;
  description: string;
  image?: string;
  comboItems?: ComboItem[];
}

export type OrderStatus = 'placed' | 'accepted' | 'packing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Address {
  id: string;
  label: string;
  hostelId: string;
  block: string;
  room: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  unit: string;
  price: number;
  mrp: number;
  qty: number;
}

export interface Bill {
  itemTotal: number;
  mrpTotal: number;
  productDiscount: number;
  couponDiscount: number;
  couponCode?: string;
  deliveryFee: number;
  convenienceFee: number;
  /** Optional Feeding India contribution the customer added at checkout. */
  donation?: number;
  grandTotal: number;
}

export interface OrderRating {
  order: number;
  items: Record<string, number>;
  comment?: string;
  at: number;
}

export interface Order {
  id: string;
  /** 4-digit code shown to both the customer and the admin for this order. Never reused. */
  shortCode: string;
  userId: string;
  customerName: string;
  phone: string;
  address: Address;
  items: OrderItem[];
  bill: Bill;
  instructions: string;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  history: { status: OrderStatus; at: number }[];
  cancelReason?: string;
  cancelledBy?: 'user' | 'store';
  etaMinutes: number;
  paymentMode: 'pay_on_delivery' | 'upi_qr' | 'wallet';
  /** Who receives the order at the door (may differ from the account holder). */
  receiver?: Receiver;
  /** Orders start 'pending' until the store confirms the UPI payment landed. Missing means paid (older orders). */
  paymentStatus?: 'pending' | 'paid';
  paidAt?: number;
  /** Delivery: assigned by the store, driven by the rider. */
  riderId?: string;
  rider?: RiderInfo;
  assignedAt?: number;
  pickedUpAt?: number;
  arrivedAt?: number;
  deliveredAt?: number;
  /** Customer instructions and rider replies while the order is on its way. */
  messages?: OrderMessage[];
  /** Written by the rider at handover; the database only accepts it if it matches the customer's delivery code. */
  deliveryCode?: string;
  rating?: OrderRating;
}

export interface Coupon {
  code: string;
  description: string;
  type: 'percent' | 'flat';
  value: number;
  maxDiscount?: number;
  minOrder: number;
  usageLimit: number;
  used: number;
  expiresAt: number;
  active: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  link: string;
  tone: Tone;
  emoji: string;
  active: boolean;
  order: number;
}

export interface Hostel {
  id: string;
  name: string;
  short: string;
  blocks: string[];
  active: boolean;
}

export interface StoreSettings {
  mode: 'auto' | 'open' | 'closed';
  openTime: string;
  closeTime: string;
  deliveryFee: number;
  convenienceFee: number;
  minOrderValue: number;
  etaMin: number;
  etaMax: number;
  hostels: Hostel[];
}

export type RiderVehicle = 'bike' | 'scooter' | 'cycle' | 'walk';
export type RiderStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type RiderIdType = 'college' | 'aadhaar' | 'licence';

export interface Rider {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicle: RiderVehicle;
  vehicleNumber?: string;
  idType: RiderIdType;
  /** Only the store owner and the rider themself can read this. */
  idNumber: string;
  emergencyName: string;
  emergencyPhone: string;
  area?: string;
  photo?: string;
  status: RiderStatus;
  statusReason?: string;
  online: boolean;
  createdAt: number;
  approvedAt?: number;
  updatedAt?: number;
}

/** What the customer is allowed to see about the person delivering their order. */
export interface RiderInfo {
  id: string;
  name: string;
  phone: string;
  vehicle: RiderVehicle;
  vehicleNumber?: string;
}

export interface OrderMessage {
  id: string;
  from: 'user' | 'rider';
  text: string;
  at: number;
}

export interface Receiver {
  name: string;
  phone: string;
}

export interface WalletTopup {
  id: string;
  userId: string;
  customerName: string;
  phone: string;
  amount: number;
  /** Shown to the customer to type in the GPay note, so the store can match the payment. */
  code: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: number;
  paidAt?: number;
}

export interface WalletTxn {
  id: string;
  userId: string;
  type: 'topup' | 'spend' | 'refund';
  amount: number;
  note: string;
  at: number;
  orderId?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  addresses: Address[];
  defaultAddressId?: string;
  receiver?: Receiver;
  /** Prepaid balance in rupees. */
  walletBalance?: number;
  blocked: boolean;
  joinedAt: number;
}

export type NotifType = 'order' | 'store' | 'stock' | 'offer' | 'broadcast';

export type Audience =
  | { kind: 'user'; userId: string }
  | { kind: 'all' }
  | { kind: 'hostels'; hostelIds: string[] };

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  at: number;
  audience: Audience;
  link?: string;
}

export interface StockAlert { productId: string; userId: string; at: number }

export interface BroadcastLog {
  id: string;
  title: string;
  body: string;
  type: 'offer' | 'broadcast';
  hostelIds: string[] | null;
  at: number;
  by: string;
}

export interface AdminSession { name: string; email: string; role: 'owner' | 'staff' }

export const STATUS_FLOW: OrderStatus[] = ['placed', 'accepted', 'packing', 'out_for_delivery', 'delivered'];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Placed',
  accepted: 'Accepted',
  packing: 'Packing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export const isPaid = (o: Pick<Order, 'paymentStatus'>) => o.paymentStatus !== 'pending';

/** Orders that never got paid (still waiting, or dropped/expired): not real sales, so they stay out of stats and lists. */
export const isAbandoned = (o: Pick<Order, 'paymentStatus' | 'cancelReason'>) =>
  o.paymentStatus === 'pending' || o.cancelReason === 'Payment not completed';
