// /dev/components: the design system, live. Foundations → atoms → molecules →
// organisms → templates. Everything renders from the same components the app uses.
import { useState } from "preact/hooks";
import { DevFrame } from "./dev";
import { MealImage, caption, cardGrid, displayLg, displayMd, displayXl } from "./layout";
import {
  AisleGroup,
  Button,
  CheckCircle,
  DayPlan,
  EmptyState,
  Field,
  ICON_NAMES,
  Icon,
  Input,
  ListRow,
  MealTile,
  SearchField,
  SectionHeading,
  Sheet,
  sheetAction,
  SuggestionRow,
  Tag,
  TextLink,
  Textarea,
  Thumb,
  VoteButton,
} from "./ui";
import { SCENARIOS, goUrl } from "../shared/scenarios";

const SPAGHETTI = "1551892374-ecf8754cf8b0";
const PIZZA = "1565299624946-b28f40a0ae38";

// ---------- frame ----------

type Mode = "both" | "light" | "dark";

function Panel({ scheme, children }: { scheme: "light" | "dark"; children: any }) {
  return (
    <div style={{ colorScheme: scheme }} class="min-w-0 flex-1 rounded-[12px] border border-line bg-canvas p-5 text-ink md:p-6">
      <p class={`mb-4 ${caption}`}>{scheme === "light" ? "Light" : "Dark"}</p>
      {children}
    </div>
  );
}

function Specimen({ id, name, usage, mode, children }: { id?: string; name: string; usage?: string; mode: Mode; children: any }) {
  return (
    <div id={id} class="scroll-mt-24 border-t border-line py-10">
      <h3 class="text-[20px] font-semibold">{name}</h3>
      {usage ? <p class="mt-1 max-w-[44rem] text-[15px] leading-relaxed text-ink-muted">{usage}</p> : null}
      <div class="mt-5 flex flex-col gap-4 lg:flex-row">
        {mode !== "dark" ? <Panel scheme="light">{children}</Panel> : null}
        {mode !== "light" ? <Panel scheme="dark">{children}</Panel> : null}
      </div>
    </div>
  );
}

function Level({ id, title, intro, children }: { id: string; title: string; intro: string; children: any }) {
  return (
    <section id={id} class="scroll-mt-20 pt-16">
      <h2 class={displayLg}>{title}</h2>
      <p class="mt-3 max-w-[40rem] text-[17px] leading-relaxed text-ink-muted">{intro}</p>
      <div class="mt-6">{children}</div>
    </section>
  );
}

const Row = ({ children }: { children: any }) => <div class="flex flex-wrap items-center gap-3">{children}</div>;
const Label = ({ children }: { children: any }) => <p class={`mb-2 mt-5 first:mt-0 ${caption}`}>{children}</p>;

// ---------- foundations ----------

const COLORS: [string, string, string][] = [
  ["canvas", "bg-canvas", "Page background"],
  ["surface", "bg-surface", "Inputs, quiet fills"],
  ["surface-strong", "bg-surface-strong", "Type tiles, image placeholders"],
  ["ink", "bg-ink", "Text and headings"],
  ["ink-muted", "bg-ink-muted", "Meta text, inactive tabs"],
  ["line", "bg-line", "Hairlines"],
  ["action", "bg-action", "Primary buttons"],
  ["accent", "bg-accent", "Basil: state only (picked, voted, done)"],
  ["accent-soft", "bg-accent-soft", "Active vote fill"],
  ["danger", "bg-danger", "Destructive and errors"],
];

const TYPE: [string, string, string][] = [
  ["display-xl", displayXl, "What's for dinner?"],
  ["display-lg", displayLg, "Spaghetti bolognese"],
  ["display-md", displayMd, "Everyone gets a say"],
  ["title", "text-[20px] font-semibold leading-tight", "Lemon herb roast chicken"],
  ["body", "text-[17px] leading-relaxed", "Anyone can suggest a dinner for any night."],
  ["body-sm", "text-[15px] text-ink-muted", "Suggested by Maya · 6 ingredients"],
  ["label", "text-[15px] font-medium", "Pick this"],
  ["caption", caption, "Tonight"],
];

const SPACE: [string, number][] = [
  ["xs", 4],
  ["sm", 8],
  ["md", 12],
  ["base", 16],
  ["lg", 24],
  ["xl", 32],
  ["xxl", 48],
  ["section", 80],
];

function Foundations({ mode }: { mode: Mode }) {
  return (
    <Level id="foundations" title="Foundations" intro="Tokens from DESIGN.md and theme.json. Every color has a light and a dark value; nothing else is themed by hand.">
      <Specimen id="colors" name="Color" mode={mode} usage="Neutrals do almost all the work. Basil is the only hue and it always means something is live or decided.">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {COLORS.map(([name, cls, use]) => (
            <div key={name}>
              <div class={`h-14 rounded-[8px] border border-line ${cls}`} />
              <p class="mt-2 text-[13px] font-medium">{name}</p>
              <p class="text-[12px] leading-snug text-ink-muted">{use}</p>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen id="type" name="Type" mode={mode} usage="Newsreader for display, Geist for everything functional. One display-size line per screen.">
        <div class="flex flex-col gap-5">
          {TYPE.map(([name, cls, sample]) => (
            <div key={name} class="grid gap-1 sm:grid-cols-[120px_1fr] sm:items-baseline sm:gap-4">
              <span class={caption}>{name}</span>
              <span class={`${cls} min-w-0 truncate`}>{sample}</span>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen id="space" name="Spacing and radius" mode={mode} usage="4px base. Space separates first, a hairline second, a fill last.">
        <div class="flex flex-col gap-2">
          {SPACE.map(([name, px]) => (
            <div key={name} class="flex items-center gap-4">
              <span class={`w-16 ${caption}`}>{name}</span>
              <span class="h-3 rounded-full bg-ink" style={{ width: `${px}px` }} />
              <span class="text-[13px] tabular-nums text-ink-muted">{px}</span>
            </div>
          ))}
        </div>
        <div class="mt-6 flex flex-wrap gap-4">
          {[
            ["sm 8", "rounded-[8px]"],
            ["md 12", "rounded-[12px]"],
            ["lg 20", "rounded-[20px]"],
            ["full", "rounded-full"],
          ].map(([n, r]) => (
            <div key={n} class="text-center">
              <div class={`h-14 w-20 border border-line bg-surface ${r}`} />
              <p class={`mt-1 ${caption}`}>{n}</p>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen id="grid" name="Grid" mode={mode} usage="4 columns on phones, 12 from 768px, 16/24px gutters. Resize the window to watch it switch.">
        <div class="grid grid-cols-4 gap-x-4 md:grid-cols-12 md:gap-x-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} class={`h-16 rounded-[4px] bg-accent-soft ${i >= 4 ? "hidden md:block" : ""}`} />
          ))}
        </div>
        <div class="mt-3 grid grid-cols-4 gap-x-4 md:grid-cols-12 md:gap-x-6">
          <div class="col-span-4 rounded-[4px] bg-surface-strong p-2 text-[13px] md:col-span-6">6 cols: photo</div>
          <div class="col-span-4 mt-3 rounded-[4px] bg-surface-strong p-2 text-[13px] md:col-span-5 md:col-start-8 md:mt-0">5 cols: text</div>
        </div>
      </Specimen>

      <Specimen id="icons" name="Icons" mode={mode} usage="1.5px line icons on a 24px grid. Never emoji.">
        <div class="flex flex-wrap gap-5">
          {ICON_NAMES.map((n) => (
            <div key={n} class="flex w-16 flex-col items-center gap-1.5">
              <Icon name={n} />
              <span class="text-[12px] text-ink-muted">{n}</span>
            </div>
          ))}
        </div>
      </Specimen>
    </Level>
  );
}

// ---------- atoms ----------

function Atoms({ mode }: { mode: Mode }) {
  const [voted, setVoted] = useState(false);
  const [checked, setChecked] = useState(true);
  return (
    <Level id="atoms" title="Atoms" intro="The smallest pieces. Each has one job and the states it needs.">
      <Specimen id="button" name="Button" mode={mode} usage="Primary is a solid ink pill, one per screen. Secondary is a hairline pill. Ghost is text. Danger only confirms a destructive step.">
        <Label>md</Label>
        <Row>
          <Button>Start your family</Button>
          <Button variant="secondary">I have an invite</Button>
          <Button variant="ghost">Edit</Button>
          <Button variant="danger">Remove</Button>
        </Row>
        <Label>sm</Label>
        <Row>
          <Button size="sm">Pick</Button>
          <Button size="sm" variant="secondary">
            I'll cook
          </Button>
          <Button size="sm" variant="ghost">
            + Suggest a meal
          </Button>
        </Row>
        <Label>disabled</Label>
        <Row>
          <Button disabled>Add</Button>
          <Button variant="secondary" disabled>
            Fill empty days
          </Button>
        </Row>
      </Specimen>

      <Specimen id="text-link" name="Text link" mode={mode} usage="Inline navigation. Underline in the line color, ink on hover.">
        <p class="text-[17px]">
          No invite? <TextLink to="/start">Start your own family</TextLink>
        </p>
      </Specimen>

      <Specimen id="input" name="Input and textarea" mode={mode} usage="Filled surface, no border, 2px ink ring on focus.">
        <div class="flex max-w-[420px] flex-col gap-3">
          <Input placeholder="Family name, like The Andrews" />
          <Input value="The Andrews" />
          <Input placeholder="Disabled" disabled />
          <Textarea placeholder={"1 lb ground beef\n1 onion"} />
        </div>
      </Specimen>

      <Specimen id="tag" name="Tag" mode={mode} usage="At most one or two per item. Basil means state; neutral is a plain label.">
        <Row>
          <Tag>Picked</Tag>
          <Tag>Saved</Tag>
          <Tag tone="neutral">Quick</Tag>
        </Row>
      </Specimen>

      <Specimen id="vote" name="Vote button" mode={mode} usage="Tabular count. Your vote fills Basil soft. Click it.">
        <Row>
          <VoteButton count={voted ? 4 : 3} active={voted} onClick={() => setVoted(!voted)} />
          <VoteButton count={0} />
          <VoteButton count={12} active />
        </Row>
      </Specimen>

      <Specimen id="check" name="Check" mode={mode} usage="The shopping list check. Basil when done.">
        <Row>
          <button onClick={() => setChecked(!checked)} aria-label="Toggle">
            <CheckCircle checked={checked} />
          </button>
          <CheckCircle checked={false} />
        </Row>
      </Specimen>

      <Specimen id="thumb" name="Thumb" mode={mode} usage="56px. The photo, or the meal's initial on a tile.">
        <Row>
          <Thumb title="Spaghetti bolognese" photo={SPAGHETTI} />
          <Thumb title="Breakfast for dinner" />
        </Row>
      </Specimen>
    </Level>
  );
}

// ---------- molecules ----------

function Molecules({ mode }: { mode: Mode }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(true);
  const [got, setGot] = useState(false);
  return (
    <Level id="molecules" title="Molecules" intro="Atoms combined into one useful unit.">
      <Specimen id="field" name="Field" mode={mode} usage="A visible label above the control. Hint below, or the error in its place.">
        <div class="flex max-w-[420px] flex-col gap-5">
          <Field label="Your name" hint="This is what your family sees.">
            <Input value="Sam" />
          </Field>
          <Field label="Invite link" error="That doesn't look like an invite link or code.">
            <Input value="fork.space/oops" />
          </Field>
        </div>
      </Specimen>

      <Specimen id="search" name="Search field" mode={mode}>
        <div class="max-w-[420px]">
          <SearchField value={q} onInput={setQ} placeholder="Search recipes or ingredients" />
        </div>
      </Specimen>

      <Specimen id="meal-tile" name="Meal tile" mode={mode} usage="Photo first. Without a photo, the type tile carries the name and it isn't repeated below.">
        <div class={cardGrid.replace("lg:grid-cols-4", "")}>
          <MealTile title="Spaghetti bolognese" photo={SPAGHETTI} eyebrow="Tonight" meta="Sam is cooking" tag="Picked" />
          <MealTile title="Homemade pizza night" photo={PIZZA} eyebrow="Friday" meta="Needs a chef" />
          <MealTile title="Turkey chili" eyebrow="Made twice · last Oct 3" meta="ground turkey, onion, kidney beans, +4" />
        </div>
      </Specimen>

      <Specimen id="suggestion-row" name="Suggestion row" mode={mode} usage="One idea for a day. Tap the name to open its ingredients.">
        <ul class="border-t border-line">
          <SuggestionRow title="Spaghetti bolognese" meta="Suggested by Sam · 8 ingredients" votes={3} voted picked onVote={() => {}} onPick={() => {}} open={open} onOpen={() => setOpen(!open)}>
            <ul class="text-[15px] sm:columns-2">
              <li>1 lb ground beef</li>
              <li>1 lb spaghetti</li>
              <li>1 onion</li>
              <li>2 carrots</li>
            </ul>
          </SuggestionRow>
          <SuggestionRow title="Homemade pizza night" meta="Suggested by Maya · 6 ingredients" votes={1} onVote={() => {}} onPick={() => {}} onOpen={() => {}} />
          <SuggestionRow title="Breakfast for dinner" meta="Idea from Fork" votes={0} onVote={() => {}} onPick={() => {}} onOpen={() => {}} />
        </ul>
      </Specimen>

      <Specimen id="list-row" name="List row" mode={mode} usage="Tap anywhere to tick. Done items go muted and sink to the bottom of their aisle.">
        <ul class="border-t border-line">
          <ListRow name="Carrots" amount="2" detail="Spaghetti bolognese" checked={got} onToggle={() => setGot(!got)} onRemove={() => {}} />
          <ListRow name="Celery" amount="2 stalks" checked={false} onToggle={() => {}} />
          <ListRow name="Onion" amount="1" checked onToggle={() => {}} />
        </ul>
      </Specimen>

      <Specimen id="empty" name="Empty state" mode={mode} usage="One line saying what's missing, one action that fixes it. No illustration.">
        <EmptyState title="No recipes yet." body="Meals you pick for a day show up here, or start one yourself." action={<Button variant="secondary">Browse Fork's ideas</Button>} />
      </Specimen>

      <Specimen id="section-heading" name="Section heading" mode={mode}>
        <SectionHeading title="Ingredients" action={<Button variant="ghost" size="sm">Edit</Button>} />
      </Specimen>
    </Level>
  );
}

// ---------- organisms ----------

function Organisms({ mode }: { mode: Mode }) {
  return (
    <Level id="organisms" title="Organisms" intro="Sections of a screen, built from molecules. These are the same components the Week and Shopping list screens render.">
      <Specimen id="sheet" name="Sheet" mode={mode} usage="A focused task over the screen, from shadcn/ui. A drag-to-dismiss bottom drawer on phones, a centered dialog from 768px. Title and the day it's for, the fields, then Cancel and one primary action.">
        <SheetDemo />
      </Specimen>

      <Specimen id="day-plan" name="Day plan" mode={mode} usage="One day on the Week screen. Who's cooking, the ideas, and a way to add one.">
        <div class="flex flex-col gap-8">
          <DayPlan day="Today" date="Nov 11" isToday chef="You're cooking" chefAction={<Button variant="ghost" size="sm">Step down</Button>} footer={<Button variant="ghost" size="sm" class="-ml-3">+ Suggest a meal</Button>}>
            <SuggestionRow title="Spaghetti bolognese" meta="Suggested by you · 8 ingredients" votes={3} picked onVote={() => {}} onPick={() => {}} onOpen={() => {}} />
            <SuggestionRow title="Homemade pizza night" meta="Suggested by Maya · 6 ingredients" votes={1} voted onVote={() => {}} onPick={() => {}} onOpen={() => {}} />
          </DayPlan>
          <DayPlan day="Sunday" date="Nov 15" chefAction={<Button variant="secondary" size="sm">I'll cook</Button>} footer={<Button variant="ghost" size="sm" class="-ml-3">+ Suggest a meal</Button>} />
        </div>
      </Specimen>

      <Specimen id="aisle" name="Aisle group" mode={mode} usage="The shopping list, one aisle at a time.">
        <AisleGroup aisle="Produce">
          <ListRow name="Carrots" amount="2" detail="Spaghetti bolognese" checked={false} onToggle={() => {}} />
          <ListRow name="Onion" amount="1" detail="Spaghetti bolognese" checked onToggle={() => {}} />
        </AisleGroup>
        <AisleGroup aisle="Pantry">
          <ListRow name="Crushed tomatoes" amount="1 can" checked={false} onToggle={() => {}} />
        </AisleGroup>
      </Specimen>

      <Specimen id="meal-image" name="Meal image" mode={mode} usage="Full-bleed hero on phones, rounded on desktop. No photo: a type tile at the same ratio.">
        <div class="grid gap-4 sm:grid-cols-2">
          <MealImage id={SPAGHETTI} title="Spaghetti bolognese" sizes="400px" widths={[600]} class="aspect-[4/3] w-full rounded-[12px]" />
          <MealImage id={null} title="Turkey chili" sizes="400px" widths={[600]} class="aspect-[4/3] w-full rounded-[12px]" />
        </div>
      </Specimen>
    </Level>
  );
}

// ---------- templates ----------

const TEMPLATES: { name: string; use: string; scenario: string; path: string }[] = [
  { name: "Marketing", use: "Landing page. Wide, photo-led.", scenario: "visitor", path: "/" },
  { name: "Auth", use: "Sign-in, start a family, join. Narrow form, photo panel on desktop.", scenario: "visitor", path: "/start" },
  { name: "App frame + App page (flow)", use: "Week, Shopping list, Family. 640px reading column.", scenario: "established", path: "/" },
  { name: "App frame + App page (wide)", use: "Meals: recipes, ideas, ingredients. Card grids.", scenario: "established", path: "/meals" },
  { name: "App frame + Detail", use: "One recipe or idea. Optional hero, then a flow column.", scenario: "established", path: "/recipe/grandma-s-lasagna" },
];

function Templates() {
  return (
    <Level id="templates" title="Templates" intro="Page layouts from client/layout.tsx. Open each one with real seeded data (needs scenario mode).">
      <ul class="border-t border-line">
        {TEMPLATES.map((t) => {
          const s = SCENARIOS.find((x) => x.id === t.scenario)!;
          return (
            <li key={t.name} class="flex flex-wrap items-center justify-between gap-4 border-b border-line py-5">
              <div>
                <p class="text-[17px] font-semibold">{t.name}</p>
                <p class="text-[15px] text-ink-muted">{t.use}</p>
              </div>
              <a href={goUrl(s, t.path)} class="text-[15px] font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
                Open as {s.persona ?? "visitor"}
              </a>
            </li>
          );
        })}
      </ul>
    </Level>
  );
}

// ---------- page ----------

const NAV: [string, string][] = [
  ["foundations", "Foundations"],
  ["atoms", "Atoms"],
  ["molecules", "Molecules"],
  ["organisms", "Organisms"],
  ["templates", "Templates"],
];

export function DevComponents() {
  const [mode, setMode] = useState<Mode>("both");
  return (
    <DevFrame title="Components">
      <div class="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 class={displayXl}>Components</h1>
          <p class="mt-3 max-w-[40rem] text-[17px] leading-relaxed text-ink-muted">Fork's design system, rendered live from client/ui.tsx and client/layout.tsx. The rules behind it are in DESIGN.md.</p>
        </div>
        <div class="flex rounded-full border border-line p-1" role="group" aria-label="Theme">
          {(["both", "light", "dark"] as Mode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} class={`h-9 rounded-full px-4 text-[15px] font-medium capitalize ${mode === m ? "bg-action text-on-action" : "text-ink-muted hover:text-ink"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <nav class="sticky top-0 z-10 -mx-5 mt-8 flex gap-6 overflow-x-auto border-b border-line bg-canvas px-5 md:-mx-8 md:px-8" aria-label="Levels">
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} class="whitespace-nowrap py-4 text-[15px] font-medium text-ink-muted hover:text-ink">
            {label}
          </a>
        ))}
      </nav>
      <Foundations mode={mode} />
      <Atoms mode={mode} />
      <Molecules mode={mode} />
      <Organisms mode={mode} />
      <Templates />
    </DevFrame>
  );
}

function SheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open the sheet
      </Button>
      {open ? (
        <Sheet title="Suggest a meal" subtitle="Today, Nov 11" onClose={() => setOpen(false)} actions={<><Button variant="secondary" class={sheetAction} onClick={() => setOpen(false)}>Cancel</Button><Button class={sheetAction}>Suggest</Button></>}>
          <div class="flex flex-col gap-5">
            <Field label="What should we have?">
              <Input placeholder="Chicken parm" />
            </Field>
            <Field label="Ingredients (optional)" hint="One per line. Leave it empty and Fork fills in a usual recipe when it knows the dish.">
              <Textarea placeholder={"2 lb chicken thighs\n1 onion"} />
            </Field>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
