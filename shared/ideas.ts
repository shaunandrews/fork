// Picks meal ideas for upcoming days from the built-in library and the
// family's own past favorites. Deterministic for a given family and date.

import { RECIPES } from "./recipes";

export type Idea = { title: string; ingredients: string[]; favorite: boolean };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/**
 * @param seed     something stable per family and request (e.g. familyId + start date)
 * @param count    how many ideas to return
 * @param recent   titles eaten or already suggested recently (lowercased), avoided
 * @param favorites the family's own past picks, with ingredient lines
 */
export function pickIdeas(
  seed: string,
  count: number,
  recent: Set<string>,
  favorites: { title: string; ingredients: string[]; times: number }[],
): Idea[] {
  const seen = new Set<string>();
  const pool: { idea: Idea; score: number }[] = [];
  for (const f of favorites) {
    const k = f.title.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    pool.push({ idea: { title: f.title, ingredients: f.ingredients, favorite: true }, score: hash(seed + k) + 0.25 + Math.min(f.times, 4) * 0.05 });
  }
  for (const r of RECIPES) {
    const k = r.title.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    pool.push({ idea: { title: r.title, ingredients: r.ingredients, favorite: false }, score: hash(seed + k) });
  }
  const fresh = pool.filter((p) => !recent.has(p.idea.title.toLowerCase()));
  const use = fresh.length >= count ? fresh : pool;
  return use.sort((a, b) => b.score - a.score).slice(0, count).map((p) => p.idea);
}
