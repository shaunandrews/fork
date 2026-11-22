// The fridge: Fork's surface is a white (or graphite, at night) enamel door, and the things on it are
// real 3D magnets lit by one soft room light and a high key light. This file holds the shared three.js
// pieces: theme, the moulded-plastic letter, and two kinds of scene:
//   pxScene   a live, transparent scene measured in CSS pixels (the tab bar, the loading splash)
//   offscreen one renderer that turns a piece (a resin print) into a transparent image, once
// See DESIGN.md → Fridge.
import * as THREE from "three";
import { Font } from "three/addons/loaders/FontLoader.js";
import { MAGNET_FONT } from "./magnet-font";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export { THREE };

// Archivo Black: the chunky alphabet-magnet shape. Bundled (magnet-font.ts, from tools/make-magnet-font.mjs),
// so opening the app never waits on a CDN or parses a TTF.
let font: Font | null = null;
export const loadFont = () => Promise.resolve((font ??= new Font(MAGNET_FONT as any)));

/** The six toy-magnet colours. */
export const COLORS = ["#e8382a", "#ffbe12", "#1b86f2", "#1fa84a", "#ff7300", "#9246f5"];

// ---------- theme: follows the system; light = white enamel, dark = graphite ----------
const mq = typeof matchMedia !== "undefined" ? matchMedia("(prefers-color-scheme: dark)") : null;
export const isDark = () => !!mq?.matches;
export const look = () =>
  isDark()
    ? { shadow: 0.62, back: "#2b2e31", env: 0.34, exposure: 0.95, rim: 0.55 }
    : { shadow: 0.32, back: "#f4f4f4", env: 0.42, exposure: 0.86, rim: 0 };
const themed = new Set<() => void>();
/** Call `fn` whenever the system switches light/dark. Returns an unsubscribe. */
export function onTheme(fn: () => void) {
  themed.add(fn);
  return () => themed.delete(fn);
}
mq?.addEventListener("change", () => themed.forEach((f) => f()));

// ---------- moulded plastic ----------
// Injection-moulded stipple: fine random dots, used as a bump map and to roughen the plastic a touch.
let stipple: THREE.CanvasTexture | null = null;
function stippleTexture() {
  if (stipple) return stipple;
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d")!;
  x.fillStyle = "#808080";
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26000; i++) {
    const r = 0.6 + Math.random() * 1.3, v = Math.random() < 0.5 ? 255 : 0;
    x.fillStyle = `rgba(${v},${v},${v},${0.18 + Math.random() * 0.25})`;
    x.beginPath();
    x.arc(Math.random() * 512, Math.random() * 512, r, 0, Math.PI * 2);
    x.fill();
  }
  stipple = new THREE.CanvasTexture(c);
  stipple.wrapS = stipple.wrapT = THREE.RepeatWrapping;
  stipple.colorSpace = THREE.NoColorSpace;
  return stipple;
}
function plastic(color: string, size: number) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.46, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 0.8 });
  const t = stippleTexture().clone();
  t.needsUpdate = true;
  t.repeat.set(1.6 / size, 1.6 / size);
  m.bumpMap = t;
  m.bumpScale = 0.55;
  m.roughnessMap = t;
  return m;
}

/** One letter magnet: extruded, bevelled, back face flat on the door (z = 0), centred on its middle. */
export function letterMesh(font: any, ch: string, color: string, size: number) {
  const g = new TextGeometry(ch, { font, size, depth: size * 0.18, curveSegments: 10, bevelEnabled: true, bevelThickness: size * 0.07, bevelSize: size * 0.05, bevelOffset: -size * 0.012, bevelSegments: 7 });
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  // Centre letters on their middle; punctuation keeps its place on the baseline (a full stop sits low, an apostrophe high).
  const cy = /[A-Z0-9?!&]/.test(ch) ? (bb.max.y + bb.min.y) / 2 : size * 0.36;
  g.translate(-(bb.max.x + bb.min.x) / 2, -cy, -bb.min.z + 0.002);
  const mesh = new THREE.Mesh(g, plastic(color, size));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, width: bb.max.x - bb.min.x };
}

export type Letter = {
  mesh: THREE.Mesh; cx: number; dy: number; tilt: number; rnd: number; word: number; u: number;
  x: number; y: number; z: number; r: number; s: number; vx: number; vy: number; vz: number; vr: number; vs: number;
};

/** A word of letter magnets in px, each with its own colour, slight size, height and tilt (picked from `seed`, so stable). */
export function magnetWord(font: any, text: string, size: number, seed: number) {
  const letters: Letter[] = [];
  let x = 0, k = seed;
  for (const ch of text) {
    k++;
    const { mesh, width } = letterMesh(font, ch, COLORS[(k * 5) % COLORS.length], size * (0.95 + ((k * 7) % 4) * 0.025));
    letters.push({ mesh, cx: x + width / 2, dy: (((k * 13) % 7) - 3) * size * 0.02, tilt: THREE.MathUtils.degToRad(((k * 37) % 10) - 5), rnd: ((k * 53) % 10) / 10, word: 0, u: 0, x: 0, y: 0, z: 0, r: 0, s: 1, vx: 0, vy: 0, vz: 0, vr: 0, vs: 0 });
    x += width + size * 0.1;
  }
  return { letters, w: x - size * 0.1 };
}

// ---------- lights ----------
function addLights(scene: THREE.Scene, centre: THREE.Vector3, dist: number, shadowBox: { w: number; h: number }, map: number) {
  const light = (int: number, dir: [number, number, number], radius: number, samples: number) => {
    const l = new THREE.DirectionalLight("#ffffff", int);
    l.position.copy(centre).addScaledVector(new THREE.Vector3(...dir).normalize(), dist);
    l.target.position.copy(centre);
    scene.add(l.target);
    l.castShadow = true;
    l.shadow.mapSize.set(map, map);
    l.shadow.radius = radius;
    (l.shadow as any).blurSamples = samples;
    l.shadow.bias = -0.0004;
    Object.assign(l.shadow.camera, { left: -shadowBox.w / 2, right: shadowBox.w / 2, top: shadowBox.h / 2, bottom: -shadowBox.h / 2, near: dist * 0.01, far: dist * 3 });
    scene.add(l);
    return l;
  };
  light(1.9, [-0.19, 0.28, 0.94], 4, 16); // key: high and nearly frontal, so shadows tuck in close (attached, not floating)
  light(0.5, [0, 0.04, 1], 1.6, 8); // contact: a tight dark edge where plastic meets steel
  scene.add(new THREE.HemisphereLight("#ffffff", "#dde1e4", 0.3));
  const rim = new THREE.DirectionalLight("#dfe8ff", look().rim); // dark only: picks out top edges against graphite
  rim.position.copy(centre).add(new THREE.Vector3(0.15, 0.9, 0.25).multiplyScalar(dist));
  rim.target.position.copy(centre);
  scene.add(rim, rim.target);
  return rim;
}

function makeRenderer(canvas?: HTMLCanvasElement, preserve = false) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: preserve });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = look().exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

/** A live transparent scene in CSS pixels (x right, y down: place things at (x, -y)). Shadows fall on the CSS door behind it. */
export function pxScene(canvas: HTMLCanvasElement, W: number, H: number) {
  const renderer = makeRenderer(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W, H, false);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  (scene as any).environmentIntensity = look().env;
  // A long lens so a wide strip doesn't fish-eye.
  const dist = Math.max(W, H) * 1.1;
  const camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(2 * Math.atan(H / 2 / dist)), W / H, 10, dist * 3);
  camera.position.set(W / 2, -H / 2, dist);
  camera.lookAt(W / 2, -H / 2, 0);
  const c = new THREE.Vector3(W / 2, -H / 2, 0);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(W * 3, H * 6), new THREE.ShadowMaterial({ opacity: look().shadow }));
  plane.position.copy(c);
  plane.receiveShadow = true;
  scene.add(plane);
  const map = Math.min(4096, Math.max(1024, 2 ** Math.ceil(Math.log2(W * 1.6))));
  const rim = addLights(scene, c, dist * 1.5, { w: W + 320, h: H + 320 }, map);
  const render = () => renderer.render(scene, camera);
  const off = onTheme(() => {
    const t = look();
    renderer.toneMappingExposure = t.exposure;
    (scene as any).environmentIntensity = t.env;
    rim.intensity = t.rim;
    (plane.material as THREE.ShadowMaterial).opacity = t.shadow;
    render();
  });
  const dispose = () => {
    off();
    scene.traverse((o: any) => {
      o.geometry?.dispose?.();
      if (o.material) for (const m of [].concat(o.material)) (m as any).dispose?.();
    });
    pmrem.dispose();
    renderer.dispose();
  };
  return { renderer, scene, camera, render, dispose };
}

// ---------- offscreen: render a piece once, to a transparent image ----------
let off: ReturnType<typeof makeOffscreen> | null = null;
function makeOffscreen() {
  const renderer = makeRenderer(undefined, true);
  renderer.setPixelRatio(2);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.ShadowMaterial({ opacity: look().shadow }));
  plane.receiveShadow = true;
  scene.add(plane);
  const rim = addLights(scene, new THREE.Vector3(0, 0, 0), 12.6, { w: 20, h: 14 }, 2048);
  return { renderer, scene, camera, plane, rim };
}
// One render at a time: they share the renderer.
let queue: Promise<unknown> = Promise.resolve();
/**
 * Render `obj` (built in world units, centred on the origin) into a `w`×`h` px transparent PNG, framed so
 * `frameW` world units span the width. Returns a data URL.
 */
export function renderOffscreen(build: () => Promise<THREE.Object3D> | THREE.Object3D, w: number, h: number, frameW: number): Promise<string> {
  const job = queue.then(async () => {
    off ??= makeOffscreen();
    const t = look();
    off.renderer.toneMappingExposure = t.exposure;
    (off.scene as any).environmentIntensity = t.env;
    off.rim.intensity = t.rim;
    (off.plane.material as THREE.ShadowMaterial).opacity = t.shadow;
    off.renderer.setSize(w, h, false);
    off.camera.aspect = w / h;
    const fov = THREE.MathUtils.degToRad(off.camera.fov);
    off.camera.position.set(0, 0, frameW / 2 / (Math.tan(fov / 2) * off.camera.aspect));
    off.camera.lookAt(0, 0, 0);
    off.camera.updateProjectionMatrix();
    const obj = await build();
    off.scene.add(obj);
    off.renderer.render(off.scene, off.camera);
    const url = off.renderer.domElement.toDataURL("image/png");
    off.scene.remove(obj);
    obj.traverse((o: any) => {
      o.geometry?.dispose?.();
      if (o.material) for (const m of [].concat(o.material)) { (m as any).map?.dispose?.(); (m as any).dispose?.(); }
    });
    return url;
  });
  queue = job.catch(() => {});
  return job;
}

/** WebGL available? Without it Fork falls back to flat letters and plain photos. */
export const hasWebGL = (() => {
  let v: boolean | null = null;
  return () => {
    if (v !== null) return v;
    try {
      const c = document.createElement("canvas");
      v = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      v = false;
    }
    return v;
  };
})();

// ---------- magnet words as images (headings, brand, labels) ----------
const LINE = 1.32, PAD = 0.38; // world units per line, and room around the letters for shadows
const textCache = new Map<string, Promise<{ url: string; w: number; h: number; pad: number }>>();
const seedOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 97;
/**
 * Render lines of letter magnets to one transparent image, `lineH` CSS px per line of letters.
 * Resolves to the image and its CSS size; `pad` is the shadow room (px) on every side.
 */
export function magnetTextImage(lines: string[], lineH: number) {
  const key = `${lines.join("\n")}|${lineH}|${isDark()}`;
  if (!textCache.has(key)) {
    const job = loadFont().then((font) => {
      let seed = seedOf(lines.join(" "));
      const rows = lines.map((line) => {
        const words = line.split(" ").map((w) => { const mw = magnetWord(font, w, 1, seed); seed += w.length; return mw; });
        const w = words.reduce((a, mw) => a + mw.w, 0) + 0.42 * (words.length - 1);
        return { words, w };
      });
      const maxW = Math.max(...rows.map((r) => r.w));
      const frameW = maxW + 2 * PAD, frameH = lines.length * LINE - (LINE - 1) + 2 * PAD;
      const w = Math.round(frameW * lineH), h = Math.round(frameH * lineH);
      const url = renderOffscreen(() => {
        const g = new THREE.Group();
        rows.forEach((r, li) => {
          let x = -maxW / 2;
          const y = frameH / 2 - PAD - 0.5 - li * LINE;
          for (const mw of r.words) {
            for (const l of mw.letters) {
              l.mesh.position.set(x + l.cx, y + l.dy, 0);
              l.mesh.rotation.z = l.tilt;
              g.add(l.mesh);
            }
            x += mw.w + 0.42;
          }
        });
        return g;
      }, w, h, frameW);
      return url.then((u) => ({ url: u, w, h, pad: PAD * lineH }));
    });
    textCache.set(key, job);
    job.catch(() => textCache.delete(key));
  }
  return textCache.get(key)!;
}
