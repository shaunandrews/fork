// Local test scenarios: who is looking, and which screens to check.
// Used by the /dev page and by tools/shoot.mjs. Data comes from devSeed in
// server/dev.ts; keep the two in step. See DEV.md.

export type Screen = { name: string; path: string };
export type Scenario = {
  id: string;
  title: string;
  /** Dev guest name (guest:<persona>), or null for a signed-out visitor. */
  persona: string | null;
  description: string;
  screens: Screen[];
};

const familyScreens: Screen[] = [
  { name: "week", path: "/" },
  { name: "recipes", path: "/meals" },
  { name: "ideas", path: "/meals/ideas" },
  { name: "ingredients", path: "/meals/ingredients" },
  { name: "list", path: "/list" },
  { name: "family", path: "/family" },
];

export const SCENARIOS: Scenario[] = [
  {
    id: "visitor",
    title: "New visitor",
    persona: null,
    description: "Signed out. Sees the landing page, sign-up, and the join screens.",
    screens: [
      { name: "landing", path: "/" },
      { name: "start", path: "/start" },
      { name: "join", path: "/join" },
      { name: "invite-link", path: "/join/andrews" },
    ],
  },
  {
    id: "newcomer",
    title: "Just signed up",
    persona: "nina",
    description: "Nina has an account but no family yet. Home sends her straight to starting one.",
    screens: [{ name: "start-family", path: "/start" }],
  },
  {
    id: "invited",
    title: "Has an invite",
    persona: "ivy",
    description: "Ivy opened the Andrews' invite link.",
    screens: [{ name: "join-andrews", path: "/join/andrews" }],
  },
  {
    id: "new-family",
    title: "Brand-new family",
    persona: "olive",
    description: "Olive just started The Parks. Nothing planned yet, so every empty state shows.",
    screens: familyScreens,
  },
  {
    id: "established",
    title: "Established family",
    persona: "sam",
    description: "Sam started The Andrews (4 people). Tonight is picked, the week is half planned, the list is going.",
    screens: [
      ...familyScreens,
      { name: "recipe", path: "/recipe/grandma-s-lasagna" },
      { name: "recipe-picked", path: "/recipe/spaghetti-bolognese" },
      { name: "idea", path: "/idea/sheet-pan-chicken-fajitas" },
      { name: "new-recipe", path: "/meals/new" },
    ],
  },
  {
    id: "member",
    title: "Family member",
    persona: "maya",
    description: "Maya joined The Andrews. Same family as Sam, seen by someone who didn't start it.",
    screens: [
      { name: "week", path: "/" },
      { name: "list", path: "/list" },
      { name: "family", path: "/family" },
    ],
  },
];

/** Direct link to a screen as a scenario's persona. */
export function scenarioUrl(s: Scenario, path: string): string {
  return s.persona ? `${path}${path.includes("?") ? "&" : "?"}guest=${s.persona}` : path;
}

/** Link via /dev/go, which re-seeds if the dev server lost its data, then opens the screen. */
export function goUrl(s: Scenario, path: string): string {
  return `/dev/go?s=${encodeURIComponent(s.id)}&p=${encodeURIComponent(path)}`;
}
