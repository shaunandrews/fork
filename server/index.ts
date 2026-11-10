import { boolean, capsule, id, mutation, number, query, string, table, userId } from "@spacefast/zero/server";
import { AISLES, aggregateList, formatAmount, normalizeName, parseIngredient, parseIngredientList, type Ingredient } from "../shared/ingredients";
import { addDays, dateRange, dayName, isDate } from "../shared/dates";
import { pickIdeas } from "../shared/ideas";
import { matchRecipe } from "../shared/match";

const schema = {
  families: table({
    name: string(),
    ownerId: userId(),
    inviteCode: string(),
  }).index("by_invite", ["inviteCode"]),
  members: table({
    familyId: id("families"),
    userId: userId(),
    displayName: string(),
  })
    .index("by_user", ["userId"])
    .index("by_family", ["familyId"]),
  suggestions: table({
    familyId: id("families"),
    date: string(),
    title: string(),
    ingredientsJson: string().default("[]"),
    // Where filled-in ingredients came from, when nobody typed them.
    ingredientsNote: string().optional(),
    byUser: string(),
    byName: string(),
    fromFork: boolean().default(false),
  }).index("by_family_date", ["familyId", "date"]),
  votes: table({
    familyId: id("families"),
    suggestionId: id("suggestions"),
    date: string(),
    userId: userId(),
  })
    .index("by_suggestion", ["suggestionId"])
    .index("by_family_date", ["familyId", "date"]),
  dayPlans: table({
    familyId: id("families"),
    date: string(),
    chefId: string().optional(),
    chefName: string().optional(),
    pickedSuggestionId: string().optional(),
    pickedTitle: string().optional(),
  }).index("by_family_date", ["familyId", "date"]),
  listEntries: table({
    familyId: id("families"),
    key: string(),
    name: string(),
    qty: number().default(0),
    unit: string().default(""),
    aisle: string(),
    source: string(), // plan date (YYYY-MM-DD) or "manual"
  })
    .index("by_family", ["familyId"])
    .index("by_family_source", ["familyId", "source"])
    .index("by_family_key", ["familyId", "key"]),
  listChecks: table({
    familyId: id("families"),
    key: string(),
    byName: string().default(""),
  })
    .index("by_family", ["familyId"])
    .index("by_family_key", ["familyId", "key"]),
  // The family's own cookbook: meals they made or saved, with their ingredients.
  meals: table({
    familyId: id("families"),
    key: string(),
    title: string(),
    ingredientsJson: string().default("[]"),
    hidden: boolean().default(false),
    servings: number().default(0),
    notes: string().default(""),
  })
    .index("by_family", ["familyId"])
    .index("by_family_key", ["familyId", "key"]),
  // The family's ingredients. Recipes, suggestions and the shopping list all
  // resolve through this, so "onions" in one meal and "yellow onion" in another
  // can be one item once they're merged.
  ingredients: table({
    familyId: id("families"),
    key: string(),
    name: string(),
    aisle: string(),
    aliasesJson: string().default("[]"),
  })
    .index("by_family", ["familyId"])
    .index("by_family_key", ["familyId", "key"]),
};

const ALL = ["me", "week", "list", "meals", "recipe", "ingredients"];

type Ctx = { auth: { requireSignedIn(): { userId: string; displayName: string } }; db: any };

function clean(s: unknown, max: number): string {
  return String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function needDate(d: unknown): string {
  if (!isDate(d)) throw new Error("That date doesn't look right.");
  return d;
}

async function membership(ctx: Ctx) {
  const me = ctx.auth.requireSignedIn();
  const member = await ctx.db.members.withIndex("by_user", (r: any) => r.eq("userId", me.userId)).first();
  return { me, member } as { me: { userId: string; displayName: string }; member: any | null };
}

async function requireFamily(ctx: Ctx) {
  const { me, member } = await membership(ctx);
  if (!member) throw new Error("Join or start a family first.");
  const family = await ctx.db.families.get(member.familyId);
  if (!family) throw new Error("That family no longer exists.");
  return { me, member, family, familyId: member.familyId as string };
}

async function makeInviteCode(ctx: any, seed: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const hex = await ctx.crypto.sha256(`${seed}:${Date.now()}:${Math.random()}:${i}`);
    const code = hex.slice(0, 10);
    const clash = await ctx.db.families.withIndex("by_invite", (r: any) => r.eq("inviteCode", code)).first();
    if (!clash) return code;
  }
  throw new Error("Couldn't make an invite code. Try again.");
}

async function getPlan(ctx: Ctx, familyId: string, date: string) {
  return ctx.db.dayPlans.withIndex("by_family_date", (r: any) => r.eq("familyId", familyId).eq("date", date)).first();
}

async function ensurePlan(ctx: Ctx, familyId: string, date: string) {
  const existing = await getPlan(ctx, familyId, date);
  if (existing) return existing;
  return ctx.db.dayPlans.insert({ familyId, date });
}

async function clearSource(ctx: Ctx, familyId: string, source: string) {
  const rows = await ctx.db.listEntries.withIndex("by_family_source", (r: any) => r.eq("familyId", familyId).eq("source", source)).collect();
  for (const row of rows) await ctx.db.listEntries.delete(row.id);
}

async function addIngredients(ctx: Ctx, familyId: string, source: string, raw: Ingredient[]) {
  const cat = await loadCatalog(ctx, familyId);
  const items = await register(ctx, familyId, cat, raw);
  const checks = await ctx.db.listChecks.withIndex("by_family", (r: any) => r.eq("familyId", familyId)).collect();
  for (const it of items) {
    await ctx.db.listEntries.insert({ familyId, key: it.key, name: it.name, qty: it.qty, unit: it.unit, aisle: it.aisle, source });
    // A re-added item should show as still needed.
    for (const c of checks) if (canonKey(cat, c.key) === it.key) await ctx.db.listChecks.delete(c.id);
  }
}

// ---------- the family's ingredients ----------

type Catalog = { rows: any[]; byKey: Map<string, any> };

function aliasesOf(row: any): string[] {
  try {
    const v = JSON.parse(row.aliasesJson ?? "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function buildCatalog(rows: any[]): Catalog {
  const byKey = new Map<string, any>();
  for (const row of rows) for (const a of aliasesOf(row)) byKey.set(a, row);
  for (const row of rows) byKey.set(row.key, row); // an ingredient's own key always wins
  return { rows, byKey };
}

async function loadCatalog(ctx: Ctx, familyId: string): Promise<Catalog> {
  return buildCatalog(await ctx.db.ingredients.withIndex("by_family", (r: any) => r.eq("familyId", familyId)).collect());
}

function canonKey(cat: Catalog, key: string): string {
  return cat.byKey.get(key)?.key ?? key;
}

/** The item as the family knows it: their name and aisle for it. */
function canon<T extends { key: string; name: string; aisle: string }>(cat: Catalog, it: T): T {
  const row = cat.byKey.get(it.key);
  return row ? { ...it, key: row.key as string, name: row.name as string, aisle: row.aisle as string } : it;
}

/** Resolves items through the catalog, adding any the family hasn't used before. */
async function register(ctx: Ctx, familyId: string, cat: Catalog, items: Ingredient[]): Promise<Ingredient[]> {
  const out: Ingredient[] = [];
  for (const it of items) {
    if (!cat.byKey.has(it.key)) {
      const row = await ctx.db.ingredients.insert({ familyId, key: it.key, name: it.name, aisle: it.aisle, aliasesJson: "[]" });
      cat.rows.push(row);
      cat.byKey.set(it.key, row);
    }
    out.push(canon(cat, it));
  }
  return out;
}

type RecipeItem = Ingredient & { prep?: string };

/** Every meal the family has: saved recipes plus ones from before recipes existed. */
async function familyMeals(ctx: Ctx, familyId: string) {
  const [rows, plans, suggestions] = await Promise.all([
    ctx.db.meals.withIndex("by_family", (r: any) => r.eq("familyId", familyId)).collect(),
    ctx.db.dayPlans.withIndex("by_family_date", (r: any) => r.eq("familyId", familyId)).collect(),
    ctx.db.suggestions.withIndex("by_family_date", (r: any) => r.eq("familyId", familyId)).collect(),
  ]);
  const picked = new Map<string, { times: number; last: string }>();
  for (const p of plans) {
    if (!p.pickedTitle) continue;
    const k = mealKey(p.pickedTitle as string);
    const prev = picked.get(k);
    picked.set(k, { times: (prev?.times ?? 0) + 1, last: prev && prev.last > p.date ? prev.last : (p.date as string) });
  }
  type M = { key: string; title: string; items: RecipeItem[]; servings: number; notes: string };
  const byKey = new Map<string, M>();
  const hidden = new Set<string>();
  for (const m of rows) {
    if (m.hidden) hidden.add(m.key as string);
    else
      byKey.set(m.key as string, {
        key: m.key as string, title: m.title as string, items: ingredientsOf(m.ingredientsJson as string),
        servings: Number(m.servings ?? 0), notes: String(m.notes ?? ""),
      });
  }
  // Meals from before the cookbook existed: typed by the family, or picked.
  for (const s of suggestions) {
    const k = mealKey(s.title as string);
    if (byKey.has(k) || hidden.has(k)) continue;
    const typed = !s.fromFork && !s.ingredientsNote && ingredientsOf(s.ingredientsJson as string).length > 0;
    if (!typed && !picked.has(k)) continue;
    byKey.set(k, { key: k, title: s.title as string, items: ingredientsOf(s.ingredientsJson as string), servings: 0, notes: "" });
  }
  return [...byKey.values()].map((m) => ({ ...m, slug: slugOf(m.key), timesPicked: picked.get(m.key)?.times ?? 0, lastPicked: picked.get(m.key)?.last ?? null }));
}

function slugOf(key: string): string {
  return key.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "meal";
}

function needAisle(a: unknown): string {
  const v = String(a ?? "");
  if (!(AISLES as readonly string[]).includes(v)) throw new Error("Pick an aisle from the list.");
  return v;
}

/** "2 lb" -> amount for the editor: what formatAmount shows. */
function amountOf(it: Ingredient): string {
  return formatAmount(it.qty, it.unit);
}

function mealKey(title: string): string {
  return String(title).replace(/\s+/g, " ").trim().toLowerCase();
}

async function getMeal(ctx: Ctx, familyId: string, title: string) {
  return ctx.db.meals.withIndex("by_family_key", (r: any) => r.eq("familyId", familyId).eq("key", mealKey(title))).first();
}

/** Saves a meal to the family's cookbook. Without overwrite, an existing meal is left as it is. */
async function rememberMeal(ctx: Ctx, familyId: string, title: string, raw: Ingredient[], overwrite: boolean) {
  const t = clean(title, 80);
  if (!t) return;
  const items = await register(ctx, familyId, await loadCatalog(ctx, familyId), raw);
  const existing = await getMeal(ctx, familyId, t);
  if (!existing) {
    await ctx.db.meals.insert({ familyId, key: mealKey(t), title: t, ingredientsJson: JSON.stringify(items) });
  } else if (overwrite || existing.hidden) {
    await ctx.db.meals.update(existing.id, { title: t, ingredientsJson: JSON.stringify(items), hidden: false });
  }
}

function linesOf(items: RecipeItem[]): string[] {
  return items.map((i) => [formatAmount(i.qty, i.unit), i.name].filter(Boolean).join(" ") + (i.prep ? `, ${i.prep}` : ""));
}

/**
 * Ingredients for a meal nobody listed ingredients for: the family's own most
 * recent version of the same meal first, then the closest built-in recipe.
 */
async function fillIngredients(ctx: Ctx, familyId: string, title: string): Promise<{ items: Ingredient[]; note: string | null }> {
  const want = mealKey(title);
  const saved = await getMeal(ctx, familyId, title);
  if (saved && !saved.hidden) {
    const items = ingredientsOf(saved.ingredientsJson);
    if (items.length) return { items, note: "From your meals" };
  }
  if (!saved) {
    const past = await ctx.db.suggestions.withIndex("by_family_date", (r: any) => r.eq("familyId", familyId)).collect();
    for (let i = past.length - 1; i >= 0; i--) {
      const s = past[i];
      if (s.fromFork || mealKey(s.title) !== want) continue;
      const items = ingredientsOf(s.ingredientsJson);
      if (items.length && !s.ingredientsNote) return { items, note: "From the last time your family had it" };
    }
  }
  const m = matchRecipe(title);
  if (!m) return { items: [], note: null };
  const items = m.recipe.ingredients.map((l) => parseIngredient(l)).filter((x): x is Ingredient => x !== null);
  const same = mealKey(m.recipe.title) === want;
  return { items, note: same ? "Fork's recipe" : `Based on Fork's ${m.recipe.title}` };
}

function ingredientsOf(json: string): Ingredient[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default capsule({
  name: "Fork",
  schema,
  auth: { requireSignIn: true },
  queries: {
    me: query(async (ctx) => {
      const { me, member } = await membership(ctx as any);
      if (!member) return { displayName: me.displayName, family: null, members: [] as { name: string; isMe: boolean; isOwner: boolean }[] };
      const family = await ctx.db.families.get(member.familyId);
      if (!family) return { displayName: me.displayName, family: null, members: [] };
      const members = await ctx.db.members.withIndex("by_family", (r) => r.eq("familyId", member.familyId)).collect();
      return {
        displayName: member.displayName as string,
        family: { id: family.id, name: family.name as string, inviteCode: family.inviteCode as string, isOwner: family.ownerId === me.userId },
        members: members.map((m) => ({ name: m.displayName as string, isMe: m.userId === me.userId, isOwner: m.userId === family.ownerId })),
      };
    }),

    inviteInfo: query(async (ctx, code: string) => {
      ctx.auth.requireSignedIn();
      const family = await ctx.db.families.withIndex("by_invite", (r) => r.eq("inviteCode", clean(code, 40))).first();
      if (!family) return null;
      const count = await ctx.db.members.withIndex("by_family", (r) => r.eq("familyId", family.id)).count();
      return { name: family.name as string, members: count };
    }),

    meals: query(async (ctx) => {
      const { familyId } = await requireFamily(ctx as any);
      const [meals, cat] = await Promise.all([familyMeals(ctx as any, familyId), loadCatalog(ctx as any, familyId)]);
      return meals
        .map((m) => ({
          key: m.key, slug: m.slug, title: m.title, servings: m.servings,
          ingredientCount: m.items.length,
          preview: m.items.slice(0, 5).map((i) => canon(cat, i).name),
          hasNotes: m.notes.trim().length > 0,
          timesPicked: m.timesPicked, lastPicked: m.lastPicked,
        }))
        .sort((a, b) => b.timesPicked - a.timesPicked || a.title.localeCompare(b.title));
    }),

    recipe: query(async (ctx, slug: string) => {
      const { familyId } = await requireFamily(ctx as any);
      const want = clean(slug, 120).toLowerCase();
      const [meals, cat] = await Promise.all([familyMeals(ctx as any, familyId), loadCatalog(ctx as any, familyId)]);
      const m = meals.find((x) => x.slug === want);
      if (!m) return null;
      return {
        key: m.key, slug: m.slug, title: m.title, servings: m.servings, notes: m.notes,
        timesPicked: m.timesPicked, lastPicked: m.lastPicked,
        items: m.items.map((raw) => {
          const i = canon(cat, raw);
          return { key: i.key, name: i.name, aisle: i.aisle, amount: amountOf(i), prep: raw.prep ?? "" };
        }),
      };
    }),

    ingredients: query(async (ctx) => {
      const { familyId } = await requireFamily(ctx as any);
      const [meals, cat] = await Promise.all([familyMeals(ctx as any, familyId), loadCatalog(ctx as any, familyId)]);
      const usedIn = new Map<string, { title: string; slug: string }[]>();
      for (const m of meals) {
        for (const i of m.items) {
          const k = canonKey(cat, i.key);
          const list = usedIn.get(k) ?? [];
          if (!list.some((x) => x.slug === m.slug)) list.push({ title: m.title, slug: m.slug });
          usedIn.set(k, list);
        }
      }
      return cat.rows
        .map((row) => ({
          key: row.key as string, name: row.name as string, aisle: row.aisle as string,
          aliases: aliasesOf(row),
          usedIn: usedIn.get(row.key as string) ?? [],
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }),

    week: query(async (ctx, start: string, days: number) => {
      const { me, familyId } = await requireFamily(ctx as any);
      const from = needDate(start);
      const n = Math.max(1, Math.min(14, Math.floor(Number(days) || 7)));
      const to = addDays(from, n - 1);
      const range = (r: any) => r.eq("familyId", familyId).gte("date", from).lte("date", to);
      const [suggestions, votes, plans, cat, saved] = await Promise.all([
        ctx.db.suggestions.withIndex("by_family_date", range).collect(),
        ctx.db.votes.withIndex("by_family_date", range).collect(),
        ctx.db.dayPlans.withIndex("by_family_date", range).collect(),
        loadCatalog(ctx as any, familyId),
        ctx.db.meals.withIndex("by_family", (r) => r.eq("familyId", familyId)).collect(),
      ]);
      const recipeKeys = new Set(saved.filter((m) => !m.hidden).map((m) => m.key as string));
      return dateRange(from, n).map((date) => {
        const plan = plans.find((p) => p.date === date);
        const daySuggestions = suggestions
          .filter((s) => s.date === date)
          .map((s) => {
            const v = votes.filter((x) => x.suggestionId === s.id);
            return {
              id: s.id,
              title: s.title as string,
              byName: s.byName as string,
              fromFork: Boolean(s.fromFork),
              mine: s.byUser === me.userId,
              votes: v.length,
              iVoted: v.some((x) => x.userId === me.userId),
              ingredients: ingredientsOf(s.ingredientsJson as string).map((i) => canon(cat, i).name),
              ingredientLines: linesOf(ingredientsOf(s.ingredientsJson as string).map((i) => canon(cat, i))),
              recipeSlug: recipeKeys.has(mealKey(s.title as string)) ? slugOf(mealKey(s.title as string)) : null,
              ingredientsNote: (s.ingredientsNote as string | undefined) ?? null,
              createdAt: s.createdAt,
            };
          })
          .sort((a, b) => b.votes - a.votes || String(a.createdAt).localeCompare(String(b.createdAt)));
        return {
          date,
          chefName: (plan?.chefName as string | undefined) ?? null,
          iAmChef: plan?.chefId === me.userId,
          pickedId: (plan?.pickedSuggestionId as string | undefined) ?? null,
          pickedTitle: (plan?.pickedTitle as string | undefined) ?? null,
          suggestions: daySuggestions,
        };
      });
    }),

    list: query(async (ctx) => {
      const { familyId } = await requireFamily(ctx as any);
      const [entries, checks] = await Promise.all([
        ctx.db.listEntries.withIndex("by_family", (r) => r.eq("familyId", familyId)).collect(),
        ctx.db.listChecks.withIndex("by_family", (r) => r.eq("familyId", familyId)).collect(),
      ]);
      // Label plan dates with the meal that needs them.
      const dates = [...new Set(entries.map((e) => e.source as string).filter((s) => isDate(s)))];
      const labels: Record<string, string> = { manual: "Added" };
      for (const d of dates) {
        const plan = await getPlan(ctx as any, familyId, d);
        labels[d] = plan?.pickedTitle ? `${dayName(d)}: ${plan.pickedTitle}` : dayName(d);
      }
      const cat = await loadCatalog(ctx as any, familyId);
      const groups = aggregateList(
        entries.map((e) => canon(cat, e as any)) as any,
        new Set(checks.map((c) => canonKey(cat, c.key as string))),
      );
      const total = groups.reduce((n, g) => n + g.items.length, 0);
      const done = groups.reduce((n, g) => n + g.items.filter((i) => i.checked).length, 0);
      return {
        total,
        done,
        groups: groups.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, forMeals: i.forMeals.map((s) => labels[s] ?? s) })) })),
      };
    }),
  },

  mutations: {
    createFamily: mutation(async (ctx, name: string, displayName: string) => {
      const { me, member } = await membership(ctx as any);
      if (member) throw new Error("You're already in a family.");
      const familyName = clean(name, 60);
      const myName = clean(displayName, 40) || clean(me.displayName, 40) || "Me";
      if (!familyName) throw new Error("Give your family a name.");
      const inviteCode = await makeInviteCode(ctx, me.userId);
      const family = await ctx.db.families.insert({ name: familyName, ownerId: me.userId, inviteCode });
      await ctx.db.members.insert({ familyId: family.id, userId: me.userId, displayName: myName });
      ctx.invalidate(...ALL);
      return { id: family.id };
    }),

    joinFamily: mutation(async (ctx, code: string, displayName: string) => {
      const { me, member } = await membership(ctx as any);
      const family = await ctx.db.families.withIndex("by_invite", (r) => r.eq("inviteCode", clean(code, 40))).first();
      if (!family) throw new Error("That invite link isn't valid anymore. Ask for a new one.");
      if (member) {
        if (member.familyId === family.id) return { id: family.id };
        throw new Error("You're already in another family.");
      }
      const myName = clean(displayName, 40) || clean(me.displayName, 40) || "Me";
      await ctx.db.members.insert({ familyId: family.id, userId: me.userId, displayName: myName });
      ctx.invalidate(...ALL);
      return { id: family.id };
    }),

    setMyName: mutation(async (ctx, displayName: string) => {
      const { member } = await requireFamily(ctx as any);
      const myName = clean(displayName, 40);
      if (!myName) throw new Error("Enter a name.");
      await ctx.db.members.update(member.id, { displayName: myName });
      ctx.invalidate(...ALL);
    }),

    resetInvite: mutation(async (ctx) => {
      const { me, family } = await requireFamily(ctx as any);
      if (family.ownerId !== me.userId) throw new Error("Only the person who started the family can reset the link.");
      const inviteCode = await makeInviteCode(ctx, me.userId);
      await ctx.db.families.update(family.id, { inviteCode });
      ctx.invalidate("me");
    }),

    suggestMeal: mutation(async (ctx, date: string, title: string, ingredientsText: string) => {
      const { me, member, familyId } = await requireFamily(ctx as any);
      const d = needDate(date);
      const t = clean(title, 80);
      if (!t) throw new Error("What's the meal?");
      let ingredients = parseIngredientList(String(ingredientsText ?? "").slice(0, 4000)).slice(0, 60);
      let note: string | null = null;
      if (!ingredients.length) ({ items: ingredients, note } = await fillIngredients(ctx as any, familyId, t));
      else await rememberMeal(ctx as any, familyId, t, ingredients, true);
      await ctx.db.suggestions.insert({
        familyId, date: d, title: t, ingredientsJson: JSON.stringify(ingredients),
        ...(note ? { ingredientsNote: note } : {}),
        byUser: me.userId, byName: member.displayName, fromFork: false,
      });
      ctx.invalidate("week", "meals", "recipe", "ingredients");
    }),

    setIngredients: mutation(async (ctx, suggestionId: string, ingredientsText: string) => {
      const { familyId } = await requireFamily(ctx as any);
      const s = await ctx.db.suggestions.get(suggestionId);
      if (!s || s.familyId !== familyId) throw new Error("That suggestion is gone.");
      const ingredients = parseIngredientList(String(ingredientsText ?? "").slice(0, 4000)).slice(0, 60);
      await ctx.db.suggestions.update(s.id, { ingredientsJson: JSON.stringify(ingredients), ingredientsNote: null });
      if (ingredients.length) await rememberMeal(ctx as any, familyId, s.title as string, ingredients, true);
      // If it's tonight's pick, the shopping list follows the edit.
      const plan = await getPlan(ctx as any, familyId, s.date);
      if (plan && plan.pickedSuggestionId === s.id) {
        await clearSource(ctx as any, familyId, s.date);
        await addIngredients(ctx as any, familyId, s.date, ingredients);
      }
      ctx.invalidate("week", "list", "meals", "recipe", "ingredients");
    }),

    saveRecipe: mutation(async (ctx, originalKey: string, recipeJson: string) => {
      const { familyId } = await requireFamily(ctx as any);
      let data: any;
      try {
        data = JSON.parse(String(recipeJson ?? "").slice(0, 20000));
      } catch {
        throw new Error("That recipe didn't come through. Try again.");
      }
      const t = clean(data?.title, 80);
      if (!t) throw new Error("Give the recipe a name.");
      const servings = Math.max(0, Math.min(50, Math.floor(Number(data?.servings) || 0)));
      const notes = String(data?.notes ?? "").replace(/\r/g, "").slice(0, 8000).trim();
      const rows: any[] = Array.isArray(data?.items) ? data.items.slice(0, 80) : [];
      const parsed: RecipeItem[] = [];
      for (const row of rows) {
        const name = clean(row?.name, 80);
        if (!name) continue;
        const it = parseIngredient(`${clean(row?.amount, 30)} ${name}`.trim());
        if (!it) continue;
        const prep = clean(row?.prep, 60);
        parsed.push(prep ? { ...it, prep } : it);
      }
      const cat = await loadCatalog(ctx as any, familyId);
      const resolved = await register(ctx as any, familyId, cat, parsed);
      const items: RecipeItem[] = resolved.map((it, i) => (parsed[i].prep ? { ...it, prep: parsed[i].prep } : it));
      const key = mealKey(t);
      const oldKey = clean(originalKey, 80).toLowerCase();
      if (oldKey && oldKey !== key) {
        const old = await ctx.db.meals.withIndex("by_family_key", (r) => r.eq("familyId", familyId).eq("key", oldKey)).first();
        if (old) await ctx.db.meals.update(old.id, { hidden: true });
        else await ctx.db.meals.insert({ familyId, key: oldKey, title: oldKey, hidden: true });
      }
      const existing = await ctx.db.meals.withIndex("by_family_key", (r) => r.eq("familyId", familyId).eq("key", key)).first();
      const fields = { title: t, ingredientsJson: JSON.stringify(items), hidden: false, servings, notes };
      if (existing) await ctx.db.meals.update(existing.id, fields);
      else await ctx.db.meals.insert({ familyId, key, ...fields });
      ctx.invalidate("meals", "recipe", "ingredients", "week");
      return { slug: slugOf(key) };
    }),

    addRecipeToList: mutation(async (ctx, slug: string) => {
      const { familyId } = await requireFamily(ctx as any);
      const meals = await familyMeals(ctx as any, familyId);
      const m = meals.find((x) => x.slug === clean(slug, 120).toLowerCase());
      if (!m) throw new Error("That recipe is gone.");
      if (!m.items.length) throw new Error("This recipe has no ingredients yet.");
      await addIngredients(ctx as any, familyId, m.title, m.items);
      ctx.invalidate("list", "ingredients");
      return { added: m.items.length };
    }),

    addIngredient: mutation(async (ctx, name: string, aisle: string) => {
      const { familyId } = await requireFamily(ctx as any);
      const n = normalizeName(clean(name, 60));
      if (!n.key) throw new Error("What's the ingredient called?");
      const cat = await loadCatalog(ctx as any, familyId);
      const existing = cat.byKey.get(n.key);
      if (existing) throw new Error(`You already have ${existing.name}.`);
      await ctx.db.ingredients.insert({ familyId, key: n.key, name: n.name, aisle: needAisle(aisle), aliasesJson: "[]" });
      ctx.invalidate("ingredients");
    }),

    saveIngredient: mutation(async (ctx, key: string, name: string, aisle: string) => {
      const { familyId } = await requireFamily(ctx as any);
      const cat = await loadCatalog(ctx as any, familyId);
      const row = cat.rows.find((r) => r.key === String(key));
      if (!row) throw new Error("That ingredient is gone.");
      const shown = clean(name, 60);
      if (!shown) throw new Error("What's the ingredient called?");
      const n = normalizeName(shown);
      const clash = n.key ? cat.byKey.get(n.key) : null;
      if (clash && clash.key !== row.key) throw new Error(`${clash.name} already has that name. Merge them instead.`);
      const aliases = aliasesOf(row);
      // Typing the new name in a recipe should land on this ingredient too.
      if (n.key && n.key !== row.key && !aliases.includes(n.key)) aliases.push(n.key);
      await ctx.db.ingredients.update(row.id, { name: shown.charAt(0).toLowerCase() + shown.slice(1), aisle: needAisle(aisle), aliasesJson: JSON.stringify(aliases) });
      ctx.invalidate("ingredients", "recipe", "meals", "list", "week");
    }),

    mergeIngredient: mutation(async (ctx, fromKey: string, intoKey: string) => {
      const { familyId } = await requireFamily(ctx as any);
      const cat = await loadCatalog(ctx as any, familyId);
      const from = cat.rows.find((r) => r.key === String(fromKey));
      const into = cat.rows.find((r) => r.key === String(intoKey));
      if (!from || !into) throw new Error("One of those ingredients is gone.");
      if (from.id === into.id) return;
      const aliases = new Set([...aliasesOf(into), from.key as string, ...aliasesOf(from)]);
      aliases.delete(into.key as string);
      await ctx.db.ingredients.update(into.id, { aliasesJson: JSON.stringify([...aliases]) });
      await ctx.db.ingredients.delete(from.id);
      ctx.invalidate("ingredients", "recipe", "meals", "list", "week");
    }),

    splitIngredient: mutation(async (ctx, key: string, alias: string) => {
      const { familyId } = await requireFamily(ctx as any);
      const cat = await loadCatalog(ctx as any, familyId);
      const row = cat.rows.find((r) => r.key === String(key));
      const a = String(alias ?? "");
      if (!row || !aliasesOf(row).includes(a)) throw new Error("That name isn't merged here anymore.");
      await ctx.db.ingredients.update(row.id, { aliasesJson: JSON.stringify(aliasesOf(row).filter((x) => x !== a)) });
      const name = a.startsWith("can:") ? `${a.slice(4)} (can)` : a.startsWith("jar:") ? `${a.slice(4)} (jar)` : a;
      await ctx.db.ingredients.insert({ familyId, key: a, name, aisle: row.aisle, aliasesJson: "[]" });
      ctx.invalidate("ingredients", "recipe", "meals", "list", "week");
    }),

    removeIngredient: mutation(async (ctx, key: string) => {
      const { familyId } = await requireFamily(ctx as any);
      const [cat, meals] = await Promise.all([loadCatalog(ctx as any, familyId), familyMeals(ctx as any, familyId)]);
      const row = cat.rows.find((r) => r.key === String(key));
      if (!row) return;
      const users = meals.filter((m) => m.items.some((i) => canonKey(cat, i.key) === row.key));
      if (users.length) throw new Error(`${row.name} is in ${users.length === 1 ? users[0].title : `${users.length} recipes`}. Take it out there first, or merge it.`);
      await ctx.db.ingredients.delete(row.id);
      ctx.invalidate("ingredients");
    }),

    removeMeal: mutation(async (ctx, key: string) => {
      const { familyId } = await requireFamily(ctx as any);
      const k = clean(key, 80).toLowerCase();
      if (!k) return;
      const row = await ctx.db.meals.withIndex("by_family_key", (r) => r.eq("familyId", familyId).eq("key", k)).first();
      if (row) await ctx.db.meals.update(row.id, { hidden: true });
      else await ctx.db.meals.insert({ familyId, key: k, title: k, hidden: true });
      ctx.invalidate("meals", "recipe", "ingredients", "week");
    }),

    removeSuggestion: mutation(async (ctx, suggestionId: string) => {
      const { me, family, familyId } = await requireFamily(ctx as any);
      const s = await ctx.db.suggestions.get(suggestionId);
      if (!s || s.familyId !== familyId) return;
      if (s.byUser !== me.userId && !s.fromFork && family.ownerId !== me.userId) throw new Error("You can only remove your own suggestions.");
      const plan = await getPlan(ctx as any, familyId, s.date);
      if (plan && plan.pickedSuggestionId === s.id) {
        await ctx.db.dayPlans.update(plan.id, { pickedSuggestionId: null, pickedTitle: null });
        await clearSource(ctx as any, familyId, s.date);
      }
      const votes = await ctx.db.votes.withIndex("by_suggestion", (r) => r.eq("suggestionId", s.id)).collect();
      for (const v of votes) await ctx.db.votes.delete(v.id);
      await ctx.db.suggestions.delete(s.id);
      ctx.invalidate(...ALL);
    }),

    toggleVote: mutation(async (ctx, suggestionId: string) => {
      const { me, familyId } = await requireFamily(ctx as any);
      const s = await ctx.db.suggestions.get(suggestionId);
      if (!s || s.familyId !== familyId) throw new Error("That suggestion is gone.");
      const votes = await ctx.db.votes.withIndex("by_suggestion", (r) => r.eq("suggestionId", s.id)).collect();
      const mine = votes.find((v) => v.userId === me.userId);
      if (mine) await ctx.db.votes.delete(mine.id);
      else await ctx.db.votes.insert({ familyId, suggestionId: s.id, date: s.date, userId: me.userId });
      ctx.invalidate("week");
    }),

    setChef: mutation(async (ctx, date: string, on: boolean) => {
      const { me, member, familyId } = await requireFamily(ctx as any);
      const d = needDate(date);
      const plan = await ensurePlan(ctx as any, familyId, d);
      if (on) await ctx.db.dayPlans.update(plan.id, { chefId: me.userId, chefName: member.displayName });
      else if (plan.chefId === me.userId) await ctx.db.dayPlans.update(plan.id, { chefId: null, chefName: null });
      ctx.invalidate("week");
    }),

    pickMeal: mutation(async (ctx, date: string, suggestionId: string) => {
      const { familyId } = await requireFamily(ctx as any);
      const d = needDate(date);
      const plan = await ensurePlan(ctx as any, familyId, d);
      await clearSource(ctx as any, familyId, d);
      if (!suggestionId || plan.pickedSuggestionId === suggestionId) {
        await ctx.db.dayPlans.update(plan.id, { pickedSuggestionId: null, pickedTitle: null });
      } else {
        const s = await ctx.db.suggestions.get(suggestionId);
        if (!s || s.familyId !== familyId || s.date !== d) throw new Error("That suggestion is gone.");
        await ctx.db.dayPlans.update(plan.id, { pickedSuggestionId: s.id, pickedTitle: s.title });
        let items = ingredientsOf(s.ingredientsJson);
        if (!items.length) {
          // Older suggestions saved without ingredients get filled in when picked.
          const filled = await fillIngredients(ctx as any, familyId, s.title);
          if (filled.items.length) {
            items = filled.items;
            await ctx.db.suggestions.update(s.id, { ingredientsJson: JSON.stringify(items), ingredientsNote: filled.note });
          }
        }
        await addIngredients(ctx as any, familyId, d, items);
      }
      ctx.invalidate("week", "list", "meals", "recipe", "ingredients");
    }),

    planAhead: mutation(async (ctx, start: string, days: number) => {
      const { familyId } = await requireFamily(ctx as any);
      const from = needDate(start);
      const n = Math.max(1, Math.min(14, Math.floor(Number(days) || 7)));
      const dates = dateRange(from, n);
      const to = dates[dates.length - 1];
      const existing = await ctx.db.suggestions
        .withIndex("by_family_date", (r) => r.eq("familyId", familyId).gte("date", addDays(from, -21)).lte("date", to))
        .collect();
      const emptyDays = dates.filter((d) => !existing.some((s) => s.date === d));
      if (!emptyDays.length) return { added: 0 };
      // Avoid anything suggested or eaten in the last three weeks.
      const recent = new Set(existing.map((s) => String(s.title).toLowerCase()));
      // Favorites: meals this family picked before.
      const plans = await ctx.db.dayPlans.withIndex("by_family_date", (r) => r.eq("familyId", familyId).lt("date", from)).collect();
      const counts = new Map<string, { title: string; ingredients: string[]; times: number }>();
      for (const p of plans.slice(-120)) {
        if (!p.pickedSuggestionId) continue;
        const s = await ctx.db.suggestions.get(p.pickedSuggestionId);
        if (!s || s.fromFork) continue;
        const k = String(s.title).toLowerCase();
        const lines = ingredientsOf(s.ingredientsJson).map((i) => `${i.qty || ""} ${i.unit ? i.unit : ""} ${i.name}`.trim());
        const prev = counts.get(k);
        counts.set(k, { title: s.title, ingredients: prev?.ingredients.length ? prev.ingredients : lines, times: (prev?.times ?? 0) + 1 });
      }
      const ideas = pickIdeas(`${familyId}:${from}`, emptyDays.length * 2, recent, [...counts.values()]);
      let added = 0;
      for (let i = 0; i < emptyDays.length; i++) {
        for (const idea of ideas.slice(i * 2, i * 2 + 2)) {
          const ingredients = idea.ingredients.map((l) => parseIngredient(l)).filter((x): x is Ingredient => x !== null);
          await ctx.db.suggestions.insert({
            familyId, date: emptyDays[i], title: idea.title, ingredientsJson: JSON.stringify(ingredients),
            byUser: "fork", byName: idea.favorite ? "Fork (a family favorite)" : "Fork", fromFork: true,
          });
          added++;
        }
      }
      ctx.invalidate("week");
      return { added };
    }),

    addItem: mutation(async (ctx, text: string) => {
      const { familyId } = await requireFamily(ctx as any);
      const items = parseIngredientList(String(text ?? "").slice(0, 2000)).slice(0, 30);
      if (!items.length) throw new Error("Type what you need, like “2 lb apples”.");
      await addIngredients(ctx as any, familyId, "manual", items);
      ctx.invalidate("list", "ingredients");
    }),

    toggleItem: mutation(async (ctx, key: string) => {
      const { member, familyId } = await requireFamily(ctx as any);
      const k = String(key ?? "").slice(0, 200);
      const cat = await loadCatalog(ctx as any, familyId);
      const checks = await ctx.db.listChecks.withIndex("by_family", (r) => r.eq("familyId", familyId)).collect();
      const mine = checks.filter((c) => canonKey(cat, c.key as string) === k);
      if (mine.length) for (const c of mine) await ctx.db.listChecks.delete(c.id);
      else await ctx.db.listChecks.insert({ familyId, key: k, byName: member.displayName });
      ctx.invalidate("list");
    }),

    removeItem: mutation(async (ctx, key: string) => {
      const { familyId } = await requireFamily(ctx as any);
      const k = String(key ?? "").slice(0, 200);
      const cat = await loadCatalog(ctx as any, familyId);
      const [entries, checks] = await Promise.all([
        ctx.db.listEntries.withIndex("by_family", (r) => r.eq("familyId", familyId)).collect(),
        ctx.db.listChecks.withIndex("by_family", (r) => r.eq("familyId", familyId)).collect(),
      ]);
      for (const e of entries) if (canonKey(cat, e.key as string) === k) await ctx.db.listEntries.delete(e.id);
      for (const c of checks) if (canonKey(cat, c.key as string) === k) await ctx.db.listChecks.delete(c.id);
      ctx.invalidate("list");
    }),

    clearChecked: mutation(async (ctx) => {
      const { familyId } = await requireFamily(ctx as any);
      const cat = await loadCatalog(ctx as any, familyId);
      const [entries, checks] = await Promise.all([
        ctx.db.listEntries.withIndex("by_family", (r) => r.eq("familyId", familyId)).collect(),
        ctx.db.listChecks.withIndex("by_family", (r) => r.eq("familyId", familyId)).collect(),
      ]);
      const done = new Set(checks.map((c) => canonKey(cat, c.key as string)));
      for (const e of entries) if (done.has(canonKey(cat, e.key as string))) await ctx.db.listEntries.delete(e.id);
      for (const c of checks) await ctx.db.listChecks.delete(c.id);
      ctx.invalidate("list");
    }),
  },
});
