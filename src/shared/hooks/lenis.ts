import { useEffect } from 'react';
import Lenis from 'lenis';

let instance: Lenis | null = null;
export const getLenis = () => instance;

/** Smooth inertia scrolling for wheel/trackpad. Touch keeps native scrolling. */
export function useLenis(enabled: boolean) {
  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, wheelMultiplier: 0.95 });
    instance = lenis;
    let id = 0;
    const raf = (t: number) => {
      lenis.raf(t);
      id = requestAnimationFrame(raf);
    };
    id = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
      instance = null;
    };
  }, [enabled]);
}

export function scrollToTop(immediate = true) {
  if (instance) instance.scrollTo(0, { immediate });
  else window.scrollTo({ top: 0 });
}

export function lockScroll(lock: boolean) {
  if (instance) {
    if (lock) instance.stop();
    else instance.start();
  }
  document.documentElement.style.overflow = lock ? 'hidden' : '';
}
