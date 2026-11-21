// Fork's grid and page templates. DESIGN.md → Layout describes them.
// Every screen renders inside one of: MarketingTemplate, AuthTemplate,
// AppFrame + AppPage, or AppFrame + DetailTemplate.
import { useEffect } from "preact/hooks";
import { Link, useLocation } from "@spacefast/zero/client";
import { DevBadge } from "./dev-badge";

// ---------- grid ----------

/** 1200px max, 20px side margins on phones, 32px from 768px. */
export const container = "mx-auto w-full max-w-[1200px] px-5 md:px-8";
/** 4 columns on phones, 12 from 768px. */
export const grid12 = "grid grid-cols-4 gap-x-4 md:grid-cols-12 md:gap-x-6";
/** Meal and idea grids: 2 / 3 / 4 across. */
export const cardGrid = "grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4";
/** One reading column. */
export const flow = "mx-auto w-full max-w-[640px]";
/** Forms. */
export const narrow = "w-full max-w-[440px]";

// ---------- type ----------

export const displayXl = "font-display text-[clamp(2.5rem,7vw,4.75rem)] font-bold leading-[1] tracking-[-0.04em]";
export const displayLg = "font-display text-[clamp(2rem,4vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.035em]";
export const displayMd = "font-display text-[clamp(1.375rem,2.5vw,1.75rem)] font-bold leading-[1.15] tracking-[-0.03em]";
export const caption = "text-[13px] font-medium text-ink-muted";

// ---------- small helpers ----------

/** Tab title: "Recipes · Fork", or just "Fork". */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Fork` : "Fork";
  }, [title]);
}

export function Brand() {
  return (
    <Link to="/" class="font-display text-[28px] font-bold leading-none tracking-[-0.02em] text-ink" data-component="Brand">
      Fork
    </Link>
  );
}

function SkipLink() {
  return (
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-action focus:px-4 focus:py-2 focus:text-on-action"
    >
      Skip to content
    </a>
  );
}

export function BackLink({ to, text }: { to: string; text: string }) {
  return (
    <Link to={to} class="inline-flex items-center gap-1 text-[15px] font-medium text-ink-muted hover:text-ink" data-component="BackLink">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      {text}
    </Link>
  );
}

// ---------- photos ----------

export const photo = (id: string, w: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;
const photoSet = (id: string, widths: number[]) => widths.map((w) => `${photo(id, w)} ${w}w`).join(", ");
/** An Unsplash id from the landing page, or a full address (a family's photo, a search pick). */
const isUrl = (id: string) => /^(https?:)?\/\//.test(id) || id.startsWith("/");

// Warm food-ish tints for meals without a photo, picked by name so a meal keeps its colour.
const TINTS = ["bg-[#f3e2cf] text-[#5a3a1c]", "bg-[#e5ecd9] text-[#33421f]", "bg-[#f4d9d2] text-[#5e2a1f]", "bg-[#e9e1f0] text-[#3d2c52]", "bg-[#f6ead0] text-[#574413]", "bg-[#dcebe8] text-[#1f4540]"];
export function tintFor(title: string) {
  let h = 0;
  for (const c of title) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

/** A meal photo, or a tinted tile with the meal's name when there isn't one (DESIGN.md → Imagery). */
export function MealImage({ id, title, sizes, widths, class: cls, eager, showTitle = true }: { id: string | null; title: string; sizes: string; widths: number[]; class: string; eager?: boolean; showTitle?: boolean }) {
  if (!id) {
    return (
      <div class={`${cls} flex items-end p-5 ${tintFor(title)}`} data-component="MealImage">
        {showTitle ? <span class="text-[22px] font-bold leading-[1.1] tracking-[-0.03em] md:text-[26px]">{title}</span> : null}
      </div>
    );
  }
  const url = isUrl(id);
  return (
    <img
      src={url ? id : photo(id, widths[widths.length - 1])}
      srcSet={url ? undefined : photoSet(id, widths)}
      sizes={url ? undefined : sizes}
      alt={title}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      class={`${cls} bg-surface-strong object-cover`}
      data-component="MealImage"
    />
  );
}

// ---------- Marketing ----------

export function MarketingTemplate({ nav, children }: { nav: any; children: any }) {
  usePageTitle();
  return (
    <div class="min-h-screen bg-canvas font-sans text-ink" data-component="MarketingTemplate">
      <SkipLink />
      <header class={`${container} flex h-16 items-center justify-between`}>
        <Brand />
        <nav class="flex items-center gap-6">{nav}</nav>
      </header>
      <main id="main">{children}</main>
      <DevBadge />
      <footer class={`${container} mt-28 flex flex-wrap items-center justify-between gap-4 border-t border-line py-8 text-[13px] text-ink-muted md:mt-40`}>
        <span>Fork · Dinner, decided.</span>
        <span>
          Photos from{" "}
          <a href="https://unsplash.com" class="underline underline-offset-2 hover:text-ink">
            Unsplash
          </a>
        </span>
      </footer>
    </div>
  );
}

// ---------- Auth ----------

const AUTH_PHOTO = "1791318554916-f0c5e627a049";

/** Narrow form column; on desktop a photo fills the right half. */
export function AuthTemplate({ title, children }: { title?: string; children: any }) {
  usePageTitle(title);
  return (
    <div class="min-h-screen bg-canvas font-sans text-ink lg:grid lg:grid-cols-2" data-component="AuthTemplate">
      <SkipLink />
      <div class="flex min-h-screen flex-col px-5 md:px-8 lg:px-16">
        <header class="flex h-16 items-center">
          <Brand />
        </header>
        <main id="main" class={`${narrow} flex flex-1 flex-col justify-center py-12 lg:py-20`}>
          {children}
        </main>
        <DevBadge />
      </div>
      <div class="sticky top-0 hidden h-screen lg:block">
        <img
          src={photo(AUTH_PHOTO, 1400)}
          srcSet={`${photo(AUTH_PHOTO, 900)} 900w, ${photo(AUTH_PHOTO, 1400)} 1400w`}
          sizes="50vw"
          alt=""
          class="h-full w-full bg-surface-strong object-cover"
        />
      </div>
    </div>
  );
}

/** Heading block used at the top of an Auth screen. */
export function AuthHeading({ title, intro }: { title: string; intro?: any }) {
  return (
    <div class="mb-8" data-component="AuthHeading">
      <h1 class={displayLg}>{title}</h1>
      {intro ? <p class="mt-3 text-[17px] leading-relaxed text-ink-muted">{intro}</p> : null}
    </div>
  );
}

// ---------- App frame ----------

type Tab = { to: string; label: string; match: RegExp; icon: any };

const icon = (d: string) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const TABS: Tab[] = [
  { to: "/", label: "Week", match: /^\/$/, icon: icon("M4 7.5h16M8 3.5v3M16 3.5v3M5.5 5.5h13a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z") },
  { to: "/meals", label: "Meals", match: /^\/(meals|recipe|idea)(\/|$)/, icon: icon("M7 3.5v17M4.5 3.5v5a2.5 2.5 0 0 0 5 0v-5M16.5 20.5v-17c-2 1-3.5 3.5-3.5 7 0 2 1 3 3.5 3") },
  { to: "/list", label: "List", match: /^\/list$/, icon: icon("M9.5 6.5h10M9.5 12h10M9.5 17.5h10M4.5 6.5l1 1 2-2M4.5 12l1 1 2-2M4.5 17.5l1 1 2-2") },
  { to: "/family", label: "Family", match: /^\/family$/, icon: icon("M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.3 2.6 3.5 5.2") },
];

/** Every signed-in screen: top bar, and the tab bar (bottom on phones, top on desktop). */
export function AppFrame({ familyName, children }: { familyName?: string; children: any }) {
  const loc = useLocation();
  return (
    <div class="min-h-screen bg-canvas font-sans text-ink">
      <SkipLink />
      <header class="sticky top-0 z-20 bg-canvas" data-component="TopBar">
        <div class={`${container} flex h-14 items-center justify-between gap-6`}>
          <div class="flex items-baseline gap-3">
            <Brand />
            {familyName ? <span class="hidden text-[15px] text-ink-muted sm:inline lg:hidden">{familyName}</span> : null}
          </div>
          <nav class="hidden items-center gap-8 lg:flex" aria-label="Main">
            {TABS.map((t) => {
              const on = t.match.test(loc.pathname);
              return (
                <Link key={t.to} to={t.to} aria-current={on ? "page" : undefined} class={`text-[15px] font-medium ${on ? "text-ink" : "text-ink-muted hover:text-ink"}`}>
                  {t.label}
                </Link>
              );
            })}
          </nav>
          {familyName ? <span class="hidden text-[15px] text-ink-muted lg:inline">{familyName}</span> : <span class="hidden lg:inline" />}
        </div>
      </header>
      <main id="main" class="pb-28 lg:pb-24">
        {children}
      </main>
      <DevBadge />
      <nav class="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Main" data-component="TabBar">
        <div class="mx-auto grid h-16 max-w-[640px] grid-cols-4">
          {TABS.map((t) => {
            const on = t.match.test(loc.pathname);
            return (
              <Link
                key={t.to}
                to={t.to}
                aria-current={on ? "page" : undefined}
                class={`flex flex-col items-center justify-center gap-1 text-[12px] font-medium ${on ? "text-ink" : "text-ink-muted"}`}
              >
                {t.icon}
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ---------- App page ----------

export type SubNavItem = { to: string; label: string };

/** Sections within a tab (Recipes · Ideas · Ingredients): a compact segmented control. */
export function SubNav({ items }: { items: SubNavItem[] }) {
  const loc = useLocation();
  return (
    <nav class="inline-flex rounded-full bg-surface p-1" aria-label="Section" data-component="SubNav">
      {items.map((it) => {
        const on = loc.pathname === it.to;
        return (
          <Link
            key={it.to}
            to={it.to}
            aria-current={on ? "page" : undefined}
            class={`rounded-full px-4 py-1.5 text-[15px] font-medium ${on ? "bg-canvas text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]" : "text-ink-muted hover:text-ink"}`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * A signed-in screen. Top-level tabs (no `back`) don't repeat their name as a big title: the tab
 * bar already says where you are, so the content starts right under it. Screens you drill into
 * (with `back`) show the back link and their title.
 */
export function AppPage({
  title,
  tabTitle,
  description,
  back,
  actions,
  subnav,
  width = "flow",
  children,
}: {
  title: any;
  tabTitle?: string;
  description?: any;
  back?: { to: string; text: string };
  actions?: any;
  subnav?: SubNavItem[];
  width?: "flow" | "wide";
  children: any;
}) {
  usePageTitle(tabTitle ?? (typeof title === "string" ? title : undefined));
  const inner = width === "flow" ? flow : "";
  const showTitle = !!back;
  return (
    <div class={container}>
      <div class={inner}>
        <header class={showTitle ? "pt-4 md:pt-8" : "pt-3 md:pt-6"} data-component="PageHeader">
          {back ? (
            <div class="mb-3">
              <BackLink to={back.to} text={back.text} />
            </div>
          ) : null}
          {showTitle ? <h1 class={displayLg}>{title}</h1> : <h1 class="sr-only">{title}</h1>}
          {description ? <p class="mt-2 max-w-[36rem] text-[17px] leading-relaxed text-ink-muted">{description}</p> : null}
          {subnav || actions ? (
            <div class={`flex flex-wrap items-center justify-between gap-3 ${showTitle ? "mt-4" : ""}`}>
              {subnav ? <SubNav items={subnav} /> : <span />}
              {actions ? <div class="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
            </div>
          ) : null}
        </header>
        <div class={subnav || actions || showTitle ? "mt-5 md:mt-6" : "mt-0"}>{children}</div>
      </div>
    </div>
  );
}

// ---------- Detail ----------

/** One recipe or idea: optional full-bleed hero, then a flow column. */
export function DetailTemplate({
  back,
  title,
  meta,
  image,
  photoAction,
  actions,
  children,
}: {
  back: { to: string; text: string };
  title: string;
  meta?: any;
  image?: string | null;
  /** A button over the photo, like "Add photo". */
  photoAction?: any;
  actions?: any;
  children: any;
}) {
  usePageTitle(title);
  return (
    <article data-component="DetailTemplate">
      <div class="md:mx-auto md:mt-6 md:max-w-[1136px] md:px-8">
        <PhotoHero image={image ?? null} title={title} meta={meta} topLeft={<BackPill to={back.to} text={back.text} />} topRight={photoAction} />
      </div>
      <div class={container}>
        <div class={`${flow} mt-6`}>
          {actions ? <div class="flex flex-wrap items-center gap-3">{actions}</div> : null}
          <div class="mt-10">{children}</div>
        </div>
      </div>
    </article>
  );
}

/**
 * A meal's photo, edge to edge on phones, with its name over it. Used by the Week's Tonight
 * card and by recipe and idea pages. No photo: the meal's tint, with the name in ink.
 */
export function PhotoHero({
  image,
  title,
  eyebrow,
  meta,
  topLeft,
  topRight,
  actions,
  onOpen,
  openLabel,
  tall,
}: {
  image: string | null;
  title: string;
  eyebrow?: string;
  meta?: any;
  topLeft?: any;
  topRight?: any;
  actions?: any;
  onOpen?: () => void;
  openLabel?: string;
  /** 4:5 on phones even without a photo (the Tonight card). */
  tall?: boolean;
}) {
  const shape = image || tall ? "aspect-[4/5] sm:aspect-[16/9]" : "aspect-[4/3] sm:aspect-[21/9]";
  const pic = <MealImage id={image} title={title} showTitle={false} eager sizes="(min-width: 1200px) 1136px, 100vw" widths={[800, 1280, 1600]} class={`w-full ${shape}`} />;
  return (
    <section class="relative overflow-hidden md:rounded-3xl" data-component="PhotoHero">
      {onOpen ? (
        <button type="button" class="block w-full" onClick={onOpen} aria-label={openLabel ?? title}>
          {pic}
        </button>
      ) : (
        pic
      )}
      {image ? <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/25" /> : null}
      {topLeft || topRight ? (
        <div class="absolute inset-x-0 top-0 flex items-center justify-between p-4 md:p-6">
          <span>{topLeft}</span>
          <span>{topRight}</span>
        </div>
      ) : null}
      <div class={`pointer-events-none absolute inset-x-0 bottom-0 p-5 md:p-8 ${image ? "text-white" : "text-ink"}`}>
        {eyebrow ? <p class={`text-[13px] font-semibold uppercase tracking-[0.08em] ${image ? "text-white/80" : "opacity-70"}`}>{eyebrow}</p> : null}
        <h1 class="mt-1 text-[clamp(2.25rem,8vw,3.75rem)] font-bold leading-[1] tracking-[-0.04em]">{title}</h1>
        {meta ? <p class={`mt-2 text-[15px] ${image ? "text-white/85" : "opacity-75"}`}>{meta}</p> : null}
        {actions ? <div class="pointer-events-auto mt-5 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

/** Back link that sits over a photo. */
export function BackPill({ to, text }: { to: string; text: string }) {
  return (
    <Link to={to} class="inline-flex h-10 items-center gap-1 rounded-full bg-black/25 pl-3 pr-4 text-[15px] font-medium text-white backdrop-blur-md hover:bg-black/35" data-component="BackPill">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      {text}
    </Link>
  );
}
