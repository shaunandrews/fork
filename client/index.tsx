import { useState } from "preact/hooks";
import {
  createClient,
  Link,
  Route,
  Router,
  Routes,
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

function SignIn() {
  const loc = useLocation();
  const returnTo = loc.pathname + loc.search;
  return (
    <Shell>
      <div class="mx-auto mt-16 max-w-sm text-center">
        <div class="text-5xl">🍴</div>
        <h1 class="mt-3 text-3xl font-bold">Fork</h1>
        <p class="mt-2 text-ink-muted">Plan dinners together. Suggest meals, vote, pick a chef, and share one shopping list.</p>
        <div class="mt-8 flex flex-col gap-3">
          <SignInWithGoogle returnTo={returnTo} className={btnPrimary} />
          <SignInWithGravatar returnTo={returnTo} className={btnQuiet} />
          <SignInWithSpacefast returnTo={returnTo} className={btnQuiet} />
        </div>
      </div>
    </Shell>
  );
}

// ---------- onboarding ----------

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
        onSubmit={(e) => {
          e.preventDefault();
          void r.run(() => create(family, name));
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

function JoinPage() {
  const params = useParams() as { code?: string };
  const code = params.code ?? "";
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
        <button type="button" class={`${btnGhost} self-start px-0`} onClick={() => setShowIngredients(true)}>
          + Add ingredients
        </button>
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

function DayCard({ day, isToday }: { day: Day; isToday: boolean }) {
  const vote = api.useMutation("toggleVote");
  const pick = api.useMutation("pickMeal");
  const chef = api.useMutation("setChef");
  const remove = api.useMutation("removeSuggestion");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
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
                  {s.ingredients.length ? (
                    <p class="text-ink-muted">{s.ingredients.join(", ")}</p>
                  ) : (
                    <p class="text-ink-muted">No ingredients added.</p>
                  )}
                  {s.mine || s.fromFork ? (
                    <button class={`${btnGhost} mt-1 px-0 text-danger`} onClick={() => void r.run(() => remove(s.id))}>
                      Remove suggestion
                    </button>
                  ) : null}
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

// ---------- shopping list ----------

function ListPage() {
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

function FamilyPage() {
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
        {tab("/", "This week")}
        {tab("/list", "Shopping list")}
        {tab("/family", "Family")}
      </div>
    </nav>
  );
}

function Home() {
  const me = api.useQuery("me");
  if (me === undefined) return <Loading />;
  if (!me.family)
    return (
      <div class="flex flex-col gap-4">
        <StartFamily defaultName={me.displayName} />
        <p class="text-center text-sm text-ink-muted">Joining someone else's family? Open the invite link they sent you.</p>
      </div>
    );
  return null;
}

function FamilyGate({ children }: { children: any }) {
  const me = api.useQuery("me");
  if (me === undefined) return <Loading />;
  if (!me.family) return <Home />;
  return (
    <>
      <header class="mb-5 flex items-center justify-between">
        <h1 class="text-2xl font-bold">🍴 {me.family.name}</h1>
      </header>
      {children}
      <Tabs />
    </>
  );
}

function SignedIn() {
  return (
    <Shell>
      <Routes>
        <Route path="/join/:code" element={<JoinPage />} />
        <Route path="/list" element={<FamilyGate><ListPage /></FamilyGate>} />
        <Route path="/family" element={<FamilyGate><FamilyPage /></FamilyGate>} />
        <Route path="/" element={<FamilyGate><WeekPage /></FamilyGate>} />
        <Route path="/*rest" element={<FamilyGate><WeekPage /></FamilyGate>} />
      </Routes>
    </Shell>
  );
}

function Gate() {
  const auth = useAuth();
  if (auth.isLoading) return <Shell><Loading /></Shell>;
  if (auth.error && !auth.isSignedIn)
    return (
      <Shell>
        <p role="alert" class="py-10 text-center text-danger">{auth.error}</p>
        <SignIn />
      </Shell>
    );
  if (!auth.isSignedIn) return <SignIn />;
  return <SignedIn />;
}

export default function App() {
  return (
    <Router>
      <Gate />
    </Router>
  );
}
