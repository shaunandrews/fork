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
import { PhotoButton, PhotoPicker, photoFor, usePhotos } from "./photos";
import { showSplash } from "./fridge/splash";
import { ResinCard } from "./fridge/ui";
import { parseLine } from "../shared/ingredients";
import { RECIPES } from "../shared/recipes";
import {
  AppFrame,
  AppPage,
  AuthHeading,
  AuthTemplate,
  MarketingTemplate,
  MealImage,
  caption,
  cardGrid,
  container,
  displayLg,
  displayMd,
  displayXl,
  grid12,
  flow,
  usePageTitle,
  PhotoHero,
  photoSrc,
} from "./layout";

export const api = createClient<typeof app>();

// Web font from DESIGN.md: Geist for everything, headings set bold and tight.
// Zero has no stylesheet hook for @import, so the link goes in once at startup.
if (typeof document !== "undefined" && !document.getElementById("fork-fonts")) {
  const pre = document.createElement("link");
  pre.rel = "preconnect";
  pre.href = "https://fonts.gstatic.com";
  pre.crossOrigin = "";
  const css = document.createElement("link");
  css.id = "fork-fonts";
  css.rel = "stylesheet";
  css.href =
    "https://fonts.googleapis.com/css2?family=Geist:wght@400..800&display=swap";
  document.head.append(pre, css);
}

// shadcn/ui token mapping. Zero aliases shadcn's names onto Fork's tokens, but maps
// primary to Basil and popovers to surface. Fork's primary action is ink (DESIGN.md:
// Basil is state only), focus rings are ink, and sheets sit on canvas.
if (typeof document !== "undefined" && !document.getElementById("fork-shadcn")) {
  const style = document.createElement("style");
  style.id = "fork-shadcn";
  style.textContent = `:root {
  --color-primary: var(--color-action);
  --color-primary-foreground: var(--color-on-action);
  --color-ring: var(--color-ink);
  --color-popover: var(--color-canvas);
  --color-popover-foreground: var(--color-ink);
  --color-input: var(--color-line);
  --radius: 12px;
}
body { position: relative; }`;
  document.head.append(style);
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
      setError(
        e instanceof Error
          ? e.message.replace(/^.*?Error:\s*/, "")
          : "Something went wrong.",
      );
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
  const auth = useAuth() as ReturnType<typeof useAuth> & {
    requireSignIn?: boolean;
    isGuest?: boolean;
    userId?: string | null;
  };
  const devGuest =
    auth.isGuest === true &&
    auth.requireSignIn === false &&
    !!auth.userId &&
    auth.userId !== "guest:local";
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
import {
  AisleGroup,
  Button,
  DayPlan,
  EmptyState,
  Field,
  Input,
  ListRow,
  Sheet,
  SuggestionRow,
  Select,
  Tag,
  MealTile,
  IngredientEntry,
  IngredientList,
  Row,
  SearchField,
  Thumb,
  Icon,
  SectionHeading,
  Confirm,
  PersonRow,
  Textarea,
  buttonClass,
  sheetAction,
  VoteButton,
  btnGhost,
  btnPrimary,
  btnQuiet,
  card,
  input,
  textLinkClass as textLink,
} from "./ui";

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

export function Redirect({ to }: { to: string }) {
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
  {
    title: "Homemade pizza night",
    photo: "1565299624946-b28f40a0ae38",
    by: "Maya",
    votes: 2,
  },
  { title: "Breakfast for dinner", photo: null, by: "Leo", votes: 1 },
];

const week = [
  {
    day: "Wednesday",
    title: "Lemon herb roast chicken",
    photo: "1606728035253-49e8a23146de",
    chef: "Alex",
  },
  {
    day: "Thursday",
    title: "Black bean burrito bowls",
    photo: "1716392976013-66d90cac4411",
    chef: "Maya",
  },
  {
    day: "Friday",
    title: "Beef tacos",
    photo: "1768716575003-2f7450b1344a",
    chef: "Sam",
  },
  { day: "Saturday", title: "Turkey chili", photo: null, chef: null },
];

const listPreview = [
  {
    aisle: "Produce",
    items: [
      { name: "Carrots", amount: "2", done: false },
      { name: "Celery", amount: "2 stalks", done: false },
      { name: "Onion", amount: "1", done: true },
    ],
  },
  {
    aisle: "Pantry",
    items: [
      { name: "Crushed tomatoes", amount: "1 can", done: false },
      { name: "Spaghetti", amount: "1 lb", done: true },
    ],
  },
  {
    aisle: "Meat",
    items: [{ name: "Ground beef", amount: "1 lb", done: false }],
  },
];

export function Landing({ signedIn }: { signedIn: boolean }) {
  return (
    <MarketingTemplate
      nav={
        <>
          <Link
            to="/join"
            class="hidden text-[15px] font-medium text-ink-muted hover:text-ink sm:inline"
          >
            Join a family
          </Link>
          <Link
            to="/start"
            class="text-[15px] font-medium text-ink hover:opacity-70"
          >
            {signedIn ? "Start a family" : "Sign in"}
          </Link>
        </>
      }
    >
      {/* Hero: one big line, one action, one big photo. */}
      <section class="mx-auto max-w-[1200px] md:px-8">
        <div class="px-5 pb-10 pt-10 md:px-0 md:pb-14 md:pt-20">
          <h1 class={`max-w-[14ch] ${displayXl}`}>
            What's for dinner tonight?
          </h1>
          <p class="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-ink-muted md:text-[19px]">
            Fork is how your family decides. Everyone suggests, everyone votes,
            someone says "I'll cook," and the groceries land on one shared list.
          </p>
          <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link to="/start" class={buttonClass("primary")}>
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
              <MealImage
                id={tonight.photo}
                title={tonight.title}
                sizes="(min-width: 768px) 560px, 100vw"
                widths={[480, 800, 1200]}
                class="aspect-[4/3] w-full rounded-[12px]"
              />
              <span class="absolute left-4 top-4">
                <Tag>Picked</Tag>
              </span>
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
              Anyone can suggest a dinner for any night. Votes come in from
              every phone at home, and whoever volunteers to cook makes the
              call.
            </p>
            <ul class="mt-8 border-t border-line">
              {[
                {
                  title: tonight.title,
                  photo: tonight.photo,
                  by: tonight.chef,
                  votes: tonight.votes,
                  active: true,
                },
                ...otherIdeas.map((m) => ({ ...m, active: false })),
              ].map((m) => (
                <SuggestionRow key={m.title} title={m.title} photo={m.photo} meta={`Suggested by ${m.by}`} votes={m.votes} voted={m.active} />
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* The week ahead. */}
      <section class={`${container} mt-24 md:mt-36`}>
        <div class="max-w-[36rem]">
          <h2 class={displayLg}>The rest of the week, sorted</h2>
          <p class="mt-3 text-[17px] leading-relaxed text-ink-muted">
            Plan a few nights ahead. Stuck? Fork fills empty nights with family
            dinners you can pick from.
          </p>
        </div>
        <ul class={`mt-10 ${cardGrid}`}>
          {week.map((d) => (
            <li key={d.day}>
              <MealTile title={d.title} photo={d.photo} eyebrow={d.day} meta={d.chef ? `${d.chef} is cooking` : "Needs a chef"} />
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
              Pick a meal and its ingredients land on the shopping list, amounts
              combined and sorted by aisle. Tick things off in the store and
              everyone sees it.
            </p>
          </div>
          <div
            class="col-span-4 md:col-span-6 md:col-start-7"
            aria-label="Example shopping list"
          >
            {listPreview.map((g) => (
              <AisleGroup key={g.aisle} aisle={g.aisle}>
                {g.items.map((it) => (
                  <ListRow key={it.name} name={it.name} amount={it.amount} checked={!!it.done} />
                ))}
              </AisleGroup>
            ))}
          </div>
        </div>
      </section>

      {/* Close. */}
      <section class={`${container} mt-28 md:mt-40`}>
        <h2 class="max-w-[16ch] font-display text-[clamp(2.5rem,6vw,4rem)] font-bold leading-[1.0] tracking-[-0.025em]">
          Tonight's dinner, settled in a minute.
        </h2>
        <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link to="/start" class={buttonClass("primary")}>
            Start your family
          </Link>
          <Link to="/join" class={buttonClass("secondary")}>
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
      <AuthHeading
        title="Start your family"
        intro="You'll get a link to invite everyone else."
      />
      <form
        class="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await r.run(() => create(family, name).then(() => true));
          if (ok) navigate("/family", { replace: true });
        }}
      >
        <Input
          
          placeholder="Family name, like The Andrews"
          value={family}
          onInput={(e) => setFamily((e.target as HTMLInputElement).value)}
        />
        <Input
          
          placeholder="Your name"
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />
        <Button disabled={r.busy || !family.trim()}>
          Start family
        </Button>
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
  if (auth.isLoading)
    return (
      <AuthTemplate>
        <Loading />
      </AuthTemplate>
    );
  if (!auth.signedIn)
    return (
      <AuthTemplate>
        <AuthHeading
          title="Create your account"
          intro="Sign up first, then name your family and invite everyone."
        />
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
      <AuthHeading
        title="Join a family"
        intro="Paste the invite link someone sent you, or just the code at the end of it."
      />
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
        <Input
          
          placeholder="fork.space.fast/join/…"
          value={text}
          onInput={(e) => {
            setText((e.target as HTMLInputElement).value);
            setError(null);
          }}
        />
        <Button disabled={!text.trim()}>
          Continue
        </Button>
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
  if (auth.isLoading)
    return (
      <AuthTemplate>
        <Loading />
      </AuthTemplate>
    );
  if (!auth.signedIn)
    return (
      <AuthTemplate>
        <AuthHeading
          title="You're invited to a family on Fork"
          intro="Sign up or sign in, and you'll come right back here to join."
        />
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
        <AuthHeading
          title="This invite link doesn't work"
          intro="Ask whoever sent it for a fresh one."
        />
        <Link to="/" class={buttonClass("secondary")}>
          Go home
        </Link>
      </div>
    );
  if (me.family && me.family.name === info.name)
    return (
      <div>
        <AuthHeading title={`You're already in ${info.name}`} />
        <Link to="/" class={buttonClass("primary")}>
          Open this week
        </Link>
      </div>
    );
  const shownName = name ?? me.displayName ?? "";
  return (
    <div>
      <AuthHeading
        title={`Join ${info.name}`}
        intro={`${info.members} ${info.members === 1 ? "person is" : "people are"} planning dinners here.`}
      />
      <form
        class="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await r.run(() => join(code, shownName));
          if (ok) navigate("/", { replace: true });
        }}
      >
        <Input
          
          placeholder="Your name"
          value={shownName}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />
        <Button disabled={r.busy}>
          Join family
        </Button>
      </form>
      <ErrorLine text={r.error} />
    </div>
  );
}

// ---------- week ----------

type Day = NonNullable<ReturnType<typeof api.useQuery<"week">>>[number];

/**
 * The meals you can suggest for a day: the family's own first, then Fork's ideas, searchable.
 * Tap one and it's suggested. Making a new meal is secondary: the button at the bottom, or Return
 * with no match. Used inside SuggestSheet, and right in the day's sheet when nothing's suggested yet.
 */
function MealPicker({ date, taken = [], onPicked, onNew, autoFocus = true }: { date: string; taken?: string[]; onPicked: () => void; onNew: (name: string) => void; autoFocus?: boolean }) {
  const suggest = api.useMutation("suggestMeal");
  const meals = api.useQuery("meals");
  const photos = usePhotos();
  const [q, setQ] = useState("");
  const r = useRunner();
  const needle = q.trim().toLowerCase();
  const already = new Set(taken.map((t) => t.toLowerCase()));
  const mine = (meals ?? []).filter((m) => !needle || m.title.toLowerCase().includes(needle) || m.preview.some((p) => p.includes(needle)));
  const mineKeys = new Set((meals ?? []).map((m) => m.title.toLowerCase()));
  const ideas = RECIPES.filter((x) => !mineKeys.has(x.title.toLowerCase()) && (needle ? x.title.toLowerCase().includes(needle) || x.tags.includes(needle) : true)).slice(0, needle ? 20 : 8);

  const pick = async (t: string) => {
    const ok = await r.run(() => suggest(date, t, "").then(() => true));
    if (ok) onPicked();
  };
  const row = (t: string, meta: string) => {
    const isTaken = already.has(t.toLowerCase());
    return (
      <Row
        key={t}
        media={<Thumb title={t} photo={photoFor(photos, t)?.url ?? null} />}
        title={t}
        meta={isTaken ? "Already suggested" : meta}
        muted={isTaken}
        onClick={isTaken || r.busy ? undefined : () => void pick(t)}
      />
    );
  };
  return (
    <div class="flex flex-col gap-4" data-component="MealPicker">
      <SearchField
        value={q}
        onInput={setQ}
        autoFocus={autoFocus}
        placeholder="Search meals"
        onEnter={() => {
          const all = [...mine.map((m) => m.title), ...ideas.map((x) => x.title)];
          const exact = all.find((t) => t.toLowerCase() === needle) ?? (needle && all.length === 1 ? all[0] : null);
          if (exact) void pick(exact);
          else if (needle) onNew(q.trim());
        }}
      />
      <ErrorLine text={r.error} />
      {mine.length ? (
        <section>
          <p class={caption}>Your meals</p>
          <ul>{mine.map((m) => row(m.title, m.timesPicked ? `Made ${m.timesPicked === 1 ? "once" : `${m.timesPicked} times`}` : "Not made yet"))}</ul>
        </section>
      ) : null}
      {ideas.length ? (
        <section>
          <p class={caption}>{needle ? "From Fork's ideas" : "Ideas from Fork"}</p>
          <ul>{ideas.map((x) => row(x.title, x.tags.slice(0, 2).join(" · ")))}</ul>
        </section>
      ) : null}
      {needle && !mine.length && !ideas.length ? <p class="text-[15px] text-ink-muted">No meals match “{q.trim()}”.</p> : null}
      <Button type="button" variant="secondary" class="w-full" onClick={() => onNew(q.trim())}>
        <Icon name="plus" size={18} />
        {needle ? `Add “${q.trim()}” as a new meal` : "New meal"}
      </Button>
    </div>
  );
}

/** The new-meal form: a name and its ingredients. */
function NewMealSheet({ date, dayLabel, name, onBack, onDone }: { date: string; dayLabel: string; name: string; onBack: () => void; onDone: () => void }) {
  const suggest = api.useMutation("suggestMeal");
  const [title, setTitle] = useState(name);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const r = useRunner();
  // With the name already typed, go straight to ingredients (the sheet would focus the name).
  useEffect(() => {
    if (!name) return;
    const t = setTimeout(() => document.querySelector<HTMLInputElement>('[data-component="IngredientEntry"] input')?.focus(), 350);
    return () => clearTimeout(t);
  }, []);
  return (
    <Sheet
      title="New meal"
      subtitle={dayLabel}
      onClose={onDone}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const ok = await r.run(() => suggest(date, title, ingredients.join("\n")).then(() => true));
        if (ok) onDone();
      }}
      actions={
        <>
          <Button type="button" variant="secondary" class={sheetAction} onClick={onBack}>
            Back
          </Button>
          <Button class={sheetAction} disabled={r.busy || !title.trim()}>
            Suggest
          </Button>
        </>
      }
    >
      <div class="flex flex-col gap-5">
        <Field label="What's it called?">
          <Input autoFocus={!name} placeholder="Chicken parm" value={title} onInput={(e: any) => setTitle(e.target.value)} />
        </Field>
        <IngredientEntry
          label="Ingredients (optional)"
          hint="Return adds one. Leave it empty and Fork fills in a usual recipe when it knows the dish."
          lines={ingredients}
          onChange={setIngredients}
        />
        <ErrorLine text={r.error} />
      </div>
    </Sheet>
  );
}

/** Suggest a meal for a day: the MealPicker in a sheet, with the new-meal form as its second step. */
function SuggestSheet({ date, dayLabel, taken = [], onDone }: { date: string; dayLabel: string; taken?: string[]; onDone: () => void }) {
  const [creating, setCreating] = useState<string | null>(null);
  if (creating !== null) return <NewMealSheet date={date} dayLabel={dayLabel} name={creating} onBack={() => setCreating(null)} onDone={onDone} />;
  return (
    <Sheet title="Suggest a meal" subtitle={dayLabel} onClose={onDone}>
      <MealPicker date={date} taken={taken} onPicked={onDone} onNew={setCreating} />
    </Sheet>
  );
}

function IngredientsEditor({
  title,
  suggestionId,
  lines,
  onDone,
}: {
  title: string;
  suggestionId: string;
  lines: string[];
  onDone: () => void;
}) {
  const save = api.useMutation("setIngredients");
  const [list, setList] = useState<string[]>(lines);
  const r = useRunner();
  return (
    <Sheet
      title={lines.length ? "Edit ingredients" : "Add ingredients"}
      subtitle={title}
      onClose={onDone}
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await r.run(() => save(suggestionId, list.join("\n")).then(() => true));
        if (ok) onDone();
      }}
      actions={
        <>
          <Button type="button" variant="secondary" class={sheetAction} onClick={onDone}>
            Cancel
          </Button>
          <Button class={sheetAction} disabled={r.busy}>
            Save
          </Button>
        </>
      }
    >
      <div class="flex flex-col gap-3">
        <IngredientEntry autoFocus lines={list} onChange={setList} />
        <ErrorLine text={r.error} />
      </div>
    </Sheet>
  );
}

function DayCard({ day, isToday, bare }: { day: Day; isToday: boolean; bare?: boolean }) {
  const photos = usePhotos();
  const [choosing, setChoosing] = useState<string | null>(null);
  const vote = api.useMutation("toggleVote");
  const pick = api.useMutation("pickMeal");
  const chef = api.useMutation("setChef");
  const remove = api.useMutation("removeSuggestion");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const r = useRunner();
  return (
    <DayPlan
      bare={bare}
      day={isToday ? "Today" : dayName(day.date)}
      date={shortDate(day.date)}
      isToday={isToday}
      chef={
        day.chefName
          ? day.iAmChef
            ? "You're cooking"
            : `${day.chefName} is cooking`
          : null
      }
      chefAction={
        day.iAmChef ? (
          <Button
           variant="ghost"
            size="sm"
            onClick={() => void r.run(() => chef(day.date, false))}
          >
            Step down
          </Button>
        ) : (
          <Button
           variant="secondary"
            size="sm"
            onClick={() => void r.run(() => chef(day.date, true))}
          >
            {day.chefName ? "I'll cook instead" : "I'll cook"}
          </Button>
        )
      }
      footer={
        <>
          {day.suggestions.length ? (
            <Button variant="ghost" size="sm" class="-ml-3" onClick={() => setAdding(true)}>
              + Suggest a meal
            </Button>
          ) : (
            <div class="mt-4">
              <MealPicker date={day.date} autoFocus={false} onPicked={() => {}} onNew={(name) => setNewName(name)} />
            </div>
          )}
          {newName !== null ? (
            <NewMealSheet
              date={day.date}
              dayLabel={`${isToday ? "Today" : dayName(day.date)}, ${shortDate(day.date)}`}
              name={newName}
              onBack={() => setNewName(null)}
              onDone={() => setNewName(null)}
            />
          ) : null}
          {adding ? (
            <SuggestSheet
              date={day.date}
              taken={day.suggestions.map((x) => x.title)}
              dayLabel={`${isToday ? "Today" : dayName(day.date)}, ${shortDate(day.date)}`}
              onDone={() => setAdding(false)}
            />
          ) : null}
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
              photo={photoFor(photos, s.title)?.url ?? null}
              votes={s.votes}
              voted={s.iVoted}
              picked={s.id === day.pickedId}
              onVote={() => void r.run(() => vote(s.id))}

              open={open === s.id}
              onOpen={() => setOpen(open === s.id ? null : s.id)}
            >
              {choosing === s.title ? (
                <PhotoPicker title={s.title} current={photoFor(photos, s.title)} onClose={() => setChoosing(null)} />
              ) : null}
              {editing === s.id ? (
                <IngredientsEditor
                  title={s.title}
                  suggestionId={s.id}
                  lines={s.ingredientLines}
                  onDone={() => setEditing(null)}
                />
              ) : null}
                <div class="text-[15px]">
                  {s.ingredientLines.length ? (
                    <IngredientList items={s.ingredientLines.map((l) => parseLine(l) ?? { amount: "", name: l, prep: "" })} />
                  ) : (
                    <p class="text-ink-muted">
                      No ingredients yet, so picking it won't add anything to
                      the shopping list.
                    </p>
                  )}
                  {s.ingredientsNote ? (
                    <p class="mt-2 text-[13px] text-ink-muted">
                      {s.ingredientsNote}. Edit to match how you make it.
                    </p>
                  ) : null}
                  <div class="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2">
                    <Button size="sm" variant={s.id === day.pickedId ? "secondary" : "primary"} onClick={() => void r.run(() => pick(day.date, s.id))}>
                      {s.id === day.pickedId ? "Unpick" : "Pick for " + (isToday ? "tonight" : dayName(day.date))}
                    </Button>
                    <Button
                     variant="ghost"
                      size="sm"
                      class="-ml-3"
                      onClick={() => setEditing(s.id)}
                    >
                      {s.ingredientLines.length
                        ? "Edit ingredients"
                        : "+ Add ingredients"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setChoosing(s.title)}>
                      {photoFor(photos, s.title) ? "Change photo" : "Add a photo"}
                    </Button>
                    {s.recipeSlug ? (
                      <Button
                       variant="ghost"
                        size="sm"
                        to={`/recipe/${s.recipeSlug}`}
                      >
                        Open recipe
                      </Button>
                    ) : null}
                    {s.mine || s.fromFork ? (
                      <Button
                       variant="ghost"
                        size="sm"
                        class="text-danger hover:text-danger"
                        onClick={() => void r.run(() => remove(s.id))}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
            </SuggestionRow>
          ))
        : null}
    </DayPlan>
  );
}

function dayLabel(date: string, today: string) {
  if (date === today) return "Tonight";
  if (date === addDays(today, 1)) return "Tomorrow";
  return dayName(date);
}

/** The meal a day is showing: the pick, or the top idea so far. */
function leadOf(day: Day) {
  return day.suggestions.find((s) => s.id === day.pickedId) ?? day.suggestions[0] ?? null;
}

/** Tonight, big: the meal's photo edge to edge with its name over it, and one action. */
function TonightHero({ day, onOpen }: { day: Day; onOpen: () => void }) {
  const photos = usePhotos();
  const chef = api.useMutation("setChef");
  const [choosing, setChoosing] = useState(false);
  const r = useRunner();
  const lead = leadOf(day);
  const picked = !!lead && lead.id === day.pickedId;
  const pic = lead ? photoFor(photos, lead.title) : null;
  const chefLine = day.chefName ? (day.iAmChef ? "You're cooking" : `${day.chefName} is cooking`) : "Nobody's cooking yet";
  const meta = lead
    ? picked
      ? chefLine
      : `${day.suggestions.length} idea${day.suggestions.length === 1 ? "" : "s"}, nothing picked yet`
    : "No ideas yet";
  const wide = useMedia("(min-width: 768px)");
  const action =
    lead && picked && !day.chefName ? (
      <Button type="button" class={pic ? "bg-white text-black hover:bg-white/90" : ""} disabled={r.busy} onClick={() => void r.run(() => chef(day.date, true))}>
        I'll cook
      </Button>
    ) : (
      <Button type="button" class={pic ? "bg-white text-black hover:bg-white/90" : ""} onClick={onOpen}>
        {lead ? (picked ? "See the plan" : "Vote and pick") : "Suggest a meal"}
      </Button>
    );
  const title = lead?.title ?? "What's for dinner?";
  return (
    <div data-component="TonightHero">
      {pic ? (
        // Tonight's photo as a resin magnet. The words sit in the card's safe area, clear of the curved rim.
        <ResinCard
          src={photoSrc(pic.url, 1600)}
          aspect={wide ? 4 / 3 : 4 / 5}
          flat={<MealImage id={pic.url} title={title} showTitle={false} eager sizes="(min-width: 768px) 640px, 100vw" widths={[800, 1280]} class="h-full w-full" />}
        >
          <button type="button" class="absolute inset-0" onClick={onOpen} aria-label={`Open tonight: ${title}`} />
          <div class="absolute right-[8%] top-[7%]">
            <PhotoButton has onClick={() => setChoosing(true)} />
          </div>
          <div class="pointer-events-none absolute inset-x-[10%] bottom-[9%] text-white">
            <p class="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/80">Tonight</p>
            <h1 class="mt-1 text-[clamp(2rem,7vw,3.25rem)] font-bold leading-[1] tracking-[-0.04em]">{title}</h1>
            <p class="mt-2 text-[15px] text-white/85">{meta}</p>
            <div class="pointer-events-auto mt-4 flex flex-wrap gap-2">{action}</div>
          </div>
        </ResinCard>
      ) : (
        <div class="overflow-hidden rounded-[28px]">
          <PhotoHero
            tall
            image={null}
            title={title}
            eyebrow="Tonight"
            meta={meta}
            onOpen={onOpen}
            openLabel={`Open tonight: ${lead?.title ?? "no ideas yet"}`}
            topRight={lead ? <PhotoButton has={false} onClick={() => setChoosing(true)} /> : null}
            actions={action}
          />
        </div>
      )}
      {choosing && lead ? <PhotoPicker title={lead.title} current={pic} onClose={() => setChoosing(false)} /> : null}
      <ErrorLine text={r.error} />
    </div>
  );
}

/** True while the media query matches. */
function useMedia(q: string) {
  const [on, setOn] = useState(() => typeof matchMedia !== "undefined" && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const f = () => setOn(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [q]);
  return on;
}

/** One upcoming day as a row: the meal's photo, the day, and what's planned. */
function DayRow({ day, label, onOpen }: { day: Day; label: string; onOpen: () => void }) {
  const photos = usePhotos();
  const lead = leadOf(day);
  const picked = !!lead && lead.id === day.pickedId;
  const meta = picked
    ? day.chefName
      ? day.iAmChef
        ? "You're cooking"
        : `${day.chefName} is cooking`
      : "Needs a cook"
    : day.suggestions.length
      ? `${day.suggestions.length} idea${day.suggestions.length === 1 ? "" : "s"} to vote on`
      : "Nothing planned";
  return (
    <Row
      component="DayRow"
      media={
        lead ? (
          <Thumb title={lead.title} photo={photoFor(photos, lead.title)?.url ?? null} size="lg" />
        ) : (
          <span class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed border-ink-muted/40 text-ink-muted">
            <Icon name="plus" size={20} />
          </span>
        )
      }
      eyebrow={`${label} · ${shortDate(day.date)}`}
      title={lead ? lead.title : "Add an idea"}
      muted={!lead}
      meta={meta}
      onClick={onOpen}
      chevron
    />
  );
}

/** Everything about one day, in a sheet: who's cooking, the ideas, votes, picking, adding one. */
function DaySheet({ day, label, isToday, onClose }: { day: Day; label: string; isToday: boolean; onClose: () => void }) {
  return (
    <Sheet title={label} subtitle={label === dayName(day.date) ? shortDate(day.date) : `${dayName(day.date)}, ${shortDate(day.date)}`} onClose={onClose}>
      <DayCard day={day} isToday={isToday} bare />
    </Sheet>
  );
}

export function WeekPage() {
  const today = todayLocal();
  const [offset, setOffset] = useState(0);
  const start = addDays(today, offset * 7);
  const week = api.useQuery("week", start, 7);
  const planAhead = api.useMutation("planAhead");
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const r = useRunner();
  usePageTitle("Week");
  if (week === undefined) return <Loading />;
  const first = offset === 0 ? week[0] : null;
  const rest = offset === 0 ? week.slice(1) : week;
  const open = week.find((d) => d.date === openDate) ?? null;
  return (
    <div class={container}>
      <div class={`${flow} pt-4 md:pt-10`}>
        {first ? <TonightHero day={first} onOpen={() => setOpenDate(first.date)} /> : null}

        <div class="mt-8 flex items-center justify-between">
          <h1 class="text-[22px] font-bold tracking-[-0.03em]">{offset === 0 ? "Coming up" : `${shortDate(start)} – ${shortDate(addDays(start, 6))}`}</h1>
          <div class="flex items-center">
            <Button variant="ghost" size="sm" class="size-9 px-0" disabled={offset <= 0} onClick={() => setOffset(offset - 1)} aria-label="Previous week">
              <Icon name="chevronLeft" size={18} />
            </Button>
            <Button variant="ghost" size="sm" class="size-9 px-0" onClick={() => setOffset(offset + 1)} aria-label="Next week">
              <Icon name="chevronRight" size={18} />
            </Button>
          </div>
        </div>
        <ul class="mt-1">
          {rest.map((d) => (
            <DayRow key={d.date} day={d} label={dayLabel(d.date, today)} onOpen={() => setOpenDate(d.date)} />
          ))}
        </ul>
        {rest.some((d) => !d.suggestions.length) ? (
          <Button
            variant="secondary"
            class="mt-4 w-full"
            disabled={r.busy}
            onClick={async () => {
              setNote(null);
              const res = await r.run(() => planAhead(start, 7));
              if (res) setNote(res.added ? `Added ${res.added} ideas to empty days.` : "Every day already has an idea.");
            }}
          >
            Fill empty days with ideas
          </Button>
        ) : null}
        {note ? <p class="mt-3 text-[15px] text-ink-muted">{note}</p> : null}
        <ErrorLine text={r.error} />
      </div>
      {open ? <DaySheet day={open} label={dayLabel(open.date, today)} isToday={open.date === today} onClose={() => setOpenDate(null)} /> : null}
    </div>
  );
}

// ---------- meals ----------

/** "Plan for a day": pick one of the next seven days and suggest this meal there. */
export function SuggestOnDay({
  title,
  onDone,
  onClose,
}: {
  title: string;
  onDone: (note: string) => void;
  onClose: () => void;
}) {
  const suggest = api.useMutation("suggestMeal");
  const today = todayLocal();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [date, setDate] = useState(today);
  const r = useRunner();
  return (
    <Sheet
      title="Plan for a day"
      subtitle={title}
      onClose={onClose}
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await r.run(() => suggest(date, title, "").then(() => true));
        if (ok) onDone(`Suggested ${title} for ${date === today ? "today" : `${dayName(date)} ${shortDate(date)}`}.`);
      }}
      actions={
        <>
          <Button type="button" variant="secondary" class={sheetAction} onClick={onClose}>
            Cancel
          </Button>
          <Button class={sheetAction} disabled={r.busy}>
            Suggest
          </Button>
        </>
      }
    >
      <div class="flex flex-col gap-3">
        <Field label="Which day?">
          <Select value={date} onChange={(e: any) => setDate(e.target.value)}>
            {days.map((d, i) => (
              <option key={d} value={d}>
                {i === 0 ? "Today" : i === 1 ? "Tomorrow" : `${dayName(d)} ${shortDate(d)}`}
              </option>
            ))}
          </Select>
        </Field>
        <ErrorLine text={r.error} />
      </div>
    </Sheet>
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
        <Input
          
          placeholder="Add an item, like 2 lb apples"
          value={text}
          onInput={(e) => setText((e.target as HTMLInputElement).value)}
        />
        <Button disabled={r.busy || !text.trim()}>
          Add
        </Button>
      </form>
      <ErrorLine text={r.error} />

      <div class="mt-6 flex min-h-11 items-center justify-between text-[15px] text-ink-muted">
        <span>
          {list.total === 0 ? "" : `${list.done} of ${list.total} in the cart`}
        </span>
        {list.done > 0 ? (
          <Button
           variant="ghost"
            size="sm"
            onClick={() => void r.run(() => clearChecked())}
          >
            Clear checked
          </Button>
        ) : null}
      </div>

      {list.total === 0 ? (
        <EmptyState
          title="Nothing on the list yet."
          body="Pick a meal for a day and its ingredients land here, combined and sorted by aisle."
        />
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
  const [confirmReset, setConfirmReset] = useState(false);
  const r = useRunner();
  if (me === undefined || !me.family) return <Loading />;
  const link = `${location.origin}/join/${me.family.inviteCode}`;
  return (
    <div class="flex flex-col gap-10">
      <section>
        <SectionHeading title="Invite your family" />
        <p class="text-[15px] text-ink-muted">Anyone with this link can join {me.family.name} after they sign in.</p>
        <div class="mt-4 flex gap-2">
          <Input readOnly aria-label="Invite link" value={link} onFocus={(e: any) => e.target.select()} />
          <Button
            type="button"
            class="h-12"
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
          </Button>
        </div>
        {me.family.isOwner ? (
          <Button type="button" variant="ghost" size="sm" class="-ml-3 mt-2" onClick={() => setConfirmReset(true)}>
            Make a new link
          </Button>
        ) : null}
        {confirmReset ? (
          <Confirm
            title="Make a new invite link?"
            body="The old link stops working. Anyone who already joined stays in the family."
            action="Make a new link"
            busy={r.busy}
            onClose={() => setConfirmReset(false)}
            onConfirm={() => void r.run(() => resetInvite()).then(() => setConfirmReset(false))}
          />
        ) : null}
      </section>

      <section>
        <SectionHeading title={me.family.name} />
        <ul class="border-t border-line">
          {me.members.map((m) => (
            <PersonRow
              key={m.name + String(m.isMe)}
              name={m.isMe ? `${m.name} (you)` : m.name}
              meta={m.isOwner ? "Started the family" : undefined}
            />
          ))}
        </ul>
      </section>

      <section>
        <SectionHeading title="Your name" />
        <form
          class="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void r.run(() => setMyName(name ?? me.displayName));
          }}
        >
          <Input aria-label="Your name" value={name ?? me.displayName} onInput={(e: any) => setName(e.target.value)} />
          <Button variant="secondary" class="h-12" disabled={r.busy || (name ?? me.displayName) === me.displayName}>
            Save
          </Button>
        </form>
        <p class="mt-1 text-[15px] text-ink-muted">This is what your family sees.</p>
      </section>

      <section class="border-t border-line pt-6">
        <Button type="button" variant="secondary" onClick={() => void signOut().then(() => location.assign("/"))}>
          Sign out
        </Button>
      </section>
      <ErrorLine text={r.error} />
    </div>
  );
}

// ---------- layout ----------

/** Loading the signed-in app: the FORK splash covers it (once per visit), with plain text under it. */
export function AppLoading() {
  useEffect(() => showSplash(), []);
  return (
    <Shell>
      <Loading />
    </Shell>
  );
}

function FamilyLayout({ children }: { children: any }) {
  const me = api.useQuery("me");
  if (me === undefined)
    return <AppLoading />;
  if (!me.family) return <Redirect to="/" />;
  return <AppFrame familyName={me.family.name}>{children}</AppFrame>;
}

export function MemberRoute({ children }: { children: any }) {
  const auth = useUser();
  if (auth.isLoading)
    return <AppLoading />;
  if (!auth.signedIn) return <Redirect to="/" />;
  return <FamilyLayout>{children}</FamilyLayout>;
}

function SignedInHome() {
  const me = api.useQuery("me");
  if (me === undefined)
    return <AppLoading />;
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
  if (auth.isLoading)
    return <AppLoading />;
  if (!auth.signedIn) return <Landing signedIn={false} />;
  return <SignedInHome />;
}
