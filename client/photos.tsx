// Meal photos: one per meal name, per family. A family takes or uploads one, or
// picks one from image search (Wikimedia Commons and Openverse, both free, no key).
// Picked search results are copied into Fork's own storage, so they stay put.
import { useEffect, useRef, useState } from "preact/hooks";
import { storage } from "@spacefast/zero/client";
import { api, ErrorLine, useRunner } from "./index";
import { Button, Icon, Sheet, sheetAction } from "./ui";

export type Photo = { url: string; credit: string; creditUrl: string; source: string };
export type Photos = Record<string, Photo>;

/** Same key the server uses: lowercase, single spaces. */
export const mealKey = (title: string) => String(title).replace(/\s+/g, " ").trim().toLowerCase();

/** The family's photos, keyed by meal name. Empty while loading. */
export function usePhotos(): Photos {
  return ((api as any).useQuery("photos") as Photos | undefined) ?? {};
}

export function photoFor(photos: Photos, title: string): Photo | null {
  return photos[mealKey(title)] ?? null;
}

// ---------- search ----------

export type Result = { thumb: string; full: string; title: string; credit: string; creditUrl: string; source: string };

const strip = (html: string) => html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function searchCommons(q: string, signal: AbortSignal): Promise<Result[]> {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=18" +
    `&gsrsearch=${encodeURIComponent(`${q} filemime:image/jpeg`)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1280`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  const pages = Object.values(data?.query?.pages ?? {}) as any[];
  return pages
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((p) => {
      const ii = p.imageinfo?.[0];
      if (!ii?.thumburl) return null;
      const meta = ii.extmetadata ?? {};
      return {
        thumb: ii.thumburl,
        full: ii.thumburl,
        title: String(p.title ?? "").replace(/^File:/, "").replace(/\.\w+$/, ""),
        credit: strip(meta.Artist?.value ?? ""),
        creditUrl: ii.descriptionurl ?? "",
        source: "Wikimedia Commons",
      } as Result;
    })
    .filter((r): r is Result => r !== null);
}

async function searchOpenverse(q: string, signal: AbortSignal): Promise<Result[]> {
  const res = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=12&category=photograph`, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.results ?? []).map((r: any) => ({
    thumb: r.thumbnail || r.url,
    full: r.url,
    title: r.title ?? "",
    credit: r.creator ?? "",
    creditUrl: r.foreign_landing_url ?? "",
    source: "Openverse",
  }));
}

/** "Grandma's lasagna" → "lasagna": drop possessives and filler, so family names still find the dish. */
export function dishWords(title: string) {
  const out = title
    .replace(/\b[\w-]+['’]s\b/gi, " ")
    .replace(/\b(homemade|easy|quick|best|famous|classic|simple|our|my|the|night|special)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return out || title;
}

/** Results for a meal name: Commons first (fast), Openverse added when it answers (it can be slow). */
function useSearch(title: string) {
  const q = dishWords(title);
  const [results, setResults] = useState<Result[] | null>(null);
  useEffect(() => {
    const ctl = new AbortController();
    let commons: Result[] = [];
    let openverse: Result[] = [];
    let pending = 2;
    // Interleave, so neither source's misses fill the first rows.
    const merge = () => {
      const out: Result[] = [];
      for (let i = 0; i < Math.max(commons.length, openverse.length); i++) {
        if (commons[i]) out.push(commons[i]);
        if (openverse[i]) out.push(openverse[i]);
      }
      setResults(out);
    };
    const done = () => {
      pending -= 1;
      if (pending === 0) merge();
    };
    setResults(null);
    searchCommons(q, ctl.signal)
      .then((r) => {
        commons = r;
        merge();
      })
      .catch(() => {})
      .finally(done);
    const slow = setTimeout(() => ctl.abort(), 12000);
    searchOpenverse(q, ctl.signal)
      .then((r) => {
        openverse = r;
        merge();
      })
      .catch(() => {})
      .finally(done);
    return () => {
      clearTimeout(slow);
      ctl.abort();
    };
  }, [q]);
  return results;
}

// ---------- saving ----------

/** Shrink to at most 1600px on the long side and re-encode as JPEG, so phone photos fit storage's 5 MB. */
async function shrink(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Couldn't read that photo."))), "image/jpeg", 0.85));
}

async function store(blob: Blob): Promise<string> {
  const object = await storage.upload(await shrink(blob));
  // Keep it path-relative, so it works on every hostname the space answers on.
  const u = new URL(object.url, location.href);
  return u.origin === location.origin ? u.pathname + u.search : u.href;
}

// ---------- the picker ----------

/** Take or upload a photo, or pick one from search. Saves it for this meal and closes. */
export function PhotoPicker({ title, current, onClose }: { title: string; current?: Photo | null; onClose: () => void }) {
  const setPhoto = (api as any).useMutation("setPhoto");
  const removePhoto = (api as any).useMutation("removePhoto");
  const results = useSearch(title);
  const [saving, setSaving] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const r = useRunner();

  const save = async (key: string, make: () => Promise<{ url: string; source: string; credit: string; creditUrl: string }>) => {
    setSaving(key);
    const ok = await r.run(async () => {
      const p = await make();
      await setPhoto(title, p.url, p.source, p.credit, p.creditUrl);
      return true;
    });
    setSaving(null);
    if (ok) onClose();
  };

  const pickResult = (res: Result) =>
    save(res.full, async () => {
      // Copy it into Fork. If the host won't let us read it, keep its address instead.
      try {
        const blob = await (await fetch(res.full)).blob();
        return { url: await store(blob), source: res.source, credit: res.credit, creditUrl: res.creditUrl };
      } catch {
        return { url: res.full, source: res.source, credit: res.credit, creditUrl: res.creditUrl };
      }
    });

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    void save("upload", async () => ({ url: await store(f), source: "upload", credit: "", creditUrl: "" }));
  };

  return (
    <Sheet
      title="Choose a photo"
      subtitle={title}
      onClose={onClose}
      actions={
        current ? (
          <>
            <Button type="button" variant="secondary" class={sheetAction} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost"
              class={`${sheetAction} text-danger hover:text-danger`}
              disabled={r.busy}
              onClick={() => void r.run(() => removePhoto(title)).then(onClose)}
            >
              Remove photo
            </Button>
          </>
        ) : undefined
      }
    >
      <div class="flex flex-col gap-5">
        <input ref={file} type="file" accept="image/*" class="hidden" onChange={(e: any) => pickFile(e.target.files?.[0])} />
        <Button type="button" size="md" class="w-full" disabled={r.busy} onClick={() => file.current?.click()}>
          <Icon name="camera" size={20} />
          {saving === "upload" ? "Saving…" : "Take or upload a photo"}
        </Button>
        <ErrorLine text={r.error} />
        <div>
          <p class="mb-2 text-[13px] font-medium text-ink-muted">Or pick one</p>
          {results === null ? (
            <div class="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} class="aspect-square animate-pulse rounded-lg bg-surface" />
              ))}
            </div>
          ) : results.length ? (
            <div class="grid grid-cols-3 gap-1.5">
              {results.map((res) => (
                <button
                  key={res.full}
                  type="button"
                  class="group relative aspect-square overflow-hidden rounded-lg bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
                  disabled={r.busy}
                  onClick={() => void pickResult(res)}
                  aria-label={`Use ${res.title || "this photo"}`}
                  title={res.credit ? `${res.title} · ${res.credit}` : res.title}
                >
                  <img src={res.thumb} alt="" loading="lazy" class="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  {saving === res.full ? <span class="absolute inset-0 flex items-center justify-center bg-black/40 text-[13px] font-medium text-white">Saving…</span> : null}
                </button>
              ))}
            </div>
          ) : (
            <p class="text-[15px] text-ink-muted">No photos found for “{title}”. Take one instead.</p>
          )}
          <p class="mt-3 text-[12px] text-ink-muted">From Wikimedia Commons and Openverse, free to use with credit.</p>
        </div>
      </div>
    </Sheet>
  );
}

/** "Add photo" / "Photo" over a meal's photo hero. Opens the picker. */
export function PhotoButton({ has, onClick }: { has: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      class="inline-flex h-10 items-center gap-1.5 rounded-full bg-black/25 px-4 text-[15px] font-medium text-white backdrop-blur-md hover:bg-black/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      data-component="PhotoButton"
    >
      <Icon name="camera" size={18} />
      {has ? "Photo" : "Add photo"}
    </button>
  );
}
