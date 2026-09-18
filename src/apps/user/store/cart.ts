import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartState {
  lines: Record<string, number>;
  couponCode: string | null;
  instructions: string;
  addressId: string | null;
  add: (id: string, max: number) => 'added' | 'max';
  dec: (id: string) => void;
  remove: (id: string) => number;
  setQty: (id: string, qty: number) => void;
  applyCoupon: (code: string | null) => void;
  setInstructions: (s: string) => void;
  setAddress: (id: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: {},
      couponCode: null,
      instructions: '',
      addressId: null,
      add: (id, max) => {
        const cur = get().lines[id] ?? 0;
        if (cur >= max) return 'max';
        set({ lines: { ...get().lines, [id]: cur + 1 } });
        return 'added';
      },
      dec: (id) => {
        const cur = get().lines[id] ?? 0;
        const lines = { ...get().lines };
        if (cur <= 1) delete lines[id];
        else lines[id] = cur - 1;
        set({ lines });
      },
      remove: (id) => {
        const prev = get().lines[id] ?? 0;
        const lines = { ...get().lines };
        delete lines[id];
        set({ lines });
        return prev;
      },
      setQty: (id, qty) => {
        const lines = { ...get().lines };
        if (qty <= 0) delete lines[id];
        else lines[id] = qty;
        set({ lines });
      },
      applyCoupon: (code) => set({ couponCode: code }),
      setInstructions: (instructions) => set({ instructions }),
      setAddress: (addressId) => set({ addressId }),
      clear: () => set({ lines: {}, couponCode: null, instructions: '' })
    }),
    { name: 'no:cart' }
  )
);

export const cartCount = (lines: Record<string, number>) => Object.values(lines).reduce((a, b) => a + b, 0);
