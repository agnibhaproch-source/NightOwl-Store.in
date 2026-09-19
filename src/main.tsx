import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { registerSW } from 'virtual:pwa-register';

import '@/shared/lib/firebase';
import { isNative } from '@/shared/lib/native';
import { services } from '@/shared/services';
import { ConfirmHost } from '@/shared/ui';
import { BootScreen } from '@/shared/ui/BootScreen';
import '@/shared/store/theme';
import '@/shared/styles.css';

/*
 * Make sure the demo/local data is initialized.
 */
services.system.ensureSeed();

/*
 * Handy development tools available in the browser console.
 *
 * Example:
 *   nightowl.resetDemo()
 *
 * This clears local NightOwl data and reloads the app.
 */
(window as unknown as { nightowl: unknown }).nightowl = {
  services,

  resetDemo: () => {
    services.system.resetDemo();
    location.reload();
  },
};

/*
 * Lazy-load the two NightOwl applications.
 */
const UserApp = lazy(
  () => import('@/apps/user/UserApp')
);

const RiderApp = lazy(
  () => import('@/apps/rider/RiderApp')
);

const AdminApp = lazy(
  () => import('@/apps/admin/AdminApp')
);

/*
 * Register the PWA service worker only in production.
 */
if (
  'serviceWorker' in navigator &&
  import.meta.env.PROD &&
  !isNative
) {
  registerSW({
    immediate: true,
  });
}

/*
 * Start the NightOwl application.
 */
createRoot(
  document.getElementById('root')!
).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Suspense fallback={<BootScreen />}>
          <Routes>
            {/* Admin application */}
            <Route
              path="/admin/*"
              element={<AdminApp />}
            />

            {/* Rider application */}
            <Route
              path="/rider/*"
              element={<RiderApp />}
            />

            {/* User application */}
            <Route
              path="/*"
              element={<UserApp />}
            />
          </Routes>
        </Suspense>

        {/* Global confirmation dialog */}
        <ConfirmHost />
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>
);