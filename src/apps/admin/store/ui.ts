import { create } from 'zustand';

/** Cross-page admin UI: the order drawer and product editor can be opened from anywhere (e.g. ⌘K). */
export const useAdminUi = create<{
  orderId: string | null;
  productId: string | null;
  assignOrderId: string | null;
  openOrder: (id: string | null) => void;
  editProduct: (id: string | null) => void;
  openAssign: (id: string | null) => void;
}>((set) => ({
  orderId: null,
  productId: null,
  assignOrderId: null,
  openOrder: (orderId) => set({ orderId }),
  editProduct: (productId) => set({ productId }),
  openAssign: (assignOrderId) => set({ assignOrderId })
}));
