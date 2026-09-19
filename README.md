<<<<<<< HEAD
# NightOwl
For late night cravings ...
=======
# 🦉 NightOwl — late-night hostel snack delivery

A production-quality **frontend** for a Blinkit-style late-night delivery service that runs inside a
college campus. Packaged snacks only — instant noodles, chips, biscuits, cakes, cold drinks, pasta,
chocolate and combos — from **9:00 PM to 2:00 AM**, delivered to a hostel block and room number.

Two apps, one codebase, one domain:

| App | Route | Who it's for |
| --- | --- | --- |
| **Customer app** | `/` | Students: browse, order, track, reorder |
| **Store admin** | `/admin` | Owner + staff: orders, stock, catalogue, store controls, reports |

Every admin action lands in the customer app instantly (and vice-versa), across tabs.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173  (admin at /admin)
```

```bash
npm run build        # type-check + production build to dist/
npm run preview      # serve the built app
npm run typecheck    # tsc --noEmit
```

Node 18+ recommended.

### Demo logins

| | Credentials |
| --- | --- |
| Customer | phone `9876543210` — the 4-digit OTP is shown in a toast (no SMS is sent) |
| Admin (owner) | `owner@nightowl.app` / `owner123` |
| Admin (staff) | `staff@nightowl.app` / `staff123` |

Staff see orders, stock and reviews. Owner also gets store controls, categories, combos, coupons,
banners, broadcast, customers and reports.

### Seeing it come alive

1. Open `/` in one tab and `/admin/orders` in another.
2. The store is closed outside 9 PM – 2 AM, so in **Store controls → Force open** flip the store open.
3. Order something in the customer tab → the admin tab chimes, flashes its title and shows the card.
4. Drag the card across the Kanban → the customer's tracking screen and timeline update live.
5. Or press **Test order** in admin to simulate a customer order.

---

## Tech

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** with CSS-variable theming (dark default, light theme, `prefers-reduced-motion`)
- **Framer Motion** for transitions, shared-layout, drag and reorder; **Lenis** for smooth scroll
- **Zustand** (+ `persist`) for cart, session and UI state
- **Recharts** for admin charts, **Lucide** for icons
- **vite-plugin-pwa** — installable, offline-capable, with a notification-click service worker
- No backend, no payment gateway, no maps. Product art is generated SVG (`PackShot`), so there are
  zero external image requests; admins can upload a photo to override it.

### Design

Dark-first "night shift" palette (`#08080d` base, violet / cyan / lime accents), Bricolage Grotesque +
Onest, glass surfaces, morphing blobs, staggered scroll reveals, fly-to-cart, morphing ADD→stepper,
skeletons, and a signature **NightDial** — a half-dial clock of the 9 PM → 2 AM night with a moon
marker and a live countdown. All animation is transform/opacity only and switches off under
`prefers-reduced-motion`.

---

## Folder structure

```
src/
├─ main.tsx                  # picks UserApp (/) or AdminApp (/admin/*), both lazy
├─ shared/                   # everything both apps use
│  ├─ types.ts               # the whole domain model (single source of truth)
│  ├─ config/app.ts          # brand, support details, demo credentials
│  ├─ styles.css             # theme variables + component classes
│  ├─ data/seed.ts           # demo catalogue, customers, 7 nights of orders
│  ├─ services/              # ← the swap point (see below)
│  │  ├─ contracts.ts        # service interfaces (watch* + mutations)
│  │  ├─ mock.ts             # localStorage implementation
│  │  └─ index.ts            # exports the active implementation
│  ├─ lib/                   # bill maths, store hours, fuzzy search, csv, sound, notifications
│  ├─ hooks/                 # live data hooks, store status, lenis, misc
│  ├─ store/                 # theme, toasts, confirm dialog
│  └─ ui/                    # buttons, sheets, drawers, badges, NightDial, PackShot…
├─ apps/
│  ├─ user/
│  │  ├─ UserApp.tsx         # splash, chrome, routes, page transitions
│  │  ├─ pages/              # Home, Category, Search, Cart, Orders, Profile, …
│  │  ├─ components/         # ProductCard, ProductSheet, CartBar, Filters, …
│  │  └─ store/              # cart, session (favourites, notif prefs, recents)
│  └─ admin/
│     ├─ AdminApp.tsx        # login gate, owner-only routes, global drawers
│     ├─ pages/              # Dashboard, Orders, Products, StoreControls, Reports, …
│     ├─ components/         # Layout, CommandPalette, OrderDrawer, ProductEditor, …
│     └─ store/              # admin session, cross-page UI state
└─ public/                   # icons, favicon, sw-notify.js
```

---

## Feature map

**Customer** — splash + 3-slide onboarding · phone OTP login (mocked) · saved rooms
(hostel → block → room, no maps) · live open/closed banner with countdown and "notify me when we
open" · browse while closed · home hero, rotating banners, category grid, rails (Trending tonight,
Midnight combos, Under ₹50, Buy again, New arrivals) · instant search with suggestions, recents and
typo tolerance · filters + sort · product sheet with related and frequently-bought-together ·
favourites · sticky cart bar with fly-to-cart · cart with undo, coupons + celebration, free-delivery
progress, delivery instructions, live bill from admin-configurable fees · pay-on-delivery checkout ·
animated success screen · live tracking timeline with ETA countdown, cancel and rating · order
history and one-tap reorder · notification centre with unread badge, per-type preferences and system
push · help/FAQ, terms, privacy · empty, offline and error states · pull-to-refresh · installable PWA.

**Admin** — role-based login · dashboard KPIs with night-over-night deltas, orders-per-hour, top
items, category split, 7-night trend, live queue and restock list · Kanban of live orders with
drag-and-drop, sound + title-flash alerts, accept/reject with reason, order drawer, printable and
downloadable packing slips, list view with filters · inventory table with inline stock stepping,
bulk stock/visibility, duplicate, CSV export and a full product editor (cost → margin, pack art,
photo upload, tags, low-stock threshold) · category manager with drag reordering · combo builder ·
store controls (force open/close, hours, every fee and threshold, ETA, serviceable hostels, live bill
preview) · coupons · home banners with reordering and live preview · broadcast composer targeted to
everyone or specific hostels, with history · customers with stats, per-customer order history,
direct message and block/unblock · ratings and reviews with item-level averages · sales reports with
date ranges and CSV exports · ⌘K command palette · collapsible sidebar · dark/light · toasts and
confirm modals throughout.

---

## Swapping the mock layer for Firebase

The UI never touches storage directly — it only imports `services` from `src/shared/services` and
the `use*` hooks in `src/shared/hooks/live.ts`. `contracts.ts` was written to map 1:1 onto Firestore:
every `watch*` method takes a callback and returns an unsubscribe function, exactly like
`onSnapshot`; every mutation returns a `Promise` and throws `ServiceError` with a user-facing message.

1. `npm i firebase`, then add `src/shared/services/firebase.ts` implementing the `Services` interface:

   ```ts
   export const firebaseServices: Services = {
     products: {
       watchProducts: (cb) => onSnapshot(collection(db, 'products'), (s) => cb(s.docs.map(d => d.data() as Product))),
       saveProduct: async (p) => { await setDoc(doc(db, 'products', p.id), p); return p; },
       // …
     },
     // orders, inventory, settings, coupons, banners, customers, notifications, auth, system
   };
   ```

2. Point the export at it:

   ```ts
   // src/shared/services/index.ts
   export const services: Services = import.meta.env.VITE_USE_FIREBASE ? firebaseServices : mockServices;
   ```

3. Suggested collections: `products`, `categories`, `orders`, `customers`, `coupons`, `banners`,
   `notifications`, `broadcasts`, `stockAlerts`, and a single `settings/store` document.
4. Replace `auth.requestOtp` / `verifyOtp` with Firebase Phone Auth and `adminLogin` with Email/Password
   plus a `role` custom claim (the UI already branches on `owner` vs `staff`).
5. Move order placement into a Cloud Function or a transaction: it validates the coupon, recomputes the
   bill with `computeBill()` (reuse `src/shared/lib/bill.ts` server-side), and decrements stock atomically.
   The mock implementation does all three in one place, so it reads like the spec for that function.
6. `system.refresh()` becomes a no-op and `db.ts`'s BroadcastChannel sync can be deleted — snapshots
   are already live across devices.

Nothing in `src/apps/**` needs to change.

---

## Notes and deliberate limits

- **No payments.** Checkout ends at "Place order" with pay-on-delivery. The payment step slots into
  `Cart.tsx` where the payment card is rendered.
- **No cooked food**, so no kitchen/prep states — the flow is placed → accepted → packing → out for
  delivery → delivered, plus cancellation from either side.
- **Data lives in `localStorage`** under the `no:db:*` keys and is seeded on first run. To start over,
  clear site data, or run `nightowl.resetDemo()` in the browser console.
- Notification permission is requested only after a user action, and system pings respect the
  per-type preferences in Settings → Notifications.
- Accessibility: keyboard-reachable everything, visible focus rings, 44px touch targets, `aria-live`
  on order status and search results, labelled icon buttons, and WCAG-AA contrast in both themes.

Built as a frontend showcase — hand it a real backend and it ships.
>>>>>>> dd0bdc1 (hi)
