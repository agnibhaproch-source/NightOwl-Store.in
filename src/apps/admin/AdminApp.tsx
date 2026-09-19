import { Suspense, lazy, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/shared/lib/firebase';
import { motion } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from '@/shared/ui';
import { BootScreen } from '@/shared/ui/BootScreen';
import { useLenis } from '@/shared/hooks/lenis';
import { APP } from '@/shared/config/app';
import { useAdmin } from './store/session';
import { AdminLayout } from './components/Layout';
import { CommandPalette } from './components/CommandPalette';
import { OrderDrawer } from './components/OrderDrawer';
import { AssignRiderSheet } from './components/AssignRiderSheet';
import { NewOrderWatcher } from './components/NewOrderWatcher';
import { ProductEditorHost } from './components/ProductEditor';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Orders = lazy(() => import('./pages/Orders'));
const Products = lazy(() => import('./pages/Products'));
const WalletTopups = lazy(() => import('./pages/WalletTopups'));
const Riders = lazy(() => import('./pages/Riders'));
const Categories = lazy(() => import('./pages/Categories'));
const Combos = lazy(() => import('./pages/Combos'));
const StoreControls = lazy(() => import('./pages/StoreControls'));
const Coupons = lazy(() => import('./pages/Coupons'));
const Banners = lazy(() => import('./pages/Banners'));
const Broadcast = lazy(() => import('./pages/Broadcast'));
const Customers = lazy(() => import('./pages/Customers'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Reports = lazy(() => import('./pages/Reports'));

function OwnerOnly({ children }: { children: JSX.Element }) {
  const owner = useAdmin((s) => s.session?.role === 'owner');
  return owner ? children : <Navigate to="/admin" replace />;
}

/** True only while Firebase itself says the signed-in user is a store admin (a forged local session doesn't count). */
function useIsRealAdmin() {
  const [state, setState] = useState<'checking' | 'yes' | 'no'>('checking');
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (!u) return;
        setState(u.isAnonymous || !APP.adminAccounts.some((a) => a.uid === u.uid) ? 'no' : 'yes');
      }),
    []
  );
  return state;
}

export default function AdminApp() {
  const storedSession = useAdmin((s) => s.session);
  const realAdmin = useIsRealAdmin();
  const session = realAdmin === 'yes' ? storedSession : null;
  const location = useLocation();
  useLenis(true);

  useEffect(() => {
    document.title = `${APP.name} Admin`;
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'no:admin-session') void useAdmin.persist.rehydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!session)
    return (
      <>
        <Login />
        <Toaster top />
      </>
    );

  return (
    <>
      <AdminLayout>
        <Suspense fallback={<BootScreen />}>
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Routes location={location}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="products" element={<Products />} />
              <Route path="wallet" element={<WalletTopups />} />
              <Route path="riders" element={<Riders />} />
              <Route path="categories" element={<OwnerOnly><Categories /></OwnerOnly>} />
              <Route path="combos" element={<OwnerOnly><Combos /></OwnerOnly>} />
              <Route path="store" element={<OwnerOnly><StoreControls /></OwnerOnly>} />
              <Route path="coupons" element={<OwnerOnly><Coupons /></OwnerOnly>} />
              <Route path="banners" element={<OwnerOnly><Banners /></OwnerOnly>} />
              <Route path="broadcast" element={<OwnerOnly><Broadcast /></OwnerOnly>} />
              <Route path="customers" element={<OwnerOnly><Customers /></OwnerOnly>} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="reports" element={<OwnerOnly><Reports /></OwnerOnly>} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </motion.div>
        </Suspense>
      </AdminLayout>
      <CommandPalette />
      <OrderDrawer />
      <AssignRiderSheet />
      <ProductEditorHost />
      <NewOrderWatcher />
      <Toaster />
    </>
  );
}
