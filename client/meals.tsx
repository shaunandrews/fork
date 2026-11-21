// Meals: the family's recipes, Fork's ideas, and the ingredients they share.
// One ingredient list for the family means "onions" in one recipe and
// "yellow onion" in another can be merged, and the shopping list adds them up.
import { useState } from "preact/hooks";
import { Link, navigate, useLocation } from "@spacefast/zero/client";
import { api, card, ErrorLine, Loading, SuggestOnDay, useRunner } from "./index";
import { AISLES, formatAmount, parseIngredient } from "../shared/ingredients";
import { RECIPES } from "../shared/recipes";
import { PhotoPicker, photoFor, usePhotos } from "./photos";

/** "Add photo" / "Photo" over a meal's hero. */
function PhotoButton({ has, onClick }: { has: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} class="inline-flex h-10 items-center gap-1.5 rounded-full bg-black/25 px-4 text-[15px] font-medium text-white backdrop-blur-md hover:bg-black/35">
      <Icon name="camera" size={18} />
      {has ? "Photo" : "Add photo"}
    </button>
  );
}
import { dayName, shortDate } from "../shared/dates";
import { AppPage, DetailTemplate, cardGrid, displayMd } from "./layout";
import { AisleGroup, Button, Confirm, EmptyState, Field, Icon, Input, MealTile, SearchField, Select, Sheet, Tag, Textarea, buttonClass, sheetAction } from "./ui";

const mealKey = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();
const slugOf = (key: string) => key.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "meal";
const label = "text-[13px] font-medium text-ink-muted";

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

export const MEALS_NAV = [
  { to: "/meals", label: "Recipes" },
  { to: "/meals/ideas", label: "Ideas" },
  { to: "/meals/ingredients", label: "Ingredients" },
];


// ---------- recipes list ----------

export function RecipesPage() {
  const meals = api.useQuery("meals");
  const photos = usePhotos();
  const [q, setQ] = useState("");
  if (meals === undefined) return <Loading />;
  const needle = q.trim().toLowerCase();
  const shown = meals.filter((m) => !needle || m.title.toLowerCase().includes(needle) || m.preview.some((p) => p.includes(needle)));
  return (
    <div>
      <div class="flex max-w-[640px] gap-3">
        <SearchField
          value={q}
          onInput={setQ}
          placeholder="Search or add a recipe"
          onEnter={() => {
            const exact = shown.find((m) => m.title.toLowerCase() === needle) ?? (shown.length === 1 ? shown[0] : null);
            if (exact) navigate(`/recipe/${exact.slug}`);
            else if (q.trim()) navigate(`/meals/new?title=${encodeURIComponent(q.trim())}`);
          }}
        />
        <Link to="/meals/new" class={buttonClass("primary") + " h-12 shrink-0"}>
          New recipe
        </Link>
      </div>
      {shown.length ? (
        <ul class={`${cardGrid} mt-8`}>
          {shown.map((m) => (
            <li key={m.key}>
              <MealTile
                to={`/recipe/${m.slug}`}
                title={m.title}
                photo={photoFor(photos, m.title)?.url ?? null}
                meta={`${madeLine(m.timesPicked, m.lastPicked)}${m.servings ? ` · serves ${m.servings}` : ""}`}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div class="mt-12 max-w-[30rem]">
          {needle ? (
            <>
              <p class="font-display text-[26px] font-bold leading-tight">No “{q.trim()}” yet.</p>
              <Link to={`/meals/new?title=${encodeURIComponent(q.trim())}`} class={buttonClass("primary") + " mt-4"}>
                Add “{q.trim()}” <kbd class="ml-2 hidden rounded border border-white/30 px-1.5 text-[12px] md:inline">Return</kbd>
              </Link>
            </>
          ) : (
            <>
              <p class="font-display text-[26px] font-bold leading-tight">No recipes yet.</p>
              <p class="mt-2 text-[17px] text-ink-muted">Meals you pick for a day show up here, or start one yourself.</p>
              <Link to="/meals/ideas" class={buttonClass("secondary") + " mt-6"}>
                Browse Fork's ideas
              </Link>
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

const rowText = (r: Row) => [r.amount, r.name].filter(Boolean).join(" ") + (r.prep ? `, ${r.prep}` : "");

/**
 * Type "2 lb chicken thighs, diced" and press Return: it's added and the box is ready for the
 * next one. Backspace in an empty box takes the last one back to edit; ↑ does the same. Tap a
 * row to edit it. Nothing else sits in the tab order, so Tab goes straight on to the next field.
 */
function IngredientEntry({ rows, known, onChange, onPaste }: { rows: Row[]; known: string[]; onChange: (rows: Row[]) => void; onPaste: () => void }) {
  const [text, setText] = useState("");
  const add = () => {
    const lines = text.split(/\n|;/).map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map(splitLine).filter((x): x is Row => x !== null);
    if (!parsed.length) return;
    onChange([...rows, ...parsed]);
    setText("");
  };
  const takeBack = (i: number) => {
    if (text.trim()) add();
    setText(rowText(rows[i]));
    onChange(rows.filter((_, j) => j !== i));
  };
  return (
    <section data-component="IngredientEntry">
      <label for="ingredient-entry" class="mb-2 block text-[15px] font-medium text-ink">
        Ingredients
      </label>
      {rows.length ? (
        <ul class="mb-2 border-t border-line">
          {rows.map((row, i) => (
            <li key={i} class="flex items-center border-b border-line">
              <button type="button" tabIndex={-1} class="flex min-h-[48px] min-w-0 flex-1 items-baseline gap-3 py-2 text-left" onClick={() => takeBack(i)} title="Edit">
                <span class="w-16 shrink-0 text-[15px] tabular-nums text-ink-muted">{row.amount}</span>
                <span class="min-w-0 truncate text-[17px]">
                  {row.name}
                  {row.prep ? <span class="text-ink-muted">, {row.prep}</span> : null}
                </span>
              </button>
              <button type="button" tabIndex={-1} class="flex h-11 w-10 shrink-0 items-center justify-center text-ink-muted hover:text-ink" aria-label={`Remove ${row.name}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        id="ingredient-entry"
        class="[&::-webkit-calendar-picker-indicator]:hidden"
        list="fork-ingredients"
        autoComplete="off"
        enterKeyHint="enter"
        placeholder={rows.length ? "Add another" : "2 lb chicken thighs, diced"}
        value={text}
        onInput={(e: any) => setText(e.target.value)}
        onPaste={(e: any) => {
          const t = e.clipboardData?.getData("text") ?? "";
          if (t.includes("\n")) {
            e.preventDefault();
            const parsed = t.split("\n").map((l: string) => splitLine(l.trim())).filter((x: Row | null): x is Row => x !== null);
            onChange([...rows, ...parsed]);
          }
        }}
        onKeyDown={(e: any) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          } else if ((e.key === "Backspace" && !text) || (e.key === "ArrowUp" && !text)) {
            if (rows.length) {
              e.preventDefault();
              takeBack(rows.length - 1);
            }
          }
        }}
      />
      <datalist id="fork-ingredients">
        {known.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <p class="mt-2 text-[13px] text-ink-muted">
        Return adds it. Paste a whole list at once, or{" "}
        <button type="button" tabIndex={-1} class="underline decoration-line underline-offset-4 hover:text-ink" onClick={onPaste}>
          paste it here
        </button>
        .
      </p>
    </section>
  );
}

function splitLine(line: string): Row | null {
  const [head, ...rest] = line.split(",");
  const it = parseIngredient(head);
  if (!it) return null;
  return { amount: formatAmount(it.qty, it.unit), name: it.name, prep: rest.join(",").trim() };
}

function RecipeEditor({ start, originalKey, onSaved, onCancel }: { start: Draft; originalKey: string; onSaved: (slug: string) => void; onCancel: () => void }) {
  const save = api.useMutation("saveRecipe");
  const known = api.useQuery("ingredients");
  const [d, setD] = useState<Draft>(start);
  const [paste, setPaste] = useState<string | null>(null);
  const r = useRunner();
  const setRow = (i: number, patch: Partial<Row>) => setD({ ...d, rows: d.rows.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const val = (e: Event) => (e.target as HTMLInputElement).value;
  // Return in Name or Serves moves on, instead of saving a half-written recipe.
  const nextOnEnter = (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const fields = [...(e.currentTarget as HTMLElement).closest("form")!.querySelectorAll<HTMLElement>("input, textarea")];
    fields[fields.indexOf(e.currentTarget as HTMLElement) + 1]?.focus();
  };
  return (
    <form
      class="flex flex-col gap-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await r.run(() =>
          save(originalKey, JSON.stringify({ title: d.title, servings: d.servings, notes: d.notes, items: d.rows.filter((x) => x.name.trim()) })),
        );
        if (res) onSaved(res.slug);
      }}
    >
      <div class="grid grid-cols-[1fr_6rem] gap-3">
        <Field label="Name">
          <Input autoFocus={!d.title} placeholder="Grandma's lasagna" value={d.title} enterKeyHint="next" onKeyDown={nextOnEnter} onInput={(e: any) => setD({ ...d, title: val(e) })} />
        </Field>
        <Field label="Serves">
          <Input type="number" inputMode="numeric" min="0" max="50" placeholder="4" value={d.servings} enterKeyHint="next" onKeyDown={nextOnEnter} onInput={(e: any) => setD({ ...d, servings: val(e) })} />
        </Field>
      </div>

      <IngredientEntry
        rows={d.rows.filter((x) => x.name.trim())}
        known={(known ?? []).map((k) => k.name)}
        onChange={(rows) => setD({ ...d, rows })}
        onPaste={() => setPaste("")}
      />

      {paste !== null ? (
        <Sheet
          title="Paste a list"
          onClose={() => setPaste(null)}
          actions={
            <>
              <Button type="button" variant="secondary" class={sheetAction} onClick={() => setPaste(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                class={sheetAction}
                disabled={!paste.trim()}
                onClick={() => {
                  const added = paste.split("\n").map(splitLine).filter((x): x is Row => x !== null);
                  setD({ ...d, rows: [...d.rows.filter((x) => x.name.trim()), ...added] });
                  setPaste(null);
                }}
              >
                Add these
              </Button>
            </>
          }
        >
          <Field label="Ingredients" hint="One per line, like “2 lb chicken thighs” or “1 onion, diced”.">
            <Textarea autoFocus class="min-h-40" placeholder={"2 lb chicken thighs\n1 onion, diced\n3 cloves garlic"} value={paste} onInput={(e: any) => setPaste(e.target.value)} />
          </Field>
        </Sheet>
      ) : null}

      <Field label="How to make it">
        <Textarea
          class="min-h-36"
          placeholder={"Steps, timings, tips. Whatever helps whoever's cooking.\n1. Brown the chicken…"}
          value={d.notes}
          onInput={(e: any) => setD({ ...d, notes: e.target.value })}
        />
      </Field>

      <div class="flex gap-2">
        <Button disabled={r.busy || !d.title.trim()}>Save recipe</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <ErrorLine text={r.error} />
    </form>
  );
}

export function NewRecipePage() {
  const title = typeof location !== "undefined" ? new URLSearchParams(location.search).get("title") ?? "" : "";
  return (
    <div>
      <RecipeEditor
        start={{ title, servings: "", notes: "", rows: [] }}
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
  const photos = usePhotos();
  const [choosing, setChoosing] = useState(false);
  const recipe = api.useQuery("recipe", slug ?? "");
  const remove = api.useMutation("removeMeal");
  const toList = api.useMutation("addRecipeToList");
  const [mode, setMode] = useState<"view" | "edit" | "plan" | "delete">("view");
  const [note, setNote] = useState<string | null>(null);
  const r = useRunner();
  if (recipe === undefined) return <Loading />;
  if (recipe === null)
    return (
      <AppPage title="Recipe not found" back={{ to: "/meals", text: "Recipes" }} description="That recipe isn't here anymore.">
        {null}
      </AppPage>
    );
  if (mode === "edit")
    return (
      <AppPage title="Edit recipe" back={{ to: `/recipe/${recipe.slug}`, text: recipe.title }}>
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
      </AppPage>
    );
  return (
    <DetailTemplate
      back={{ to: "/meals", text: "Recipes" }}
      title={recipe.title}
      image={photoFor(photos, recipe.title)?.url ?? null}
      photoAction={<PhotoButton has={!!photoFor(photos, recipe.title)} onClick={() => setChoosing(true)} />}
      meta={`${madeLine(recipe.timesPicked, recipe.lastPicked)}${recipe.servings ? ` · serves ${recipe.servings}` : ""}`}
      actions={
        <>
          <Button onClick={() => setMode(mode === "plan" ? "view" : "plan")}>
            Plan for a day
          </Button>
          <Button
           variant="secondary"
            disabled={r.busy || !recipe.items.length}
            onClick={async () => {
              const res = await r.run(() => toList(recipe.slug));
              if (res) setNote(`Added ${res.added} ingredients to the shopping list.`);
            }}
          >
            Add to list
          </Button>
          <Button variant="ghost" onClick={() => setMode("edit")}>
            Edit
          </Button>
        </>
      }
    >
    <div class="flex flex-col gap-6">
      <Notice text={note} />
      {choosing ? <PhotoPicker title={recipe.title} current={photoFor(photos, recipe.title)} onClose={() => setChoosing(false)} /> : null}
      {mode === "plan" ? (
        <SuggestOnDay
          title={recipe.title}
          onClose={() => setMode("view")}
          onDone={(msg) => {
            setMode("view");
            setNote(msg);
          }}
        />
      ) : null}
      <ErrorLine text={r.error} />

      <section>
        <h2 class={`${displayMd} mb-3`}>Ingredients</h2>
        <IngredientTable items={recipe.items} />
      </section>

      <section>
        <h2 class={`${displayMd} mb-3`}>How to make it</h2>
        {recipe.notes ? (
          <p class="whitespace-pre-wrap text-[17px] leading-relaxed">{recipe.notes}</p>
        ) : (
          <Button variant="ghost" class="px-0" onClick={() => setMode("edit")}>
            + Add steps
          </Button>
        )}
      </section>

      <Button variant="ghost" class="self-start px-0 text-danger hover:bg-transparent hover:text-danger" onClick={() => setMode("delete")}>
        Remove recipe
      </Button>
      {mode === "delete" ? (
        <Confirm
          title={`Remove ${recipe.title}?`}
          body="It comes off your recipes. The week and the shopping list stay as they are."
          action="Remove"
          cancel="Keep it"
          busy={r.busy}
          onClose={() => setMode("view")}
          onConfirm={() => void r.run(() => remove(recipe.key)).then(() => navigate("/meals", { replace: true }))}
        />
      ) : null}
    </div>
    </DetailTemplate>
  );
}

// ---------- Fork's ideas ----------

const TAGS = [...new Set(RECIPES.flatMap((x) => x.tags))].sort();

export function IdeasPage() {
  const photos = usePhotos();
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
      <div class="max-w-[640px]">
        <SearchField value={q} onInput={setQ} placeholder="Search Fork's ideas" />
      </div>
      <div class="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        {TAGS.map((t) => (
          <button
            key={t}
            aria-pressed={tag === t}
            class={`h-9 shrink-0 rounded-full border px-3.5 text-[15px] font-medium ${tag === t ? "border-ink bg-ink text-canvas" : "border-line text-ink-muted hover:text-ink"}`}
            onClick={() => setTag(tag === t ? null : t)}
          >
            {t}
          </button>
        ))}
      </div>
      <ul class={`${cardGrid} mt-8`}>
        {shown.map((x) => (
          <li key={x.title}>
            <MealTile
              to={`/idea/${slugOf(mealKey(x.title))}`}
              title={x.title}
              photo={photoFor(photos, x.title)?.url ?? null}
              tag={mine.has(mealKey(x.title)) ? "Saved" : undefined}
              meta={x.tags.slice(0, 2).join(" · ")}
            />
          </li>
        ))}
      </ul>
      {!shown.length ? <p class="mt-12 font-display text-[26px] font-bold">No ideas match.</p> : null}
    </div>
  );
}

export function IdeaPage({ slug }: { slug?: string }) {
  const photos = usePhotos();
  const [choosing, setChoosing] = useState(false);
  const save = api.useMutation("saveRecipe");
  const meals = api.useQuery("meals");
  const [plan, setPlan] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const r = useRunner();
  const idea = RECIPES.find((x) => slugOf(mealKey(x.title)) === slug);
  if (!idea)
    return (
      <AppPage title="Idea not found" back={{ to: "/meals/ideas", text: "Ideas" }} description="That idea isn't here.">
        {null}
      </AppPage>
    );
  const saved = (meals ?? []).find((m) => m.key === mealKey(idea.title));
  const rows = idea.ingredients.map(splitLine).filter((x): x is Row => x !== null);
  return (
    <DetailTemplate
      back={{ to: "/meals/ideas", text: "Ideas" }}
      title={idea.title}
      image={photoFor(photos, idea.title)?.url ?? null}
      photoAction={<PhotoButton has={!!photoFor(photos, idea.title)} onClick={() => setChoosing(true)} />}
      meta={`An idea from Fork · ${idea.tags.join(" · ")} · serves about 4`}
      actions={
        <>
        {saved ? (
          <Link to={`/recipe/${saved.slug}`} class={buttonClass("primary")}>
            Open your recipe
          </Link>
        ) : (
          <Button
            
           disabled={r.busy}
            onClick={async () => {
              const res = await r.run(() => save("", JSON.stringify({ title: idea.title, servings: 4, notes: "", items: rows })));
              if (res) navigate(`/recipe/${res.slug}`);
            }}
          >
            Add to our recipes
          </Button>
        )}
        <Button variant="secondary" onClick={() => setPlan(!plan)}>
          Plan for a day
        </Button>
        </>
      }
    >
    <div class="flex flex-col gap-6">
      <Notice text={note} />
      {choosing ? <PhotoPicker title={idea.title} current={photoFor(photos, idea.title)} onClose={() => setChoosing(false)} /> : null}
      {plan ? (
        <SuggestOnDay
          title={idea.title}
          onClose={() => setPlan(false)}
          onDone={(msg) => {
            setPlan(false);
            setNote(msg);
          }}
        />
      ) : null}
      <ErrorLine text={r.error} />
      <section>
        <h2 class={`${displayMd} mb-3`}>Ingredients</h2>
        <IngredientTable items={rows} />
      </section>
      <p class="text-[15px] text-ink-muted">Add it to your recipes to change the amounts or write down how you make it.</p>
    </div>
    </DetailTemplate>
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
  const close = () => {
    setOpen(false);
    setName(it.name);
    setAisle(it.aisle);
    setInto("");
  };
  return (
    <li class="border-b border-line">
      <button class="flex min-h-[52px] w-full items-center gap-3 py-2 text-left" onClick={() => setOpen(true)}>
        <span class="min-w-0 flex-1 truncate text-[17px]">{it.name}</span>
        <span class="shrink-0 text-[15px] text-ink-muted">
          {it.usedIn.length ? `${it.usedIn.length} recipe${it.usedIn.length === 1 ? "" : "s"}` : "Not in a recipe"}
        </span>
        <Icon name="chevronRight" size={18} />
      </button>
      {open ? (
        <Sheet
          title={it.name}
          subtitle={it.aisle}
          onClose={close}
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await r.run(() => saveIng(it.key, name, aisle).then(() => true));
            if (ok) setOpen(false);
          }}
          actions={
            <>
              <Button type="button" variant="secondary" class={sheetAction} onClick={close}>
                Cancel
              </Button>
              <Button class={sheetAction} disabled={r.busy || (name === it.name && aisle === it.aisle)}>
                Save
              </Button>
            </>
          }
        >
          <div class="flex flex-col gap-5">
            <Field label="Name">
              <Input value={name} onInput={(e: any) => setName(e.target.value)} />
            </Field>
            <Field label="Aisle">
              <Select value={aisle} onChange={(e: any) => setAisle(e.target.value)}>
                {AISLES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </Field>

            {it.usedIn.length ? (
              <p class="text-[15px] text-ink-muted">
                In{" "}
                {it.usedIn.map((u, i) => (
                  <span key={u.slug}>
                    {i ? ", " : ""}
                    <Link to={`/recipe/${u.slug}`} class="text-ink underline decoration-line underline-offset-4">
                      {u.title}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}

            {it.aliases.length ? (
              <div class="flex flex-wrap items-center gap-1.5 text-[15px]">
                <span class="text-ink-muted">Also counts:</span>
                {it.aliases.map((a) => (
                  <Tag key={a} tone="neutral">
                    {a.replace(/^(can|jar):/, "")}
                    <button type="button" class="ml-1 text-ink-muted hover:text-ink" aria-label={`Split ${a} back out`} title="Split back out" onClick={() => void r.run(() => split(it.key, a))}>
                      ✕
                    </button>
                  </Tag>
                ))}
              </div>
            ) : null}

            {others.length ? (
              <Field label="Same thing as" hint="Merging keeps one name and counts both on the list.">
                <div class="flex gap-2">
                  <Select class="min-w-0 flex-1" value={into} onChange={(e: any) => setInto(e.target.value)}>
                    <option value="">Pick an ingredient…</option>
                    {others.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.name}
                      </option>
                    ))}
                  </Select>
                  <Button type="button" variant="secondary" disabled={!into || r.busy} onClick={() => void r.run(() => merge(it.key, into)).then(() => setOpen(false))}>
                    Merge
                  </Button>
                </div>
              </Field>
            ) : null}

            {!it.usedIn.length ? (
              <Button type="button" variant="ghost" class="self-start px-0 text-danger hover:bg-transparent hover:text-danger" onClick={() => void r.run(() => removeIng(it.key))}>
                Remove ingredient
              </Button>
            ) : null}
            <ErrorLine text={r.error} />
          </div>
        </Sheet>
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
      <div class="flex gap-2">
        <SearchField value={q} onInput={setQ} placeholder="Search ingredients" />
        <Button class="h-12 shrink-0" onClick={() => setAdding(true)}>
          + Add
        </Button>
      </div>
      {adding ? (
        <Sheet
          title="Add an ingredient"
          onClose={() => setAdding(false)}
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await r.run(() => add(name, aisle).then(() => true));
            if (ok) {
              setName("");
              setAdding(false);
            }
          }}
          actions={
            <>
              <Button type="button" variant="secondary" class={sheetAction} onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button class={sheetAction} disabled={r.busy || !name.trim()}>
                Add
              </Button>
            </>
          }
        >
          <div class="flex flex-col gap-5">
            <Field label="Name">
              <Input autoFocus placeholder="Chicken thighs" value={name} onInput={(e: any) => setName(e.target.value)} />
            </Field>
            <Field label="Aisle">
              <Select value={aisle} onChange={(e: any) => setAisle(e.target.value)}>
                {AISLES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </Field>
            <ErrorLine text={r.error} />
          </div>
        </Sheet>
      ) : null}
      {!all.length ? <EmptyState title="No ingredients yet." body="They appear here as your family adds recipes, picks meals and adds to the list." /> : null}
      <div class="mt-6 flex flex-col gap-8">
        {groups.map((g) => (
          <AisleGroup key={g.aisle} aisle={`${g.aisle} · ${g.items.length}`}>
            {g.items.map((it) => (
              <IngredientRow key={`${it.key}:${it.name}:${it.aisle}`} it={it} all={all} />
            ))}
          </AisleGroup>
        ))}
      </div>
    </div>
  );
}
