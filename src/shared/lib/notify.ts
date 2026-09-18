/** Browser / PWA system notifications. Falls back silently when unsupported or denied. */
export const notifSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export const notifPermission = (): NotificationPermission | 'unsupported' =>
  notifSupported() ? Notification.permission : 'unsupported';

export async function requestNotifPermission() {
  if (!notifSupported()) return 'unsupported' as const;
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export async function showSystemNotification(title: string, opts: { body?: string; tag?: string; url?: string } = {}) {
  if (!notifSupported() || Notification.permission !== 'granted') return false;
  const options: NotificationOptions = {
    body: opts.body,
    tag: opts.tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: opts.url ?? '/' }
  };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, options);
      return true;
    }
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      if (opts.url) window.location.assign(opts.url);
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}
