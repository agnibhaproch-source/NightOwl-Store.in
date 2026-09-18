import type { Category, Product } from '../types';

const SYNONYMS: Record<string, string[]> = {
  coke: ['coca', 'cola'],
  cola: ['coca', 'thums', 'pepsi'],
  noodle: ['noodles', 'maggi', 'ramen'],
  ramen: ['noodles', 'ramen'],
  choco: ['chocolate', 'choco', 'dairy'],
  chocolate: ['chocolate', 'dairy', 'kitkat', 'silk'],
  drink: ['drinks', 'cola', 'energy', 'mango'],
  energy: ['energy', 'red', 'sting', 'monster'],
  water: ['water', 'bisleri'],
  cookie: ['cookies', 'biscuit'],
  cake: ['cake', 'brownie', 'roll'],
  namkeen: ['bhujia', 'namkeen'],
  lays: ['lay']
};

export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/['’]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function lev(a: string, b: string) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n]!;
}

function wordScore(q: string, words: string[]) {
  let best = 0;
  for (const w of words) {
    if (w === q) return 40;
    if (w.startsWith(q)) best = Math.max(best, 32);
    else if (w.includes(q) && q.length >= 3) best = Math.max(best, 22);
    else if (q.length >= 3) {
      const d = Math.min(lev(q, w), lev(q, w.slice(0, q.length)));
      const allowed = q.length <= 4 ? 1 : 2;
      if (d <= allowed) best = Math.max(best, 18 - d * 4);
    }
  }
  return best;
}

export function scoreProduct(p: Product, cat: Category | undefined, query: string) {
  const q = normalize(query);
  if (!q) return 0;
  const hay = normalize(`${p.name} ${p.brand} ${cat?.name ?? ''} ${p.tags.join(' ')}`);
  if (hay.includes(q)) return 100 - hay.indexOf(q) * 0.2 + p.popularity * 0.01;
  const words = hay.split(' ');
  let total = 0;
  for (const qw of q.split(' ')) {
    let s = wordScore(qw, words);
    const syn = SYNONYMS[qw];
    if (syn) for (const alt of syn) s = Math.max(s, wordScore(alt, words) - 2);
    if (!s) return 0;
    total += s;
  }
  return total + p.popularity * 0.01;
}

export function searchProducts(products: Product[], cats: Category[], query: string) {
  const byId = new Map(cats.map((c) => [c.id, c]));
  return products
    .map((p) => ({ p, s: scoreProduct(p, byId.get(p.categoryId), query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}
