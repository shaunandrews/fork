// The magnet tab bar's engine: the tab words as live 3D letter magnets that follow a position `p`
// (0 = first tab, 1 = second… fractional while you swipe). Each letter rides its own spring: leaders
// are stiff and followers lag, so the letters march; they lift off the door while moving, tip with the
// drag, hop a little each step and wobble as they settle. The selected tab is full size, the others shrink.
// On phones the row slides so the selected tab sits at the left; on desktop the row stays put.
import { magnetWord, pxScene, type Letter } from "./kit";
import { splashAnimating } from "./splash";

export type TabsOptions = { W: number; H: number; tabs: string[]; size: number; inactive: number; anchor: number; fixed: boolean };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export class TabsEngine {
  private S: ReturnType<typeof pxScene>;
  private words: { letters: Letter[]; w: number }[] = [];
  private all: Letter[] = [];
  private ranges: [number, number][] = [];
  private time = 0;
  private running = false;
  private last = 0;
  private lastMove = 0;
  private dead = false;
  p: number;
  pv = 0;
  target: number;
  dragging = false;
  ready: Promise<void>;

  constructor(canvas: HTMLCanvasElement, private o: TabsOptions, start: number, private onFrame: (p: number) => void, hidden: boolean) {
    this.p = this.target = start;
    this.S = pxScene(canvas, o.W, o.H);
    // Letters come from the shared shapes and materials (kit.ts); the shaders compile before the first
    // frame, so the bar never stalls when it first moves.
    this.ready = Promise.resolve().then(async () => {
      if (this.dead) return;
      let seed = 0;
      this.words = o.tabs.map((t) => {
        const w = magnetWord(t, o.size, seed);
        seed += t.length;
        return w;
      });
      this.words.forEach((w, j) => w.letters.forEach((l) => { l.word = j; this.all.push(l); this.S.scene.add(l.mesh); }));
      this.all.forEach((l, i) => (l.u = i / Math.max(1, this.all.length - 1)));
      const L = this.layout(this.p);
      for (const l of this.all) {
        const wd = L[l.word];
        Object.assign(l, { x: wd.x + l.cx * wd.s, y: o.H / 2 + l.dy * wd.s, s: wd.s, r: l.tilt });
        l.mesh.visible = !hidden;
      }
      // Compile while nothing is animating (a compile blocks the page): wait out the splash's move.
      while (splashAnimating()) await new Promise((r) => setTimeout(r, 30));
      await this.S.warm();
      if (this.dead) return;
      this.kick();
    });
  }

  private layout(p: number) {
    const { inactive, size, anchor, fixed } = this.o;
    const sc = this.words.map((_, j) => 1 - (1 - inactive) * Math.min(1, Math.abs(j - p)));
    const gap = size * 0.6, X: number[] = [];
    let acc = 0;
    this.words.forEach((w, j) => { X.push(acc); acc += w.w * sc[j] + gap; });
    const i0 = clamp(Math.floor(p), 0, this.words.length - 1), i1 = Math.min(this.words.length - 1, i0 + 1);
    const offset = fixed ? 0 : X[i0] + (X[i1] - X[i0]) * clamp(p - i0, 0, 1);
    return this.words.map((w, j) => ({ x: anchor + X[j] - offset, s: sc[j], w: w.w * sc[j] }));
  }

  /** Follow a finger: `p` is where the row should be, `pv` its speed in tabs per second. */
  drag(p: number, pv: number) {
    this.dragging = true;
    this.p = p;
    this.pv = pv;
    this.lastMove = performance.now();
    this.kick();
  }
  /** Let go: spring to tab `i`. */
  settle(i: number) {
    this.dragging = false;
    this.target = clamp(i, 0, this.o.tabs.length - 1);
    this.kick();
  }
  /** Which tab is under x (px in the canvas), or -1. */
  hit(x: number) {
    return this.ranges.findIndex(([a, b]) => x >= a && x <= b);
  }
  /** The letters march in from the right, staggered (first showing, after the splash). */
  intro() {
    const L = this.layout(this.p);
    this.all.forEach((l, i) => {
      const wd = L[l.word];
      l.mesh.visible = true;
      Object.assign(l, { x: wd.x + l.cx * wd.s + 140 + i * 26, y: this.o.H / 2 - 30, z: 24, s: 0.3, r: l.tilt + 0.5, vx: -300, vy: 0, vs: 0, vz: 0, vr: 0 });
    });
    this.kick();
  }
  dispose() {
    this.dead = true;
    this.S.dispose();
  }

  private kick() {
    if (this.running || this.dead) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  private frame = (t: number) => {
    if (this.dead) return;
    const dt = Math.min(0.033, (t - this.last) / 1000 || 0.016);
    this.last = t;
    if (!this.dragging) {
      const k = 95, c = 2 * Math.sqrt(k) * 0.92;
      this.pv += (k * (this.target - this.p) - c * this.pv) * dt;
      this.p += this.pv * dt;
    } else if (t - this.lastMove > 60) this.pv *= 0.8;
    const moving = this.step(dt);
    const settled = !this.dragging && Math.abs(this.target - this.p) < 0.0008 && Math.abs(this.pv) < 0.002;
    if (settled) { this.p = this.target; this.pv = 0; }
    this.onFrame(this.p);
    if (!settled || this.dragging || moving) requestAnimationFrame(this.frame);
    else this.running = false;
  };

  private step(dt: number) {
    if (!this.words.length) return false;
    const { H } = this.o;
    this.time += dt;
    const L = this.layout(this.p);
    this.ranges = L.map((l) => [l.x - 10, l.x + l.w + 10]);
    const spacing = this.o.fixed ? 260 : 190;
    const sv = -this.pv * spacing, mag = Math.min(1, Math.abs(sv) / 900);
    let moving = false;
    for (const [i, l] of this.all.entries()) {
      const wd = L[l.word];
      const tx = wd.x + l.cx * wd.s, ts = wd.s;
      const ty = H / 2 + l.dy * wd.s - Math.abs(Math.sin(this.time * 15 + i * 0.85)) * 8 * mag * wd.s; // a hop each step
      const tz = 16 * mag; // pulled off the door while moving
      const tr = l.tilt - clamp(sv * 0.00045, -0.45, 0.45) * (0.7 + 0.6 * l.rnd); // tip with the drag
      const lead = sv < 0 ? 1 - l.u : l.u, k = 120 + 180 * lead, c = 2 * Math.sqrt(k) * 0.5; // leaders stiff, followers lag
      if (reduced()) { Object.assign(l, { x: tx, y: H / 2 + l.dy * wd.s, s: ts, z: 0, r: l.tilt, vx: 0, vy: 0, vs: 0, vz: 0, vr: 0 }); l.mesh.position.set(l.x, -l.y, 0); l.mesh.rotation.z = l.r; l.mesh.scale.setScalar(l.base * ts); continue; }
      const n = 3, h = dt / n;
      for (let q = 0; q < n; q++) {
        l.vx += (k * (tx - l.x) - c * l.vx) * h; l.x += l.vx * h;
        l.vy += (k * (ty - l.y) - c * l.vy) * h; l.y += l.vy * h;
        l.vs += (k * (ts - l.s) - c * l.vs) * h; l.s += l.vs * h;
        l.vz += (220 * (tz - l.z) - 2 * Math.sqrt(220) * 0.7 * l.vz) * h; l.z += l.vz * h;
        l.vr += (300 * (tr - l.r) - 2 * Math.sqrt(300) * 0.28 * l.vr) * h; l.r += l.vr * h; // underdamped: wobbles as it settles
      }
      l.mesh.position.set(l.x, -l.y, l.z);
      l.mesh.rotation.z = l.r;
      l.mesh.scale.setScalar(l.base * Math.max(0.001, l.s));
      if (Math.abs(l.vx) + Math.abs(l.vr) * 40 + Math.abs(l.vs) * 40 + Math.abs(l.vz) > 1.5 || Math.abs(tx - l.x) > 0.4 || Math.abs(tr - l.r) > 0.004) moving = true;
    }
    this.S.render();
    return moving || mag > 0.01;
  }
}
