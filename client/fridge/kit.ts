// The fridge: Fork's surface is a white (or graphite, at night) enamel door, and the things on it are
// real 3D magnets lit by one soft room light and a high key light. This file holds what every 3D scene
// shares: the theme, the light rig, and the letter magnets.
//
// Built to run like a game, not a render farm:
//   - one geometry per letter shape and one material per colour, built once and shared by every scene
//     (the page stage, the tab bar, the splash), so a word is just a few cheap meshes;
//   - PCF shadows softened with a sample radius (no blurred VSM passes);
//   - scenes compile their shaders ahead of the first frame (compileAsync), so nothing stalls mid-animation;
//   - scenes draw only when something moves (see stage.ts and tabs.ts).
// See DESIGN.md → Fridge.
// three.js comes from a tree-shaken, minified build of just what's used (vendor/three.js, from
// tools/build-three.mjs): a third of the size of the full library, which was most of the app's JavaScript.
import * as THREE from "./vendor/three.js";
const { Font, TextGeometry, RoomEnvironment } = THREE as any;
type Font = any;
import { MAGNET_FONT } from "./magnet-font";

export { THREE };

// Archivo Black, bundled (magnet-font.ts, from tools/make-magnet-font.mjs).
let font: Font | null = null;
const getFont = () => (font ??= new Font(MAGNET_FONT as any));
/** Kept for callers that still await it; the font is bundled, so it's ready at once. */
export const loadFont = () => Promise.resolve(getFont());

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

// ---------- moulded plastic: one material per colour ----------
// Injection-moulded stipple: fine random dots, used as a bump map and to roughen the plastic a touch.
let stipple: THREE.CanvasTexture | null = null;
function stippleTexture() {
  if (stipple) return stipple;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = "#808080";
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6500; i++) {
    const r = 0.5 + Math.random() * 0.9, v = Math.random() < 0.5 ? 255 : 0;
    x.fillStyle = `rgba(${v},${v},${v},${0.18 + Math.random() * 0.25})`;
    x.beginPath();
    x.arc(Math.random() * 256, Math.random() * 256, r, 0, Math.PI * 2);
    x.fill();
  }
  stipple = new THREE.CanvasTexture(c);
  stipple.wrapS = stipple.wrapT = THREE.RepeatWrapping;
  stipple.colorSpace = THREE.NoColorSpace;
  // Letter geometry is built at size 1, so its UVs run about 0..1 across a letter: ~1.6 dot tiles per letter.
  stipple.repeat.set(1.6, 1.6);
  return stipple;
}
const plastics = new Map<string, THREE.MeshPhysicalMaterial>();
export function plastic(color: string) {
  let m = plastics.get(color);
  if (!m) {
    const t = stippleTexture();
    m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.46, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 0.8, bumpMap: t, bumpScale: 0.55, roughnessMap: t });
    plastics.set(color, m);
  }
  return m;
}

// ---------- letter shapes: one geometry per character, at size 1 ----------
const glyphs = new Map<string, { geo: THREE.BufferGeometry; width: number }>();
/** A letter magnet's shape at size 1: extruded, bevelled, back face flat on the door (z = 0). */
export function glyph(ch: string) {
  let g = glyphs.get(ch);
  if (!g) {
    const geo = new TextGeometry(ch, { font: getFont(), size: 1, depth: 0.18, curveSegments: 7, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelOffset: -0.012, bevelSegments: 4 });
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    // Centre letters on their middle; punctuation keeps its place on the baseline (a full stop sits low, an apostrophe high).
    const cy = /[A-Z0-9?!&]/.test(ch) ? (bb.max.y + bb.min.y) / 2 : 0.36;
    geo.translate(-(bb.max.x + bb.min.x) / 2, -cy, -bb.min.z + 0.002);
    g = { geo, width: bb.max.x - bb.min.x };
    glyphs.set(ch, g);
  }
  return g;
}

export type Letter = {
  mesh: THREE.Mesh; base: number; cx: number; dy: number; tilt: number; rnd: number; word: number; u: number;
  x: number; y: number; z: number; r: number; s: number; vx: number; vy: number; vz: number; vr: number; vs: number;
};

/**
 * A word of letter magnets, `size` px tall, each with its own colour, slight size, height and tilt (picked
 * from `seed`, so stable). `cx` is each letter's centre from the word's left edge, in px. `base` is the
 * letter's own scale; callers that resize letters multiply it.
 */
export function magnetWord(text: string, size: number, seed: number) {
  const letters: Letter[] = [];
  let x = 0, k = seed;
  for (const ch of text) {
    k++;
    const g = glyph(ch);
    const base = size * (0.95 + ((k * 7) % 4) * 0.025);
    const mesh = new THREE.Mesh(g.geo, plastic(COLORS[(k * 5) % COLORS.length]));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.setScalar(base);
    const width = g.width * base;
    letters.push({ mesh, base, cx: x + width / 2, dy: (((k * 13) % 7) - 3) * size * 0.02, tilt: THREE.MathUtils.degToRad(((k * 37) % 10) - 5), rnd: ((k * 53) % 10) / 10, word: 0, u: 0, x: 0, y: 0, z: 0, r: 0, s: 1, vx: 0, vy: 0, vz: 0, vr: 0, vs: 0 });
    x += width + size * 0.1;
  }
  return { letters, w: x - size * 0.1 };
}

// ---------- renderer and lights ----------
export function makeRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = look().exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

/** The fridge's light rig. Call `aim(centre, dist, w, h)` whenever the area it covers changes. */
export function lightRig(scene: THREE.Scene, mapSize: number) {
  const shadowLight = (int: number, dir: [number, number, number], radius: number) => {
    const l = new THREE.DirectionalLight("#ffffff", int);
    l.castShadow = true;
    l.shadow.mapSize.set(mapSize, mapSize);
    l.shadow.radius = radius;
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.02;
    scene.add(l, l.target);
    return { l, dir: new THREE.Vector3(...dir).normalize() };
  };
  const key = shadowLight(2.2, [-0.19, 0.28, 0.94], 6); // high and nearly frontal: shadows tuck in close, attached not floating
  // A tight dark edge where plastic meets steel. Shadows only: almost no light of its own, because a
  // head-on light puts a glare in the middle of every glossy magnet (right where the words sit).
  const contact = shadowLight(0.06, [0, 0.04, 1], 2);
  scene.add(new THREE.HemisphereLight("#ffffff", "#dde1e4", 0.3));
  const rim = new THREE.DirectionalLight("#dfe8ff", look().rim); // dark only: picks out top edges against graphite
  scene.add(rim, rim.target);
  const aim = (centre: THREE.Vector3, dist: number, w: number, h: number) => {
    for (const { l, dir } of [key, contact]) {
      l.position.copy(centre).addScaledVector(dir, dist);
      l.target.position.copy(centre);
      Object.assign(l.shadow.camera, { left: -w / 2 - 160, right: w / 2 + 160, top: h / 2 + 160, bottom: -h / 2 - 160, near: dist * 0.2, far: dist * 2 });
      l.shadow.camera.updateProjectionMatrix();
    }
    rim.position.copy(centre).add(new THREE.Vector3(0.15, 0.9, 0.25).multiplyScalar(dist));
    rim.target.position.copy(centre);
  };
  return { aim, rim };
}

/** Image-based lighting (the soft room). One per renderer. */
export function roomLight(renderer: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return env;
}

/**
 * A live transparent scene in CSS pixels (x right, y down: place things at (x, -y)), for one fixed-size
 * canvas (the tab bar, the splash). Shadows fall on the CSS door behind it.
 */
export function pxScene(canvas: HTMLCanvasElement, W: number, H: number) {
  const renderer = makeRenderer(canvas);
  renderer.setSize(W, H, false);
  const scene = new THREE.Scene();
  scene.environment = roomLight(renderer);
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
  const rig = lightRig(scene, Math.min(2048, Math.max(1024, 2 ** Math.ceil(Math.log2(W)))));
  rig.aim(c, dist * 1.5, W, H);
  const render = () => renderer.render(scene, camera);
  /** Compile every shader the scene needs before its first frame, off the main thread where the browser can. */
  const warm = () => renderer.compileAsync(scene, camera).catch(() => {});
  const off = onTheme(() => {
    const t = look();
    renderer.toneMappingExposure = t.exposure;
    (scene as any).environmentIntensity = t.env;
    rig.rim.intensity = t.rim;
    (plane.material as THREE.ShadowMaterial).opacity = t.shadow;
    render();
  });
  // Letter geometry and materials are shared with other scenes, so only this scene's own things are freed.
  const dispose = () => {
    off();
    plane.geometry.dispose();
    (plane.material as THREE.Material).dispose();
    scene.environment?.dispose();
    renderer.dispose();
  };
  return { renderer, scene, camera, render, warm, dispose };
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
