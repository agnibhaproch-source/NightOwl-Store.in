import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'default';
  input?: { label: string; placeholder?: string; options?: string[]; required?: boolean };
}

interface State {
  open: (ConfirmOptions & { resolve: (v: { ok: boolean; value: string }) => void }) | null;
}

export const useConfirmStore = create<State>(() => ({ open: null }));

/** Promise-based confirmation modal. Resolves { ok, value }. */
export function confirmDialog(o: ConfirmOptions) {
  return new Promise<{ ok: boolean; value: string }>((resolve) => {
    useConfirmStore.setState({ open: { ...o, resolve } });
  });
}
