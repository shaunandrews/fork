// Scenario mode only: a small badge on every page saying who you're viewing as,
// with a way back to /dev. Renders nothing in normal dev or production.
import { useAuth } from "@spacefast/zero/client";
import { SCENARIOS } from "../shared/scenarios";

const isLocal = () => typeof location !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\]|100\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|[\w-]+\.[\w-]+\.ts\.net)$/.test(location.hostname);

export function DevBadge() {
  const auth = useAuth() as any;
  if (!isLocal() || auth.requireSignIn !== false || auth.isLoading) return null;
  if (typeof location !== "undefined" && location.pathname.startsWith("/dev")) return null;
  const id = typeof auth.userId === "string" ? auth.userId.replace(/^guest:/, "") : "";
  const signedOut = !id || id === "local";
  const name = signedOut ? "Signed out" : id[0].toUpperCase() + id.slice(1);
  const scenario = SCENARIOS.find((s) => (signedOut ? s.persona === null : s.persona === id));
  return (
    <a
      href="/dev"
      data-dev-badge
      class="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-action py-2 pl-3 pr-4 text-[13px] font-medium text-on-action shadow-[0_1px_2px_rgba(0,0,0,.06),0_8px_24px_rgba(0,0,0,.12)] hover:opacity-90 lg:bottom-4"
    >
      <span class="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
      <span>
        {signedOut ? name : `Viewing as ${name}`}
        {scenario ? <span class="opacity-60"> · {scenario.title}</span> : null}
      </span>
      <span class="opacity-60">· Dev</span>
    </a>
  );
}
