// Meals: the family's recipes, Fork's ideas, and the ingredients they share.
// One ingredient list for the family means "onions" in one recipe and
// "yellow onion" in another can be merged, and the shopping list adds them up.
import { useState } from "preact/hooks";
import { Link, navigate, useLocation } from "@spacefast/zero/client";
import { api, btnGhost, btnPrimary, btnQuiet, card, ErrorLine, input, Loading, SuggestOnDay, useRunner } from "./index";
import { AISLES, formatAmount, parseIngredient } from "../shared/ingredients";
import { RECIPES } from "../shared/recipes";
import { dayName, shortDate } from "../shared/dates";

const mealKey = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();
const slugOf = (key: string) => key.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "meal";
const label = "text-xs font-semibold uppercase tracking-wide text-ink-muted";

function madeLine(times: number, last: string | null): string {
  if (!times) return "Not made yet";
  const n = times === 1 ? "Made once" : `Made ${times} times`;
  return last ? `${n} · last ${dayName(last)} ${shortDate(last)}` : n;
}

function Notice({ text }: { text: string | null }) {
  if (!text) return null;
  return <p class="rounded-lg bg-canvas px-3 py-2 text-sm text-success">{text}</p>;
}

// ---------- section nav ----------

function MealsNav() {
  const loc = useLocation();
  const item = (to: string, text: string) => {
    const on = loc.pathname === to;
    return (
      <Link to={to} class={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium ${on ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"}`}>
        {text}
      </Link>
    );
  };
  return (
    <nav class="mb-4 flex gap-1 rounded-lg border border-line bg-canvas p-1">
      {item("/meals", "Recipes")}
      {item("/meals/ideas", "Ideas")}
      {item("/meals/ingredients", "Ingredients")}
    </nav>
  );
}

function BackLink({ to, text }: { to: string; text: string }) {
  return (
    <Link to={to} class="mb-3 inline-block text-sm text-ink-muted hover:text-ink">
      ‹ {text}
    </Link>
  );
}

function Search({ value, onInput, placeholder }: { value: string; onInput: (v: string) => void; placeholder: string }) {
  return <input class={input} type="search" placeholder={placeholder} value={value} onInput={(e) => onInput((e.target as HTMLInputElement).value)} />;
}

// ---------- recipes list ----------

export function RecipesPage() {
  const meals = api.useQuery("meals");
  const [q, setQ] = useState("");
  if (meals === undefined) return <Loading />;
  const needle = q.trim().toLowerCase();
  const shown = meals.filter((m) => !needle || m.title.toLowerCase().includes(needle) || m.preview.some((p) => p.includes(needle)));
  return (
    <div>
      <MealsNav />
      <div class="flex gap-2">
        <Search value={q} onInput={setQ} placeholder="Search recipes or ingredients" />
        <Link to="/meals/new" class={`${btnPrimary} shrink-0`}>
          + New recipe
        </Link>
      </div>
      {shown.length ? (
        <ul class="mt-4 flex flex-col gap-2">
          {shown.map((m) => (
            <li key={m.key}>
              <Link to={`/recipe/${m.slug}`} class={`${card} flex items-center gap-3 p-3 hover:border-accent`}>
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-ink">{m.title}</div>
                  <div class="truncate text-sm text-ink-muted">
                    {m.preview.length ? m.preview.join(", ") + (m.ingredientCount > m.preview.length ? `, +${m.ingredientCount - m.preview.length}` : "") : "No ingredients yet"}
                  </div>
                  <div class="mt-0.5 text-xs text-ink-muted">
                    {madeLine(m.timesPicked, m.lastPicked)}
                    {m.servings ? ` · serves ${m.servings}` : ""}
                  </div>
                </div>
                <span class="text-ink-muted">›</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div class={`${card} mt-4 text-center text-sm text-ink-muted`}>
          {needle ? (
            "No recipes match."
          ) : (
            <>
              <p>Your family's recipes live here. Meals you pick on the week show up too.</p>
              <p class="mt-2">
                Start one, or <Link to="/meals/ideas" class="text-accent">browse Fork's ideas</Link>.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- one recipe ----------

type Row = { amount: string; name: string; prep: string };
type Draft = { title: string; servings: string; notes: string; rows: Row[] };

function splitLine(line: string): Row | null {
  const [head, ...rest] = line.split(",");
  const it = parseIngredient(head);
  if (!it) return null;
  return { amount: formatAmount(it.qty, it.unit), name: it.name, prep: rest.join(",").trim() };
}

function RecipeEditor({ start, originalKey, onSaved, onCancel }: { start: Draft; originalKey: string; onSaved: (slug: string) => void; onCancel: () => void }) {
  const save = api.useMutation("saveRecipe");
  const known = api.useQuery("ingredients");
  const [d, setD] = useState<Draft>(start.rows.length ? start : { ...start, rows: [{ amount: "", name: "", prep: "" }] });
  const [paste, setPaste] = useState<string | null>(null);
  const r = useRunner();
  const setRow = (i: number, patch: Partial<Row>) => setD({ ...d, rows: d.rows.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const val = (e: Event) => (e.target as HTMLInputElement).value;
  return (
    <form
      class="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await r.run(() =>
          save(originalKey, JSON.stringify({ title: d.title, servings: d.servings, notes: d.notes, items: d.rows.filter((x) => x.name.trim()) })),
        );
        if (res) onSaved(res.slug);
      }}
    >
      <div class="grid grid-cols-[1fr_6rem] gap-2">
        <label class="flex flex-col gap-1">
          <span class={label}>Name</span>
          <input class={input} placeholder="Grandma's lasagna" value={d.title} onInput={(e) => setD({ ...d, title: val(e) })} />
        </label>
        <label class="flex flex-col gap-1">
          <span class={label}>Serves</span>
          <input class={input} type="number" min="0" max="50" placeholder="4" value={d.servings} onInput={(e) => setD({ ...d, servings: val(e) })} />
        </label>
      </div>

      <div>
        <div class="mb-1 grid grid-cols-[5.5rem_1fr_1fr_2rem] gap-2">
          <span class={label}>Amount</span>
          <span class={label}>Ingredient</span>
          <span class={label}>Prep</span>
          <span />
        </div>
        <datalist id="fork-ingredients">
          {(known ?? []).map((k) => (
            <option key={k.key} value={k.name} />
          ))}
        </datalist>
        <div class="flex flex-col gap-2">
          {d.rows.map((row, i) => (
            <div key={i} class="grid grid-cols-[5.5rem_1fr_1fr_2rem] items-center gap-2">
              <input class={input} placeholder="2 lb" value={row.amount} onInput={(e) => setRow(i, { amount: val(e) })} />
              <input class={input} list="fork-ingredients" placeholder="chicken thighs" value={row.name} onInput={(e) => setRow(i, { name: val(e) })} />
              <input class={input} placeholder="diced" value={row.prep} onInput={(e) => setRow(i, { prep: val(e) })} />
              <button type="button" class={btnGhost} aria-label="Remove ingredient" onClick={() => setD({ ...d, rows: d.rows.filter((_, j) => j !== i) })}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <div class="mt-2 flex gap-3">
          <button type="button" class={`${btnGhost} px-0`} onClick={() => setD({ ...d, rows: [...d.rows, { amount: "", name: "", prep: "" }] })}>
            + Add ingredient
          </button>
          {paste === null ? (
            <button type="button" class={`${btnGhost} px-0`} onClick={() => setPaste("")}>
              Paste a list
            </button>
          ) : null}
        </div>
        {paste !== null ? (
          <div class="mt-2 flex flex-col gap-2 rounded-lg bg-canvas p-3">
            <textarea
              class={`${input} min-h-28`}
              placeholder={"One per line\n2 lb chicken thighs\n1 onion, diced\n3 cloves garlic"}
              value={paste}
              onInput={(e) => setPaste((e.target as HTMLTextAreaElement).value)}
            />
            <div class="flex gap-2">
              <button
                type="button"
                class={btnQuiet}
                onClick={() => {
                  const added = paste.split("\n").map(splitLine).filter((x): x is Row => x !== null);
                  setD({ ...d, rows: [...d.rows.filter((x) => x.name.trim()), ...added] });
                  setPaste(null);
                }}
              >
                Add these
              </button>
              <button type="button" class={btnGhost} onClick={() => setPaste(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <label class="flex flex-col gap-1">
        <span class={label}>How to make it</span>
        <textarea
          class={`${input} min-h-36`}
          placeholder={"Steps, timings, tips. Whatever helps whoever's cooking.\n1. Brown the chicken…"}
          value={d.notes}
          onInput={(e) => setD({ ...d, notes: (e.target as HTMLTextAreaElement).value })}
        />
      </label>

      <div class="flex gap-2">
        <button class={btnPrimary} disabled={r.busy || !d.title.trim()}>
          Save recipe
        </button>
        <button type="button" class={btnGhost} onClick={onCancel}>
          Cancel
        </button>
      </div>
      <ErrorLine text={r.error} />
    </form>
  );
}

export function NewRecipePage() {
  return (
    <div>
      <BackLink to="/meals" text="Recipes" />
      <h2 class="mb-4 text-xl font-bold">New recipe</h2>
      <RecipeEditor
        start={{ title: "", servings: "", notes: "", rows: [] }}
        originalKey=""
        onSaved={(slug) => navigate(`/recipe/${slug}`, { replace: true })}
        onCancel={() => navigate("/meals")}
      />
    </div>
  );
}

function IngredientTable({ items }: { items: { amount: string; name: string; prep: string }[] }) {
  if (!items.length) return <p class="text-sm text-ink-muted">No ingredients yet.</p>;
  return (
    <ul class="divide-y divide-line">
      {items.map((it, i) => (
        <li key={i} class="grid grid-cols-[6rem_1fr] gap-3 py-2 text-sm">
          <span class="text-right font-medium tabular-nums text-ink">{it.amount || "—"}</span>
          <span>
            {it.name}
            {it.prep ? <span class="text-ink-muted">, {it.prep}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function RecipePage({ slug }: { slug?: string }) {
  const recipe = api.useQuery("recipe", slug ?? "");
  const remove = api.useMutation("removeMeal");
  const toList = api.useMutation("addRecipeToList");
  const [mode, setMode] = useState<"view" | "edit" | "plan" | "delete">("view");
  const [note, setNote] = useState<string | null>(null);
  const r = useRunner();
  if (recipe === undefined) return <Loading />;
  if (recipe === null)
    return (
      <div>
        <BackLink to="/meals" text="Recipes" />
        <p class={`${card} text-sm text-ink-muted`}>That recipe isn't here anymore.</p>
      </div>
    );
  if (mode === "edit")
    return (
      <div>
        <BackLink to="/meals" text="Recipes" />
        <h2 class="mb-4 text-xl font-bold">Edit recipe</h2>
        <RecipeEditor
          start={{ title: recipe.title, servings: recipe.servings ? String(recipe.servings) : "", notes: recipe.notes, rows: recipe.items.map((i) => ({ amount: i.amount, name: i.name, prep: i.prep })) }}
          originalKey={recipe.key}
          onSaved={(s) => {
            setMode("view");
            setNote("Saved.");
            if (s !== recipe.slug) navigate(`/recipe/${s}`, { replace: true });
          }}
          onCancel={() => setMode("view")}
        />
      </div>
    );
  return (
    <div class="flex flex-col gap-4">
      <div>
        <BackLink to="/meals" text="Recipes" />
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-2xl font-bold">{recipe.title}</h2>
          <button class={btnQuiet} onClick={() => setMode("edit")}>
            Edit
          </button>
        </div>
        <p class="mt-1 text-sm text-ink-muted">
          {madeLine(recipe.timesPicked, recipe.lastPicked)}
          {recipe.servings ? ` · serves ${recipe.servings}` : ""}
        </p>
      </div>
      <Notice text={note} />

      <div class="flex flex-wrap gap-2">
        <button class={btnPrimary} onClick={() => setMode(mode === "plan" ? "view" : "plan")}>
          Plan for a day
        </button>
        <button
          class={btnQuiet}
          disabled={r.busy || !recipe.items.length}
          onClick={async () => {
            const res = await r.run(() => toList(recipe.slug));
            if (res) setNote(`Added ${res.added} ingredients to the shopping list.`);
          }}
        >
          Add to shopping list
        </button>
      </div>
      {mode === "plan" ? (
        <SuggestOnDay
          title={recipe.title}
          onDone={(msg) => {
            setMode("view");
            setNote(msg);
          }}
        />
      ) : null}
      <ErrorLine text={r.error} />

      <section class={card}>
        <h3 class={`${label} mb-1`}>Ingredients</h3>
        <IngredientTable items={recipe.items} />
      </section>

      <section class={card}>
        <h3 class={`${label} mb-2`}>How to make it</h3>
        {recipe.notes ? (
          <p class="whitespace-pre-wrap text-sm leading-relaxed">{recipe.notes}</p>
        ) : (
          <button class={`${btnGhost} px-0`} onClick={() => setMode("edit")}>
            + Add steps
          </button>
        )}
      </section>

      {mode === "delete" ? (
        <div class={`${card} flex flex-wrap items-center gap-3 text-sm`}>
          <span class="flex-1">Remove {recipe.title} from your recipes? The week and shopping list stay as they are.</span>
          <button class={`${btn2Danger}`} onClick={() => void r.run(() => remove(recipe.key)).then(() => navigate("/meals", { replace: true }))}>
            Remove
          </button>
          <button class={btnGhost} onClick={() => setMode("view")}>
            Keep it
          </button>
        </div>
      ) : (
        <button class={`${btnGhost} self-start px-0 text-danger`} onClick={() => setMode("delete")}>
          Remove recipe
        </button>
      )}
    </div>
  );
}

const btn2Danger = "inline-flex items-center justify-center rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white hover:opacity-90";

// ---------- Fork's ideas ----------

const TAGS = [...new Set(RECIPES.flatMap((x) => x.tags))].sort();

export function IdeasPage() {
  const meals = api.useQuery("meals");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const mine = new Set((meals ?? []).map((m) => m.key));
  const needle = q.trim().toLowerCase();
  const shown = RECIPES.filter(
    (x) => (!tag || x.tags.includes(tag)) && (!needle || x.title.toLowerCase().includes(needle) || x.ingredients.some((l) => l.toLowerCase().includes(needle))),
  );
  return (
    <div>
      <MealsNav />
      <Search value={q} onInput={setQ} placeholder="Search Fork's ideas" />
      <div class="mt-3 flex flex-wrap gap-1.5">
        {TAGS.map((t) => (
          <button
            key={t}
            class={`rounded-full border px-3 py-1 text-xs ${tag === t ? "border-accent bg-accent text-white" : "border-line text-ink-muted hover:text-ink"}`}
            onClick={() => setTag(tag === t ? null : t)}
          >
            {t}
          </button>
        ))}
      </div>
      <ul class="mt-4 flex flex-col gap-2">
        {shown.map((x) => (
          <li key={x.title}>
            <Link to={`/idea/${slugOf(mealKey(x.title))}`} class={`${card} flex items-center gap-3 p-3 hover:border-accent`}>
              <div class="min-w-0 flex-1">
                <div class="font-semibold text-ink">
                  {x.title}
                  {mine.has(mealKey(x.title)) ? <span class="ml-2 rounded-full bg-canvas px-2 py-0.5 text-xs font-normal text-success">In your recipes</span> : null}
                </div>
                <div class="text-xs text-ink-muted">
                  {x.tags.join(" · ")} · {x.ingredients.length} ingredients
                </div>
              </div>
              <span class="text-ink-muted">›</span>
            </Link>
          </li>
        ))}
      </ul>
      {!shown.length ? <p class="mt-6 text-center text-sm text-ink-muted">No ideas match.</p> : null}
    </div>
  );
}

export function IdeaPage({ slug }: { slug?: string }) {
  const save = api.useMutation("saveRecipe");
  const meals = api.useQuery("meals");
  const [plan, setPlan] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const r = useRunner();
  const idea = RECIPES.find((x) => slugOf(mealKey(x.title)) === slug);
  if (!idea)
    return (
      <div>
        <BackLink to="/meals/ideas" text="Ideas" />
        <p class={`${card} text-sm text-ink-muted`}>That idea isn't here.</p>
      </div>
    );
  const saved = (meals ?? []).find((m) => m.key === mealKey(idea.title));
  const rows = idea.ingredients.map(splitLine).filter((x): x is Row => x !== null);
  return (
    <div class="flex flex-col gap-4">
      <div>
        <BackLink to="/meals/ideas" text="Ideas" />
        <h2 class="text-2xl font-bold">{idea.title}</h2>
        <p class="mt-1 text-sm text-ink-muted">An idea from Fork · {idea.tags.join(" · ")} · serves about 4</p>
      </div>
      <Notice text={note} />
      <div class="flex flex-wrap gap-2">
        {saved ? (
          <Link to={`/recipe/${saved.slug}`} class={btnPrimary}>
            Open your recipe
          </Link>
        ) : (
          <button
            class={btnPrimary}
            disabled={r.busy}
            onClick={async () => {
              const res = await r.run(() => save("", JSON.stringify({ title: idea.title, servings: 4, notes: "", items: rows })));
              if (res) navigate(`/recipe/${res.slug}`);
            }}
          >
            Add to our recipes
          </button>
        )}
        <button class={btnQuiet} onClick={() => setPlan(!plan)}>
          Plan for a day
        </button>
      </div>
      {plan ? (
        <SuggestOnDay
          title={idea.title}
          onDone={(msg) => {
            setPlan(false);
            setNote(msg);
          }}
        />
      ) : null}
      <ErrorLine text={r.error} />
      <section class={card}>
        <h3 class={`${label} mb-1`}>Ingredients</h3>
        <IngredientTable items={rows} />
      </section>
      <p class="text-sm text-ink-muted">Add it to your recipes to change the amounts or write down how you make it.</p>
    </div>
  );
}

// ---------- ingredients ----------

type Ing = NonNullable<ReturnType<typeof api.useQuery<"ingredients">>>[number];

function IngredientRow({ it, all }: { it: Ing; all: Ing[] }) {
  const saveIng = api.useMutation("saveIngredient");
  const merge = api.useMutation("mergeIngredient");
  const split = api.useMutation("splitIngredient");
  const removeIng = api.useMutation("removeIngredient");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(it.name);
  const [aisle, setAisle] = useState(it.aisle);
  const [into, setInto] = useState("");
  const r = useRunner();
  const others = all.filter((x) => x.key !== it.key);
  return (
    <li class="px-4 py-2">
      <button class="flex w-full items-center gap-2 text-left" onClick={() => setOpen(!open)}>
        <span class="flex-1 font-medium">{it.name}</span>
        <span class="text-xs text-ink-muted">
          {it.usedIn.length ? `${it.usedIn.length} recipe${it.usedIn.length === 1 ? "" : "s"}` : "Not in a recipe"}
        </span>
        <span class="text-ink-muted">{open ? "⌃" : "⌄"}</span>
      </button>
      {open ? (
        <div class="mt-2 flex flex-col gap-3 border-t border-line pt-3 text-sm">
          <form
            class="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void r.run(() => saveIng(it.key, name, aisle));
            }}
          >
            <input class={`${input} min-w-0 flex-1`} value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} aria-label="Name" />
            <select class={`${input} w-auto`} value={aisle} onChange={(e) => setAisle((e.target as HTMLSelectElement).value)} aria-label="Aisle">
              {AISLES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <button class={btnQuiet} disabled={r.busy || (name === it.name && aisle === it.aisle)}>
              Save
            </button>
          </form>

          {it.usedIn.length ? (
            <p class="text-ink-muted">
              In{" "}
              {it.usedIn.map((u, i) => (
                <span key={u.slug}>
                  {i ? ", " : ""}
                  <Link to={`/recipe/${u.slug}`} class="text-accent">
                    {u.title}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}

          {it.aliases.length ? (
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-ink-muted">Also counts:</span>
              {it.aliases.map((a) => (
                <span key={a} class="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-xs">
                  {a.replace(/^(can|jar):/, "")}
                  <button class="text-ink-muted hover:text-ink" aria-label={`Split ${a} back out`} title="Split back out" onClick={() => void r.run(() => split(it.key, a))}>
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {others.length ? (
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-ink-muted">Same thing as</span>
              <select class={`${input} w-auto min-w-0 flex-1`} value={into} onChange={(e) => setInto((e.target as HTMLSelectElement).value)} aria-label="Merge into">
                <option value="">Pick an ingredient…</option>
                {others.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button class={btnQuiet} disabled={!into || r.busy} onClick={() => void r.run(() => merge(it.key, into))}>
                Merge
              </button>
            </div>
          ) : null}

          {!it.usedIn.length ? (
            <button class={`${btnGhost} self-start px-0 text-danger`} onClick={() => void r.run(() => removeIng(it.key))}>
              Remove ingredient
            </button>
          ) : null}
          <ErrorLine text={r.error} />
        </div>
      ) : null}
    </li>
  );
}

export function IngredientsPage() {
  const all = api.useQuery("ingredients");
  const add = api.useMutation("addIngredient");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [aisle, setAisle] = useState<string>("Produce");
  const r = useRunner();
  if (all === undefined) return <Loading />;
  const needle = q.trim().toLowerCase();
  const shown = all.filter((x) => !needle || x.name.toLowerCase().includes(needle) || x.aliases.some((a) => a.includes(needle)));
  const groups = AISLES.map((a) => ({ aisle: a as string, items: shown.filter((x) => x.aisle === a) })).filter((g) => g.items.length);
  return (
    <div>
      <MealsNav />
      <p class="mb-3 text-sm text-ink-muted">
        One list for every recipe. Merge two names for the same thing and the shopping list adds them up. The aisle sets where it shows on the list.
      </p>
      <div class="flex gap-2">
        <Search value={q} onInput={setQ} placeholder="Search ingredients" />
        {adding ? null : (
          <button class={`${btnPrimary} shrink-0`} onClick={() => setAdding(true)}>
            + Add
          </button>
        )}
      </div>
      {adding ? (
        <form
          class={`${card} mt-3 flex flex-wrap gap-2`}
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await r.run(() => add(name, aisle).then(() => true));
            if (ok) {
              setName("");
              setAdding(false);
            }
          }}
        >
          <input class={`${input} min-w-0 flex-1`} placeholder="Ingredient name" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
          <select class={`${input} w-auto`} value={aisle} onChange={(e) => setAisle((e.target as HTMLSelectElement).value)}>
            {AISLES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button class={btnPrimary} disabled={r.busy || !name.trim()}>
            Add
          </button>
          <button type="button" class={btnGhost} onClick={() => setAdding(false)}>
            Cancel
          </button>
          <ErrorLine text={r.error} />
        </form>
      ) : null}
      {!all.length ? (
        <p class={`${card} mt-4 text-center text-sm text-ink-muted`}>Ingredients appear here as your family adds recipes, picks meals and adds to the list.</p>
      ) : null}
      <div class="mt-4 flex flex-col gap-4">
        {groups.map((g) => (
          <section key={g.aisle}>
            <h3 class={`${label} mb-1`}>
              {g.aisle} <span class="font-normal normal-case">· {g.items.length}</span>
            </h3>
            <ul class={`${card} divide-y divide-line p-0`}>
              {g.items.map((it) => (
                <IngredientRow key={`${it.key}:${it.name}:${it.aisle}`} it={it} all={all} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
