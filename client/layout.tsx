// Fork's grid and page templates. DESIGN.md → Layout describes them.
// Every screen renders inside one of: MarketingTemplate, AuthTemplate,
// AppFrame + AppPage, or AppFrame + DetailTemplate.
import { createContext } from "preact";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { Link, navigate, useLocation } from "@spacefast/zero/client";
import { MagnetNav, MagnetText, ProgressiveBlur, ResinCard } from "./fridge/ui";
import { hideSplash } from "./fridge/splash";
import type { TabsEngine } from "./fridge/tabs";
import { DebugPanel } from "./debug";
import { mark } from "./live";
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
  const showing = useContext(PaneShowing);
  useEffect(() => {
    if (showing) document.title = title ? `${title} · Fork` : "Fork";
  }, [title, showing]);
}
/** False inside a tab pane that's mounted but not the one on screen (see AppFrame `panes`). */
export const PaneShowing = createContext(true);

export function Brand() {
  return (
    <Link to="/" class="inline-flex items-center" aria-label="Fork" data-component="Brand">
      <MagnetText lines={["FORK"]} lineH={26} label="Fork" />
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
/** A meal photo's address at about `w` px wide, whether it's an Unsplash id or a full address. */
export const photoSrc = (id: string, w: number) => (isUrl(id) ? id : photo(id, w));

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
  useEffect(() => void hideSplash(), []);
  return (
    <div class="fridge-door min-h-screen overflow-x-clip font-sans text-ink" data-component="MarketingTemplate">
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
  useEffect(() => void hideSplash(), []);
  return (
    <div class="fridge-door min-h-screen overflow-x-clip font-sans text-ink lg:grid lg:grid-cols-2" data-component="AuthTemplate">
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
      {/* The photo as a resin magnet on the door. */}
      <div class="sticky top-0 hidden h-screen items-center p-12 lg:flex">
        <div class="w-full">
          <ResinCard src={photo(AUTH_PHOTO, 1400)} aspect={4 / 5} flat={<img src={photo(AUTH_PHOTO, 1400)} alt="" class="h-full w-full object-cover" />} />
        </div>
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

type Tab = { to: string; label: string; match: RegExp };

const TABS: Tab[] = [
  { to: "/", label: "Week", match: /^\/$/ },
  { to: "/meals", label: "Meals", match: /^\/(meals|recipe|idea)(\/|$)/ },
  { to: "/list", label: "List", match: /^\/list$/ },
  { to: "/family", label: "Family", match: /^\/family$/ },
];

/**
 * Every signed-in screen sits on the fridge door. The main nav is the tabs as letter magnets across the
 * top, over the content: a transparent bar with a progressive blur, so the page scrolls underneath it.
 * Swipe the page sideways (finger, mouse, or two fingers on a trackpad) to go to the next or previous tab,
 * one at a time; the page moves with the magnets. DESIGN.md → Fridge.
 */
export function AppFrame({ familyName, children, panes }: { familyName?: string; children?: any; panes?: any[] }) {
  const loc = useLocation();
  const active = Math.max(0, TABS.findIndex((t) => t.match.test(loc.pathname)));
  const activeRef = useRef(active);
  activeRef.current = active;
  const engine = useRef<TabsEngine | null>(null);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    mark("app shown");
    void hideSplash();
  }, []);

  // The page follows the magnets' position: off by (p - active) screens while a swipe or a switch is moving.
  const track = useRef<HTMLDivElement>(null);
  const onFrame = (p: number) => {
    if (panes) {
      // All four tabs are mounted side by side: the row slides with the magnets, real content all the way.
      const t = track.current;
      if (t) t.style.transform = `translate3d(${(-p * t.clientWidth).toFixed(1)}px,0,0)`;
      return;
    }
    const el = main.current;
    if (!el) return;
    const off = p - activeRef.current;
    el.style.transform = Math.abs(off) < 0.001 ? "" : `translate3d(${(-off * el.clientWidth).toFixed(1)}px,0,0)`;
  };
  if (TABS[1].match.test(loc.pathname) && /^\/meals(\/(ideas|ingredients))?$/.test(loc.pathname)) lastMeals = loc.pathname;
  const go = (i: number) => {
    if (i === activeRef.current) {
      engine.current?.settle(i);
      return;
    }
    navigate(i === 1 ? lastMeals : TABS[i].to);
  };
  useTabSwipe(main, engine, () => activeRef.current, TABS.length, go);
  // Before the magnets exist (or without WebGL) nothing drives the row: put it on the current tab directly.
  useLayoutEffect(() => {
    if (panes && track.current && !engine.current) track.current.style.transform = `translate3d(${-active * 100}%,0,0)`;
  }, [active]);

  return (
    <div class="fridge-door min-h-screen font-sans text-ink" data-component="AppFrame">
      <SkipLink />
      <header class="fixed inset-x-0 top-0 z-20 pt-[env(safe-area-inset-top)]" data-component="TopBar">
        <ProgressiveBlur />
        <div class="relative h-16 lg:h-[72px]">
          <MagnetNav tabs={TABS.map((t) => ({ label: t.label, to: t.to }))} active={active} onPick={go} engineRef={engine} onFrame={onFrame} />
          {familyName ? <span class="pointer-events-none absolute right-[max(32px,calc((100vw-1200px)/2+32px))] top-1/2 hidden -translate-y-1/2 text-[15px] text-ink-muted lg:inline">{familyName}</span> : null}
        </div>
      </header>
      {panes ? (
        <main id="main" ref={main} class="fork-app fixed inset-0 overflow-hidden">
          <div ref={track} class="flex h-full will-change-transform">
            {panes.map((pane, i) => (
              <div key={i} class="h-full w-full shrink-0 overflow-y-auto overscroll-contain pb-16 pt-[calc(64px+env(safe-area-inset-top))] lg:pt-[72px]" inert={i !== active} aria-hidden={i !== active}>
                <PaneShowing.Provider value={i === active}>{pane}</PaneShowing.Provider>
              </div>
            ))}
          </div>
        </main>
      ) : (
        <main id="main" ref={main} class="fork-app overflow-x-clip pb-16 pt-[calc(64px+env(safe-area-inset-top))] lg:pt-[72px]">
          {children}
        </main>
      )}
      <DevBadge />
      <DebugPanel />
    </div>
  );
}

let lastMeals = "/meals";
const clampN = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/**
 * Sideways swipes on the page drive the tab magnets. A swipe moves at most one tab from where it started;
 * past that it resists. Trackpads: follow the fingers, then snap as soon as the swipe is clear (far enough,
 * or the deltas start shrinking, which means the fingers lifted) and ignore the rest of that gesture, so the
 * Mac's scroll momentum doesn't hold the snap back.
 */
function useTabSwipe(main: { current: HTMLElement | null }, engine: { current: TabsEngine | null }, active: () => number, n: number, go: (i: number) => void) {
  useEffect(() => {
    const el = main.current;
    if (!el) return;
    const W = () => el.clientWidth || innerWidth;
    const band = (raw: number, home: number) => {
      let v = raw < 0 ? raw * 0.3 : raw > n - 1 ? n - 1 + (raw - n + 1) * 0.3 : raw;
      if (v > home + 1) v = home + 1 + (v - home - 1) * 0.15;
      if (v < home - 1) v = home - 1 + (v - home + 1) * 0.15;
      return v;
    };
    const finish = (home: number, p: number, pv: number) => {
      const d = p - home + clampN(pv, -4, 4) * 0.12;
      const to = Math.abs(d) > 0.3 ? clampN(home + Math.sign(d), 0, n - 1) : home;
      engine.current?.settle(to);
      if (to !== home) go(to);
    };
    const skip = (t: EventTarget | null) => !!(t as Element)?.closest?.("input, textarea, select, [contenteditable], [data-noswipe], [role=dialog]");

    // Finger / mouse
    let st: { x: number; y: number; home: number; p0: number } | null = null, dir: "h" | "v" | null = null, lastX = 0, lastT = 0, pv = 0, p = 0;
    const down = (e: PointerEvent) => {
      const eng = engine.current;
      if (e.button || !eng || skip(e.target)) return;
      st = { x: e.clientX, y: e.clientY, home: active(), p0: eng.p };
      dir = null; lastX = e.clientX; lastT = performance.now(); pv = 0; p = eng.p;
    };
    const move = (e: PointerEvent) => {
      if (!st) return;
      const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!dir) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) { dir = "h"; el.setPointerCapture(e.pointerId); }
        else if (Math.abs(dy) > 8) { st = null; return; }
        else return;
      }
      const now = performance.now();
      const inst = -(e.clientX - lastX) / W() / Math.max(0.008, (now - lastT) / 1000);
      pv = pv * 0.55 + inst * 0.45;
      p = band(st.p0 - dx / W(), st.home);
      lastX = e.clientX; lastT = now;
      engine.current?.drag(p, pv);
    };
    const up = () => {
      if (st && dir === "h") finish(st.home, p, pv);
      st = null; dir = null;
    };
    // A drag that turned into a swipe shouldn't also click what it started on.
    const click = (e: MouseEvent) => { if (justSwiped) { e.preventDefault(); e.stopPropagation(); justSwiped = false; } };
    let justSwiped = false;
    const upMark = () => { justSwiped = dir === "h"; up(); setTimeout(() => (justSwiped = false), 0); };

    // Trackpad
    let wheelT = 0, locked = false, prevAbs = 0, shrinking = 0, home = 0, wp = 0, wpv = 0, inGesture = false;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || skip(e.target)) return;
      const eng = engine.current;
      if (!eng) return;
      e.preventDefault();
      clearTimeout(wheelT);
      wheelT = window.setTimeout(() => {
        if (!locked && inGesture) finish(home, wp, wpv);
        locked = false; inGesture = false; prevAbs = 0; shrinking = 0;
      }, 140);
      if (locked) return;
      if (!inGesture) { inGesture = true; home = active(); wp = eng.p; wpv = 0; prevAbs = 0; shrinking = 0; }
      const a = Math.abs(e.deltaX);
      shrinking = a < prevAbs ? shrinking + 1 : 0;
      prevAbs = a;
      const d = e.deltaX / W();
      wp = band(wp + d, home);
      wpv = wpv * 0.6 + (d / 0.016) * 0.4;
      eng.drag(wp, wpv);
      if (Math.abs(wp - home) > 0.22) {
        locked = true;
        const to = clampN(home + Math.sign(wp - home), 0, n - 1);
        eng.settle(to);
        if (to !== home) go(to);
      } else if (shrinking >= 3) {
        locked = true;
        finish(home, wp, wpv);
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", upMark);
    el.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", upMark);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
      el.removeEventListener("wheel", wheel);
    };
  }, []);
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
      <div class="mx-auto max-w-[1136px] px-5 pt-3 md:px-8 md:pt-6">
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

/** True while the media query matches. */
export function useMedia(q: string) {
  const [on, setOn] = useState(() => typeof matchMedia !== "undefined" && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const f = () => setOn(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [q]);
  return on;
}

/** A plain magnet tile (no photo): the meal's tint, rounded like a resin card, sitting on the door. */
const tileShadow = "shadow-[0_1px_1px_rgba(0,0,0,.08),0_3px_8px_rgba(0,0,0,.10)]";

/**
 * A meal shown big, as a resin magnet on the door: its photo sealed under resin, with its name, a line
 * about it and actions laid over the card's safe area (clear of the curved rim). Used by the Week's
 * Tonight card, recipe and idea pages, and the landing page. No photo: a tinted tile with the name in ink.
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
  heading = true,
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
  /** Portrait on phones (the Tonight card). */
  tall?: boolean;
  /** The title is the page's heading (h1). Off for cards inside a page. */
  heading?: boolean;
}) {
  const wide = useMedia("(min-width: 768px)");
  const aspect = tall ? (wide ? 4 / 3 : 4 / 5) : wide ? 16 / 9 : 4 / 3;
  const H = heading ? "h1" : "h2";
  const ink = image ? "text-white" : "text-ink";
  const overlay = (
    <>
      {onOpen ? <button type="button" class="absolute inset-0 rounded-[inherit]" onClick={onOpen} aria-label={openLabel ?? title} /> : null}
      {topLeft || topRight ? (
        <div class="pointer-events-none absolute inset-x-[7%] top-[6%] flex items-center justify-between">
          <span class="pointer-events-auto">{topLeft}</span>
          <span class="pointer-events-auto">{topRight}</span>
        </div>
      ) : null}
      <div class={`pointer-events-none absolute inset-x-[9%] bottom-[9%] ${ink}`}>
        {eyebrow ? <p class={`text-[13px] font-semibold uppercase tracking-[0.08em] ${image ? "text-white/80" : "opacity-70"}`}>{eyebrow}</p> : null}
        <H class="mt-1 text-[clamp(2rem,7vw,3.25rem)] font-bold leading-[1] tracking-[-0.04em]">{title}</H>
        {meta ? <p class={`mt-2 text-[15px] ${image ? "text-white/85" : "opacity-75"}`}>{meta}</p> : null}
        {actions ? <div class="pointer-events-auto mt-4 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </>
  );
  if (image)
    return (
      <ResinCard frost src={photoSrc(image, 1600)} aspect={aspect} flat={<MealImage id={image} title={title} showTitle={false} eager sizes="(min-width: 1200px) 1136px, 100vw" widths={[800, 1280, 1600]} class="h-full w-full" />}>
        {overlay}
      </ResinCard>
    );
  return (
    <section class={`relative overflow-hidden rounded-[28px] ${tileShadow} ${tintFor(title)}`} style={{ aspectRatio: String(aspect) }} data-component="PhotoHero">
      {overlay}
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
