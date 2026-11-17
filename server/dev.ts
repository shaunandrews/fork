// LOCAL SCENARIO TESTING ONLY. Never deployed.
// spacefast.config.ts points `sf dev` here only when FORK_SCENARIOS=1 (see DEV.md).
// It allows named dev guests (guest:sam, guest:maya…) instead of real sign-in,
// and adds devSeed, which rebuilds a known world of families to test against.
import { boolean, capsule, id, mutation, number, query, string, table, userId } from "@spacefast/zero/server";
import { enableDevGuests, mutations as m, queries as q } from "./app";
import { schema as prodSchema } from "./index";
import { assertListed } from "./entry-check";
import { addDays } from "../shared/dates";

enableDevGuests();

// A copy of the schema in server/index.ts (Spacefast reads it from each entry's source).
// The check below stops the dev server if the two drift apart.
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

if (JSON.stringify(schema) !== JSON.stringify(prodSchema)) {
  throw new Error("server/dev.ts schema differs from server/index.ts. Copy the schema from index.ts.");
}

/** Runs a real handler as a named persona, exactly as their browser would. */
function as(ctx: any, name: string) {
  const auth: any = {
    user: null,
    userId: `guest:${name}`,
    displayName: name[0].toUpperCase() + name.slice(1),
    provider: "guest",
    isGuest: true,
    isAuthenticated: false,
    isSignedIn: false,
  };
  auth.requireIdentity = () => auth;
  auth.requireSignedIn = () => auth;
  return { ...ctx, auth };
}

async function suggestionId(ctx: any, date: string, title: string): Promise<string> {
  const rows = await ctx.db.suggestions.withIndex("by_family_date").collect();
  const row = rows.find((r: any) => r.date === date && r.title === title);
  if (!row) throw new Error(`Seed: no suggestion ${title} on ${date}`);
  return row.id;
}

const devSeed = mutation(async (ctx: any, today: string) => {
  // Wipe everything. Tables are named directly: ctx.db only exposes tables the source names.
  const wipe = async (api: any, index: string) => {
    for (const r of await api.withIndex(index).collect()) await api.delete(r.id);
  };
  await wipe(ctx.db.votes, "by_suggestion");
  await wipe(ctx.db.suggestions, "by_family_date");
  await wipe(ctx.db.dayPlans, "by_family_date");
  await wipe(ctx.db.listChecks, "by_family");
  await wipe(ctx.db.listEntries, "by_family");
  await wipe(ctx.db.meals, "by_family");
  await wipe(ctx.db.ingredients, "by_family");
  await wipe(ctx.db.members, "by_user");
  await wipe(ctx.db.families, "by_invite");
  const d = (n: number) => addDays(today, n);
  const sam = as(ctx, "sam"), maya = as(ctx, "maya"), leo = as(ctx, "leo"), alex = as(ctx, "alex");

  // The Andrews: an established family of four. Fixed invite code "andrews".
  await m.createFamily(sam, "The Andrews", "Sam");
  const fam = (await ctx.db.families.withIndex("by_invite").collect())[0];
  await ctx.db.families.update(fam.id, { inviteCode: "andrews" });
  await m.joinFamily(maya, "andrews", "Maya");
  await m.joinFamily(leo, "andrews", "Leo");
  await m.joinFamily(alex, "andrews", "Alex");

  // Tonight: three ideas, votes, a chef, a pick.
  await m.suggestMeal(sam, d(0), "Spaghetti bolognese", "1 lb ground beef\n1 lb spaghetti\n1 onion\n2 carrots\n2 celery stalks\n3 cloves garlic\n1 can crushed tomatoes\n1 cup parmesan");
  await m.suggestMeal(maya, d(0), "Homemade pizza night", "");
  await m.suggestMeal(leo, d(0), "Breakfast for dinner", "");
  const spag = await suggestionId(ctx, d(0), "Spaghetti bolognese");
  const pizza = await suggestionId(ctx, d(0), "Homemade pizza night");
  for (const who of [maya, leo, alex]) await m.toggleVote(who, spag);
  await m.toggleVote(sam, pizza);
  await m.setChef(sam, d(0), true);
  await m.pickMeal(sam, d(0), spag);

  // Tomorrow and the day after: picked, with chefs.
  await m.suggestMeal(alex, d(1), "Lemon herb roast chicken", "");
  await m.setChef(alex, d(1), true);
  await m.pickMeal(alex, d(1), await suggestionId(ctx, d(1), "Lemon herb roast chicken"));
  await m.suggestMeal(maya, d(2), "Black bean burrito bowls", "");
  await m.setChef(maya, d(2), true);
  await m.pickMeal(maya, d(2), await suggestionId(ctx, d(2), "Black bean burrito bowls"));

  // Day 3: undecided, votes split. Days 4–6: empty.
  await m.suggestMeal(leo, d(3), "Beef tacos", "");
  await m.suggestMeal(sam, d(3), "Chickpea curry", "");
  await m.toggleVote(leo, await suggestionId(ctx, d(3), "Beef tacos"));
  await m.toggleVote(maya, await suggestionId(ctx, d(3), "Chickpea curry"));

  // A family recipe with steps.
  await m.saveRecipe(sam, "", JSON.stringify({
    title: "Grandma's lasagna",
    servings: 8,
    notes: "Brown the beef with the onion.\nLayer noodles, sauce, ricotta and mozzarella three times.\nBake covered 45 minutes at 375°F, then 15 uncovered.",
    items: [
      { amount: "1 box", name: "lasagna noodles", prep: "" },
      { amount: "1 lb", name: "ground beef", prep: "" },
      { amount: "1", name: "onion", prep: "diced" },
      { amount: "1 jar", name: "marinara sauce", prep: "" },
      { amount: "15 oz", name: "ricotta", prep: "" },
      { amount: "16 oz", name: "mozzarella", prep: "shredded" },
    ],
  }));

  // Shopping: a manual item, and Maya has ticked two things.
  await m.addItem(maya, "Paper towels");
  const list: any = await q.list(maya);
  const keys: string[] = (list?.groups ?? list?.aisles ?? [])
    .flatMap((g: any) => g.items ?? [])
    .map((it: any) => it.key)
    .slice(0, 2);
  for (const k of keys) await m.toggleItem(maya, k);

  // The Parks: brand new, just Olive, nothing planned.
  await m.createFamily(as(ctx, "olive"), "The Parks", "Olive");

  return { ok: true, today };
});

/** Whether devSeed has run since this server started (memory state resets on every reload). */
const devStatus = query(async (ctx: any) => {
  const fam = await ctx.db.families.withIndex("by_invite").first();
  return { seeded: !!fam };
});

const queries = {
    me: q.me,
    inviteInfo: q.inviteInfo,
    meals: q.meals,
    recipe: q.recipe,
    ingredients: q.ingredients,
    week: q.week,
    list: q.list,
  devStatus,
};

const mutations = {
    createFamily: m.createFamily,
    joinFamily: m.joinFamily,
    setMyName: m.setMyName,
    resetInvite: m.resetInvite,
    suggestMeal: m.suggestMeal,
    setIngredients: m.setIngredients,
    saveRecipe: m.saveRecipe,
    addRecipeToList: m.addRecipeToList,
    addIngredient: m.addIngredient,
    saveIngredient: m.saveIngredient,
    mergeIngredient: m.mergeIngredient,
    splitIngredient: m.splitIngredient,
    removeIngredient: m.removeIngredient,
    removeMeal: m.removeMeal,
    removeSuggestion: m.removeSuggestion,
    toggleVote: m.toggleVote,
    setChef: m.setChef,
    pickMeal: m.pickMeal,
    planAhead: m.planAhead,
    addItem: m.addItem,
    toggleItem: m.toggleItem,
    removeItem: m.removeItem,
    clearChecked: m.clearChecked,
  devSeed,
};

assertListed("server/dev.ts", q, queries, m, mutations);

export default capsule({
  name: "Fork",
  schema,
  auth: { requireSignIn: false },
  queries,
  mutations,
});
