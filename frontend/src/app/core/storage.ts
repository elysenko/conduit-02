/**
 * Mockups are served many-per-origin at /<mockup_id>/ and browser storage is
 * origin-scoped, not path-scoped. Every key is therefore prefixed with the first
 * URL path segment so two mockups open in the same browser cannot collide.
 */
const NS = (typeof location !== 'undefined' && location.pathname.split('/')[1]) || 'app';

export const nsKey = (key: string): string => `${NS}:${key}`;

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(nsKey(key));
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(nsKey(key), value);
  } catch {
    /* storage unavailable (private mode) — the mockup still works in memory */
  }
}

export function clearStored(keys: string[]): void {
  try {
    for (const key of keys) {
      localStorage.removeItem(nsKey(key));
    }
  } catch {
    /* nothing to clean up */
  }
}
