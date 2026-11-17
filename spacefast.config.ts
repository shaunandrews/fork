// Spacefast reads this before sf.jsonc. It is sf.jsonc, plus one local switch:
// `FORK_SCENARIOS=1 sf dev` runs server/dev.ts (named dev guests + seed data)
// instead of server/index.ts. Any other command (build, publish) or a run
// without the variable gets sf.jsonc unchanged. See DEV.md.
import { readFileSync } from "node:fs";
import { defineConfig } from "spacefast/config";

const base = JSON.parse(readFileSync(new URL("./sf.jsonc", import.meta.url), "utf8"));
const scenarios = process.env.FORK_SCENARIOS === "1" && process.argv[2] === "dev";

export default defineConfig(scenarios ? { ...base, runtime: { ...base.runtime, server: "server/dev.ts" } } : base);
