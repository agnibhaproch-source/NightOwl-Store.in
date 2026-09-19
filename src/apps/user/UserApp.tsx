import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { useLenis, scrollToTop } from '@/shared/hooks/lenis';
import { useOnline } from '@/shared/hooks/misc';
import { Blobs, Logo, Toaster } from '@/shared/ui';
import { BootScreen } from '@/shared/ui/BootScreen';
import { APP } from '@/shared/config/app';
import { BottomNav, TopNav } from './components/Nav';
import { CartBar } from './components/CartBar';
import { FlyLayer } from './components/FlyLayer';
import { ProductSheet } from './components/ProductSheet';
import { StoreBanner } from './components/StoreBanner';
import { NotificationBridge } from './components/NotificationBridge';
import { IosInstallBanner } from './components/IosInstallBanner';
import { ReceiverPrompt } from './components/ReceiverPrompt';
import { ActiveOrderBar } from './components/ActiveOrderBar';
import { PullToRefresh } from './components/PullToRefresh';
import { useSession } from './store/session';
import { useCart } from './store/cart';
import Home from './pages/Home';

const Welcome = lazy(() => import('./pages/Welcome'));
const Login = lazy(() => import('./pages/Login'));
const CategoryPage = lazy(() => import('./pages/Category'));
const Search = lazy(() => import('./pages/Search'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const GetApp = lazy(() => import('./pages/GetApp'));
const Support = lazy(() => import('./pages/Support'));
const Settings = lazy(() => import('./pages/Settings'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Addresses = lazy(() => import('./pages/Addresses'));
const Notifications = lazy(() => import('./pages/Notifications'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Help = lazy(() => import('./pages/Help'));
const Legal = lazy(() => import('./pages/Legal'));
const NotFound = lazy(() => import('./pages/NotFound'));

const CHROMELESS = ['/welcome', '/login', '/order-success', '/checkout'];

function Splash({ onDone }: { onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => done.current(), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.div
      className="fixed inset-0 z-[100] grid place-items-center bg-bg"
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      aria-label={`${APP.name} is loading`}
      role="status"
    >
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.4, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          className="relative"
        >
          <motion.div
            className="absolute inset-0 rounded-[30px]"
            style={{ boxShadow: '0 0 80px 10px rgb(var(--violet) / .45)' }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <Logo size={104} withText={false} />
        </motion.div>
        <motion.h1
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-6 font-display text-4xl font-extrabold tracking-tight"
        >
          {APP.name}
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-1 text-muted">
          {APP.tagline}
        </motion.p>
      </div>
    </motion.div>
  );
}

function OfflineBanner() {
  const online = useOnline();
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          className="overflow-hidden bg-fg text-bg"
          role="alert"
        >
          <p className="flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold">
            <WifiOff className="h-4 w-4" /> You're offline. Showing what we saved, orders will need a connection.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Keep the cart honest across tabs: zustand persist does not listen to storage events by itself. */
function useCrossTabStores() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'no:cart') void useCart.persist.rehydrate();
      if (e.key === 'no:user-session') void useSession.persist.rehydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
}

export default function UserApp() {
  const location = useLocation();
  const onboarded = useSession((s) => s.onboarded);
  const [splash, setSplash] = useState(() => !sessionStorage.getItem('no:splash'));
  const chromeless = CHROMELESS.some((p) => location.pathname.startsWith(p));
  useLenis(true);
  useCrossTabStores();

  useEffect(() => {
    scrollToTop();
  }, [location.pathname]);

  useEffect(() => {
    document.title = `${APP.name} · ${APP.tagline}`;
  }, []);

  if (!onboarded && location.pathname !== '/welcome' && location.pathname !== '/login') {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <div className="relative min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-xl focus:bg-fg focus:px-4 focus:py-2 focus:text-bg">
        Skip to content
      </a>
      <Blobs />
      <OfflineBanner />
      {!chromeless && (
        <>
          <TopNav />
          <StoreBanner />
        </>
      )}
      <PullToRefresh>
        <Suspense fallback={<BootScreen />}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/c/:id" element={<CategoryPage />} />
              <Route path="/search" element={<Search />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/get-app" element={<GetApp />} />
              <Route path="/support" element={<Support />} />
              <Route path="/wallet" element={<Navigate to="/" replace />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/order-success/:id" element={<OrderSuccess />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/addresses" element={<Addresses />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings/notifications" element={<NotificationSettings />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/help" element={<Help />} />
              <Route path="/legal/:doc" element={<Legal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </Suspense>
      </PullToRefresh>
      {!chromeless && (
        <>
          <ReceiverPrompt />
          <IosInstallBanner />
          <ActiveOrderBar />
          <CartBar />
          <BottomNav />
        </>
      )}
      <ProductSheet />
      <FlyLayer />
      <NotificationBridge />
      <Toaster offsetBottom={!chromeless} top={chromeless} />
      <AnimatePresence>
        {splash && (
          <Splash
            onDone={() => {
              sessionStorage.setItem('no:splash', '1');
              setSplash(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
