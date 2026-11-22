// The loading splash: FORK in letter magnets snaps onto the door while the app loads, then hops off
// one letter at a time as the app slides in and the tab letters march in. Shown once per visit.
// It's a plain overlay on <body>, outside Preact, so it survives the loading screens being swapped
// for the app frame underneath it.
import { hasWebGL, loadFont, magnetWord, pxScene, type Letter } from "./kit";

type State = "idle" | "showing" | "leaving" | "gone";
let state: State = "idle";
let shownAt = 0;
let inDone: Promise<void> = Promise.resolve();
const revealers = new Set<() => void>();
let el: HTMLDivElement | null = null;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t * t;
const easeBack = (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;

let scene: ReturnType<typeof pxScene> | null = null;
let letters: (Letter & { ox: number })[] = [];
const run = (dur: number, f: (e: number) => void) =>
  new Promise<void>((done) => {
    const t0 = performance.now();
    const tick = (t: number) => {
      const e = t - t0;
      f(e);
      scene?.render();
      e < dur ? requestAnimationFrame(tick) : done();
    };
    requestAnimationFrame(tick);
  });

function place(l: Letter & { ox: number }, H: number, { y = 0, z = 0, r = 0, o = 1 }) {
  l.mesh.position.set(l.ox, -(H * 0.44 + l.dy + y), z);
  l.mesh.rotation.z = l.tilt + r;
  const m = l.mesh.material as any;
  m.opacity = o;
  l.mesh.castShadow = o > 0.85;
}

/** Show the splash (no-op if it has already been shown this visit). Call from loading screens. */
export function showSplash() {
  if (state !== "idle" || typeof document === "undefined" || !hasWebGL() || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  state = "showing";
  shownAt = performance.now();
  document.documentElement.classList.add("fork-splashing");
  el = document.createElement("div");
  el.className = "fork-splash fridge-door";
  const canvas = document.createElement("canvas");
  el.append(canvas);
  document.body.append(el);
  const W = innerWidth, H = innerHeight, size = W >= 900 ? 130 : Math.min(74, W / 5.3);
  scene = pxScene(canvas, W, H);
  inDone = loadFont().then(async (font) => {
    const w = magnetWord(font, "FORK", size, 0);
    letters = w.letters.map((l) => Object.assign(l, { ox: (W - w.w) / 2 + l.cx }));
    letters.forEach((l) => { (l.mesh.material as any).transparent = true; place(l, H, { o: 0 }); scene!.scene.add(l.mesh); });
    await run(70 * 3 + 320, (e) => letters.forEach((l, i) => {
      const t = clamp((e - i * 70) / 320, 0, 1);
      place(l, H, { z: 70 * (1 - easeOut(t)), r: 0.25 * (1 - easeBack(t)), o: clamp(t * 2.5, 0, 1) });
    }));
  }).catch(() => {});
}

/** The app is ready: FORK hops off and the app is revealed. Safe to call when no splash is showing. */
export async function hideSplash() {
  if (state !== "showing") return;
  state = "leaving";
  await inDone;
  await new Promise((r) => setTimeout(r, Math.max(0, 900 - (performance.now() - shownAt))));
  const H = innerHeight;
  const out = run(80 * 3 + 560, (e) => letters.forEach((l, i) => {
    const t = clamp((e - i * 80) / 560, 0, 1), lift = easeOut(clamp(t / 0.3, 0, 1)), fly = easeIn(clamp((t - 0.22) / 0.78, 0, 1));
    place(l, H, { z: 40 * lift, y: -H * 0.5 * fly, r: (i % 2 ? 0.55 : -0.55) * fly, o: 1 - fly });
  }));
  setTimeout(() => {
    el?.classList.add("gone");
    document.documentElement.classList.add("fork-revealed");
    revealers.forEach((f) => f());
    revealers.clear();
  }, 260);
  await out;
  setTimeout(() => { el?.remove(); scene?.dispose(); scene = null; el = null; state = "gone"; }, 700);
}

/** Is the splash covering the app right now? */
export const splashUp = () => state === "showing" || state === "leaving";
/** Run `f` when the splash starts revealing the app (right away if no splash is up). */
export function onReveal(f: () => void) {
  if (!splashUp()) { f(); return () => {}; }
  revealers.add(f);
  return () => revealers.delete(f);
}
