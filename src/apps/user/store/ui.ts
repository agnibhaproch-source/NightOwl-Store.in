import { create } from 'zustand';

export interface Flyer { id: number; x: number; y: number; productId: string }

interface UiState {
  sheetProductId: string | null;
  flyers: Flyer[];
  cartPulse: number;
  openProduct: (id: string | null) => void;
  fly: (productId: string, from: DOMRect) => void;
  land: (id: number) => void;
}

let seq = 0;
export const useUi = create<UiState>((set) => ({
  sheetProductId: null,
  flyers: [],
  cartPulse: 0,
  openProduct: (id) => set({ sheetProductId: id }),
  fly: (productId, r) =>
    set((s) => ({ flyers: [...s.flyers, { id: ++seq, productId, x: r.left + r.width / 2, y: r.top + r.height / 2 }] })),
  land: (id) => set((s) => ({ flyers: s.flyers.filter((f) => f.id !== id), cartPulse: s.cartPulse + 1 }))
}));
