import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NotifType } from '@/shared/types';

export type NotifPrefs = Record<NotifType, boolean>;

interface SessionState {
  userId: string | null;
  onboarded: boolean;
  recentSearches: string[];
  favorites: string[];
  readIds: string[];
  clearedBefore: number;
  prefs: NotifPrefs;
  notifyWhenOpen: boolean;
  login: (id: string) => void;
  logout: () => void;
  finishOnboarding: () => void;
  addSearch: (q: string) => void;
  clearSearches: () => void;
  toggleFavorite: (id: string) => boolean;
  markRead: (ids: string[]) => void;
  clearNotifications: () => void;
  setPref: (k: NotifType, v: boolean) => void;
  setNotifyWhenOpen: (v: boolean) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      userId: null,
      onboarded: false,
      recentSearches: [],
      favorites: [],
      readIds: [],
      clearedBefore: 0,
      prefs: { order: true, store: true, stock: true, offer: true, broadcast: true },
      notifyWhenOpen: false,
      login: (id) => set({ userId: id }),
      logout: () => set({ userId: null, readIds: [] }),
      finishOnboarding: () => set({ onboarded: true }),
      addSearch: (q) => {
        const t = q.trim();
        if (t.length < 2) return;
        set({ recentSearches: [t, ...get().recentSearches.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8) });
      },
      clearSearches: () => set({ recentSearches: [] }),
      toggleFavorite: (id) => {
        const has = get().favorites.includes(id);
        set({ favorites: has ? get().favorites.filter((x) => x !== id) : [id, ...get().favorites] });
        return !has;
      },
      markRead: (ids) => set({ readIds: [...new Set([...ids, ...get().readIds])].slice(0, 500) }),
      clearNotifications: () => set({ clearedBefore: Date.now() }),
      setPref: (k, v) => set({ prefs: { ...get().prefs, [k]: v } }),
      setNotifyWhenOpen: (v) => set({ notifyWhenOpen: v })
    }),
    { name: 'no:user-session' }
  )
);
