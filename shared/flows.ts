// Click-through flows for screenshots and review. Each step does one thing,
// then (if it has a `shot`) takes a screenshot. tools/shoot.mjs re-seeds
// before every flow, so each starts from the devSeed world. See DEV.md.

export type FlowStep = {
  /** Name of the screenshot taken after this step. Omit to not take one. */
  shot?: string;
  go?: string;
  click?: { role?: "button" | "link"; name?: string; exact?: boolean; css?: string; nth?: number };
  fill?: { placeholder: string; value: string };
  /** Wait until the URL path is this before shooting. */
  waitPath?: string;
};

export type Flow = {
  id: string;
  title: string;
  persona: string | null;
  description: string;
  steps: FlowStep[];
};

export const FLOWS: Flow[] = [
  {
    id: "start-family",
    title: "Start a family",
    persona: "nina",
    description: "Nina names her family and gets an invite link.",
    steps: [
      { go: "/start", shot: "Empty form" },
      { fill: { placeholder: "Family name, like The Andrews", value: "The Nguyens" }, shot: "Name filled in" },
      { click: { role: "button", name: "Start family", exact: true }, waitPath: "/family", shot: "Family created" },
      { go: "/", shot: "First week" },
    ],
  },
  {
    id: "join-invite",
    title: "Join with an invite",
    persona: "ivy",
    description: "Ivy opens the Andrews' invite link and joins.",
    steps: [
      { go: "/join/andrews", shot: "Invite" },
      { click: { role: "button", name: "Join family", exact: true }, waitPath: "/", shot: "Joined: the week" },
      { go: "/family", shot: "Family" },
    ],
  },
  {
    id: "plan-tonight",
    title: "Change tonight's pick",
    persona: "maya",
    description: "Maya picks pizza instead, then checks the shopping list.",
    steps: [
      { go: "/", shot: "The week" },
      { click: { role: "button", name: "Open tonight", exact: false, nth: 0 }, shot: "Tonight's ideas" },
      { click: { role: "button", name: "Homemade pizza night", exact: false, nth: 0 }, shot: "Pizza opened" },
      { click: { role: "button", name: "Pick for tonight", exact: true, nth: 0 }, shot: "Picked pizza" },
      { go: "/list", shot: "List updated" },
      { click: { css: "[data-component=ListRow] button", nth: 0 }, shot: "Ticked an item" },
    ],
  },
];
