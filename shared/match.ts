// Matches a typed meal name ("Tacos", "spag bol") to a recipe so a suggestion
// without ingredients can still fill the shopping list. Pure: tested in node.

import { RECIPES, type Recipe } from "./recipes";

const STOP = new Set([
  "a", "an", "and", "n", "the", "with", "of", "on", "in", "for", "my", "our", "some", "night", "dinner",
  "homemade", "easy", "quick", "simple", "classic", "best", "style", "mom", "moms", "dad", "dads", "grandma", "grandmas",
  "slow", "cooker", "crockpot", "instant", "pot", "sheet", "pan", "one",
]);

const ALIAS: Record<string, string> = {
  spag: "spaghetti", bol: "bolognese", bolognaise: "bolognese", parm: "parmesan", parmigiana: "parmesan",
  mac: "mac", macaroni: "mac", cheeseburger: "burger", hamburger: "burger", fajita: "fajita",
  stirfry: "stir", stir: "stir", fry: "fry", noodle: "noodle", ramen: "ramen", spuds: "potato", spud: "potato",
  veg: "veggie", vegetable: "veggie", vegetables: "veggie", bbq: "bbq", barbecue: "bbq", barbeque: "bbq",
  hotdog: "hotdog", hotdogs: "hotdog", sub: "sub", hoagie: "sub", wrap: "wrap", tofu: "tofu",
};

// A meal named only by one of these ("Chicken", "Pasta") is too vague to guess.
const GENERIC = new Set([
  "chicken", "beef", "pork", "turkey", "fish", "pasta", "soup", "salad", "rice", "noodle", "sandwich",
  "leftover", "takeout", "takeaway", "out", "veggie", "bowl", "potato", "egg",
]);

// Main proteins: a guess never swaps one for another ("Chicken tacos" is not "Beef tacos").
const PROTEINS = new Set(["chicken", "beef", "pork", "turkey", "fish", "salmon", "shrimp", "tofu", "sausage", "steak", "lamb", "tuna", "cod"]);

function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && /(ches|shes|xes|oes)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokens(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.toLowerCase().replace(/['’]/g, "").split(/[^a-z]+/)) {
    if (!raw || STOP.has(raw)) continue;
    const w = ALIAS[raw] ?? ALIAS[stem(raw)] ?? stem(raw);
    if (!STOP.has(w) && !out.includes(w)) out.push(w);
  }
  return out;
}

export type Match = { recipe: Recipe; score: number };

/** The library recipe that best fits a typed meal name, or null if nothing fits well. */
export function matchRecipe(title: string, library: Recipe[] = RECIPES): Match | null {
  const q = tokens(title);
  if (!q.length) return null;
  if (q.every((t) => GENERIC.has(t))) return null;
  const qProteins = q.filter((t) => PROTEINS.has(t));
  const meatless = q.includes("veggie") || q.includes("vegetarian") || q.includes("vegan");
  let best: { recipe: Recipe; score: number; precision: number } | null = null;
  for (const recipe of library) {
    const rt = tokens(recipe.title);
    const rProteins = rt.filter((t) => PROTEINS.has(t));
    if (qProteins.length && rProteins.some((p) => !qProteins.includes(p))) continue;
    if (meatless && rProteins.some((p) => p !== "tofu")) continue;
    const hits = q.filter((t) => rt.includes(t));
    if (!hits.some((t) => !GENERIC.has(t))) continue;
    const score = hits.length / q.length;
    if (score < 0.66) continue;
    const precision = hits.length / rt.length;
    if (!best || score > best.score || (score === best.score && precision > best.precision)) {
      best = { recipe, score, precision };
    }
  }
  return best ? { recipe: best.recipe, score: best.score } : null;
}
