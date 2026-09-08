const PALETTE = ['#4f9d54', '#2b6ca3', '#b57614', '#7a4fa3', '#b3382c', '#2f7a8a'];

/** Deterministic inline SVG avatar so the mockup renders with no network. */
export function avatarFor(name: string): string {
  const initials = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const bg = PALETTE[hash % PALETTE.length];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" rx="48" fill="${bg}"/>` +
    `<text x="48" y="61" font-family="system-ui,sans-serif" font-size="38" font-weight="600" ` +
    `fill="#ffffff" text-anchor="middle">${initials || '?'}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const COVER_TINTS = ['#eaf5eb', '#e7eff7', '#fdf3e0', '#f1ebf7', '#e8f4ec'];

/** Soft abstract cover art for article headers — also inline, also offline-safe. */
export function coverFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 37 + seed.charCodeAt(i)) >>> 0;
  }
  const tint = COVER_TINTS[hash % COVER_TINTS.length];
  const accent = PALETTE[(hash >> 3) % PALETTE.length];
  const cx = 20 + (hash % 60);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="240" viewBox="0 0 800 240">` +
    `<rect width="800" height="240" fill="${tint}"/>` +
    `<circle cx="${cx * 8}" cy="70" r="150" fill="${accent}" opacity="0.18"/>` +
    `<circle cx="${740 - cx * 3}" cy="220" r="110" fill="${accent}" opacity="0.12"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
