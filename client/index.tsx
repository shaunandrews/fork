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
import { AppFrame, AppPage, AuthHeading, AuthTemplate, MarketingTemplate, MealImage, caption, cardGrid, container, displayLg, displayMd, displayXl, grid12 } from "./layout";

export const api = createClient<typeof app>();

// Web fonts from DESIGN.md: Newsreader for display, Geist for everything else.
// Zero has no stylesheet hook for @import, so the link goes in once at startup.
if (typeof document !== "undefined" && !document.getElementById("fork-fonts")) {
  const pre = document.createElement("link");
  pre.rel = "preconnect";
  pre.href = "https://fonts.gstatic.com";
  pre.crossOrigin = "";
  const css = document.createElement("link");
  css.id = "fork-fonts";
  css.rel = "stylesheet";
  css.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400..600&family=Newsreader:opsz,wght@6..72,400..600&display=swap";
  document.head.append(pre, css);
}

// ---------- small helpers ----------

export function useRunner() {
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

/**
 * useAuth, plus `signedIn`: a real account, or in local scenario mode
 * (FORK_SCENARIOS=1, where the server stops requiring sign-in) a named dev
 * guest like guest:sam. Production always requires sign-in, so guests never count there.
 */
export function useUser() {
  const auth = useAuth() as ReturnType<typeof useAuth> & { requireSignIn?: boolean; isGuest?: boolean; userId?: string | null };
  const devGuest = auth.isGuest === true && auth.requireSignIn === false && !!auth.userId && auth.userId !== "guest:local";
  return { ...auth, signedIn: auth.isSignedIn || devGuest };
}

export function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" class="mt-2 text-sm text-danger">
      {text}
    </p>
  );
}

export { btn, btnGhost, btnPrimary, btnQuiet, card, input } from "./ui";
import { AisleGroup, Button, DayPlan, EmptyState, ListRow, SuggestionRow, VoteButton, btnGhost, btnPrimary, btnQuiet, card, input, textLinkClass as textLink } from "./ui";

function Shell({ children }: { children: any }) {
  return (
    <div class="min-h-screen bg-canvas font-sans text-ink">
      <div class={`${container} py-16`}>{children}</div>
    </div>
  );
}

export function Loading() {
  return <p class="py-10 text-[15px] text-ink-muted">Loading…</p>;
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

// ---------- landing ----------
// Follows DESIGN.md: photos and type lead, chrome stays quiet, Basil only marks state.

const HERO = "1627662166825-a860471632e4";

const tonight = {
  title: "Spaghetti bolognese",
  photo: "1551892374-ecf8754cf8b0",
  chef: "Sam",
  votes: 3,
};

const otherIdeas = [
  { title: "Homemade pizza night", photo: "1565299624946-b28f40a0ae38", by: "Maya", votes: 2 },
  { title: "Breakfast for dinner", photo: null, by: "Leo", votes: 1 },
];

const week = [
  { day: "Wednesday", title: "Lemon herb roast chicken", photo: "1606728035253-49e8a23146de", chef: "Alex" },
  { day: "Thursday", title: "Black bean burrito bowls", photo: "1716392976013-66d90cac4411", chef: "Maya" },
  { day: "Friday", title: "Beef tacos", photo: "1768716575003-2f7450b1344a", chef: "Sam" },
  { day: "Saturday", title: "Turkey chili", photo: null, chef: null },
];

const listPreview = [
  { aisle: "Produce", items: [{ name: "Carrots", amount: "2", done: false }, { name: "Celery", amount: "2 stalks", done: false }, { name: "Onion", amount: "1", done: true }] },
  { aisle: "Pantry", items: [{ name: "Crushed tomatoes", amount: "1 can", done: false }, { name: "Spaghetti", amount: "1 lb", done: true }] },
  { aisle: "Meat", items: [{ name: "Ground beef", amount: "1 lb", done: false }] },
];

function Landing({ signedIn }: { signedIn: boolean }) {
  return (
    <MarketingTemplate
      nav={
        <>
          <Link to="/join" class="hidden text-[15px] font-medium text-ink-muted hover:text-ink sm:inline">
            Join a family
          </Link>
          <Link to="/start" class="text-[15px] font-medium text-ink hover:opacity-70">
            {signedIn ? "Start a family" : "Sign in"}
          </Link>
        </>
      }
    >
      {/* Hero: one big line, one action, one big photo. */}
      <section class="mx-auto max-w-[1200px] md:px-8">
        <div class="px-5 pb-10 pt-10 md:px-0 md:pb-14 md:pt-20">
          <h1 class={`max-w-[14ch] ${displayXl}`}>What's for dinner tonight?</h1>
          <p class="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-ink-muted md:text-[19px]">
            Fork is how your family decides. Everyone suggests, everyone votes, someone says "I'll cook," and the groceries land on one shared list.
          </p>
          <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link to="/start" class={btnPrimary}>
              Start your family
            </Link>
            <Link to="/join" class={textLink}>
              I have an invite
            </Link>
          </div>
        </div>
        <MealImage
          id={HERO}
          title="A family sharing dinner at the kitchen table"
          sizes="(min-width: 1200px) 1136px, (min-width: 768px) calc(100vw - 64px), 100vw"
          widths={[640, 960, 1400, 2000]}
          class="aspect-[4/5] w-full object-[30%_50%] sm:aspect-[16/9] md:rounded-[20px]"
          eager
        />
      </section>

      {/* Tonight: the product, shown as itself. Photo 6 cols, text 5 cols, one empty between. */}
      <section class={`${container} mt-20 md:mt-32`}>
        <div class={`${grid12} gap-y-10 md:items-end`}>
          <div class="col-span-4 md:col-span-6">
            <div class="relative">
              <MealImage id={tonight.photo} title={tonight.title} sizes="(min-width: 768px) 560px, 100vw" widths={[480, 800, 1200]} class="aspect-[4/3] w-full rounded-[12px]" />
              <span class="absolute left-4 top-4 rounded-full bg-accent px-2.5 py-1 text-[13px] font-medium text-accent-foreground">Picked</span>
            </div>
            <p class={`mt-5 ${caption}`}>Tonight</p>
            <h2 class={`mt-1 ${displayLg}`}>{tonight.title}</h2>
            <p class="mt-2 text-[15px] text-ink-muted">
              {tonight.chef} is cooking · {tonight.votes} votes
            </p>
          </div>

          <div class="col-span-4 md:col-span-5 md:col-start-8">
            <h3 class={displayMd}>Everyone gets a say</h3>
            <p class="mt-3 text-[17px] leading-relaxed text-ink-muted">
              Anyone can suggest a dinner for any night. Votes come in from every phone at home, and whoever volunteers to cook makes the call.
            </p>
            <ul class="mt-8 border-t border-line">
              {[{ title: tonight.title, photo: tonight.photo, by: tonight.chef, votes: tonight.votes, active: true }, ...otherIdeas.map((m) => ({ ...m, active: false }))].map((m) => (
                <li key={m.title} class="flex items-center gap-4 border-b border-line py-3">
                  {m.photo ? (
                    <MealImage id={m.photo} title={m.title} sizes="56px" widths={[112]} class="h-14 w-14 shrink-0 rounded-[8px]" />
                  ) : (
                    <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-[8px] bg-surface-strong font-display text-[22px] font-medium" aria-hidden="true">
                      {m.title[0]}
                    </span>
                  )}
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-[17px] font-medium">{m.title}</p>
                    <p class="text-[15px] text-ink-muted">Suggested by {m.by}</p>
                  </div>
                  <VoteButton count={m.votes} active={m.active} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* The week ahead. */}
      <section class={`${container} mt-24 md:mt-36`}>
        <div class="max-w-[36rem]">
          <h2 class={displayLg}>The rest of the week, sorted</h2>
          <p class="mt-3 text-[17px] leading-relaxed text-ink-muted">Plan a few nights ahead. Stuck? Fork fills empty nights with family dinners you can pick from.</p>
        </div>
        <ul class="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4">
          {week.map((d) => (
            <li key={d.day}>
              <MealImage id={d.photo} title={d.title} sizes="(min-width: 1024px) 270px, 50vw" widths={[400, 600]} class="aspect-[4/3] w-full rounded-[12px]" />
              <p class={`mt-3 ${caption}`}>{d.day}</p>
              <p class="mt-0.5 text-[17px] font-semibold leading-snug md:text-[20px]">{d.title}</p>
              <p class="mt-0.5 text-[15px] text-ink-muted">{d.chef ? `${d.chef} is cooking` : "Needs a chef"}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* One shared list. Text 5 cols, list 6 cols. */}
      <section class={`${container} mt-24 md:mt-36`}>
        <div class={`${grid12} gap-y-10`}>
          <div class="col-span-4 md:col-span-5">
            <h2 class={displayLg}>One list for the whole house</h2>
            <p class="mt-3 text-[17px] leading-relaxed text-ink-muted">
              Pick a meal and its ingredients land on the shopping list, amounts combined and sorted by aisle. Tick things off in the store and everyone sees it.
            </p>
          </div>
          <div class="col-span-4 md:col-span-6 md:col-start-7" aria-label="Example shopping list">
            {listPreview.map((g) => (
              <div key={g.aisle} class="mb-6 last:mb-0">
                <p class={caption}>{g.aisle}</p>
                <ul class="mt-1">
                  {g.items.map((it) => (
                    <li key={it.name} class="flex h-[52px] items-center gap-3 border-b border-line">
                      <span
                        class={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${it.done ? "border-accent bg-accent text-accent-foreground" : "border-line"}`}
                        aria-hidden="true"
                      >
                        {it.done && (
                          <svg width="12" height="12" viewBox="0 0 12 12">
                            <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span class={`flex-1 text-[17px] ${it.done ? "text-ink-muted line-through" : ""}`}>{it.name}</span>
                      <span class="text-[15px] tabular-nums text-ink-muted">{it.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Close. */}
      <section class={`${container} mt-28 md:mt-40`}>
        <h2 class="max-w-[16ch] font-display text-[clamp(2.5rem,6vw,4rem)] font-medium leading-[1.0] tracking-[-0.025em]">Tonight's dinner, settled in a minute.</h2>
        <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link to="/start" class={btnPrimary}>
            Start your family
          </Link>
          <Link to="/join" class={btnQuiet}>
            Join with an invite
          </Link>
        </div>
      </section>
    </MarketingTemplate>
  );
}

// ---------- start and join ----------

function StartFamily({ defaultName }: { defaultName: string }) {
  const create = api.useMutation("createFamily");
  const [family, setFamily] = useState("");
  const [name, setName] = useState(defaultName);
  const r = useRunner();
  return (
    <div>
      <AuthHeading title="Start your family" intro="You'll get a link to invite everyone else." />
      <form
        class="flex flex-col gap-3"
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
      <p class="mt-8 text-[15px] text-ink-muted">
        Got an invite instead?{" "}
        <Link to="/join" class={textLink}>
          Join a family
        </Link>
      </p>
    </>
  );
}

export function StartPage() {
  const auth = useUser();
  if (auth.isLoading) return <AuthTemplate><Loading /></AuthTemplate>;
  if (!auth.signedIn)
    return (
      <AuthTemplate>
        <AuthHeading title="Create your account" intro="Sign up first, then name your family and invite everyone." />
        {auth.error ? <ErrorLine text={auth.error} /> : null}
        <div>
          <SignInButtons returnTo="/start" />
        </div>
        <p class="mt-8 text-[15px] text-ink-muted">
          Already have an account? The same buttons sign you in.
        </p>
      </AuthTemplate>
    );
  return (
    <AuthTemplate>
      <StartSignedIn />
    </AuthTemplate>
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
    <AuthTemplate>
      <AuthHeading title="Join a family" intro="Paste the invite link someone sent you, or just the code at the end of it." />
      <form
        class="flex flex-col gap-3"
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
      <p class="mt-8 text-[15px] text-ink-muted">
        No invite?{" "}
        <Link to="/start" class={textLink}>
          Start your own family
        </Link>
      </p>
    </AuthTemplate>
  );
}

export function JoinRoute({ code }: { code?: string }) {
  const auth = useUser();
  const loc = useLocation();
  if (auth.isLoading) return <AuthTemplate><Loading /></AuthTemplate>;
  if (!auth.signedIn)
    return (
      <AuthTemplate>
        <AuthHeading title="You're invited to a family on Fork" intro="Sign up or sign in, and you'll come right back here to join." />
        {auth.error ? <ErrorLine text={auth.error} /> : null}
        <div>
          <SignInButtons returnTo={loc.pathname + loc.search} />
        </div>
      </AuthTemplate>
    );
  return (
    <AuthTemplate>
      <JoinPage code={code} />
    </AuthTemplate>
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
      <div>
        <AuthHeading title="This invite link doesn't work" intro="Ask whoever sent it for a fresh one." />
        <Link to="/" class={btnQuiet}>
          Go home
        </Link>
      </div>
    );
  if (me.family && me.family.name === info.name)
    return (
      <div>
        <AuthHeading title={`You're already in ${info.name}`} />
        <Link to="/" class={btnPrimary}>
          Open this week
        </Link>
      </div>
    );
  const shownName = name ?? me.displayName ?? "";
  return (
    <div>
      <AuthHeading title={`Join ${info.name}`} intro={`${info.members} ${info.members === 1 ? "person is" : "people are"} planning dinners here.`} />
      <form
        class="flex flex-col gap-3"
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
    <DayPlan
      day={isToday ? "Today" : dayName(day.date)}
      date={shortDate(day.date)}
      isToday={isToday}
      chef={day.chefName ? (day.iAmChef ? "You're cooking" : `${day.chefName} is cooking`) : null}
      chefAction={
        day.iAmChef ? (
          <Button variant="ghost" size="sm" onClick={() => void r.run(() => chef(day.date, false))}>
            Step down
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => void r.run(() => chef(day.date, true))}>
            {day.chefName ? "I'll cook instead" : "I'll cook"}
          </Button>
        )
      }
      footer={
        <>
          {adding ? (
            <div class="pt-2">
              <SuggestForm date={day.date} onDone={() => setAdding(false)} />
            </div>
          ) : (
            <Button variant="ghost" size="sm" class="-ml-3" onClick={() => setAdding(true)}>
              + Suggest a meal
            </Button>
          )}
          <ErrorLine text={r.error} />
        </>
      }
    >
      {day.suggestions.length
        ? day.suggestions.map((s) => (
            <SuggestionRow
              key={s.id}
              title={s.title}
              meta={`${s.fromFork ? `Idea from ${s.byName}` : `Suggested by ${s.mine ? "you" : s.byName}`}${s.ingredients.length ? ` · ${s.ingredients.length} ingredients` : ""}`}
              votes={s.votes}
              voted={s.iVoted}
              picked={s.id === day.pickedId}
              onVote={() => void r.run(() => vote(s.id))}
              onPick={() => void r.run(() => pick(day.date, s.id))}
              open={open === s.id}
              onOpen={() => setOpen(open === s.id ? null : s.id)}
            >
              {editing === s.id ? (
                <IngredientsEditor suggestionId={s.id} lines={s.ingredientLines} onDone={() => setEditing(null)} />
              ) : (
                <div class="text-[15px]">
                  {s.ingredientLines.length ? (
                    <ul class="columns-1 gap-6 sm:columns-2">
                      {s.ingredientLines.map((line, i) => (
                        <li key={i} class="py-0.5">
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p class="text-ink-muted">No ingredients yet, so picking it won't add anything to the shopping list.</p>
                  )}
                  {s.ingredientsNote ? <p class="mt-2 text-[13px] text-ink-muted">{s.ingredientsNote}. Edit to match how you make it.</p> : null}
                  <div class="mt-2 flex flex-wrap gap-x-1">
                    <Button variant="ghost" size="sm" class="-ml-3" onClick={() => setEditing(s.id)}>
                      {s.ingredientLines.length ? "Edit ingredients" : "+ Add ingredients"}
                    </Button>
                    {s.recipeSlug ? (
                      <Button variant="ghost" size="sm" to={`/recipe/${s.recipeSlug}`}>
                        Open recipe
                      </Button>
                    ) : null}
                    {s.mine || s.fromFork ? (
                      <Button variant="ghost" size="sm" class="text-danger hover:text-danger" onClick={() => void r.run(() => remove(s.id))}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
            </SuggestionRow>
          ))
        : null}
    </DayPlan>
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
    <AppPage
      title={offset === 0 ? "This week" : `${shortDate(start)} – ${shortDate(addDays(start, 6))}`}
      tabTitle="Week"
      actions={
        <>
          <div class="flex items-center">
            <button class={btnGhost} disabled={offset <= 0} onClick={() => setOffset(offset - 1)} aria-label="Previous week">
              <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
            <button class={btnGhost} onClick={() => setOffset(offset + 1)} aria-label="Next week">
              <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
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
            Fill empty days
          </button>
        </>
      }
    >
      {note ? <p class="mb-4 text-[15px] text-ink-muted">{note}</p> : null}
      <ErrorLine text={r.error} />
      {week === undefined ? (
        <Loading />
      ) : (
        <div class="flex flex-col gap-10">
          {week.map((d) => (
            <DayCard key={d.date} day={d} isToday={d.date === today} />
          ))}
        </div>
      )}
    </AppPage>
  );
}

// ---------- meals ----------

export function SuggestOnDay({ title, onDone }: { title: string; onDone: (note: string) => void }) {
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

      <div class="mt-6 flex min-h-11 items-center justify-between text-[15px] text-ink-muted">
        <span>{list.total === 0 ? "" : `${list.done} of ${list.total} in the cart`}</span>
        {list.done > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => void r.run(() => clearChecked())}>
            Clear checked
          </Button>
        ) : null}
      </div>

      {list.total === 0 ? (
        <EmptyState title="Nothing on the list yet." body="Pick a meal for a day and its ingredients land here, combined and sorted by aisle." />
      ) : null}

      <div class="mt-4">
        {list.groups.map((g) => (
          <AisleGroup key={g.aisle} aisle={g.aisle}>
            {[...g.items]
              .sort((a, b) => Number(a.checked) - Number(b.checked))
              .map((it) => (
                <ListRow
                  key={it.key}
                  name={it.name}
                  amount={it.amounts.join(" + ")}
                  detail={it.forMeals.join(", ")}
                  checked={it.checked}
                  onToggle={() => void r.run(() => toggle(it.key))}
                  onRemove={() => void r.run(() => removeItem(it.key))}
                />
              ))}
          </AisleGroup>
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
    <div class="flex flex-col gap-10">
      <section class="border-t border-line pt-6 first:border-0 first:pt-0">
        <h2 class={displayMd}>Invite your family</h2>
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

      <section class="border-t border-line pt-6 first:border-0 first:pt-0">
        <h2 class={displayMd}>{me.family.name}</h2>
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

      <section class="border-t border-line pt-6 first:border-0 first:pt-0">
        <h2 class={displayMd}>Your name</h2>
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

function FamilyLayout({ children }: { children: any }) {
  const me = api.useQuery("me");
  if (me === undefined) return <Shell><Loading /></Shell>;
  if (!me.family) return <Redirect to="/" />;
  return <AppFrame familyName={me.family.name}>{children}</AppFrame>;
}

export function MemberRoute({ children }: { children: any }) {
  const auth = useUser();
  if (auth.isLoading) return <Shell><Loading /></Shell>;
  if (!auth.signedIn) return <Redirect to="/" />;
  return <FamilyLayout>{children}</FamilyLayout>;
}

function SignedInHome() {
  const me = api.useQuery("me");
  if (me === undefined) return <Shell><Loading /></Shell>;
  // Signed in without a family: skip the marketing page and go straight to starting one.
  if (!me.family) return <Redirect to="/start" />;
  return (
    <FamilyLayout>
      <WeekPage />
    </FamilyLayout>
  );
}

export function HomeRoute() {
  const auth = useUser();
  if (auth.isLoading) return <Shell><Loading /></Shell>;
  if (!auth.signedIn) return <Landing signedIn={false} />;
  return <SignedInHome />;
}
