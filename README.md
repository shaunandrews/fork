# Fork

A family meal planner on Spacefast (Zero runtime), live at https://fork.space.fast.

- Start a family and invite everyone with a link or a QR code (Family tab).
- Each day: suggest meals, vote, and tap "I'll cook" to be the chef.
- Plan ahead: fill empty days with ideas from a built-in recipe library (and your family's past picks).
- Pick a meal for a day and its ingredients land on one shared shopping list: amounts combined, grouped by aisle, ticked off live.

The look is a fridge door with real 3D magnets on it: letter magnets for the nav, resin magnets for every meal photo. DESIGN.md → Fridge explains it.

## Where things are

| Path | What |
| --- | --- |
| `server/index.ts`, `server/app.ts` | Schema, queries and mutations (`index.ts` lists them; `app.ts` has the handlers) |
| `server/dev.ts` | Scenario mode: named test people and seed data (DEV.md) |
| `client/index.tsx` | Most screens: landing, start/join, Week, List, Family |
| `client/meals.tsx` | Meals: recipes, ideas, ingredients, recipe and idea pages |
| `client/tabs-app.tsx` | Week, Meals, List and Family as one page (all four tab routes export it) |
| `client/layout.tsx` | Grid, templates (Marketing, Auth, AppFrame, AppPage, Detail), `PhotoHero`, the tab swipe |
| `client/ui.tsx` | Fork's components on top of shadcn/ui (`client/components/ui/`) |
| `client/fridge/` | The 3D: `kit.ts` (light rig, letters, scenes), `tabs.ts` (magnet nav), `splash.ts` (loading), `resin.ts` (resin magnets), `ui.tsx` (Preact pieces) |
| `client/photos.tsx` | Meal photos: upload or search, stored per family |
| `shared/` | Ingredient parsing, list merging, dates, ideas, scenarios |
| `pages/` | One file per URL |
| `tools/` | `shoot.mjs` screenshots, `review.mjs` review app, `phone.sh` dev server for the phone |

## Working on it

DEV.md covers running it locally, scenario mode and screenshots. Publish every change to production:

```bash
sf publish --space fork --target production --wait -y
```
