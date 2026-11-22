// Resin magnets: a meal's photo printed on a backing and sealed under clear resin, rendered once with
// real refraction and the fridge's light, then shown as an image. Two shapes:
//   card  a rounded rectangle whose resin is flat over the middle and curves only at the rim, so text
//         laid over the safe area (inset ~12%) is never bent. The lower part of the print is the same
//         photo blurred and dimmed, for text to sit on.
//   dome  a round magnet under a gentle spherical cap (thumbnails).
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { THREE, isDark, look, renderOffscreen } from "./kit";

const imgP = (src: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => ok(im);
    im.onerror = fail;
    im.src = src;
  });

function printCanvas(img: HTMLImageElement, W: number, H: number, frost: boolean) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  const s = Math.max(W / img.width, H / img.height), iw = img.width * s, ih = img.height * s, ox = (W - iw) / 2, oy = (H - ih) * 0.35;
  x.drawImage(img, ox, oy, iw, ih);
  if (frost) {
    // the same photo, blurred and dimmed, fading in over the lower part: frosted resin for the words
    const b = document.createElement("canvas");
    b.width = W;
    b.height = H;
    const bx = b.getContext("2d")!;
    bx.filter = `blur(${Math.round(W * 0.028)}px) saturate(1.25) brightness(.72)`;
    bx.drawImage(img, ox - 40, oy - 40, iw + 80, ih + 80);
    const m = document.createElement("canvas");
    m.width = W;
    m.height = H;
    const mx = m.getContext("2d")!;
    const g = mx.createLinearGradient(0, H * 0.5, 0, H * 0.74);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    mx.fillStyle = g;
    mx.fillRect(0, 0, W, H);
    mx.globalCompositeOperation = "source-in";
    mx.drawImage(b, 0, 0);
    x.drawImage(m, 0, 0);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 24), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x) / w, (p.getY(i) - y) / h);
  return g;
}
const resinMaterial = () => new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.015, transmission: 1, thickness: 0.4, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.2 });

function cardObject(tex: THREE.Texture, w: number, h: number, r: number) {
  const g = new THREE.Group();
  const back = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.1, 6, r), new THREE.MeshStandardMaterial({ color: look().back, roughness: 0.6 }));
  back.position.z = 0.05; back.castShadow = true; back.receiveShadow = true; g.add(back);
  const print = new THREE.Mesh(roundedRect(w - 0.03, h - 0.03, r * 0.97), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  print.position.z = 0.102; g.add(print);
  // flat across the middle, curving down only in the outer rim
  const dg = new RoundedBoxGeometry(w, h, 0.5, 12, Math.min(r, 0.25)), p = dg.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (v.z > 0) {
      const n = Math.max(Math.abs(v.x / (w / 2)), Math.abs(v.y / (h / 2)));
      const f = n < 0.86 ? 1 : Math.max(0, 1 - Math.pow((n - 0.86) / 0.14, 2));
      p.setZ(i, v.z * (0.3 + 0.7 * f));
    }
  }
  dg.computeVertexNormals();
  const resin = new THREE.Mesh(dg, resinMaterial());
  resin.position.z = 0.354; resin.castShadow = true; g.add(resin);
  return g;
}

function domeObject(tex: THREE.Texture, r: number) {
  const g = new THREE.Group();
  const back = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.1, 64), new THREE.MeshStandardMaterial({ color: look().back, roughness: 0.6 }));
  back.rotation.x = Math.PI / 2; back.position.z = 0.05; back.castShadow = true; back.receiveShadow = true; g.add(back);
  const print = new THREE.Mesh(new THREE.CircleGeometry(r * 0.985, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  print.position.z = 0.102; g.add(print);
  const R = r * 1.9, th = Math.asin(r / R), cap = new THREE.SphereGeometry(R, 96, 24, 0, Math.PI * 2, 0, th);
  cap.rotateX(Math.PI / 2); cap.translate(0, 0, -R * Math.cos(th));
  const resin = new THREE.Mesh(cap, resinMaterial());
  resin.position.z = 0.104; resin.castShadow = true; g.add(resin);
  return g;
}

// Framing: the image is bigger than the magnet by MARGIN on every side, for its shadow.
// Components place the image with these so the magnet lands exactly on its box.
export const CARD_W = 4, CARD_MARGIN = 0.28, CARD_RADIUS = 0.42;
export const DOME_R = 1, DOME_MARGIN = 0.2;

const cache = new Map<string, Promise<string>>();

/** A resin card for a photo, `cssW` px wide with aspect w/h. Resolves to a PNG data URL. */
export function resinCard(url: string, cssW: number, aspect: number) {
  const bucket = Math.ceil(cssW / 80) * 80;
  const key = `card|${url}|${aspect.toFixed(3)}|${bucket}|${isDark()}`;
  if (!cache.has(key)) {
    const w = CARD_W, h = CARD_W / aspect, m = CARD_MARGIN;
    const pxW = Math.round(bucket * (w + 2 * m) / w), pxH = Math.round(pxW * (h + 2 * m) / (w + 2 * m));
    cache.set(key, imgP(url).then((img) => renderOffscreen(() => cardObject(printCanvas(img, 1000, Math.round(1000 / aspect), true), w, h, CARD_RADIUS), pxW, pxH, w + 2 * m)));
    cache.get(key)!.catch(() => cache.delete(key));
  }
  return cache.get(key)!;
}

/** A round resin magnet for a photo, `cssD` px across. */
export function resinDome(url: string, cssD: number) {
  const bucket = Math.ceil(cssD / 32) * 32;
  const key = `dome|${url}|${bucket}|${isDark()}`;
  if (!cache.has(key)) {
    const frame = 2 * (DOME_R + DOME_MARGIN), px = Math.round(bucket * frame / (2 * DOME_R));
    cache.set(key, imgP(url).then((img) => renderOffscreen(() => domeObject(printCanvas(img, 600, 600, false), DOME_R), px, px, frame)));
    cache.get(key)!.catch(() => cache.delete(key));
  }
  return cache.get(key)!;
}
