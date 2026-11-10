// Ingredient parsing, unit normalization, aisles, and list aggregation.
// Pure functions: imported by both server and client, tested in node.

export type Ingredient = {
  name: string; // display name, cleaned
  key: string; // normalized name used to merge items
  qty: number; // 0 means "no amount given"
  unit: string; // canonical unit ("" for a plain count)
  aisle: string;
};

export const AISLES = [
  "Produce",
  "Meat & fish",
  "Dairy & eggs",
  "Bakery",
  "Pantry",
  "Spices & sauces",
  "Frozen",
  "Other",
] as const;

// Canonical units. Each alias maps to [canonical unit, factor into that unit].
const UNIT_ALIASES: Record<string, [string, number]> = {
  g: ["g", 1], gram: ["g", 1], grams: ["g", 1], gr: ["g", 1],
  kg: ["g", 1000], kgs: ["g", 1000], kilogram: ["g", 1000], kilograms: ["g", 1000],
  oz: ["oz", 1], ounce: ["oz", 1], ounces: ["oz", 1],
  lb: ["oz", 16], lbs: ["oz", 16], pound: ["oz", 16], pounds: ["oz", 16],
  ml: ["ml", 1], milliliter: ["ml", 1], milliliters: ["ml", 1], millilitre: ["ml", 1], millilitres: ["ml", 1],
  l: ["ml", 1000], liter: ["ml", 1000], liters: ["ml", 1000], litre: ["ml", 1000], litres: ["ml", 1000],
  tsp: ["tsp", 1], teaspoon: ["tsp", 1], teaspoons: ["tsp", 1], t: ["tsp", 1],
  tbsp: ["tsp", 3], tablespoon: ["tsp", 3], tablespoons: ["tsp", 3], tbs: ["tsp", 3], tbl: ["tsp", 3], T: ["tsp", 3],
  cup: ["tsp", 48], cups: ["tsp", 48], c: ["tsp", 48],
  pint: ["tsp", 96], pints: ["tsp", 96], quart: ["tsp", 192], quarts: ["tsp", 192],
  clove: ["clove", 1], cloves: ["clove", 1],
  can: ["can", 1], cans: ["can", 1], tin: ["can", 1], tins: ["can", 1],
  jar: ["jar", 1], jars: ["jar", 1],
  bunch: ["bunch", 1], bunches: ["bunch", 1],
  head: ["head", 1], heads: ["head", 1],
  pack: ["pack", 1], packs: ["pack", 1], package: ["pack", 1], packages: ["pack", 1], packet: ["pack", 1], packets: ["pack", 1], pkg: ["pack", 1],
  bag: ["bag", 1], bags: ["bag", 1],
  box: ["box", 1], boxes: ["box", 1],
  bottle: ["bottle", 1], bottles: ["bottle", 1],
  slice: ["slice", 1], slices: ["slice", 1],
  stick: ["stick", 1], sticks: ["stick", 1],
  sprig: ["sprig", 1], sprigs: ["sprig", 1],
  pinch: ["pinch", 1], pinches: ["pinch", 1],
  dash: ["dash", 1], dashes: ["dash", 1],
  loaf: ["loaf", 1], loaves: ["loaf", 1],
  dozen: ["", 12],
};

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

// Words that describe preparation or size rather than the item itself.
const DESCRIPTORS = new Set([
  "fresh", "chopped", "diced", "minced", "sliced", "grated", "shredded", "large", "small", "medium",
  "ripe", "boneless", "skinless", "finely", "roughly", "thinly", "peeled", "cooked", "uncooked",
  "dried", "to", "taste", "optional", "about", "approx", "approximately", "of",
]);

const PLURAL_KEEP = new Set([
  "hummus", "couscous", "asparagus", "molasses", "swiss", "oats", "greens", "brussels", "lentils", "noodles",
  "chips", "grits", "tortillas", "beans", "peas", "chickpeas", "fries", "sprouts", "herbs", "nachos",
]);

function parseNumberToken(tok: string): number | null {
  if (!tok) return null;
  if (UNICODE_FRACTIONS[tok] !== undefined) return UNICODE_FRACTIONS[tok];
  // "1½"
  const mixedUni = tok.match(/^(\d+)([½⅓⅔¼¾⅛⅜⅝⅞])$/);
  if (mixedUni) return Number(mixedUni[1]) + UNICODE_FRACTIONS[mixedUni[2]];
  const frac = tok.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const d = Number(frac[2]);
    return d ? Number(frac[1]) / d : null;
  }
  if (/^\d+(\.\d+)?$/.test(tok) || /^\.\d+$/.test(tok)) return Number(tok);
  return null;
}

function singularize(word: string): string {
  const w = word.toLowerCase();
  if (PLURAL_KEEP.has(w) || w.length <= 3) return w;
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("oes")) return w.slice(0, -2);
  if (w.endsWith("ves") && (w === "leaves" || w === "loaves" || w === "halves")) return w.slice(0, -3) + "f";
  if (/(ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("ss") || w.endsWith("us")) return w;
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
}

export function normalizeName(raw: string): { name: string; key: string } {
  let s = raw
    .replace(/\([^)]*\)/g, " ") // drop parentheticals
    .split(",")[0] // drop ", diced"
    .replace(/[^\p{L}\p{N}' &-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const all = s.split(" ").filter(Boolean);
  const words = all.filter((w) => !DESCRIPTORS.has(w.toLowerCase()));
  if (!words.length) words.push(...all);
  const lower = words.map((w) => w.toLowerCase());
  if (lower.length) lower[lower.length - 1] = singularize(lower[lower.length - 1]);
  const key = lower.join(" ");
  // Display keeps "crushed tomatoes" but drops a leading "fresh"/"large".
  let start = 0;
  while (start < all.length - 1 && DESCRIPTORS.has(all[start].toLowerCase())) start++;
  const shown = all.slice(start).join(" ");
  const name = shown ? shown.charAt(0).toLowerCase() + shown.slice(1) : "";
  return { name, key };
}

const AISLE_KEYWORDS: [string, string[]][] = [
  ["Frozen", ["frozen", "ice cream", "peas frozen"]],
  ["Meat & fish", [
    "chicken", "beef", "pork", "turkey", "lamb", "sausage", "bacon", "ham", "steak",
    "salmon", "tuna", "cod", "shrimp", "prawn", "fish", "tilapia", "chorizo", "meatball", "pepperoni", "prosciutto",
  ]],
  ["Dairy & eggs", [
    "milk", "cheese", "cheddar", "mozzarella", "parmesan", "feta", "butter", "yogurt", "yoghurt", "cream",
    "egg", "sour cream", "ricotta", "half and half",
  ]],
  ["Bakery", ["pizza dough", "bread", "bun", "roll", "tortilla", "pita", "naan", "baguette", "bagel", "loaf", "wrap", "taco shell"]],
  ["Spices & sauces", [
    "salt", "pepper flake", "black pepper", "cumin", "paprika", "oregano", "chili powder", "chilli powder", "cinnamon",
    "garlic powder", "onion powder", "curry", "turmeric", "thyme dried", "italian seasoning", "seasoning", "soy sauce",
    "ketchup", "mustard", "mayo", "mayonnaise", "hot sauce", "sriracha", "vinegar", "worcestershire", "bbq", "barbecue",
    "salsa", "pesto", "teriyaki", "fish sauce", "hoisin", "gochujang", "bay lea", "spice", "salt and pepper",
    "sauce", "dressing", "marinara", "oyster sauce", "sesame seed",
  ]],
  ["Pantry", [
    "rice", "pasta", "spaghetti", "penne", "macaroni", "noodle", "flour", "sugar", "oil", "olive oil", "broth", "stock",
    "bean", "chickpea", "lentil", "tomato sauce", "passata", "crushed tomato", "tomato paste", "canned", "oats", "quinoa",
    "honey", "maple", "peanut butter", "breadcrumb", "panko", "coconut milk", "cornstarch", "baking", "couscous",
    "taco seasoning", "nuts", "almond", "walnut", "cracker", "cereal", "lasagna", "ramen", "jam", "syrup",
    "ziti", "linguine", "fettuccine", "rigatoni", "orzo", "waffle mix", "pancake mix", "crouton", "tomato soup",
    "tomato sauce", "diced tomato", "canned tomato", "chicken broth", "chicken stock", "beef broth", "beef stock", "vegetable broth", "vegetable stock", "bone broth",
  ]],
  ["Produce", [
    "onion", "garlic", "tomato", "potato", "carrot", "celery", "pepper", "lettuce", "spinach", "kale", "broccoli",
    "cauliflower", "zucchini", "courgette", "cucumber", "mushroom", "avocado", "lime", "lemon", "apple", "banana",
    "berry", "berries", "orange", "ginger", "cilantro", "coriander", "parsley", "basil", "mint", "thyme", "rosemary",
    "scallion", "green onion", "shallot", "cabbage", "corn", "squash", "sweet potato", "green bean", "asparagus",
    "salad", "herb", "jalapeno", "jalapeño", "leek", "eggplant", "aubergine", "grape", "pear", "peach", "mango",
    "pineapple", "chive", "dill", "arugula", "rocket", "bok choy", "radish", "beet", "snap pea", "fruit", "veg",
    "tofu", "coleslaw", "salad mix", "stir-fry vegetable", "blueberry", "strawberry", "raspberry", "blackberry", "romaine", "spring onion", "red onion", "plantain",
  ]],
];

export function guessAisle(key: string): string {
  const k = ` ${key.toLowerCase()}`;
  // Keywords match at the start of a word; the longest match wins ("peanut butter" beats "butter").
  let best: { aisle: string; len: number } | null = null;
  for (const [aisle, words] of AISLE_KEYWORDS) {
    for (const w of words) {
      if (k.includes(` ${w}`) && (!best || w.length > best.len)) best = { aisle, len: w.length };
    }
  }
  return best ? best.aisle : "Other";
}

export function parseIngredient(line: string): Ingredient | null {
  let s = line.replace(/^[\s*•\-–·]+/, "").trim();
  if (!s) return null;
  // "1 1/2" or "1-2" (take the higher end of a range)
  s = s.replace(/^(\d+)\s*[-–]\s*(\d+)\b/, "$2");
  // "500g pasta" -> "500 g pasta"
  s = s.replace(/^(\d+(?:\.\d+)?)([a-zA-Z]+)\b/, (m, n, u) => (UNIT_ALIASES[u] || UNIT_ALIASES[u.toLowerCase()] ? `${n} ${u}` : m));
  const tokens = s.split(/\s+/);
  let qty = 0;
  let i = 0;
  const first = parseNumberToken(tokens[0]);
  if (first !== null) {
    qty = first;
    i = 1;
    const second = tokens[1] !== undefined ? parseNumberToken(tokens[1]) : null;
    if (second !== null && second < 1) {
      qty += second;
      i = 2;
    }
  } else if (/^(a|an|one)$/i.test(tokens[0]) && tokens.length > 1) {
    qty = 1;
    i = 1;
  }
  let unit = "";
  let factor = 1;
  const unitTok = tokens[i];
  if (unitTok !== undefined) {
    const clean = unitTok.replace(/\.$/, "");
    const alias = UNIT_ALIASES[clean] ?? UNIT_ALIASES[clean.toLowerCase()];
    if (alias && tokens.length > i + 1) {
      unit = alias[0];
      factor = alias[1];
      i += 1;
      if (tokens[i] && /^of$/i.test(tokens[i])) i += 1;
    }
  }
  const rest = tokens.slice(i).join(" ");
  const norm = normalizeName(rest || s);
  if (!norm.key) return null;
  if (qty === 0 && unit) qty = 1;
  let { key } = norm;
  let aisle = guessAisle(key);
  if (unit === "can" || unit === "jar") {
    // Canned tomatoes are not fresh tomatoes.
    key = `${unit}:${key}`;
    if (aisle === "Produce" || aisle === "Other") aisle = "Pantry";
  }
  return { name: norm.name, key, qty: round(qty * factor), unit, aisle };
}

export function parseIngredientList(text: string): Ingredient[] {
  return text
    .split(/\n|;/)
    .map((l) => parseIngredient(l))
    .filter((x): x is Ingredient => x !== null);
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function fmtNum(n: number): string {
  const whole = Math.floor(n);
  const fracPart = n - whole;
  const fracs: [number, string][] = [[0, ""], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"], [1, ""]];
  let best = fracs[0];
  for (const f of fracs) if (Math.abs(f[0] - fracPart) < Math.abs(best[0] - fracPart)) best = f;
  if (Math.abs(best[0] - fracPart) <= 0.05) {
    const w = best[0] === 1 ? whole + 1 : whole;
    if (!best[1]) return String(w);
    return w ? `${w}${best[1]}` : best[1];
  }
  return String(Math.round(n * 10) / 10);
}

const COUNT_PLURALS: Record<string, string> = {
  clove: "cloves", can: "cans", jar: "jars", bunch: "bunches", head: "heads", pack: "packs", bag: "bags",
  box: "boxes", bottle: "bottles", slice: "slices", stick: "sticks", sprig: "sprigs", pinch: "pinches",
  dash: "dashes", loaf: "loaves",
};

/** Human amount for a canonical quantity, e.g. (40, "oz") -> "2½ lb". */
export function formatAmount(qty: number, unit: string): string {
  if (!qty) return "";
  switch (unit) {
    case "g":
      return qty >= 1000 ? `${fmtNum(qty / 1000)} kg` : `${Math.round(qty)} g`;
    case "ml":
      return qty >= 1000 ? `${fmtNum(qty / 1000)} l` : `${Math.round(qty)} ml`;
    case "oz":
      return qty >= 16 ? `${fmtNum(qty / 16)} lb` : `${fmtNum(qty)} oz`;
    case "tsp":
      if (qty >= 12) return `${fmtNum(qty / 48)} cup${qty / 48 > 1 ? "s" : ""}`;
      if (qty >= 3) return `${fmtNum(qty / 3)} tbsp`;
      return `${fmtNum(qty)} tsp`;
    case "":
      return fmtNum(qty);
    default:
      return `${fmtNum(qty)} ${qty > 1 ? COUNT_PLURALS[unit] ?? unit : unit}`;
  }
}

export type ListEntryLike = {
  key: string;
  name: string;
  qty: number;
  unit: string;
  aisle: string;
  source: string; // plan date (YYYY-MM-DD) or "manual"
};

export type ListItem = {
  key: string;
  name: string;
  amounts: string[]; // e.g. ["2½ lb", "500 g"]
  aisle: string;
  checked: boolean;
  forMeals: string[]; // sources
};

export type ListGroup = { aisle: string; items: ListItem[] };

/** Merge entries into one line per item, amounts combined per unit, grouped by aisle. */
export function aggregateList(entries: ListEntryLike[], checkedKeys: Set<string>): ListGroup[] {
  const byKey = new Map<string, { item: ListItem; perUnit: Map<string, number>; uncounted: boolean }>();
  for (const e of entries) {
    let rec = byKey.get(e.key);
    if (!rec) {
      rec = {
        item: { key: e.key, name: e.name, amounts: [], aisle: e.aisle, checked: checkedKeys.has(e.key), forMeals: [] },
        perUnit: new Map(),
        uncounted: false,
      };
      byKey.set(e.key, rec);
    }
    if (e.qty > 0) rec.perUnit.set(e.unit, (rec.perUnit.get(e.unit) ?? 0) + e.qty);
    else rec.uncounted = true;
    if (!rec.item.forMeals.includes(e.source)) rec.item.forMeals.push(e.source);
  }
  const groups = new Map<string, ListItem[]>();
  for (const { item, perUnit } of byKey.values()) {
    item.amounts = [...perUnit.entries()].map(([u, q]) => formatAmount(round(q), u)).filter(Boolean);
    const list = groups.get(item.aisle) ?? [];
    list.push(item);
    groups.set(item.aisle, list);
  }
  const order = (a: string) => {
    const i = (AISLES as readonly string[]).indexOf(a);
    return i === -1 ? AISLES.length : i;
  };
  return [...groups.entries()]
    .sort((a, b) => order(a[0]) - order(b[0]))
    .map(([aisle, items]) => ({
      aisle,
      items: items.sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name)),
    }));
}
