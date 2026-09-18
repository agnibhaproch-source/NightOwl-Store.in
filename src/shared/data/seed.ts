import type {
  AppNotification, Banner, BroadcastLog, Category, Coupon, Customer, Hostel, Order, OrderItem,
  OrderStatus, PackShape, Product, StoreSettings
} from '../types';
import { computeBill } from '../lib/bill';
import { mulberry32, slug } from '../lib/format';
import { DAY, HOUR, MIN, latestNight } from '../lib/time';
import { APP } from '../config/app';

export const SEED_VERSION = 4;

export const seedCategories: Category[] = [
  { id: 'noodles', name: 'Noodles', emoji: '🍜', tone: 'amber', order: 0, active: true },
  { id: 'chips', name: 'Chips', emoji: '🥔', tone: 'lime', order: 1, active: true },
  { id: 'biscuits', name: 'Biscuits', emoji: '🍪', tone: 'amber', order: 2, active: true },
  { id: 'cakes', name: 'Cakes', emoji: '🧁', tone: 'pink', order: 3, active: true },
  { id: 'drinks', name: 'Cold Drinks', emoji: '🥤', tone: 'cyan', order: 4, active: true },
  { id: 'pasta', name: 'Pasta', emoji: '🍝', tone: 'pink', order: 5, active: true },
  { id: 'chocolates', name: 'Chocolates', emoji: '🍫', tone: 'violet', order: 6, active: true },
  { id: 'combos', name: 'Combos', emoji: '🎁', tone: 'lime', order: 7, active: true }
];

type Row = [name: string, brand: string, unit: string, mrp: number, price: number, stock: number,
  shape: PackShape, color: string, veg?: boolean, tags?: string[]];

const ROWS: Record<string, Row[]> = {
  noodles: [
    ['Maggi 2-Minute Masala Noodles', 'Maggi', '70 g', 15, 14, 64, 'noodle', '#f5c518', true, ['maggi', 'masala']],
    ['Maggi Masala Noodles Family Pack', 'Maggi', '4 × 70 g', 60, 56, 22, 'noodle', '#f5c518', true, ['maggi']],
    ['Maggi Hot Heads Barbeque Pepper', 'Maggi', '71 g', 35, 30, 18, 'noodle', '#e2231a', true, ['spicy']],
    ['Maggi Atta Noodles Masala', 'Maggi', '72 g', 28, 25, 14, 'noodle', '#c8a165'],
    ['Maggi Cuppa Mania Masala Yo', 'Maggi', '70 g', 50, 48, 3, 'cup', '#f5c518', true, ['cup']],
    ['Sunfeast Yippee Magic Masala', 'Sunfeast', '60 g', 15, 14, 40, 'noodle', '#ff7a00'],
    ["Ching's Schezwan Instant Noodles", "Ching's Secret", '60 g', 25, 22, 20, 'noodle', '#2a2a2a', true, ['spicy', 'chinese']],
    ['Top Ramen Curry Veg', 'Top Ramen', '70 g', 15, 14, 0, 'noodle', '#d0021b'],
    ['Wai Wai Veg Masala Noodles', 'Wai Wai', '70 g', 20, 18, 26, 'noodle', '#ffd400'],
    ['Knorr Soupy Noodles Mast Masala', 'Knorr', '75 g', 25, 23, 11, 'noodle', '#00843d'],
    ['Nissin Cup Noodles Mazedaar Masala', 'Nissin', '70 g', 50, 45, 16, 'cup', '#e60012', true, ['cup']],
    ['Samyang Buldak Hot Chicken Ramen', 'Samyang', '140 g', 160, 145, 6, 'noodle', '#1c1c1c', false, ['korean', 'spicy', 'ramen']]
  ],
  chips: [
    ["Lay's Classic Salted", "Lay's", '50 g', 20, 20, 48, 'chips', '#ffc800', true, ['lays', 'salted']],
    ["Lay's India's Magic Masala", "Lay's", '50 g', 20, 20, 55, 'chips', '#1a5dab', true, ['lays', 'masala']],
    ["Lay's American Style Cream & Onion", "Lay's", '50 g', 20, 20, 39, 'chips', '#2e9e44', true, ['lays']],
    ['Kurkure Masala Munch', 'Kurkure', '75 g', 20, 20, 60, 'chips', '#f47b20'],
    ['Uncle Chipps Spicy Treat', 'Uncle Chipps', '48 g', 20, 20, 2, 'chips', '#d71920', true, ['spicy']],
    ['Bingo Mad Angles Achaari Masti', 'Bingo', '66 g', 20, 20, 30, 'chips', '#7fb800'],
    ['Doritos Nacho Cheese', 'Doritos', '60 g', 50, 45, 14, 'chips', '#e4002b', true, ['nachos', 'cheese']],
    ['Pringles Sour Cream & Onion', 'Pringles', '107 g', 120, 110, 9, 'tube', '#00a651'],
    ["Haldiram's Aloo Bhujia", "Haldiram's", '150 g', 50, 45, 21, 'chips', '#e8a200', true, ['namkeen', 'bhujia']],
    ['Too Yumm Multigrain Chips', 'Too Yumm', '54 g', 20, 20, 0, 'chips', '#7b2d8e'],
    ['Balaji Wafers Masala Masti', 'Balaji', '45 g', 10, 10, 70, 'chips', '#ec1c24']
  ],
  biscuits: [
    ['Parle-G Original Gluco', 'Parle', '250 g', 25, 24, 40, 'biscuit', '#f2b705', true, ['parle g']],
    ['Oreo Chocolate Creme', 'Oreo', '120 g', 35, 32, 33, 'biscuit', '#0058a8', true, ['cookie']],
    ['Sunfeast Dark Fantasy Choco Fills', 'Sunfeast', '75 g', 40, 38, 19, 'biscuit', '#3b1f14', true, ['cookie', 'choco']],
    ['Parle Hide & Seek Choco Chips', 'Parle', '100 g', 35, 30, 27, 'biscuit', '#5b2c1a', true, ['cookie']],
    ['Britannia Good Day Cashew', 'Britannia', '100 g', 20, 20, 45, 'biscuit', '#f7a600'],
    ['Britannia Bourbon', 'Britannia', '150 g', 35, 30, 3, 'biscuit', '#6b3e26', true, ['choco']],
    ['Parle Monaco Classic', 'Parle', '75 g', 10, 10, 50, 'biscuit', '#e31e24', true, ['salted']],
    ['Britannia Marie Gold', 'Britannia', '250 g', 40, 35, 18, 'biscuit', '#d7282f'],
    ['Britannia Treat Jim Jam', 'Britannia', '138 g', 35, 32, 22, 'biscuit', '#e5007e'],
    ['Unibic Choco Chip Cookies', 'Unibic', '75 g', 30, 28, 0, 'biscuit', '#8b4513', true, ['cookie']]
  ],
  cakes: [
    ['Britannia Fruity Fun Cake', 'Britannia', '55 g', 15, 15, 24, 'cake', '#e94e1b'],
    ['Britannia Gobbles Choco Cake', 'Britannia', '60 g', 20, 20, 17, 'cake', '#6a3312', true, ['choco']],
    ['Winkies Chocolate Swiss Roll', 'Winkies', '75 g', 35, 30, 12, 'cake', '#7a4524', true, ['roll']],
    ['Elite Choco Brownie', 'Elite', '45 g', 40, 35, 2, 'cake', '#4a2614', true, ['brownie']],
    ['Monginis Choco Lava Cake', 'Monginis', '70 g', 50, 45, 8, 'cake', '#3a1a0b', false, ['lava']],
    ['Bonn Butter Sponge Cake', 'Bonn', '150 g', 45, 40, 10, 'cake', '#e0a82e']
  ],
  drinks: [
    ['Coca-Cola', 'Coca-Cola', '750 ml', 40, 40, 36, 'bottle', '#e41e2b', true, ['coke', 'cola', 'soda']],
    ['Thums Up', 'Thums Up', '750 ml', 40, 40, 30, 'bottle', '#1d3f8f', true, ['cola', 'soda']],
    ['Sprite', 'Sprite', '750 ml', 40, 40, 28, 'bottle', '#00a651', true, ['lemon', 'soda']],
    ['Limca', 'Limca', '750 ml', 40, 38, 0, 'bottle', '#9cc02a', true, ['lemon', 'soda']],
    ['Maaza Mango Drink', 'Maaza', '600 ml', 42, 40, 20, 'bottle', '#f7941d', true, ['mango', 'juice']],
    ['Pepsi Can', 'Pepsi', '250 ml', 40, 38, 25, 'can', '#004b93', true, ['cola', 'soda']],
    ['Red Bull Energy Drink', 'Red Bull', '250 ml', 125, 120, 15, 'can', '#1e3264', true, ['energy']],
    ['Sting Energy Berry Blast', 'Sting', '250 ml', 20, 20, 44, 'bottle', '#c8102e', true, ['energy']],
    ['Monster Energy Original', 'Monster', '350 ml', 125, 120, 4, 'can', '#2b2b2b', true, ['energy']],
    ['Frooti Mango Drink', 'Frooti', '200 ml', 10, 10, 60, 'tetra', '#7cb518', true, ['mango', 'juice']],
    ['Amul Kool Café', 'Amul', '200 ml', 30, 30, 18, 'can', '#6b4226', true, ['coffee', 'cold coffee']],
    ['Bisleri Mineral Water', 'Bisleri', '1 L', 20, 20, 80, 'bottle', '#1ba1e2', true, ['water']]
  ],
  pasta: [
    ['Maggi Pazzta Cheesy Tomato Twist', 'Maggi', '64 g', 30, 28, 15, 'pasta', '#f5c518', true, ['cheese']],
    ['Maggi Pazzta Masala Penne', 'Maggi', '64 g', 30, 28, 12, 'pasta', '#e2231a'],
    ['Sunfeast Pasta Treat Masala', 'Sunfeast', '70 g', 30, 28, 9, 'pasta', '#ff7a00'],
    ['Weikfield Cheese Macaroni Cup', 'Weikfield', '60 g', 65, 60, 5, 'cup', '#e89b1c', true, ['mac', 'cheese', 'cup']]
  ],
  chocolates: [
    ['Cadbury Dairy Milk', 'Cadbury', '23 g', 20, 20, 70, 'bar', '#4b1a7a', true, ['dairy milk']],
    ['Cadbury Dairy Milk Silk', 'Cadbury', '60 g', 95, 90, 20, 'bar', '#5a1a8a', true, ['silk']],
    ['Nestlé KitKat 4 Finger', 'KitKat', '38 g', 30, 30, 33, 'bar', '#d7141a', true, ['wafer']],
    ['Cadbury 5 Star', 'Cadbury', '40 g', 20, 20, 40, 'bar', '#e6b800', true, ['caramel']],
    ['Snickers Peanut', 'Snickers', '50 g', 50, 50, 12, 'bar', '#5a3825', true, ['peanut']],
    ['Nestlé Munch', 'Munch', '23 g', 10, 10, 55, 'bar', '#e30613', true, ['wafer']],
    ['Cadbury Perk', 'Cadbury', '13 g', 10, 10, 3, 'bar', '#f39200', true, ['wafer']],
    ['Galaxy Smooth Milk', 'Galaxy', '56 g', 95, 90, 11, 'bar', '#6a3410'],
    ['Amul Dark Chocolate 55%', 'Amul', '150 g', 150, 135, 7, 'bar', '#2b1a12', true, ['dark']],
    ['Ferrero Rocher 3 Pieces', 'Ferrero', '37.5 g', 150, 145, 0, 'box', '#b8860b', true, ['hazelnut', 'gift']]
  ]
};

const DESC: Record<string, string> = {
  noodles: 'Sealed pack. Boil, stir, done in a few minutes. Kettle-friendly.',
  chips: 'Sealed pack, crunchy and ready to open.',
  biscuits: 'Sealed pack. Pairs well with late-night chai.',
  cakes: 'Individually packed, shelf-stable cake. Check the date on the pack.',
  drinks: 'Sealed and chilled where possible.',
  pasta: 'Instant pasta with seasoning inside. Ready in about 5 minutes.',
  chocolates: 'Sealed chocolate. Stored cool so it reaches you in shape.',
  combos: 'A bundle picked for tonight, priced lower than buying each item.'
};

const NEW_IDS = new Set([
  'samyang-buldak-hot-chicken-ramen', 'monginis-choco-lava-cake', 'doritos-nacho-cheese',
  'weikfield-cheese-macaroni-cup', 'amul-kool-cafe', 'elite-choco-brownie', 'galaxy-smooth-milk', 'sting-energy-berry-blast'
]);

export function buildProducts(now: number): Product[] {
  const rand = mulberry32(7);
  const out: Product[] = [];
  for (const [categoryId, rows] of Object.entries(ROWS)) {
    for (const [name, brand, unit, mrp, price, stock, shape, color, veg = true, tags = []] of rows) {
      const id = slug(name);
      out.push({
        id, name, brand, categoryId, unit, mrp, price,
        cost: Math.round(price * (0.7 + rand() * 0.12)),
        stock,
        lowStockAt: price > 80 ? 3 : 5,
        veg, active: true, tags,
        popularity: Math.round(20 + rand() * 80),
        createdAt: NEW_IDS.has(id) ? now - Math.round(rand() * 3 * DAY) : now - Math.round((20 + rand() * 120) * DAY),
        color, shape, description: DESC[categoryId]!
      });
    }
  }
  const combos: [string, string, [string, number][]][] = [
    ['Midnight Maggi Kit', '#9b6bff', [['maggi-2-minute-masala-noodles', 2], ['coca-cola', 1], ['cadbury-dairy-milk', 1]]],
    ['Exam Night Survival Pack', '#3ee6ff', [['red-bull-energy-drink', 1], ['lay-s-india-s-magic-masala', 1], ['sunfeast-dark-fantasy-choco-fills', 1], ['nestle-kitkat-4-finger', 1]]],
    ['Movie Marathon Box', '#ff4d8d', [['pringles-sour-cream-and-onion', 1], ['doritos-nacho-cheese', 1], ['pepsi-can', 2], ['cadbury-5-star', 1]]],
    ['Sweet Tooth SOS', '#ffbe3c', [['oreo-chocolate-creme', 1], ['monginis-choco-lava-cake', 1], ['cadbury-dairy-milk-silk', 1]]]
  ];
  const byId = new Map(out.map((p) => [p.id, p]));
  combos.forEach(([name, color, items], i) => {
    const valid = items.filter(([id]) => byId.has(id));
    const mrp = valid.reduce((a, [id, q]) => a + byId.get(id)!.mrp * q, 0);
    const price = Math.round((mrp * 0.86) / 5) * 5 - 1;
    out.push({
      id: slug(name), name, brand: APP.name, categoryId: 'combos',
      unit: `${valid.reduce((a, [, q]) => a + q, 0)} items`,
      mrp, price, cost: Math.round(price * 0.8), stock: [14, 9, 6, 4][i]!, lowStockAt: 3,
      veg: valid.every(([id]) => byId.get(id)!.veg), active: true, tags: ['combo', 'bundle'],
      popularity: 70 + i * 5, createdAt: now - (i + 1) * 4 * DAY, color, shape: 'combo',
      description: DESC.combos!,
      comboItems: valid.map(([productId, qty]) => ({ productId, qty }))
    });
  });
  return out;
}

const BOYS_HOSTELS = 13;
const GIRLS_HOSTELS = 9;

function buildHostels(): Hostel[] {
  const boys: Hostel[] = Array.from({ length: BOYS_HOSTELS }, (_, i) => ({
    id: `bh${i + 1}`,
    name: `Boys Hostel ${i + 1}`,
    short: `BH-${i + 1}`,
    blocks: ['A', 'B', 'C'],
    active: true
  }));
  const girls: Hostel[] = Array.from({ length: GIRLS_HOSTELS }, (_, i) => ({
    id: `gh${i + 1}`,
    name: `Girls Hostel ${i + 1}`,
    short: `GH-${i + 1}`,
    blocks: ['A', 'B', 'C'],
    active: true
  }));
  return [...boys, ...girls];
}

export const defaultSettings: StoreSettings = {
  mode: 'auto',
  openTime: '21:00',
  closeTime: '02:00',
  deliveryFee: 15,
  convenienceFee: 5,
  minOrderValue: 50,
  etaMin: 10,
  etaMax: 15,
  hostels: buildHostels()
};

const PEOPLE: [string, string, string][] = [
  [APP.demoUserPhone, 'Dev Patel', 'bh1'],
  ['9810011223', 'Aarav Sharma', 'bh1'],
  ['9820022334', 'Priya Nair', 'gh1'],
  ['9830033445', 'Rohan Gupta', 'bh2'],
  ['9840044556', 'Ananya Singh', 'gh1'],
  ['9850055667', 'Kabir Mehta', 'bh1'],
  ['9860066778', 'Ishita Verma', 'gh2'],
  ['9870077889', 'Arjun Reddy', 'bh2'],
  ['9880088990', 'Sneha Kulkarni', 'gh1'],
  ['9890099001', 'Vikram Chauhan', 'bh1'],
  ['9800101112', 'Meera Iyer', 'gh2'],
  ['9811112223', 'Aditya Joshi', 'bh2'],
  ['9822223334', 'Tanvi Bansal', 'gh1'],
  ['9833334445', 'Harsh Malhotra', 'bh1'],
  ['9844445556', 'Riya Kapoor', 'gh2']
];

export function buildCustomers(now: number): Customer[] {
  const rand = mulberry32(11);
  return PEOPLE.map(([phone, name, hostelId], i) => {
    const hostel = defaultSettings.hostels.find((h) => h.id === hostelId)!;
    const block = i === 0 ? 'B' : hostel.blocks[Math.floor(rand() * hostel.blocks.length)]!;
    const room = i === 0 ? '214' : String(100 + Math.floor(rand() * 350));
    const addrId = `addr_${phone}`;
    return {
      id: phone, name, phone,
      addresses: [{ id: addrId, label: 'My room', hostelId, block, room }],
      defaultAddressId: addrId,
      blocked: i === 14,
      joinedAt: now - (30 + Math.floor(rand() * 200)) * DAY
    };
  });
}

const COMMENTS = [
  'Came in 8 minutes, unreal.', 'Maggi at 1 AM saved my assignment.', 'Cold drink was actually cold!',
  'Rider called before coming, nice.', 'One chips packet was a bit crushed.', 'Best thing on campus.',
  'Could use more energy drink options.', ''
];

export function buildOrders(now: number, products: Product[], customers: Customer[]): Order[] {
  const rand = mulberry32(42);
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)]!;
  const pool = products.filter((p) => p.categoryId !== 'combos');
  const combos = products.filter((p) => p.categoryId === 'combos');
  const active = customers.filter((c) => !c.blocked);
  const [nightStart, nightEnd] = latestNight(now, defaultSettings);
  const orders: Order[] = [];
  let seq = 48000;

  const make = (createdAt: number, status: OrderStatus, cust: Customer, rated = false): Order => {
    const count = 1 + Math.floor(rand() * 4);
    const chosen = new Map<string, number>();
    for (let i = 0; i < count; i++) {
      const p = rand() < 0.12 ? pick(combos) : pick(pool);
      chosen.set(p.id, Math.min(3, (chosen.get(p.id) ?? 0) + 1 + (rand() < 0.2 ? 1 : 0)));
    }
    const items: OrderItem[] = [...chosen].map(([id, qty]) => {
      const p = products.find((x) => x.id === id)!;
      return { productId: id, name: p.name, unit: p.unit, price: p.price, mrp: p.mrp, qty };
    });
    const { bill } = computeBill(items, defaultSettings);
    const flow: OrderStatus[] = ['placed', 'accepted', 'packing', 'out_for_delivery', 'delivered'];
    const upto = status === 'cancelled' ? 1 : flow.indexOf(status) + 1;
    const gaps = [0, 1.5, 3, 5, 6];
    const history = flow.slice(0, upto).map((s, i) => ({ status: s, at: createdAt + gaps.slice(0, i + 1).reduce((a, b) => a + b, 0) * MIN }));
    if (status === 'cancelled') history.push({ status: 'cancelled', at: createdAt + 2 * MIN });
    const addr = cust.addresses[0]!;
    const orderSeq = seq++;
    const order: Order = {
      id: `NO${orderSeq}`,
      shortCode: String(orderSeq % 10000).padStart(4, '0'),
      userId: cust.id, customerName: cust.name, phone: cust.phone,
      address: addr, items, bill,
      instructions: rand() < 0.3 ? pick(['Call on arrival', "Don't knock, roommate asleep", 'Leave at the door', 'Ring twice']) : '',
      status, createdAt, updatedAt: history[history.length - 1]!.at, history,
      etaMinutes: 10 + Math.floor(rand() * 6),
      paymentMode: 'pay_on_delivery',
      ...(status === 'cancelled'
        ? { cancelReason: pick(['Item went out of stock', 'Customer not reachable', 'Changed my mind']), cancelledBy: pick(['user', 'store'] as const) }
        : {})
    };
    if (rated && status === 'delivered') {
      const stars = rand() < 0.75 ? 5 : rand() < 0.6 ? 4 : 3;
      order.rating = {
        order: stars,
        items: Object.fromEntries(items.map((it) => [it.productId, Math.max(3, stars - (rand() < 0.2 ? 1 : 0))])),
        comment: pick(COMMENTS) || undefined,
        at: order.updatedAt + 10 * MIN
      };
    }
    return order;
  };

  // Last seven nights
  for (let k = 7; k >= 1; k--) {
    const start = nightStart - k * DAY;
    const n = 14 + Math.floor(rand() * 16) + (k % 3 === 0 ? 8 : 0);
    for (let i = 0; i < n; i++) {
      const t = start + Math.pow(rand(), 0.8) * 4.8 * HOUR;
      const cust = k <= 3 && i === 0 ? active[0]! : pick(active);
      orders.push(make(t, rand() < 0.07 ? 'cancelled' : 'delivered', cust, rand() < 0.45));
    }
  }

  // Tonight (or the most recent night)
  const endRef = Math.min(now, nightEnd);
  const span = Math.max(40 * MIN, endRef - nightStart);
  for (let i = 0; i < 11; i++) {
    const t = nightStart + (i / 12) * (span - 25 * MIN);
    orders.push(make(t, i === 4 ? 'cancelled' : 'delivered', i === 6 ? active[0]! : pick(active), rand() < 0.4));
  }
  const live: [OrderStatus, number][] = [['out_for_delivery', 16], ['packing', 9], ['accepted', 5], ['placed', 2], ['placed', 1]];
  live.forEach(([s, ago]) => orders.push(make(endRef - ago * MIN, s, pick(active.slice(1)))));

  return orders.sort((a, b) => b.createdAt - a.createdAt);
}

export function buildCoupons(now: number): Coupon[] {
  return [
    { code: 'NIGHTOWL20', description: '20% off, up to ₹60', type: 'percent', value: 20, maxDiscount: 60, minOrder: 149, usageLimit: 500, used: 132, expiresAt: now + 30 * DAY, active: true },
    { code: 'MAGGI10', description: '₹10 off any order above ₹79', type: 'flat', value: 10, minOrder: 79, usageLimit: 1000, used: 410, expiresAt: now + 60 * DAY, active: true },
    { code: 'FIRSTBITE', description: '₹40 off your order above ₹199', type: 'flat', value: 40, minOrder: 199, usageLimit: 300, used: 88, expiresAt: now + 14 * DAY, active: true },
    { code: 'EXAMWEEK', description: '15% off, up to ₹45', type: 'percent', value: 15, maxDiscount: 45, minOrder: 99, usageLimit: 200, used: 200, expiresAt: now + 5 * DAY, active: true },
    { code: 'DIWALI50', description: '₹50 off above ₹249', type: 'flat', value: 50, minOrder: 249, usageLimit: 100, used: 64, expiresAt: now - 3 * DAY, active: true },
    { code: '2AMCRAVE', description: '25% off, up to ₹75', type: 'percent', value: 25, maxDiscount: 75, minOrder: 199, usageLimit: 150, used: 0, expiresAt: now + 20 * DAY, active: false }
  ];
}

export const seedBanners: Banner[] = [
  { id: 'b1', title: 'Maggi o’clock', subtitle: 'Midnight Maggi Kit, now ₹15 cheaper than buying separately', cta: 'Grab the kit', link: '/c/combos', tone: 'violet', emoji: '🍜', active: true, order: 0 },
  { id: 'b2', title: 'Exam week fuel', subtitle: 'Energy drinks and brain food, at your door in 15 min', cta: 'Stock up', link: '/c/drinks', tone: 'cyan', emoji: '⚡', active: true, order: 1 },
  { id: 'b3', title: '20% off tonight', subtitle: 'Use NIGHTOWL20 on orders above ₹149', cta: 'Start shopping', link: '/search', tone: 'lime', emoji: '🦉', active: true, order: 2 },
  { id: 'b4', title: 'Sweet tooth SOS', subtitle: 'Lava cakes and Silk bars, packed cool', cta: 'Treat yourself', link: '/c/chocolates', tone: 'pink', emoji: '🍫', active: true, order: 3 }
];

export function buildFeed(now: number): { feed: AppNotification[]; broadcasts: BroadcastLog[] } {
  const b: BroadcastLog = {
    id: 'bc_welcome', title: 'New tonight: Buldak ramen 🔥', body: 'Samyang Buldak just landed. Limited packs, spice at your own risk.',
    type: 'offer', hostelIds: null, at: now - 5 * HOUR, by: 'Store Owner'
  };
  return {
    broadcasts: [b],
    feed: [{ id: b.id, type: 'offer', title: b.title, body: b.body, at: b.at, audience: { kind: 'all' }, link: '/c/noodles' }]
  };
}
