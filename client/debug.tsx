// The ?debug=1 panel: is this tab live, and how long did opening take. Open fork.space.fast/?debug=1 once;
// it stays on for the tab (sessionStorage). ?debug=0 turns it off. See client/live.ts.
import { useEffect, useState } from "preact/hooks";
import { keepLive, live, onLive } from "./live";

const on = () => {
  if (typeof location === "undefined") return false;
  const q = new URLSearchParams(location.search).get("debug");
  if (q === "1") sessionStorage.setItem("fork-debug", "1");
  if (q === "0") sessionStorage.removeItem("fork-debug");
  return sessionStorage.getItem("fork-debug") === "1";
};
const ago = (t: number) => (t ? `${Math.round((Date.now() - t) / 1000)}s ago` : "never");
const short = (v: string | null) => (v ? v.replace(/^ver_/, "").slice(0, 8) : "?");

export function DebugPanel() {
  const [show] = useState(on);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!show) return;
    const off = onLive(() => tick((n) => n + 1));
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => { off(); clearInterval(t); };
  }, [show]);
  if (!show) return null;
  const stale = live.bootVersion && live.liveVersion && live.bootVersion !== live.liveVersion;
  const lastClose = live.closes[live.closes.length - 1];
  const steps = Object.entries(live.marks).sort((a, b) => a[1] - b[1]);
  const runs = performance.getEntriesByType("resource").filter((r) => /__zero\/(run|config|realtime-ticket)/.test(r.name)) as PerformanceResourceTiming[];
  return (
    <div class="fixed bottom-3 left-3 z-[200] w-[min(92vw,340px)] rounded-2xl bg-black/85 p-3 font-mono text-[11px] leading-[1.45] text-white shadow-lg backdrop-blur" data-component="DebugPanel">
      <div class="flex items-center justify-between">
        <b>Live</b>
        <span class={live.state === "open" ? "text-green-400" : "text-amber-300"}>● {live.state}</span>
      </div>
      <div>version: tab {short(live.bootVersion)} · live {short(live.liveVersion)} {stale ? <b class="text-amber-300">STALE</b> : null}</div>
      <div>socket: {live.socketUrl.replace(/^wss?:\/\//, "") || "none"} · opened {live.opens}×</div>
      <div>last message {ago(live.lastMessageAt)}</div>
      <div>last update {live.lastUpdate ? `${ago(live.lastUpdate.at)}: ${live.lastUpdate.queries.join(", ")}` : "none"}</div>
      {lastClose ? <div>last close {ago(lastClose.at)}: {lastClose.code} {lastClose.reason}{lastClose.code === 4003 ? " (stopped)" : ""}</div> : null}
      {live.reconnects.length ? <div>reconnected {live.reconnects.length}×, last: {live.reconnects[live.reconnects.length - 1].why}</div> : null}
      <div class="mt-2"><b>Opening</b> (ms from page start)</div>
      <div>{steps.map(([k, v]) => `${k} ${v}`).join(" · ") || "…"}</div>
      <div class="mt-1 max-h-24 overflow-y-auto opacity-80">
        {runs.slice(0, 12).map((r, i) => (
          <div key={i}>{r.name.replace(/^.*__zero\//, "")} at {Math.round(r.startTime)} took {Math.round(r.duration)}</div>
        ))}
      </div>
      <button type="button" class="mt-2 rounded-full bg-white/15 px-3 py-1" onClick={() => void keepLive("debug panel")}>Reconnect now</button>
    </div>
  );
}
