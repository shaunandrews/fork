// Keeping Fork live. Zero pushes changes over one realtime socket (on fork.space.fast, through
// Spacefast's relay, "Cast"). Three things can leave a tab deaf without this file:
//   - a publish: Cast has one room per published version, so a tab opened before a publish never
//     hears changes made from the new version;
//   - a refused join: the client stops the socket for good (close code 4003);
//   - a background tab: browsers throttle or drop sockets in hidden tabs.
// So: watch the socket, and when the tab comes back (or the socket is stopped) either reload onto the
// new version, reload when the client has given up, or close the socket so the client reconnects, which
// re-joins and replays what was missed. (The platform's client module doesn't export `reconnect`.)
// It also records what the ?debug=1 panel shows. See projects/fork/docs/realtime-and-speed-plan.md in Bond.

export type Close = { at: number; code: number; reason: string };
export const live = {
  bootVersion: null as string | null,
  liveVersion: null as string | null,
  socketUrl: "",
  state: "none" as "none" | "connecting" | "open" | "closed",
  opens: 0,
  closes: [] as Close[],
  lastMessageAt: 0,
  lastUpdate: null as { at: number; queries: string[] } | null,
  reconnects: [] as { at: number; why: string }[],
  marks: {} as Record<string, number>,
};
const listeners = new Set<() => void>();
export const onLive = (f: () => void) => (listeners.add(f), () => listeners.delete(f));
const emit = () => listeners.forEach((f) => f());

/** Note when a step of opening the app happened (ms since the page started). First call wins. */
export function mark(name: string) {
  if (live.marks[name] === undefined) {
    live.marks[name] = Math.round(performance.now());
    emit();
  }
}

async function liveVersion(): Promise<string | null> {
  try {
    const r = await fetch("/__zero/config", { cache: "no-store" });
    const j = await r.json();
    return j?.realtime?.versionId ?? null;
  } catch {
    return null;
  }
}

// ---------- watch the realtime socket ----------
let current: WebSocket | null = null;
function watchSockets() {
  const Native = window.WebSocket;
  class Watched extends Native {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      const u = String(url);
      if (!/realtime|cast|_ws/.test(u)) return;
      live.socketUrl = u.replace(/[?#].*$/, "");
      current = this;
      live.state = "connecting";
      emit();
      this.addEventListener("open", () => { live.state = "open"; live.opens++; emit(); });
      this.addEventListener("close", (e) => {
        live.state = "closed";
        live.closes = [...live.closes.slice(-9), { at: Date.now(), code: e.code, reason: e.reason }];
        emit();
        // 4003: the client stopped this socket (a refused join) and won't try again by itself.
        if (e.code === 4003) setTimeout(() => keepLive("socket stopped"), backoff());
      });
      this.addEventListener("message", (e) => {
        live.lastMessageAt = Date.now();
        if (typeof e.data === "string" && e.data.includes("invalidate")) {
          try {
            const m = JSON.parse(e.data);
            live.lastUpdate = { at: Date.now(), queries: m?.payload?.changedQueries ?? [] };
          } catch {
            live.lastUpdate = { at: Date.now(), queries: [] };
          }
        }
        emit();
      });
    }
  }
  window.WebSocket = Watched as any;
}

let stoppedTries = 0;
const backoff = () => Math.min(60_000, 2_000 * 2 ** stoppedTries++);

// ---------- come back to life ----------
let busy = false;
let lastKeep = 0;
// Never reload in a loop: at most twice in five minutes.
function reloadOnce(): boolean {
  const now = Date.now();
  const recent = (JSON.parse(sessionStorage.getItem("fork-reloads") || "[]") as number[]).filter((t) => now - t < 300_000);
  if (recent.length >= 2) return false;
  sessionStorage.setItem("fork-reloads", JSON.stringify([...recent, now]));
  location.reload();
  return true;
}
const typing = () => {
  const a = document.activeElement as HTMLElement | null;
  return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable);
};

/** Make sure this tab is on the live version and its socket is joined. */
export async function keepLive(why: string) {
  if (busy || Date.now() - lastKeep < 5_000) return;
  busy = true;
  lastKeep = Date.now();
  try {
    const v = await liveVersion();
    if (v) live.liveVersion = v;
    if (v && live.bootVersion && v !== live.bootVersion) {
      // A new version is live: this tab's room is dead. Reload onto it (not mid-typing; try again later).
      if (!typing() && reloadOnce()) return;
    }
    const stopped = live.closes.length && live.closes[live.closes.length - 1].code === 4003 && live.state === "closed";
    if (!current || stopped) {
      // The client has given up on its socket: only a reload brings it back.
      if (!typing()) reloadOnce();
      return;
    }
    // Close it ourselves: the client reconnects, re-joins and replays what this tab missed.
    if (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING) current.close(4000, "fork: catch up");
    live.reconnects = [...live.reconnects.slice(-9), { at: Date.now(), why }];
    emit();
  } finally {
    busy = false;
  }
}

let started = false;
/** Start watching. Call once, as early as possible (before Zero opens its socket). */
export function startLive() {
  if (started || typeof window === "undefined") return;
  started = true;
  watchSockets();
  void liveVersion().then((v) => { live.bootVersion = live.liveVersion = v; emit(); });
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 30_000) void keepLive("back after " + Math.round((Date.now() - hiddenAt) / 1000) + "s hidden");
  });
  // Restored from the back/forward cache: everything in it may be stale.
  addEventListener("pageshow", (e) => { if ((e as PageTransitionEvent).persisted) void keepLive("restored from back/forward cache"); });
}
