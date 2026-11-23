// The magnet tab bar's engine: the tab words as live 3D letter magnets that follow a position `p`
// (0 = first tab, 1 = second… fractional while you swipe). Each letter is a little physical body with its
// own randomly rolled stiffness, weight and wobble, chained to its neighbours (see step()). The selected tab is full size, the others shrink.
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

  // Each letter is its own little body: its own stiffness, damping, weight and wobble, rolled fresh each
  // time the bar is made, so no two letters (and no two visits) move the same way.
  private body = new Map<Letter, { k: number; damp: number; rk: number; rdamp: number; kick: number; lift: number; freq: number; phase: number; pvx: number }>();
  private bodyOf(l: Letter) {
    let b = this.body.get(l);
    if (!b) {
      const r = (a: number, z: number) => a + Math.random() * (z - a);
      b = { k: r(70, 200), damp: r(0.3, 0.7), rk: r(160, 360), rdamp: r(0.12, 0.32), kick: r(0.6, 1.5), lift: r(0.6, 1.4), freq: r(9, 17), phase: r(0, 6.28), pvx: 0 };
      this.body.set(l, b);
    }
    return b;
  }

  /**
   * Physics, not a script: every letter is pulled toward its place by its own spring, tied to the letter
   * before it in its word (so a tug travels down the word like a chain), bumps its neighbours instead of
   * passing through them, tips from its own speed and acceleration, lifts off the door while it moves,
   * and now and then gets jostled into a little hop.
   */
  private step(dt: number) {
    if (!this.words.length) return false;
    const { H } = this.o;
    this.time += dt;
    const L = this.layout(this.p);
    this.ranges = L.map((l) => [l.x - 10, l.x + l.w + 10]);
    let moving = false;
    const n = 3, h = dt / n;
    let before: Letter | null = null, beforeTx = 0; // the previous letter in the whole row, for bumping
    for (const w of this.words) {
      const wd = L[this.words.indexOf(w)];
      let prev: Letter | null = null;
      for (const l of w.letters) {
        const b = this.bodyOf(l);
        const tx = wd.x + l.cx * wd.s, ty = H / 2 + l.dy * wd.s, ts = wd.s;
        if (reduced()) { Object.assign(l, { x: tx, y: ty, s: ts, z: 0, r: l.tilt, vx: 0, vy: 0, vs: 0, vz: 0, vr: 0 }); l.mesh.position.set(l.x, -l.y, 0); l.mesh.rotation.z = l.r; l.mesh.scale.setScalar(l.base * ts); prev = before = l; beforeTx = tx; continue; }
        const speed = Math.abs(l.vx);
        const c = 2 * Math.sqrt(b.k) * b.damp;
        for (let q = 0; q < n; q++) {
          // pulled home, and dragged along by the letter before it
          let fx = b.k * (tx - l.x) - c * l.vx;
          if (prev) {
            const gap = (l.cx - prev.cx) * wd.s;
            fx += 55 * (prev.x + gap - l.x);
          }
          l.vx += fx * h;
          l.x += l.vx * h;
          // height: home, plus a hop when jostled (springy, so it bounces back down)
          l.vy += (160 * (ty - l.y) - 2 * Math.sqrt(160) * 0.25 * l.vy) * h;
          l.y += l.vy * h;
          l.vs += (b.k * 1.4 * (ts - l.s) - 2 * Math.sqrt(b.k * 1.4) * 0.6 * l.vs) * h;
          l.s += l.vs * h;
        }
        // bump the letter before it in the row (in its own word or the word before), never pass through it
        if (before) {
          const minGap = (tx - beforeTx) * 0.95;
          const overlap = before.x + minGap - l.x;
          if (overlap > 0) {
            l.x += overlap * 0.6; before.x -= overlap * 0.4;
            const dv = (before.vx - l.vx) * 0.5;
            l.vx += dv; before.vx -= dv;
          }
        }
        // jostle: the faster it's going, the likelier a small random hop
        if (speed > 160 && Math.random() < dt * (speed / 400) * b.kick) l.vy -= (40 + Math.random() * 90) * wd.s * b.kick;
        // tip from its own speed and its own acceleration, plus a loose wobble while moving
        const acc = (l.vx - b.pvx) / Math.max(dt, 0.001);
        b.pvx = l.vx;
        const tr = l.tilt + clamp(-l.vx * 0.00035 * b.kick - acc * 0.000025 * b.kick, -0.32, 0.32) + Math.sin(this.time * b.freq + b.phase) * Math.min(0.07, speed * 0.00015);
        l.vr += (b.rk * (tr - l.r) - 2 * Math.sqrt(b.rk) * b.rdamp * l.vr) * dt;
        l.r += l.vr * dt;
        // lifted off the door while moving
        const tz = Math.min(24, (speed / 45) * b.lift);
        l.vz += (220 * (tz - l.z) - 2 * Math.sqrt(220) * 0.6 * l.vz) * dt;
        l.z += l.vz * dt;
        l.mesh.position.set(l.x, -l.y, Math.max(0, l.z));
        l.mesh.rotation.z = l.r;
        l.mesh.scale.setScalar(l.base * Math.max(0.001, l.s));
        if (speed + Math.abs(l.vy) + Math.abs(l.vr) * 40 + Math.abs(l.vs) * 40 + Math.abs(l.vz) > 1.5 || Math.abs(tx - l.x) > 0.4 || Math.abs(ty - l.y) > 0.4 || Math.abs(l.tilt - l.r) > 0.004) moving = true;
        prev = l;
        before = l;
        beforeTx = tx;
      }
    }
    this.S.render();
    return moving || this.dragging;
  }
}
