/**
 * Tiny local "database": JSON in localStorage plus live sync across tabs.
 * Every write is broadcast, so /admin and / update each other instantly
 * when open in different tabs or windows. Only the mock services use this.
 */
const PREFIX = 'no:db:';
const CHANNEL = 'nightowl-sync';

type Listener = () => void;
const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<Listener>>();
const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

function notify(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

function invalidate(key: string) {
  cache.delete(key);
  notify(key);
}

if (channel) {
  channel.onmessage = (e: MessageEvent<{ key: string }>) => invalidate(e.data.key);
} else {
  window.addEventListener('storage', (e) => {
    if (e.key?.startsWith(PREFIX)) invalidate(e.key.slice(PREFIX.length));
  });
}

export const db = {
  get<T>(key: string, fallback: T): T {
    if (cache.has(key)) return cache.get(key) as T;
    let value = fallback;
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw != null) value = JSON.parse(raw) as T;
    } catch {
      /* corrupted entry: use fallback */
    }
    cache.set(key, value);
    return value;
  },
  set<T>(key: string, value: T) {
    cache.set(key, value);
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (err) {
      console.warn('[db] could not persist', key, err);
    }
    notify(key);
    channel?.postMessage({ key });
  },
  update<T>(key: string, fallback: T, fn: (prev: T) => T) {
    const next = fn(db.get(key, fallback));
    db.set(key, next);
    return next;
  },
  subscribe(key: string, fn: Listener) {
    let set = listeners.get(key);
    if (!set) listeners.set(key, (set = new Set()));
    set.add(fn);
    return () => {
      set!.delete(fn);
    };
  },
  /** Re-read everything from storage (pull-to-refresh). */
  refreshAll() {
    [...cache.keys()].forEach(invalidate);
  },
  clearAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
    cache.clear();
  }
};
