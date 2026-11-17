// Both entries (index.ts, dev.ts) list every handler by name. This throws at
// load if one was added to app.ts but not listed, so it can't ship missing.
export function assertListed(file: string, q: object, queries: object, m: object, mutations: object) {
  const missing = [
    ...Object.keys(q).filter((k) => !(k in queries)),
    ...Object.keys(m).filter((k) => !(k in mutations)),
  ];
  if (missing.length) throw new Error(`${file} is missing handlers: ${missing.join(", ")}`);
}
