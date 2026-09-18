import { firebaseServices } from './firebase';
import type { Services } from './contracts';

/** The single swap point. `./mock` (localStorage-only, no cross-device sync) is still there for offline demos. */
export const services: Services = firebaseServices;
export { ServiceError } from './contracts';
export type { Services } from './contracts';

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong. Try again.';
