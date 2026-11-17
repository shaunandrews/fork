#!/usr/bin/env node
// Screenshot every scenario screen and every flow step, on phone and desktop,
// in light and dark, and record where each element sits in every shot.
//
//   node tools/shoot.mjs                         # everything
//   node tools/shoot.mjs established plan-tonight # only these scenarios/flows
//   node tools/shoot.mjs --phone --dark          # narrow the variants
//
// Starts its own scenario-mode dev server (FORK_SCENARIOS=1, port 4190), seeds
// it, shoots, and stops it. Output: screenshots/latest/ with manifest.json
// (read by the review tool, tools/review.mjs) and index.html. See DEV.md.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENARIOS, scenarioUrl } from "../shared/scenarios.ts";
import { FLOWS } from "../shared/flows.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4190;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(root, "screenshots", "latest");

const VIEWPORTS = { phone: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
const THEMES = ["light", "dark"];

// ---------- args ----------
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2)));
const only = args.filter((a) => !a.startsWith("--"));
const viewports = Object.keys(VIEWPORTS).filter((v) => !(flags.has("phone") || flags.has("desktop")) || flags.has(v));
const themes = THEMES.filter((t) => !(flags.has("light") || flags.has("dark")) || flags.has(t));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Scenarios and flows become one list of groups, each a list of steps.
const groups = [
  ...SCENARIOS.map((s) => ({
    kind: "scenario",
    id: s.id,
    title: s.title,
    persona: s.persona,
    description: s.description,
    steps: s.screens.map((sc) => ({ id: slug(sc.name), name: sc.name, go: sc.path, shot: sc.name })),
  })),
  ...FLOWS.map((f) => ({
    kind: "flow",
    id: f.id,
    title: f.title,
    persona: f.persona,
    description: f.description,
    steps: f.steps.map((st, i) => ({ ...st, id: st.shot ? `${String(i + 1).padStart(2, "0")}-${slug(st.shot)}` : null, name: st.shot ?? null })),
  })),
].filter((g) => !only.length || only.includes(g.id));
if (!groups.length) {
  console.error(`Nothing matches ${only.join(", ")}. Known: ${[...SCENARIOS, ...FLOWS].map((s) => s.id).join(", ")}`);
  process.exit(1);
}

// ---------- playwright ----------
function loadPlaywright() {
  for (const dir of [root, join(homedir(), ".cache", "pr-screenshots")]) {
    const manifest = join(dir, "package.json");
    if (!existsSync(manifest)) continue;
    try {
      return createRequire(manifest)("playwright");
    } catch {}
  }
  console.error("Playwright not found. Install once:\n  npm i -D playwright && npx playwright install chromium-headless-shell");
  process.exit(1);
}

// ---------- dev server ----------
function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn("sf", ["dev", "--port", String(PORT), "--no-watch"], {
      cwd: root,
      env: { ...process.env, FORK_SCENARIOS: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    const onData = (buf) => {
      log += buf.toString();
      const m = log.match(/Open this private URL: (\S+)/);
      if (m) resolve({ child, capabilityUrl: m[1] });
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => reject(new Error(`sf dev exited (${code}):\n${log}`)));
    setTimeout(() => reject(new Error(`sf dev didn't start in 60s:\n${log}`)), 60_000);
  });
}

// ---------- page helpers ----------
const personaUrl = (persona, path) => scenarioUrl({ persona }, path);

/** Re-seed in a fresh tab of the same browser context, so no app state leaks in. */
async function reseed(context) {
  for (let attempt = 1; ; attempt++) {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}/dev`);
      await page.getByTestId("dev-seed").waitFor({ timeout: 15_000 });
      await page.getByTestId("dev-seed").click();
      await page.getByTestId("dev-seeded").waitFor({ timeout: 20_000 });
      return;
    } catch (e) {
      // The capability cookie can land a beat late; try once more before giving up.
      if (attempt >= 2) throw new Error(`Couldn't seed at ${page.url()}. The page said:\n${(await page.innerText("body").catch(() => "")).slice(0, 400)}`);
    } finally {
      await page.close();
    }
  }
}

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !document.body.innerText.includes("Loading…"), null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(async () => {
    const imgs = [...document.images].filter((i) => !i.complete);
    await Promise.race([Promise.all(imgs.map((i) => new Promise((r) => (i.onload = i.onerror = r)))), new Promise((r) => setTimeout(r, 4000))]);
  });
  // Full-page shots: pin fixed bars to the page's bottom edge; hide the dev badge.
  await page.addStyleTag({ content: "body{position:relative!important} .fixed{position:absolute!important} [data-dev-badge]{display:none!important}" });
  await page.waitForTimeout(250);
}

/** Every meaningful element's box in page coordinates, for pointing at things in review. */
function elementMap() {
  const SEL = "a,button,input,textarea,select,img,h1,h2,h3,p,li,label,nav,header,section,article,[data-component]";
  const path = (el) => {
    const parts = [];
    for (let n = el; n && n !== document.body && parts.length < 6; n = n.parentElement) {
      const comp = n.getAttribute("data-component");
      if (comp) {
        parts.unshift(`[data-component=${comp}]`);
        if (n !== el) break;
        continue;
      }
      const same = n.parentElement ? [...n.parentElement.children].filter((c) => c.tagName === n.tagName) : [];
      parts.unshift(n.tagName.toLowerCase() + (same.length > 1 ? `:nth-of-type(${same.indexOf(n) + 1})` : ""));
    }
    return parts.join(" > ");
  };
  const out = [];
  for (const el of document.querySelectorAll(SEL)) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
    const own = el.getAttribute("data-component");
    const parent = (own ? el.parentElement : el)?.closest("[data-component]");
    const text = (el.getAttribute("aria-label") || el.getAttribute("alt") || el.getAttribute("placeholder") || el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 80);
    out.push({
      tag: el.tagName.toLowerCase(),
      component: own,
      within: parent ? parent.getAttribute("data-component") : null,
      text,
      selector: path(el),
      x: Math.round(r.left + scrollX),
      y: Math.round(r.top + scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
    });
  }
  return out;
}

async function doStep(page, persona, step) {
  if (step.go) await page.goto(BASE + personaUrl(persona, step.go));
  if (step.fill) await page.getByPlaceholder(step.fill.placeholder).fill(step.fill.value);
  if (step.click) {
    const c = step.click;
    const loc = c.css ? page.locator(c.css) : page.getByRole(c.role ?? "button", { name: c.name, exact: !!c.exact });
    await loc.nth(c.nth ?? 0).click();
    if (!step.waitPath) await page.waitForTimeout(600);
  }
  if (step.waitPath) await page.waitForURL((u) => u.pathname === step.waitPath, { timeout: 15_000 });
}

// ---------- run ----------
const { chromium } = loadPlaywright();
console.log("Starting scenario server…");
const { child, capabilityUrl } = await startServer();
const browser = await chromium.launch({ headless: true });
const shots = {};
const problems = [];
try {
  rmSync(OUT, { recursive: true, force: true });
  for (const viewport of viewports) {
    for (const theme of themes) {
      const variant = `${viewport}.${theme}`;
      const context = await browser.newContext({ viewport: VIEWPORTS[viewport], deviceScaleFactor: 2, colorScheme: theme });
      const page = await context.newPage();
      page.on("pageerror", (e) => problems.push(`${page.url()}: ${e.message}`));
      await page.goto(capabilityUrl);
      await page.waitForURL((u) => !u.hash.includes("zero-dev-capability"), { timeout: 15_000 });
      for (const g of groups) {
        // Flows change data, so every group starts from a fresh seed.
        await reseed(context);
        for (const step of g.steps) {
          try {
            await doStep(page, g.persona, step);
          } catch (e) {
            problems.push(`${g.id} › ${step.name ?? JSON.stringify(step)} (${variant}): ${e.message.split("\n")[0]}`);
            break;
          }
          if (!step.id) continue;
          await settle(page);
          const file = join(g.id, `${step.id}.${variant}.png`);
          mkdirSync(join(OUT, g.id), { recursive: true });
          await page.screenshot({ path: join(OUT, file), fullPage: true });
          const size = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
          shots[`${g.id}/${step.id}/${variant}`] = { file, url: new URL(page.url()).pathname, ...size, elements: await page.evaluate(elementMap) };
          process.stdout.write(".");
        }
      }
      await context.close();
    }
  }
  process.stdout.write("\n");
} finally {
  await browser.close();
  child.kill();
}

// ---------- manifest + contact sheet ----------
const variants = viewports.flatMap((v) => themes.map((t) => ({ id: `${v}.${t}`, viewport: v, theme: t, width: VIEWPORTS[v].width })));
const manifest = {
  generatedAt: new Date().toISOString(),
  variants,
  groups: groups.map((g) => ({ ...g, steps: g.steps.filter((s) => s.id).map((s) => ({ id: s.id, name: s.name })) })),
  shots,
};
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const sections = manifest.groups
  .map((g) => {
    const rows = g.steps
      .map((st) => {
        const cells = variants
          .map((v) => {
            const shot = shots[`${g.id}/${st.id}/${v.id}`];
            return shot ? `<a href="${esc(shot.file)}" target="_blank"><img src="${esc(shot.file)}" loading="lazy" class="${v.viewport}"></a>` : "<span></span>";
          })
          .join("");
        return `<div class="row"><h3>${esc(st.name)}</h3><div class="cells">${cells}</div></div>`;
      })
      .join("");
    return `<section><h2>${esc(g.title)} <small>${g.kind}</small></h2><p>${esc(g.persona ? `As ${g.persona}` : "Signed out")} · ${esc(g.description)}</p>${rows}</section>`;
  })
  .join("");
writeFileSync(
  join(OUT, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>Fork screenshots</title>
<style>
body{font:15px/1.5 system-ui,sans-serif;margin:0;padding:32px;background:#f6f6f4;color:#151514}
h1{margin:0 0 4px}h2{margin:48px 0 4px;font-size:24px}h2 small{font-size:13px;color:#6b6b66;font-weight:500}h3{font-size:14px;margin:24px 0 8px}
p{margin:0;color:#6b6b66}.cells{display:flex;gap:16px;align-items:flex-start;overflow-x:auto}
img{display:block;border:1px solid #e6e6e2;border-radius:8px;background:#fff}img.phone{width:200px}img.desktop{width:480px}
</style>
<h1>Fork screenshots</h1><p>${new Date().toLocaleString()} · ${Object.keys(shots).length} shots · columns: ${variants.map((v) => v.id).join(", ")} · Review and comment with <code>node tools/review.mjs</code></p>${sections}`,
);

console.log(`${Object.keys(shots).length} screenshots → ${join(OUT, "index.html")}`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of [...new Set(problems)]) console.log(`  ${p}`);
}
