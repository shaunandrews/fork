// The fridge's Preact pieces: the magnet tab bar, resin card and dome images, the progressive blur
// under the bar, and the styles they need (DESIGN.md → Fridge).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { hasWebGL } from "./kit";
import { TabsEngine } from "./tabs";
import { onReveal, splashUp } from "./splash";
import { magnetLayout, magnetTextPiece, resinCardPiece, resinDomePiece } from "./stage";

// ---------- styles ----------
// Zero has no stylesheet hook, so the fridge's few hand-written rules go in once at startup.
if (typeof document !== "undefined" && !document.getElementById("fork-fridge")) {
  const s = document.createElement("style");
  s.id = "fork-fridge";
  const blur = (edge: "top" | "bottom") =>
    [0.5, 1, 2, 4, 8, 16]
      .map((px, i) => {
        const a = (i * 14.3).toFixed(1), b = ((i + 1) * 14.3).toFixed(1), c = ((i + 2) * 14.3).toFixed(1), d = ((i + 3) * 14.3).toFixed(1);
        const mask = i === 5 ? `linear-gradient(to ${edge}, transparent ${a}%, #000 ${b}%)` : `linear-gradient(to ${edge}, transparent ${a}%, #000 ${b}%, #000 ${c}%, transparent ${d}%)`;
        return `.progressive-blur.${edge} > i:nth-child(${i + 1}) { -webkit-backdrop-filter: blur(${px}px); backdrop-filter: blur(${px}px); -webkit-mask-image: ${mask}; mask-image: ${mask}; }`;
      })
      .join("\n");
  s.textContent = `
:root { --door-top: #f7f8f8; --door-mid: #f1f2f3; --door-low: #e9eaec; --door-sheen: rgba(255,255,255,.85); --door-sheen2: rgba(255,255,255,.5); }
@media (prefers-color-scheme: dark) { :root { --door-top: #232527; --door-mid: #1c1e20; --door-low: #17191a; --door-sheen: rgba(255,255,255,.06); --door-sheen2: rgba(255,255,255,.035); } }
/* The door: enamel with two soft vertical sheen bands. Fixed, so it doesn't scroll with the page. */
/* The door: enamel with two soft vertical sheen bands, on the page itself. The 3D stage canvas (stage.ts)
   sits on it, and the app's content sits above the stage. */
body:has(.fridge-door) {
  background:
    linear-gradient(105deg, transparent 0 22%, var(--door-sheen) 30%, transparent 40%),
    linear-gradient(105deg, transparent 0 62%, var(--door-sheen2) 68%, transparent 74%),
    linear-gradient(180deg, var(--door-top) 0%, var(--door-mid) 60%, var(--door-low) 100%);
  background-attachment: fixed;
  background-color: var(--door-mid);
}
.fridge-door { position: relative; z-index: 1; }
#fridge-stage { transition: opacity .45s ease; }
html.fork-splashing:not(.fork-revealed) #fridge-stage { opacity: 0; }
.fork-splash { position: fixed; inset: 0; z-index: 100; transition: opacity .35s ease .15s;
  background: linear-gradient(105deg, transparent 0 22%, var(--door-sheen) 30%, transparent 40%), linear-gradient(105deg, transparent 0 62%, var(--door-sheen2) 68%, transparent 74%), linear-gradient(180deg, var(--door-top) 0%, var(--door-mid) 60%, var(--door-low) 100%); }
.fork-splash canvas { width: 100%; height: 100%; display: block; }
.fork-splash.gone { opacity: 0; pointer-events: none; }
/* While the splash is up the app waits just below, then slides up into place. */
.fork-app { transition: opacity .45s ease, transform .45s ease; }
html.fork-splashing:not(.fork-revealed) .fork-app { opacity: 0; transform: translateY(14px); }
/* Progressive blur: a stack of layers, each blurring twice as much and masked to its own band, plus a tint of the door. */
.progressive-blur { position: absolute; left: 0; right: 0; pointer-events: none; }
.progressive-blur.top { top: 0; bottom: -44px; }
.progressive-blur > i { position: absolute; inset: 0; }
.progressive-blur::after { content: ""; position: absolute; inset: 0; }
.progressive-blur.top::after { background: linear-gradient(to top, transparent, color-mix(in srgb, var(--door-top) 12%, transparent) 20%, color-mix(in srgb, var(--door-top) 36%, transparent) 45%, color-mix(in srgb, var(--door-top) 62%, transparent) 70%, color-mix(in srgb, var(--door-top) 82%, transparent)); }
${blur("top")}
@media (prefers-reduced-transparency: reduce) { .progressive-blur > i { display: none; } .progressive-blur.top::after { background: var(--door-top); } }
.magnet-nav canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: pointer; }
.resin { position: relative; }
.resin > .resin-flat { position: absolute; inset: 0; transition: opacity .3s ease; }
.resin.ready > .resin-flat { opacity: 0; }
`;
  document.head.append(s);
}

// ---------- progressive blur ----------
const LAYERS = 6;
export function ProgressiveBlur({ edge = "top" }: { edge?: "top" }) {
  return (
    <div class={`progressive-blur ${edge}`} aria-hidden="true">
      {Array.from({ length: LAYERS }, (_, i) => <i key={i} />)}
    </div>
  );
}

// ---------- magnet tab bar ----------
export type NavTab = { label: string; to: string };
let introduced = false;

/** Measured layout for the bar: phones slide the row; desktop keeps it still, aligned with the content column. */
function navOptions(W: number, H: number, tabs: NavTab[]) {
  const desk = W >= 1024;
  return desk
    ? { W, H, tabs: tabs.map((t) => t.label.toUpperCase()), size: 32, inactive: 0.62, anchor: Math.max(32, (W - 1200) / 2 + 32), fixed: true }
    : { W, H, tabs: tabs.map((t) => t.label.toUpperCase()), size: W >= 768 ? 38 : 34, inactive: 0.52, anchor: W >= 768 ? 32 : 20, fixed: false };
}

/**
 * The main nav: the tabs as live letter magnets. `engine` is handed out so the page swipe can drive the
 * row (drag / settle); `onFrame` reports the row's position every frame so the content can move with it.
 */
export function MagnetNav({ tabs, active, onPick, engineRef, onFrame }: { tabs: NavTab[]; active: number; onPick: (i: number) => void; engineRef?: { current: TabsEngine | null }; onFrame?: (p: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  const [gl] = useState(() => typeof document !== "undefined" && hasWebGL());
  const frameRef = useRef(onFrame);
  frameRef.current = onFrame;
  const activeRef = useRef(active);
  activeRef.current = active;

  useLayoutEffect(() => {
    const el = wrap.current!;
    const measure = () => setSize((s) => (s && Math.abs(s.W - el.clientWidth) < 2 && s.H === el.clientHeight ? s : { W: el.clientWidth, H: el.clientHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!gl || !size || !size.W) return;
    const canvas = document.createElement("canvas");
    wrap.current!.append(canvas);
    const hidden = splashUp() || !introduced;
    const e = new TabsEngine(canvas, navOptions(size.W, size.H, tabs), activeRef.current, (p) => frameRef.current?.(p), hidden);
    if (engineRef) engineRef.current = e;
    let unReveal = () => {};
    if (hidden)
      e.ready.then(() => {
        unReveal = onReveal(() => { introduced = true; e.intro(); });
      });
    // Tap a tab
    let down: { x: number; y: number } | null = null;
    canvas.addEventListener("pointerdown", (ev) => (down = { x: ev.clientX, y: ev.clientY }));
    canvas.addEventListener("pointerup", (ev) => {
      if (!down || Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 8) return;
      const i = e.hit(ev.clientX - canvas.getBoundingClientRect().left);
      if (i >= 0) onPick(i);
      down = null;
    });
    return () => {
      unReveal();
      if (engineRef?.current === e) engineRef.current = null;
      e.dispose();
      canvas.remove();
    };
  }, [gl, size?.W, size?.H]);

  // The route changed (a tap, a link, the back button): march to it.
  useEffect(() => {
    const e = engineRef?.current;
    if (e && !e.dragging && e.target !== active) e.settle(active);
  }, [active]);

  return (
    <div ref={wrap} class="magnet-nav relative h-full w-full" data-component="MagnetNav">
      {/* Real links, for keyboards, screen readers and when there's no WebGL. Visually hidden when the magnets draw. */}
      <nav aria-label="Main" class={gl ? "sr-only" : "flex h-full items-center gap-6 px-5 md:px-8"}>
        {tabs.map((t, i) => (
          <a key={t.to} href={t.to} aria-current={i === active ? "page" : undefined} onClick={(ev) => { ev.preventDefault(); onPick(i); }} class={`font-display text-[22px] font-bold tracking-[-0.03em] ${i === active ? "text-ink" : "text-ink-muted"}`}>
            {t.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

// ---------- resin magnets and magnet words: boxes on the page, drawn by the stage ----------
/** Tie a stage piece to a box on the page for as long as the box is mounted. */
function usePiece(make: (el: HTMLElement, shown: () => void) => { dispose(): void } | null, deps: any[]) {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ref.current || !hasWebGL()) return;
    setReady(false);
    const piece = make(ref.current, () => setReady(true));
    return () => piece?.dispose();
  }, deps);
  return [ref, ready] as const;
}

/**
 * A photo as a resin card magnet, `aspect` (w/h) wide. The flat photo shows until the 3D card has drawn.
 * `frost` blurs and dims the lower part of the print, for words laid over it.
 * `children` sit over the card inside its safe area (clear of the curved rim): use for the title and actions.
 */
export function ResinCard({ src, aspect, flat, frost = false, class: cls = "", children }: { src: string; aspect: number; flat: any; frost?: boolean; class?: string; children?: any }) {
  const [ref, ready] = usePiece((el, shown) => resinCardPiece(el, src, aspect, frost, shown), [src, aspect, frost]);
  return (
    <div ref={ref as any} class={`resin ${ready ? "ready" : ""} ${cls}`} style={{ aspectRatio: String(aspect) }} data-component="ResinCard">
      <div class="resin-flat overflow-hidden" style={{ borderRadius: `10.5% / ${10.5 * aspect}%` }}>{flat}</div>
      {children}
    </div>
  );
}

/** A photo as a round resin magnet, `size` px across. */
export function ResinDome({ src, size, flat }: { src: string; size: number; flat: any }) {
  const [ref, ready] = usePiece((el, shown) => resinDomePiece(el, src, shown), [src]);
  return (
    <span ref={ref as any} class={`resin block shrink-0 ${ready ? "ready" : ""}`} style={{ width: `${size}px`, height: `${size}px` }} data-component="ResinDome">
      <span class="resin-flat block overflow-hidden rounded-full">{flat}</span>
    </span>
  );
}

// ---------- magnet words (brand, headlines, section labels) ----------
/**
 * Words spelled in letter magnets, `lineH` px of letter per line, live in 3D on the page's stage. Never for
 * meal names. `lines` breaks the words onto rows; `label` is what screen readers hear (defaults to the
 * words). The box is sized from the font at once, so nothing jumps; it shrinks to fit a narrow column.
 * Without WebGL, the words show as plain bold type.
 */
export function MagnetText({ lines, lineH, label, class: cls = "" }: { lines: string[]; lineH: number; label?: string; class?: string }) {
  const key = lines.join("\n");
  const gl = typeof document !== "undefined" && hasWebGL();
  const box = useMemo(() => (gl ? magnetLayout(lines) : null), [key, gl]);
  const [ref] = usePiece((el, shown) => magnetTextPiece(el, lines, shown), [key]);
  const name = label ?? lines.join(" ");
  if (!box)
    return (
      <span class={`inline-block font-display font-black uppercase leading-[1.32] tracking-[-0.01em] ${cls}`} style={{ fontSize: `${lineH * 1.05}px` }} aria-label={name}>
        {lines.map((l, i) => <span key={i} class="block" aria-hidden="true">{l}</span>)}
      </span>
    );
  return <span ref={ref as any} role="img" aria-label={name} class={`relative inline-block max-w-full align-top ${cls}`} style={{ width: `${box.width * lineH}px`, aspectRatio: `${box.width} / ${box.height}` }} data-component="MagnetText" />;
}
