// Production entry. Handlers live in ./app; this file lists them by name
// because Spacefast reads the capsule's surface from this file's source.
import { boolean, capsule, id, number, string, table, userId } from "@spacefast/zero/server";
import { mutations as m, queries as q } from "./app";
import { assertListed } from "./entry-check";

export const schema = {
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
  // One photo per meal name, per family: uploaded, taken, or picked from search.
  photos: table({
    familyId: id("families"),
    key: string(),
    url: string(),
    source: string(), // "upload" or the search source, like "Wikimedia Commons"
    credit: string().default(""),
    creditUrl: string().default(""),
  })
    .index("by_family", ["familyId"])
    .index("by_family_key", ["familyId", "key"]),
};

const queries = {
    me: q.me,
    inviteInfo: q.inviteInfo,
    meals: q.meals,
    recipe: q.recipe,
    ingredients: q.ingredients,
    week: q.week,
    list: q.list,
    photos: q.photos,
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
    setPhoto: m.setPhoto,
    removePhoto: m.removePhoto,
};

assertListed("server/index.ts", q, queries, m, mutations);

export default capsule({
  name: "Fork",
  schema,
  auth: { requireSignIn: true },
  queries,
  mutations,
});
