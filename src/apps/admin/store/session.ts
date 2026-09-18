import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminSession } from '@/shared/types';

interface State {
  session: AdminSession | null;
  collapsed: boolean;
  sound: boolean;
  lastSeenOrderAt: number;
  login: (s: AdminSession) => void;
  logout: () => void;
  toggleCollapsed: () => void;
  setSound: (v: boolean) => void;
  seeOrders: (at: number) => void;
}

export const useAdmin = create<State>()(
  persist(
    (set) => ({
      session: null,
      collapsed: false,
      sound: true,
      lastSeenOrderAt: 0,
      login: (session) => set({ session }),
      logout: () => set({ session: null }),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setSound: (sound) => set({ sound }),
      seeOrders: (at) => set((s) => ({ lastSeenOrderAt: Math.max(s.lastSeenOrderAt, at) }))
    }),
    { name: 'no:admin-session' }
  )
);

export const useIsOwner = () => useAdmin((s) => s.session?.role === 'owner');
