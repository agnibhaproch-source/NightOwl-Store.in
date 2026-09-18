import { create } from 'zustand';

export type ToastTone = 'default' | 'success' | 'error' | 'info';
export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
  emoji?: string;
  action?: { label: string; onClick: () => void };
  duration: number;
}

let seq = 0;
export const useToasts = create<{ list: Toast[]; dismiss: (id: number) => void }>((set) => ({
  list: [],
  dismiss: (id) => set((s) => ({ list: s.list.filter((t) => t.id !== id) }))
}));

export function toast(t: Partial<Omit<Toast, 'id'>> & { title: string }) {
  const id = ++seq;
  const item: Toast = { tone: 'default', duration: t.action ? 5000 : 3200, ...t, id };
  useToasts.setState((s) => ({ list: [...s.list.slice(-3), item] }));
  setTimeout(() => useToasts.getState().dismiss(id), item.duration);
  return id;
}
toast.success = (title: string, body?: string) => toast({ title, body, tone: 'success' });
toast.error = (title: string, body?: string) => toast({ title, body, tone: 'error', duration: 4500 });
