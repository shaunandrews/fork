// Fork's screens. Each URL has its own file in pages/ that renders one of these,
// so refreshing or opening any link (like /list) loads the right screen.
import { useEffect, useState } from "preact/hooks";
import {
  createClient,
  Link,
  SignInWithGoogle,
  SignInWithGravatar,
  SignInWithSpacefast,
  navigate,
  signOut,
  useAuth,
  useLocation,
  useParams,
} from "@spacefast/zero/client";
import type app from "../server/index";
import { addDays, dayName, shortDate, todayLocal } from "../shared/dates";
import { RECIPES } from "../shared/recipes";

const api = createClient<typeof app>();

// ---------- small helpers ----------

function useRunner() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setError(null);
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^.*?Error:\s*/, "") : "Something went wrong.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  return { error, busy, run, clear: () => setError(null) };
}

function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" class="mt-2 text-sm text-danger">
      {text}
    </p>
  );
}

const btn = "inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50";
const btnPrimary = `${btn} bg-accent text-white hover:opacity-90`;
const btnQuiet = `${btn} border border-line bg-surface text-ink hover:bg-canvas`;
const btnGhost = `${btn} text-ink-muted hover:text-ink`;
const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent";
const card = "rounded-xl border border-line bg-surface p-4";

function Shell({ children }: { children: any }) {
  return (
    <div class="min-h-screen bg-canvas text-ink">
      <div class="mx-auto max-w-2xl px-4 pb-24 pt-6">{children}</div>
    </div>
  );
}

function Loading() {
  return <p class="py-10 text-center text-ink-muted">Loading…</p>;
}

// ---------- sign in ----------

function SignInButtons({ returnTo }: { returnTo: string }) {
  return (
    <div class="flex flex-col gap-3">
      <SignInWithGoogle returnTo={returnTo} className={btnPrimary} />
      <SignInWithGravatar returnTo={returnTo} className={btnQuiet} />
      <SignInWithSpacefast returnTo={returnTo} className={btnQuiet} />
    </div>
  );
}

function Redirect({ to }: { to: string }) {
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to]);
  return null;
}

function Brand() {
  return (
    <Link to="/" class="flex items-center gap-2 text-lg font-bold text-ink">
      <span class="text-2xl">🍴</span> Fork
    </Link>
  );
}

function SmallPage({ children }: { children: any }) {
  return (
    <div class="min-h-screen bg-canvas text-ink">
      <div class="mx-auto max-w-md px-4 pb-16 pt-6">
        <Brand />
        <div class="mt-10">{children}</div>
      </div>
    </div>
  );
}

// ---------- landing ----------

const features = [
  { icon: "🗳️", title: "Suggest and vote", text: "Anyone can throw out an idea for any night. Everyone else votes on what sounds good." },
  { icon: "👩‍🍳", title: "Pick a chef", text: "Someone volunteers to cook. The chef sees the votes and makes the call." },
  { icon: "✨", title: "Plan the week", text: "Stuck for ideas? Fork fills empty nights with family-friendly dinners you can pick from." },
  { icon: "🛒", title: "One shopping list", text: "Picked meals drop their ingredients onto a shared list, merged and sorted by aisle." },
];

const steps = [
  { title: "Start your family", text: "Name it, then send the invite link to everyone at home." },
  { title: "Suggest dinners", text: "Add ideas for the days ahead and vote on the ones you like." },
  { title: "Cook and shop", text: "The chef picks, and the groceries land on the list you all share." },
];

function PreviewCard() {
  return (
    <div class={`${card} shadow-sm`} aria-hidden="true">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-ink-muted">Tuesday</p>
          <p class="text-lg font-semibold">Tacos 🌮</p>
        </div>
        <span class="rounded-full bg-canvas px-2 py-1 text-xs text-ink-muted">Chef: Sam</span>
      </div>
      <ul class="mt-4 flex flex-col gap-2 text-sm">
        <li class="flex items-center justify-between rounded-lg border border-line px-3 py-2">
          <span>Tacos</span>
          <span class="font-medium text-accent">▲ 3 · picked</span>
        </li>
        <li class="flex items-center justify-between rounded-lg border border-line px-3 py-2">
          <span>Breakfast for dinner</span>
          <span class="text-ink-muted">▲ 2</span>
        </li>
        <li class="flex items-center justify-between rounded-lg border border-line px-3 py-2">
          <span>Chicken stir fry</span>
          <span class="text-ink-muted">▲ 1</span>
        </li>
      </ul>
      <div class="mt-4 border-t border-line pt-3 text-sm">
        <p class="text-xs font-medium uppercase tracking-wide text-ink-muted">Shopping list</p>
        <p class="mt-1">☑ ground beef 1 lb · ☐ tortillas 8 · ☐ cheddar 8 oz</p>
      </div>
    </div>
  );
}

function Landing({ signedIn }: { signedIn: boolean }) {
  return (
    <div class="min-h-screen bg-canvas text-ink">
      <div class="mx-auto max-w-5xl px-4">
        <header class="flex items-center justify-between py-5">
          <Brand />
          <nav class="flex items-center gap-2">
            <Link to="/join" class={btnGhost}>
              Join a family
            </Link>
            <Link to="/start" class={btnQuiet}>
              {signedIn ? "Start a family" : "Sign in"}
            </Link>
          </nav>
        </header>

        <section class="grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <div>
            <h1 class="text-4xl font-bold leading-tight md:text-5xl">What's for dinner? Decided, together.</h1>
            <p class="mt-4 text-lg text-ink-muted">
              Fork is a meal planner for families. Everyone suggests what sounds good, someone volunteers to cook, and the week's
              groceries land on one shared list.
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              <Link to="/start" class={`${btnPrimary} px-5 py-3 text-base`}>
                Start your family
              </Link>
              <Link to="/join" class={`${btnQuiet} px-5 py-3 text-base`}>
                I have an invite
              </Link>
            </div>
            <p class="mt-4 text-sm text-ink-muted">Free for your household. Set up takes a minute.</p>
          </div>
          <PreviewCard />
        </section>

        <section class="py-12">
          <h2 class="text-2xl font-bold">Everything dinner needs, nothing it doesn't</h2>
          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} class={card}>
                <div class="text-2xl">{f.icon}</div>
                <h3 class="mt-2 font-semibold">{f.title}</h3>
                <p class="mt-1 text-sm text-ink-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section class="py-12">
          <h2 class="text-2xl font-bold">How it works</h2>
          <ol class="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} class={card}>
                <span class="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">{i + 1}</span>
                <h3 class="mt-3 font-semibold">{s.title}</h3>
                <p class="mt-1 text-sm text-ink-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section class="my-12 rounded-2xl bg-surface p-8 text-center md:p-12">
          <h2 class="text-2xl font-bold">Settle tonight's dinner in a minute</h2>
          <p class="mt-2 text-ink-muted">Start a family and send the link to everyone at home.</p>
          <div class="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/start" class={`${btnPrimary} px-5 py-3 text-base`}>
              Start your family
            </Link>
            <Link to="/join" class={`${btnQuiet} px-5 py-3 text-base`}>
              Join a family
            </Link>
          </div>
        </section>

        <footer class="border-t border-line py-6 text-center text-sm text-ink-muted">🍴 Fork · Dinner, decided.</footer>
      </div>
    </div>
  );
}

// ---------- start and join ----------

function StartFamily({ defaultName }: { defaultName: string }) {
  const create = api.useMutation("createFamily");
  const [family, setFamily] = useState("");
  const [name, setName] = useState(defaultName);
  const r = useRunner();
  return (
    <div class={card}>
      <h2 class="text-lg font-semibold">Start your family</h2>
      <p class="mt-1 text-sm text-ink-muted">You'll get a link to invite everyone else.</p>
      <form
        class="mt-4 flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await r.run(() => create(family, name).then(() => true));
          if (ok) navigate("/family", { replace: true });
        }}
      >
        <input class={input} placeholder="Family name, like The Andrews" value={family} onInput={(e) => setFamily((e.target as HTMLInputElement).value)} />
        <input class={input} placeholder="Your name" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
        <button class={btnPrimary} disabled={r.busy || !family.trim()}>
          Start family
        </button>
      </form>
      <ErrorLine text={r.error} />
    </div>
  );
}

function StartSignedIn() {
  const me = api.useQuery("me");
  if (me === undefined) return <Loading />;
  if (me.family) return <Redirect to="/" />;
  return (
    <>
      <StartFamily defaultName={me.displayName} />
      <p class="mt-4 text-center text-sm text-ink-muted">
        Got an invite instead?{" "}
        <Link to="/join" class="font-medium text-accent">
          Join a family
        </Link>
      </p>
    </>
  );
}

export function StartPage() {
  const auth = useAuth();
  if (auth.isLoading) return <SmallPage><Loading /></SmallPage>;
  if (!auth.isSignedIn)
    return (
      <SmallPage>
        <h1 class="text-2xl font-bold">Create your account</h1>
        <p class="mt-2 text-ink-muted">Sign up first, then name your family and invite everyone.</p>
        {auth.error ? <ErrorLine text={auth.error} /> : null}
        <div class="mt-6">
          <SignInButtons returnTo="/start" />
        </div>
        <p class="mt-6 text-center text-sm text-ink-muted">
          Already have an account? The same buttons sign you in.
        </p>
      </SmallPage>
    );
  return (
    <SmallPage>
      <StartSignedIn />
    </SmallPage>
  );
}

function codeFrom(text: string): string | null {
  const t = text.trim();
  const fromUrl = t.match(/\/join\/([A-Za-z0-9]+)/);
  if (fromUrl) return fromUrl[1];
  if (/^[A-Za-z0-9]{4,40}$/.test(t)) return t;
  return null;
}

export function JoinEntry() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <SmallPage>
      <h1 class="text-2xl font-bold">Join a family</h1>
      <p class="mt-2 text-ink-muted">Paste the invite link someone sent you, or just the code at the end of it.</p>
      <form
        class="mt-6 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const code = codeFrom(text);
          if (!code) {
            setError("That doesn't look like an invite link or code.");
            return;
          }
          navigate(`/join/${code}`);
        }}
      >
        <input
          class={input}
          placeholder="fork.space.fast/join/…"
          value={text}
          onInput={(e) => {
            setText((e.target as HTMLInputElement).value);
            setError(null);
          }}
        />
        <button class={btnPrimary} disabled={!text.trim()}>
          Continue
        </button>
      </form>
      <ErrorLine text={error} />
      <p class="mt-6 text-center text-sm text-ink-muted">
        No invite?{" "}
        <Link to="/start" class="font-medium text-accent">
          Start your own family
        </Link>
      </p>
    </SmallPage>
  );
}

export function JoinRoute({ code }: { code?: string }) {
  const auth = useAuth();
  const loc = useLocation();
  if (auth.isLoading) return <SmallPage><Loading /></SmallPage>;
  if (!auth.isSignedIn)
    return (
      <SmallPage>
        <h1 class="text-2xl font-bold">You're invited to a family on Fork</h1>
        <p class="mt-2 text-ink-muted">Sign up or sign in, and you'll come right back here to join.</p>
        {auth.error ? <ErrorLine text={auth.error} /> : null}
        <div class="mt-6">
          <SignInButtons returnTo={loc.pathname + loc.search} />
        </div>
      </SmallPage>
    );
  return (
    <SmallPage>
      <JoinPage code={code} />
    </SmallPage>
  );
}

function JoinPage({ code: codeProp }: { code?: string }) {
  const params = useParams() as { code?: string };
  const code = codeProp ?? params.code ?? "";
  const info = api.useQuery("inviteInfo", code);
  const me = api.useQuery("me");
  const join = api.useMutation("joinFamily");
  const [name, setName] = useState<string | null>(null);
  const r = useRunner();
  if (info === undefined || me === undefined) return <Loading />;
  if (info === null)
    return (
      <div class={card}>
        <h2 class="text-lg font-semibold">This invite link doesn't work</h2>
        <p class="mt-1 text-sm text-ink-muted">Ask whoever sent it for a fresh one.</p>
        <Link to="/" class={`${btnQuiet} mt-4`}>
          Go home
        </Link>
      </div>
    );
  if (me.family && me.family.name === info.name)
    return (
      <div class={card}>
        <h2 class="text-lg font-semibold">You're already in {info.name}</h2>
        <Link to="/" class={`${btnPrimary} mt-4`}>
          Open this week
        </Link>
      </div>
    );
  const shownName = name ?? me.displayName ?? "";
  return (
    <div class={card}>
      <h2 class="text-lg font-semibold">Join {info.name}</h2>
      <p class="mt-1 text-sm text-ink-muted">
        {info.members} {info.members === 1 ? "person is" : "people are"} planning dinners here.
      </p>
      <form
        class="mt-4 flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await r.run(() => join(code, shownName));
          if (ok) navigate("/", { replace: true });
        }}
      >
        <input class={input} placeholder="Your name" value={shownName} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
        <button class={btnPrimary} disabled={r.busy}>
          Join family
        </button>
      </form>
      <ErrorLine text={r.error} />
    </div>
  );
}

// ---------- week ----------

type Day = NonNullable<ReturnType<typeof api.useQuery<"week">>>[number];

function SuggestForm({ date, onDone }: { date: string; onDone: () => void }) {
  const suggest = api.useMutation("suggestMeal");
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [showIngredients, setShowIngredients] = useState(false);
  const r = useRunner();
  return (
    <form
      class="mt-3 flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await r.run(() => suggest(date, title, ingredients).then(() => true));
        if (ok) {
          setTitle("");
          setIngredients("");
          onDone();
        }
      }}
    >
      <input class={input} placeholder="What should we have?" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} />
      {showIngredients ? (
        <textarea
          class={`${input} min-h-24`}
          placeholder={"One ingredient per line\n2 lb chicken thighs\n1 onion\n3 cloves garlic"}
          value={ingredients}
          onInput={(e) => setIngredients((e.target as HTMLTextAreaElement).value)}
        />
      ) : (
        <div class="flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
          <button type="button" class={`${btnGhost} px-0`} onClick={() => setShowIngredients(true)}>
            + Add ingredients
          </button>
          <span>or leave it and Fork fills in a usual recipe when it knows the dish.</span>
        </div>
      )}
      <div class="flex gap-2">
        <button class={btnPrimary} disabled={r.busy || !title.trim()}>
          Suggest
        </button>
        <button type="button" class={btnGhost} onClick={onDone}>
          Cancel
        </button>
      </div>
      <ErrorLine text={r.error} />
    </form>
  );
}

function IngredientsEditor({ suggestionId, lines, onDone }: { suggestionId: string; lines: string[]; onDone: () => void }) {
  const save = api.useMutation("setIngredients");
  const [text, setText] = useState(lines.join("\n"));
  const r = useRunner();
  return (
    <form
      class="mt-2 flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await r.run(() => save(suggestionId, text).then(() => true));
        if (ok) onDone();
      }}
    >
      <textarea
        class={`${input} min-h-32`}
        placeholder={"One ingredient per line\n2 lb chicken thighs\n1 onion\n3 cloves garlic"}
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
      />
      <div class="flex gap-2">
        <button class={btnPrimary} disabled={r.busy}>
          Save ingredients
        </button>
        <button type="button" class={btnGhost} onClick={onDone}>
          Cancel
        </button>
      </div>
      <ErrorLine text={r.error} />
    </form>
  );
}

function DayCard({ day, isToday }: { day: Day; isToday: boolean }) {
  const vote = api.useMutation("toggleVote");
  const pick = api.useMutation("pickMeal");
  const chef = api.useMutation("setChef");
  const remove = api.useMutation("removeSuggestion");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const r = useRunner();
  return (
    <section class={`${card} ${isToday ? "ring-2 ring-accent" : ""}`}>
      <header class="flex items-baseline justify-between gap-2">
        <h3 class="text-base font-semibold">
          {isToday ? "Today" : dayName(day.date)} <span class="font-normal text-ink-muted">{shortDate(day.date)}</span>
        </h3>
        <div class="flex items-center gap-2 text-sm">
          {day.chefName ? (
            <span class="text-ink-muted">
              👩‍🍳 <span class="text-ink">{day.iAmChef ? "You're cooking" : `${day.chefName} is cooking`}</span>
            </span>
          ) : null}
          {day.iAmChef ? (
            <button class={btnGhost} onClick={() => void r.run(() => chef(day.date, false))}>
              Step down
            </button>
          ) : (
            <button class={btnQuiet} onClick={() => void r.run(() => chef(day.date, true))}>
              {day.chefName ? "I'll cook instead" : "I'll cook"}
            </button>
          )}
        </div>
      </header>

      {day.pickedTitle ? (
        <p class="mt-2 rounded-lg bg-canvas px-3 py-2 text-sm">
          <span class="text-ink-muted">Dinner: </span>
          <span class="font-semibold">{day.pickedTitle}</span>
        </p>
      ) : null}

      <ul class="mt-3 flex flex-col gap-2">
        {day.suggestions.map((s) => {
          const picked = s.id === day.pickedId;
          return (
            <li key={s.id} class={`rounded-lg border px-3 py-2 ${picked ? "border-accent" : "border-line"}`}>
              <div class="flex items-center gap-2">
                <button
                  class={`flex min-w-12 items-center justify-center gap-1 rounded-lg border px-2 py-1 text-sm ${s.iVoted ? "border-accent text-accent" : "border-line text-ink-muted"}`}
                  aria-pressed={s.iVoted}
                  aria-label={s.iVoted ? "Remove my vote" : "Vote for this"}
                  onClick={() => void r.run(() => vote(s.id))}
                >
                  ▲ {s.votes}
                </button>
                <button class="min-w-0 flex-1 text-left" onClick={() => setOpen(open === s.id ? null : s.id)}>
                  <div class="truncate font-medium">{s.title}</div>
                  <div class="text-xs text-ink-muted">
                    {s.fromFork ? `Idea from ${s.byName}` : `Suggested by ${s.mine ? "you" : s.byName}`}
                    {s.ingredients.length ? ` · ${s.ingredients.length} ingredients` : ""}
                  </div>
                </button>
                <button class={picked ? btnPrimary : btnQuiet} onClick={() => void r.run(() => pick(day.date, s.id))}>
                  {picked ? "Picked ✓" : "Pick"}
                </button>
              </div>
              {open === s.id ? (
                <div class="mt-2 border-t border-line pt-2 text-sm">
                  {editing === s.id ? (
                    <IngredientsEditor suggestionId={s.id} lines={s.ingredientLines} onDone={() => setEditing(null)} />
                  ) : (
                    <>
                      {s.ingredientLines.length ? (
                        <ul class="list-disc pl-5 text-ink">
                          {s.ingredientLines.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      ) : (
                        <p class="text-ink-muted">No ingredients yet, so picking it won't add anything to the shopping list.</p>
                      )}
                      {s.ingredientsNote ? <p class="mt-1 text-xs text-ink-muted">{s.ingredientsNote}. Edit to match how you make it.</p> : null}
                      <div class="mt-1 flex gap-3">
                        <button class={`${btnGhost} px-0`} onClick={() => setEditing(s.id)}>
                          {s.ingredientLines.length ? "Edit ingredients" : "+ Add ingredients"}
                        </button>
                        {s.mine || s.fromFork ? (
                          <button class={`${btnGhost} px-0 text-danger`} onClick={() => void r.run(() => remove(s.id))}>
                            Remove suggestion
                          </button>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {adding ? (
        <SuggestForm date={day.date} onDone={() => setAdding(false)} />
      ) : (
        <button class={`${btnGhost} mt-2 px-0`} onClick={() => setAdding(true)}>
          + Suggest a meal
        </button>
      )}
      <ErrorLine text={r.error} />
    </section>
  );
}

function WeekPage() {
  const today = todayLocal();
  const [offset, setOffset] = useState(0);
  const start = addDays(today, offset * 7);
  const week = api.useQuery("week", start, 7);
  const planAhead = api.useMutation("planAhead");
  const [note, setNote] = useState<string | null>(null);
  const r = useRunner();
  return (
    <div>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-1">
          <button class={btnGhost} disabled={offset <= 0} onClick={() => setOffset(offset - 1)} aria-label="Previous week">
            ←
          </button>
          <span class="text-sm font-medium">
            {offset === 0 ? "Next 7 days" : `${shortDate(start)} – ${shortDate(addDays(start, 6))}`}
          </span>
          <button class={btnGhost} onClick={() => setOffset(offset + 1)} aria-label="Next week">
            →
          </button>
        </div>
        <button
          class={btnQuiet}
          disabled={r.busy}
          onClick={async () => {
            setNote(null);
            const res = await r.run(() => planAhead(start, 7));
            if (res) setNote(res.added ? `Added ${res.added} ideas to days with nothing suggested yet.` : "Every day already has a suggestion.");
          }}
        >
          ✨ Suggest meals for empty days
        </button>
      </div>
      {note ? <p class="mb-3 text-sm text-ink-muted">{note}</p> : null}
      <ErrorLine text={r.error} />
      {week === undefined ? (
        <Loading />
      ) : (
        <div class="flex flex-col gap-3">
          {week.map((d) => (
            <DayCard key={d.date} day={d} isToday={d.date === today} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- meals ----------

function SuggestOnDay({ title, onDone }: { title: string; onDone: (note: string) => void }) {
  const suggest = api.useMutation("suggestMeal");
  const today = todayLocal();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [date, setDate] = useState(today);
  const r = useRunner();
  return (
    <div class="mt-2 flex flex-wrap items-center gap-2">
      <select class={`${input} w-auto`} value={date} onChange={(e) => setDate((e.target as HTMLSelectElement).value)}>
        {days.map((d, i) => (
          <option key={d} value={d}>
            {i === 0 ? "Today" : i === 1 ? "Tomorrow" : `${dayName(d)} ${shortDate(d)}`}
          </option>
        ))}
      </select>
      <button
        class={btnPrimary}
        disabled={r.busy}
        onClick={async () => {
          const ok = await r.run(() => suggest(date, title, "").then(() => true));
          if (ok) onDone(`Suggested ${title} for ${date === today ? "today" : `${dayName(date)} ${shortDate(date)}`}.`);
        }}
      >
        Suggest
      </button>
      <ErrorLine text={r.error} />
    </div>
  );
}

function MealForm({ originalKey, title: startTitle, lines, onDone }: { originalKey: string; title: string; lines: string[]; onDone: () => void }) {
  const save = api.useMutation("saveMeal");
  const [title, setTitle] = useState(startTitle);
  const [text, setText] = useState(lines.join("\n"));
  const r = useRunner();
  return (
    <form
      class="mt-2 flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await r.run(() => save(originalKey, title, text).then(() => true));
        if (ok) onDone();
      }}
    >
      <input class={input} placeholder="Meal name" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} />
      <textarea
        class={`${input} min-h-32`}
        placeholder={"One ingredient per line\n2 lb chicken thighs\n1 onion\n3 cloves garlic"}
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
      />
      <div class="flex gap-2">
        <button class={btnPrimary} disabled={r.busy || !title.trim()}>
          Save meal
        </button>
        <button type="button" class={btnGhost} onClick={onDone}>
          Cancel
        </button>
      </div>
      <ErrorLine text={r.error} />
    </form>
  );
}

type OpenState = { id: string; mode: "view" | "edit" | "suggest" } | null;

export function MealsPage() {
  const meals = api.useQuery("meals");
  const removeMeal = api.useMutation("removeMeal");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<OpenState>(null);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const r = useRunner();
  if (meals === undefined) return <Loading />;
  const needle = q.trim().toLowerCase();
  const hit = (title: string) => !needle || title.toLowerCase().includes(needle);
  const mine = meals.filter((m) => hit(m.title));
  const mineKeys = new Set(meals.map((m) => m.key));
  const recipes = RECIPES.filter((x) => hit(x.title) && !mineKeys.has(x.title.trim().toLowerCase()));
  const toggle = (id: string) => setOpen(open?.id === id ? null : { id, mode: "view" });
  const done = (msg?: string) => {
    setOpen(null);
    if (msg) setNote(msg);
  };

  const ingredientList = (lines: string[]) =>
    lines.length ? (
      <ul class="list-disc pl-5 text-ink">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    ) : (
      <p class="text-ink-muted">No ingredients yet.</p>
    );

  return (
    <div class="flex flex-col gap-4">
      <input class={input} type="search" placeholder="Search meals" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
      {note ? <p class="rounded-lg bg-canvas px-3 py-2 text-sm text-success">{note}</p> : null}

      <section class={card}>
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-base font-semibold">Your meals</h2>
          {adding ? null : (
            <button class={btnQuiet} onClick={() => setAdding(true)}>
              + Add a meal
            </button>
          )}
        </div>
        {adding ? <MealForm originalKey="" title="" lines={[]} onDone={() => setAdding(false)} /> : null}
        {mine.length ? (
          <ul class="mt-3 flex flex-col gap-2">
            {mine.map((m) => {
              const id = `m:${m.key}`;
              const isOpen = open?.id === id;
              return (
                <li key={id} class="rounded-lg border border-line px-3 py-2">
                  <button class="w-full text-left" onClick={() => toggle(id)}>
                    <div class="font-medium">{m.title}</div>
                    <div class="text-xs text-ink-muted">
                      {m.timesPicked ? `Picked ${m.timesPicked === 1 ? "once" : `${m.timesPicked} times`}` : "Not picked yet"}
                      {m.lastPicked ? ` · last ${dayName(m.lastPicked)} ${shortDate(m.lastPicked)}` : ""}
                      {` · ${m.lines.length} ingredients`}
                    </div>
                  </button>
                  {isOpen ? (
                    <div class="mt-2 border-t border-line pt-2 text-sm">
                      {open?.mode === "edit" ? (
                        <MealForm originalKey={m.key} title={m.title} lines={m.lines} onDone={() => done()} />
                      ) : (
                        <>
                          {ingredientList(m.lines)}
                          {open?.mode === "suggest" ? (
                            <SuggestOnDay title={m.title} onDone={(msg) => done(msg)} />
                          ) : (
                            <div class="mt-2 flex flex-wrap gap-3">
                              <button class={btnQuiet} onClick={() => setOpen({ id, mode: "suggest" })}>
                                Suggest for a day
                              </button>
                              <button class={`${btnGhost} px-0`} onClick={() => setOpen({ id, mode: "edit" })}>
                                Edit
                              </button>
                              <button class={`${btnGhost} px-0 text-danger`} onClick={() => void r.run(() => removeMeal(m.key)).then(() => done())}>
                                Remove
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p class="mt-2 text-sm text-ink-muted">
            {needle ? "None of your meals match." : "Meals your family picks or adds show up here, with their ingredients."}
          </p>
        )}
        <ErrorLine text={r.error} />
      </section>

      <section class={card}>
        <h2 class="text-base font-semibold">Fork's recipes</h2>
        <p class="mt-1 text-sm text-ink-muted">Ideas to try. Save one to your meals to make it your own.</p>
        {recipes.length ? (
          <ul class="mt-3 flex flex-col gap-2">
            {recipes.map((x) => {
              const id = `r:${x.title}`;
              const isOpen = open?.id === id;
              return (
                <li key={id} class="rounded-lg border border-line px-3 py-2">
                  <button class="w-full text-left" onClick={() => toggle(id)}>
                    <div class="font-medium">{x.title}</div>
                    <div class="text-xs text-ink-muted">
                      {x.tags.join(" · ")} · {x.ingredients.length} ingredients
                    </div>
                  </button>
                  {isOpen ? (
                    <div class="mt-2 border-t border-line pt-2 text-sm">
                      {open?.mode === "edit" ? (
                        <MealForm originalKey="" title={x.title} lines={x.ingredients} onDone={() => done()} />
                      ) : (
                        <>
                          {ingredientList(x.ingredients)}
                          {open?.mode === "suggest" ? (
                            <SuggestOnDay title={x.title} onDone={(msg) => done(msg)} />
                          ) : (
                            <div class="mt-2 flex flex-wrap gap-3">
                              <button class={btnQuiet} onClick={() => setOpen({ id, mode: "suggest" })}>
                                Suggest for a day
                              </button>
                              <button class={`${btnGhost} px-0`} onClick={() => setOpen({ id, mode: "edit" })}>
                                Save to your meals
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p class="mt-2 text-sm text-ink-muted">No recipes match.</p>
        )}
      </section>
    </div>
  );
}

// ---------- shopping list ----------

export function ListPage() {
  const list = api.useQuery("list");
  const add = api.useMutation("addItem");
  const toggle = api.useMutation("toggleItem");
  const removeItem = api.useMutation("removeItem");
  const clearChecked = api.useMutation("clearChecked");
  const [text, setText] = useState("");
  const r = useRunner();
  if (list === undefined) return <Loading />;
  return (
    <div>
      <form
        class="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await r.run(() => add(text).then(() => true));
          if (ok) setText("");
        }}
      >
        <input class={input} placeholder="Add an item, like 2 lb apples" value={text} onInput={(e) => setText((e.target as HTMLInputElement).value)} />
        <button class={btnPrimary} disabled={r.busy || !text.trim()}>
          Add
        </button>
      </form>
      <ErrorLine text={r.error} />

      <div class="mt-4 flex items-center justify-between text-sm text-ink-muted">
        <span>
          {list.total === 0 ? "Nothing on the list yet." : `${list.done} of ${list.total} in the cart`}
        </span>
        {list.done > 0 ? (
          <button class={btnGhost} onClick={() => void r.run(() => clearChecked())}>
            Clear checked
          </button>
        ) : null}
      </div>

      {list.total === 0 ? (
        <p class="mt-6 text-center text-sm text-ink-muted">Pick a meal for a day and its ingredients land here, combined and sorted by aisle.</p>
      ) : null}

      <div class="mt-3 flex flex-col gap-4">
        {list.groups.map((g) => (
          <section key={g.aisle}>
            <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">{g.aisle}</h3>
            <ul class={`${card} divide-y divide-line p-0`}>
              {g.items.map((it) => (
                <li key={it.key} class="flex items-center gap-3 px-4 py-2">
                  <input
                    type="checkbox"
                    class="h-5 w-5 accent-accent"
                    checked={it.checked}
                    aria-label={`Got ${it.name}`}
                    onChange={() => void r.run(() => toggle(it.key))}
                  />
                  <div class={`min-w-0 flex-1 ${it.checked ? "text-ink-muted line-through" : ""}`}>
                    <div>
                      <span class="font-medium">{it.name}</span>
                      {it.amounts.length ? <span class="text-ink-muted"> · {it.amounts.join(" + ")}</span> : null}
                    </div>
                    <div class="truncate text-xs text-ink-muted">{it.forMeals.join(", ")}</div>
                  </div>
                  <button class={btnGhost} aria-label={`Remove ${it.name}`} onClick={() => void r.run(() => removeItem(it.key))}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

// ---------- family ----------

export function FamilyPage() {
  const me = api.useQuery("me");
  const setMyName = api.useMutation("setMyName");
  const resetInvite = api.useMutation("resetInvite");
  const [name, setName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const r = useRunner();
  if (me === undefined || !me.family) return <Loading />;
  const link = `${location.origin}/join/${me.family.inviteCode}`;
  return (
    <div class="flex flex-col gap-4">
      <section class={card}>
        <h2 class="text-lg font-semibold">Invite your family</h2>
        <p class="mt-1 text-sm text-ink-muted">Anyone with this link can join {me.family.name} after they sign in.</p>
        <div class="mt-3 flex gap-2">
          <input class={input} readOnly value={link} onFocus={(e) => (e.target as HTMLInputElement).select()} />
          <button
            class={btnPrimary}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* select-and-copy still works */
              }
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {me.family.isOwner ? (
          <button class={`${btnGhost} mt-2 px-0`} onClick={() => void r.run(() => resetInvite())}>
            Make a new link (the old one stops working)
          </button>
        ) : null}
      </section>

      <section class={card}>
        <h2 class="text-lg font-semibold">{me.family.name}</h2>
        <ul class="mt-2 flex flex-col gap-1 text-sm">
          {me.members.map((m) => (
            <li key={m.name + String(m.isMe)}>
              {m.name}
              {m.isMe ? <span class="text-ink-muted"> (you)</span> : null}
              {m.isOwner ? <span class="text-ink-muted"> · started the family</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section class={card}>
        <h2 class="text-lg font-semibold">Your name</h2>
        <form
          class="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void r.run(() => setMyName(name ?? me.displayName));
          }}
        >
          <input class={input} value={name ?? me.displayName} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
          <button class={btnQuiet} disabled={r.busy}>
            Save
          </button>
        </form>
        <button class={`${btnGhost} mt-3 px-0`} onClick={() => void signOut().then(() => location.assign("/"))}>
          Sign out
        </button>
      </section>
      <ErrorLine text={r.error} />
    </div>
  );
}

// ---------- layout ----------

function Tabs() {
  const loc = useLocation();
  const tab = (to: string, label: string) => {
    const active = loc.pathname === to;
    return (
      <Link
        to={to}
        class={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium ${active ? "bg-accent text-white" : "text-ink-muted hover:text-ink"}`}
      >
        {label}
      </Link>
    );
  };
  return (
    <nav class="fixed inset-x-0 bottom-0 border-t border-line bg-surface">
      <div class="mx-auto flex max-w-2xl gap-1 px-4 py-2">
        {tab("/", "Week")}
        {tab("/meals", "Meals")}
        {tab("/list", "Shopping")}
        {tab("/family", "Family")}
      </div>
    </nav>
  );
}

function FamilyLayout({ children }: { children: any }) {
  const me = api.useQuery("me");
  if (me === undefined) return <Shell><Loading /></Shell>;
  if (!me.family) return <Redirect to="/" />;
  return (
    <Shell>
      <header class="mb-5 flex items-center justify-between">
        <h1 class="text-2xl font-bold">🍴 {me.family.name}</h1>
      </header>
      {children}
      <Tabs />
    </Shell>
  );
}

export function MemberRoute({ children }: { children: any }) {
  const auth = useAuth();
  if (auth.isLoading) return <Shell><Loading /></Shell>;
  if (!auth.isSignedIn) return <Redirect to="/" />;
  return <FamilyLayout>{children}</FamilyLayout>;
}

function SignedInHome() {
  const me = api.useQuery("me");
  if (me === undefined) return <Shell><Loading /></Shell>;
  if (!me.family) return <Landing signedIn />;
  return (
    <FamilyLayout>
      <WeekPage />
    </FamilyLayout>
  );
}

export function HomeRoute() {
  const auth = useAuth();
  if (auth.isLoading) return <Shell><Loading /></Shell>;
  if (!auth.isSignedIn) return <Landing signedIn={false} />;
  return <SignedInHome />;
}
