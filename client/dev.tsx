// /dev: local tools. Scenarios (log in as a test persona, seed data) and,
// later, the component library. Only renders on localhost.
import { useEffect, useRef, useState } from "preact/hooks";
import { Link, useAuth } from "@spacefast/zero/client";
import { api, btnPrimary, btnQuiet } from "./index";
import { caption, container, displayLg, displayMd, flow, usePageTitle } from "./layout";
import { SCENARIOS, goUrl, scenarioUrl } from "../shared/scenarios";
import { todayLocal } from "../shared/dates";

const isLocal = () => typeof location !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\]|100\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|[\w-]+\.[\w-]+\.ts\.net|[\w-]+\.local)$/.test(location.hostname);

export function DevFrame({ title, children }: { title: string; children: any }) {
  usePageTitle(`${title} · Dev`);
  if (!isLocal()) {
    return (
      <div class={`${container} py-24`}>
        <h1 class={displayLg}>Not here</h1>
        <p class="mt-3 text-ink-muted">Dev tools only run on a local dev server.</p>
      </div>
    );
  }
  return (
    <div class="min-h-screen bg-canvas font-sans text-ink">
      <header class={`${container} flex h-16 items-center justify-between border-b border-line`}>
        <div class="flex items-baseline gap-3">
          <Link to="/dev" class="font-display text-[24px] font-medium">
            Fork dev
          </Link>
        </div>
        <nav class="flex gap-6 text-[15px] font-medium">
          <Link to="/dev" class="text-ink-muted hover:text-ink">
            Scenarios
          </Link>
          <Link to="/dev/components" class="text-ink-muted hover:text-ink">
            Components
          </Link>
          <Link to="/" class="text-ink-muted hover:text-ink">
            App
          </Link>
        </nav>
      </header>
      <main class={`${container} pb-24 pt-10`}>{children}</main>
    </div>
  );
}

function SeedButton() {
  const seed = (api as any).useMutation("devSeed");
  const [state, setState] = useState<"idle" | "busy" | "done" | string>("idle");
  return (
    <div class="flex flex-wrap items-center gap-4">
      <button
        class={btnPrimary}
        data-testid="dev-seed"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          try {
            await seed(todayLocal());
            setState("done");
          } catch (e) {
            setState(e instanceof Error ? e.message : String(e));
          }
        }}
      >
        {state === "busy" ? "Seeding…" : "Reset and seed"}
      </button>
      {state === "done" ? (
        <span data-testid="dev-seeded" class="text-[15px] text-accent">
          Seeded. Every scenario is ready.
        </span>
      ) : state !== "idle" && state !== "busy" ? (
        <span class="text-[15px] text-danger">{state}</span>
      ) : (
        <span class="text-[15px] text-ink-muted">Wipes local data and rebuilds the families below.</span>
      )}
    </div>
  );
}

export function DevHome() {
  const auth = useAuth() as any;
  const scenarioMode = auth.requireSignIn === false;
  return (
    <DevFrame title="Scenarios">
      <div class={flow.replace("mx-auto", "")}>
        <h1 class={displayLg}>Scenarios</h1>
        <p class="mt-3 text-[17px] leading-relaxed text-ink-muted">
          Open any screen as a test persona. Each link signs you in as that person for that tab, and seeds the data first if the dev server lost it. Screenshot them all with{" "}
          <code class="rounded bg-surface px-1.5 py-0.5 text-[15px]">node tools/shoot.mjs</code>.
        </p>
        <div class="mt-8">
          {scenarioMode ? (
            <SeedButton />
          ) : (
            <p class="rounded-[12px] bg-surface p-4 text-[15px]">
              Scenario mode is off, so personas can't sign in. Restart the dev server with{" "}
              <code class="font-medium">FORK_SCENARIOS=1 sf dev</code>.
            </p>
          )}
        </div>
      </div>

      <ul class="mt-14 border-t border-line">
        {SCENARIOS.map((s) => (
          <li key={s.id} class="grid gap-4 border-b border-line py-8 md:grid-cols-12 md:gap-6">
            <div class="md:col-span-5">
              <p class={caption}>{s.persona ? `As ${s.persona[0].toUpperCase()}${s.persona.slice(1)}` : "Signed out"}</p>
              <h2 class={`mt-1 ${displayMd}`}>{s.title}</h2>
              <p class="mt-2 text-[15px] leading-relaxed text-ink-muted">{s.description}</p>
            </div>
            <div class="flex flex-wrap content-start gap-2 md:col-span-7">
              {s.screens.map((sc) => (
                <a key={sc.name} href={goUrl(s, sc.path)} class={`${btnQuiet} h-9 px-3.5`}>
                  {sc.name}
                </a>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </DevFrame>
  );
}

/** /dev/go?s=<scenario>&p=<path>: seed if the server lost its data, then open the screen as that persona. */
export function DevGo() {
  const auth = useAuth() as any;
  const status = (api as any).useQuery("devStatus");
  const seed = (api as any).useMutation("devSeed");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const params = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
  const scenario = SCENARIOS.find((s) => s.id === params.get("s"));
  const path = params.get("p") || "/";
  useEffect(() => {
    if (!scenario || status === undefined || started.current) return;
    started.current = true;
    // replace, not assign: Back should return to /dev, not bounce through this redirect again.
    const open = () => location.replace(scenarioUrl(scenario, path));
    if (status.seeded) open();
    else seed(todayLocal()).then(open, (e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [status, scenario, path]);
  let text = "Opening…";
  if (auth.requireSignIn === true) text = "Scenario mode is off. Restart the dev server with FORK_SCENARIOS=1 sf dev.";
  else if (!scenario) text = `No scenario called "${params.get("s")}".`;
  else if (error) text = error;
  else if (status && !status.seeded) text = "The dev server lost its data. Seeding…";
  return (
    <DevFrame title="Opening">
      <p class="text-[17px] text-ink-muted">{text}</p>
    </DevFrame>
  );
}
