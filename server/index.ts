import { boolean, capsule, id, mutation, number, query, string, table, userId } from "@spacefast/zero/server";
import { aggregateList, parseIngredient, parseIngredientList, type Ingredient } from "../shared/ingredients";
import { addDays, dateRange, dayName, isDate } from "../shared/dates";
import { pickIdeas } from "../shared/ideas";

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
};

const ALL = ["me", "week", "list"];

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

async function addIngredients(ctx: Ctx, familyId: string, source: string, items: Ingredient[]) {
  for (const it of items) {
    await ctx.db.listEntries.insert({ familyId, key: it.key, name: it.name, qty: it.qty, unit: it.unit, aisle: it.aisle, source });
    // A re-added item should show as still needed.
    const check = await ctx.db.listChecks.withIndex("by_family_key", (r: any) => r.eq("familyId", familyId).eq("key", it.key)).first();
    if (check) await ctx.db.listChecks.delete(check.id);
  }
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

    week: query(async (ctx, start: string, days: number) => {
      const { me, familyId } = await requireFamily(ctx as any);
      const from = needDate(start);
      const n = Math.max(1, Math.min(14, Math.floor(Number(days) || 7)));
      const to = addDays(from, n - 1);
      const range = (r: any) => r.eq("familyId", familyId).gte("date", from).lte("date", to);
      const [suggestions, votes, plans] = await Promise.all([
        ctx.db.suggestions.withIndex("by_family_date", range).collect(),
        ctx.db.votes.withIndex("by_family_date", range).collect(),
        ctx.db.dayPlans.withIndex("by_family_date", range).collect(),
      ]);
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
              ingredients: ingredientsOf(s.ingredientsJson as string).map((i) => i.name),
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
      const groups = aggregateList(entries as any, new Set(checks.map((c) => c.key as string)));
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
      const ingredients = parseIngredientList(String(ingredientsText ?? "").slice(0, 4000)).slice(0, 60);
      await ctx.db.suggestions.insert({
        familyId, date: d, title: t, ingredientsJson: JSON.stringify(ingredients),
        byUser: me.userId, byName: member.displayName, fromFork: false,
      });
      ctx.invalidate("week");
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
        await addIngredients(ctx as any, familyId, d, ingredientsOf(s.ingredientsJson));
      }
      ctx.invalidate("week", "list");
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
      ctx.invalidate("list");
    }),

    toggleItem: mutation(async (ctx, key: string) => {
      const { member, familyId } = await requireFamily(ctx as any);
      const k = String(key ?? "").slice(0, 200);
      const check = await ctx.db.listChecks.withIndex("by_family_key", (r) => r.eq("familyId", familyId).eq("key", k)).first();
      if (check) await ctx.db.listChecks.delete(check.id);
      else await ctx.db.listChecks.insert({ familyId, key: k, byName: member.displayName });
      ctx.invalidate("list");
    }),

    removeItem: mutation(async (ctx, key: string) => {
      const { familyId } = await requireFamily(ctx as any);
      const k = String(key ?? "").slice(0, 200);
      const rows = await ctx.db.listEntries.withIndex("by_family_key", (r) => r.eq("familyId", familyId).eq("key", k)).collect();
      for (const row of rows) await ctx.db.listEntries.delete(row.id);
      const check = await ctx.db.listChecks.withIndex("by_family_key", (r) => r.eq("familyId", familyId).eq("key", k)).first();
      if (check) await ctx.db.listChecks.delete(check.id);
      ctx.invalidate("list");
    }),

    clearChecked: mutation(async (ctx) => {
      const { familyId } = await requireFamily(ctx as any);
      const checks = await ctx.db.listChecks.withIndex("by_family", (r) => r.eq("familyId", familyId)).collect();
      for (const c of checks) {
        const rows = await ctx.db.listEntries.withIndex("by_family_key", (r) => r.eq("familyId", familyId).eq("key", c.key)).collect();
        for (const row of rows) await ctx.db.listEntries.delete(row.id);
        await ctx.db.listChecks.delete(c.id);
      }
      ctx.invalidate("list");
    }),
  },
});
