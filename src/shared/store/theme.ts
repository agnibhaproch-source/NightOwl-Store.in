import { create } from 'zustand';

type Theme = 'dark' | 'light';
const KEY = 'no:theme';

const read = (): Theme => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '"dark"') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#08080d' : '#f6f5fb');
}

export const useTheme = create<{ theme: Theme; toggle: () => void; set: (t: Theme) => void }>((set, get) => ({
  theme: read(),
  set: (t) => {
    localStorage.setItem(KEY, JSON.stringify(t));
    apply(t);
    set({ theme: t });
  },
  toggle: () => get().set(get().theme === 'dark' ? 'light' : 'dark')
}));

apply(read());
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    useTheme.setState({ theme: read() });
    apply(read());
  }
});
