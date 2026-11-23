// The stage: every 3D piece on a page (resin cards, resin domes, magnet words) lives in ONE scene, drawn by
// ONE WebGL renderer on a fixed canvas behind the page. Each piece is tied to a DOM box and placed exactly
// over it, in CSS pixels, so the page lays everything out and the stage only draws.
//
// Why one scene: shadows cost one pass per light and shader compiles happen once per material, so drawing
// everything together pays them once per frame, not once per piece. It only draws when something moved:
// a scroll, a resize, a swipe, a layout change, a transition. Nothing is read back to images.
//
// The resin is faked the way games do it, not with real transmission (which re-renders the whole page into
// a second full-size buffer every frame and ghosted the photo): the print's shader bends the photo near the
// rim like a lens, and a clear gloss coat on top adds the reflections and the bright edge.
//
// The canvas sits under the page (z-index 0; app content above it), so words laid over a card stay crisp
// DOM text, and the tab bar's progressive blur blurs the magnets that scroll under it, like the rest.
import { THREE, glyph, isDark, lightRig, look, makeRenderer, onTheme, plastic, COLORS, roomLight } from "./kit";
import { splashAnimating } from "./splash";

export type Piece = {
  el: HTMLElement;
  obj: THREE.Object3D;
  /** The piece's gloss coat, drawn in a second pass lit only by the room (see `coats`). */
  coat?: THREE.Object3D;
  ready: boolean;
  /** Put the piece over its box (a viewport rect). */
  place(r: DOMRect): void;
  /** Called once, after the first frame that drew it. */
  shown?: () => void;
  dispose(): void;
};

let stage: ReturnType<typeof makeStage> | null = null;
/** The page's stage, made on first use. */
export const getStage = () => (stage ??= makeStage());
/** Something on the page moved: draw for the next `ms` milliseconds (at least one frame). */
export const kickStage = (ms = 0) => stage?.kick(ms);
/** Resolves once the stage has compiled what it needs (at once if there's no stage). */
export const stageIdle = () => (stage ? stage.idle() : Promise.resolve());

function makeStage() {
  const canvas = document.createElement("canvas");
  canvas.id = "fridge-stage";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100vw", height: "100vh", zIndex: "0", pointerEvents: "none" });
  document.body.prepend(canvas);
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = roomLight(renderer);
  (scene as any).environmentIntensity = look().env;
  // Tilt the room so its brightest panel isn't straight behind the viewer: a flat glossy magnet facing you
  // would mirror it as a glare in the middle of the card, right where the words sit.
  (scene as any).environmentRotation?.set(0.9, 0.5, 0);
  // The gloss coats live in their own scene, lit only by the room: reflections and a bright rim, but no
  // hard highlight from the key light, which lands as a glare on the middle of a flat card.
  const coats = new THREE.Scene();
  coats.environment = scene.environment;
  (coats as any).environmentIntensity = look().env;
  (coats as any).environmentRotation?.set(0.9, 0.5, 0);
  renderer.autoClear = false;
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 10000);
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: look().shadow }));
  shadowFloor.receiveShadow = true;
  // Darken after the gloss coats are drawn: a coat adds light without alpha, and adding light onto a
  // half-transparent shadow pixel first made it composite as black.
  shadowFloor.renderOrder = 10;
  scene.add(shadowFloor);
  // A smaller shadow map than the bar's: softer edges, the way the prototypes' blurred shadows read.
  const rig = lightRig(scene, 1024);
  const pieces = new Set<Piece>();
  let W = 0, H = 0;

  function fit() {
    const w = innerWidth, h = innerHeight;
    if (w === W && h === H) return;
    W = w; H = h;
    renderer.setSize(W, H, false);
    // A long lens, so pieces near the edges don't splay. z = 0 maps exactly to CSS pixels.
    const dist = Math.max(W, H) * 1.6;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(H / 2 / dist));
    camera.aspect = W / H;
    camera.near = dist * 0.3;
    camera.far = dist * 2;
    camera.position.set(W / 2, -H / 2, dist);
    camera.lookAt(W / 2, -H / 2, 0);
    camera.updateProjectionMatrix();
    const c = new THREE.Vector3(W / 2, -H / 2, 0);
    shadowFloor.position.copy(c);
    shadowFloor.scale.set(W + 600, H + 600, 1);
    rig.aim(c, dist, W, H);
  }

  let until = 0, running = false, warming = false, needsWarm = true;
  function frame() {
    fit();
    // New pieces may need shaders the stage hasn't built: compile them in the background first (the
    // browser does it off the main thread where it can), and draw once they're ready.
    if (needsWarm && splashAnimating()) {
      // Shader compiles block the page: let the splash finish its move first.
      running = false;
      setTimeout(() => kick(), 50);
      return;
    }
    if (needsWarm) {
      needsWarm = false;
      warming = true;
      for (const p of pieces) { p.obj.visible = p.ready; if (p.coat) p.coat.visible = p.ready; }
      Promise.all([renderer.compileAsync(scene, camera), renderer.compileAsync(coats, camera)]).catch(() => {}).then(() => { warming = false; running = false; kick(); });
      return;
    }
    const pending: Piece[] = [];
    for (const p of pieces) {
      if (!p.ready || !p.el.isConnected) { p.obj.visible = false; continue; }
      const r = p.el.getBoundingClientRect();
      const on = r.width > 0 && r.height > 0 && r.bottom > -200 && r.top < H + 200 && r.right > -200 && r.left < W + 200 && !hiddenByStyle(p.el);
      p.obj.visible = on;
      if (p.coat) p.coat.visible = on;
      if (on) {
        p.place(r);
        if (p.shown) pending.push(p);
      }
    }
    renderer.clear();
    renderer.render(scene, camera);
    renderer.render(coats, camera);
    for (const p of pending) { p.shown!(); p.shown = undefined; }
    if (performance.now() < until) requestAnimationFrame(frame);
    else running = false;
  }
  function kick(ms = 0) {
    until = Math.max(until, performance.now() + ms);
    if (!running && !warming) { running = true; requestAnimationFrame(frame); }
  }

  // Draw when the page moves. Scrolls anywhere (the tab panes scroll on their own), resizes, layout
  // changes, CSS transitions, and style changes (the swipe moves the tab row with a transform).
  addEventListener("scroll", () => kick(120), { capture: true, passive: true });
  addEventListener("resize", () => kick(120));
  addEventListener("transitionrun", () => kick(700));
  addEventListener("animationstart", () => kick(700));
  new ResizeObserver(() => kick(60)).observe(document.body);
  new MutationObserver(() => kick(60)).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["style", "class", "inert"] });
  onTheme(() => {
    const t = look();
    renderer.toneMappingExposure = t.exposure;
    (scene as any).environmentIntensity = t.env;
    (coats as any).environmentIntensity = t.env;
    rig.rim.intensity = t.rim;
    (shadowFloor.material as THREE.ShadowMaterial).opacity = t.shadow;
    backMaterial.color.set(t.back);
    kick();
  });

  return {
    add(p: Piece) { pieces.add(p); scene.add(p.obj); if (p.coat) coats.add(p.coat); kick(); },
    /** A piece just got its materials: compile before drawing it. */
    warm() { needsWarm = true; kick(); },
    /** Resolves when no shader compile is waiting (so the splash can leave onto a page that draws at once). */
    idle() {
      return new Promise<void>((done) => {
        const check = () => (needsWarm || warming ? setTimeout(check, 30) : done());
        check();
      });
    },
    remove(p: Piece) { pieces.delete(p); scene.remove(p.obj); if (p.coat) coats.remove(p.coat); kick(); },
    kick,
    renderer,
  };
}

// A piece inside a hidden subtree (display: none, or the app waiting under the splash) shouldn't draw.
function hiddenByStyle(el: HTMLElement) {
  return el.offsetParent === null && getComputedStyle(el).position !== "fixed";
}

// ---------- resin ----------
// Shared by every resin piece: the gloss coat, and the backing. The coat is a black body drawn additively,
// so it only adds light (reflections of the room, the key light's highlight, a bright rim) on top of the print.
// It adds colour but never alpha: where the coat's edge passes beyond the print (perspective), the page
// must stay see-through, not turn black.
const glossMaterial = new THREE.MeshPhysicalMaterial({
  color: "#000000", roughness: 0.04, metalness: 0, specularIntensity: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.55,
  transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
});
const backMaterial = new THREE.MeshStandardMaterial({ color: look().back, roughness: 0.6 });

// Sizes are for a card 1 unit wide (scaled to its box in px); the proportions are the ones Shaun approved.
const CARD_RADIUS = 0.105, CARD_BACK = 0.025;
const cardGeos = new Map<string, { back: THREE.BufferGeometry; print: THREE.BufferGeometry; resin: THREE.BufferGeometry }>();
function cardGeometry(aspect: number) {
  const key = aspect.toFixed(3);
  let g = cardGeos.get(key);
  if (g) return g;
  const w = 1, h = 1 / aspect, r = CARD_RADIUS;
  // The backing: the card's rounded rectangle, extruded, with a softened edge.
  const back = new THREE.ExtrudeGeometry(roundedShape(w, h, r), { depth: CARD_BACK, bevelEnabled: false, curveSegments: 12 });
  const print = roundedRect(w, h, r);
  print.translate(0, 0, CARD_BACK + 0.0005);
  // The coat: the card's own rounded rectangle, flat across the top and rounding down at the rim (a bevel),
  // so it matches the print exactly and the rim catches the light.
  const bevel = 0.03;
  const resin = new THREE.ExtrudeGeometry(roundedShape(w, h, r), { depth: 0.002, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 8, curveSegments: 24 });
  resin.translate(0, 0, CARD_BACK + 0.001 + bevel);
  g = { back, print, resin };
  cardGeos.set(key, g);
  return g;
}
function roundedShape(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function roundedRect(w: number, h: number, r: number) {
  const x = -w / 2, y = -h / 2;
  const g = new THREE.ShapeGeometry(roundedShape(w, h, r), 16), pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
  return g;
}
let domeGeo: { back: THREE.BufferGeometry; print: THREE.BufferGeometry; resin: THREE.BufferGeometry } | null = null;
function domeGeometry() {
  if (domeGeo) return domeGeo;
  const back = new THREE.CylinderGeometry(1, 1, 0.13, 48);
  back.rotateX(Math.PI / 2);
  back.translate(0, 0, 0.065);
  const print = new THREE.CircleGeometry(0.985, 48);
  print.translate(0, 0, 0.131);
  const R = 1.9, th = Math.asin(1 / R), resin = new THREE.SphereGeometry(R, 64, 16, 0, Math.PI * 2, 0, th);
  resin.rotateX(Math.PI / 2);
  resin.translate(0, 0, -R * Math.cos(th) + 0.133);
  return (domeGeo = { back, print, resin });
}

// Photos as textures, shared by every piece that shows the same photo.
const loader = new THREE.TextureLoader();
loader.setCrossOrigin("anonymous");
const textures = new Map<string, Promise<THREE.Texture>>();
function photoTexture(url: string) {
  let t = textures.get(url);
  if (!t) {
    t = loader.loadAsync(url).then((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    });
    t.catch(() => textures.delete(url));
    textures.set(url, t);
  }
  return t;
}

/**
 * The print under the resin: the photo, cropped to cover the shape like `object-fit: cover` (a little above
 * centre), bent near the rim like a lens (the resin's refraction, faked in the shader). With `frost`, the
 * lower part is the same photo blurred and dimmed, for words to sit on; the blur is a mipmap read.
 */
function printMaterial(src: THREE.Texture, kind: "card" | "dome", aspect: number, frost: boolean) {
  const tex = src.clone();
  tex.needsUpdate = true;
  const img = src.image as { width: number; height: number };
  const ia = img.width / img.height;
  if (ia > aspect) { tex.repeat.set(aspect / ia, 1); tex.offset.set((1 - aspect / ia) / 2, 0); }
  else { tex.repeat.set(1, ia / aspect); tex.offset.set(0, (1 - ia / aspect) * 0.65); }
  // Unlit: the photo shows in its own colours, with no highlight of its own (the coat on top adds the shine).
  const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.lensRepeat = { value: tex.repeat };
    sh.uniforms.lensOffset = { value: tex.offset };
    sh.uniforms.lensAspect = { value: aspect };
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
uniform vec2 lensRepeat;
uniform vec2 lensOffset;
uniform float lensAspect;
// Where on the shape (0..1 both ways) to read, after the rim bends it toward the middle.
vec2 lens(vec2 local) {
  ${kind === "card"
    ? `float d = min(min(local.x, 1.0 - local.x), min(local.y, 1.0 - local.y) / lensAspect);
  float t = clamp(1.0 - d / 0.06, 0.0, 1.0);`
    : `float t = clamp((length(local - 0.5) * 2.0 - 0.78) / 0.22, 0.0, 1.0);`}
  return local + (vec2(0.5) - local) * t * t * t * 0.035;
}`)
      .replace(
        "#include <map_fragment>",
        `vec2 local = (vMapUv - lensOffset) / lensRepeat;
         vec2 bent = lens(local) * lensRepeat + lensOffset;
         vec4 sampledDiffuseColor = texture2D( map, bent );
         ${frost ? `float frostMask = smoothstep(0.5, 0.26, local.y);
         sampledDiffuseColor = mix(sampledDiffuseColor, texture2D( map, bent, 5.0 ) * vec4(vec3(0.72), 1.0), frostMask);` : ""}
         diffuseColor *= sampledDiffuseColor;`,
      );
  };
  m.customProgramCacheKey = () => `fork-print-${kind}-${frost}`;
  return m;
}

function resinPiece(el: HTMLElement, url: string, kind: "card" | "dome", aspect: number, frost: boolean, onShown: () => void): Piece {
  const obj = new THREE.Group();
  const coat = new THREE.Group();
  let print: THREE.MeshBasicMaterial | null = null;
  const piece: Piece = {
    el, obj, coat, ready: false, shown: onShown,
    place(r) {
      obj.position.set(r.left + r.width / 2, -(r.top + r.height / 2), 0);
      obj.scale.setScalar(kind === "card" ? r.width : r.width / 2);
      coat.position.copy(obj.position);
      coat.scale.copy(obj.scale);
    },
    dispose() {
      getStage().remove(piece);
      print?.map?.dispose();
      print?.dispose();
    },
  };
  photoTexture(url).then((tex) => {
    const g = kind === "card" ? cardGeometry(aspect) : domeGeometry();
    print = printMaterial(tex, kind, kind === "card" ? aspect : 1, frost);
    const back = new THREE.Mesh(g.back, backMaterial);
    back.castShadow = back.receiveShadow = true;
    const face = new THREE.Mesh(g.print, print);
    obj.add(back, face);
    coat.add(new THREE.Mesh(g.resin, glossMaterial));
    piece.ready = true;
    getStage().warm();
  }, () => {});
  getStage().add(piece);
  return piece;
}

export const resinCardPiece = (el: HTMLElement, url: string, aspect: number, frost: boolean, onShown: () => void) => resinPiece(el, url, "card", aspect, frost, onShown);
export const resinDomePiece = (el: HTMLElement, url: string, onShown: () => void) => resinPiece(el, url, "dome", 1, false, onShown);

// ---------- magnet words ----------
const LINE = 1.32; // line height, in letter heights
const seedOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 97;
type Laid = { ch: string; x: number; y: number; scale: number; tilt: number; color: string }[];
/** Lay out lines of letter magnets in letter-height units: positions, and the box they fill. */
export function magnetLayout(lines: string[]) {
  let k = seedOf(lines.join(" "));
  const rows = lines.map((line) => {
    const out: Laid = [];
    let x = 0;
    line.split(" ").forEach((word, wi) => {
      if (wi) x += 0.42;
      for (const ch of word) {
        k++;
        const scale = 0.95 + ((k * 7) % 4) * 0.025;
        const w = glyph(ch).width * scale;
        out.push({ ch, x: x + w / 2, y: (((k * 13) % 7) - 3) * 0.02, scale, tilt: THREE.MathUtils.degToRad(((k * 37) % 10) - 5), color: COLORS[(k * 5) % COLORS.length] });
        x += w + 0.1;
      }
    });
    return { out, w: x - 0.1 };
  });
  const width = Math.max(...rows.map((r) => r.w));
  const height = lines.length * LINE - (LINE - 1);
  const laid: Laid = [];
  rows.forEach((r, li) => {
    const shift = -width / 2;
    for (const l of r.out) laid.push({ ...l, x: l.x + shift, y: height / 2 - 0.5 - li * LINE + l.y });
  });
  return { laid, width, height };
}

/** Letter magnets placed over a DOM box whose aspect matches `magnetLayout(lines)`. */
export function magnetTextPiece(el: HTMLElement, lines: string[], onShown: () => void): Piece {
  const { laid, width } = magnetLayout(lines);
  const obj = new THREE.Group();
  for (const l of laid) {
    const m = new THREE.Mesh(glyph(l.ch).geo, plastic(l.color));
    m.castShadow = m.receiveShadow = true;
    m.position.set(l.x, l.y, 0);
    m.rotation.z = l.tilt;
    m.scale.setScalar(l.scale);
    obj.add(m);
  }
  const piece: Piece = {
    el, obj, ready: true, shown: onShown,
    place(r) {
      obj.position.set(r.left + r.width / 2, -(r.top + r.height / 2), 0);
      obj.scale.setScalar(r.width / width);
    },
    dispose() { getStage().remove(piece); },
  };
  getStage().add(piece);
  getStage().warm();
  return piece;
}

/** Light or dark, for callers that key anything on it. */
export { isDark };
