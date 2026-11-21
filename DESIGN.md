---
version: alpha
name: Fork
description: Fork is a family dinner planner whose interface steps back so the food and the words carry the page. Large, edge-to-edge food photography and an editorial serif display face do the work; the chrome is white (or near-black at night), hairline-thin, and nearly colorless. Actions are solid ink pills. One accent, Basil green, appears only where something is live or decided — tonight's pick, your vote, a ticked list item. No cards around everything, no emoji as decoration, no gradients. If a screen looks busy, remove chrome before adding anything.

colors:
  # Names match the Zero runtime's Tailwind tokens (bg-canvas, text-ink, border-line, bg-accent…).
  canvas: "#ffffff"
  canvas-dark: "#111110"
  surface: "#f6f6f4"
  surface-dark: "#1b1b19"
  surface-strong: "#ecece9"
  surface-strong-dark: "#262623"
  ink: "#151514"
  ink-dark: "#f4f4f2"
  ink-muted: "#6b6b66"
  ink-muted-dark: "#a3a39d"
  line: "#e6e6e2"
  line-dark: "#2c2c29"
  action: "#151514"
  action-dark: "#f4f4f2"
  on-action: "#ffffff"
  on-action-dark: "#111110"
  accent: "#2f7a4f"
  accent-dark: "#5fb385"
  accent-soft: "#e7f2ec"
  accent-soft-dark: "#18291f"
  accent-foreground: "#ffffff"
  accent-foreground-dark: "#0d1a12"
  danger: "#b42318"
  danger-dark: "#f0786c"
  scrim: "#000000"

typography:
  display-xl:
    fontFamily: "'Geist', -apple-system, system-ui, sans-serif"
    fontSize: 64px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: -1.6px
  display-lg:
    fontFamily: "'Geist', -apple-system, system-ui, sans-serif"
    fontSize: 44px
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: -0.9px
  display-md:
    fontFamily: "'Geist', -apple-system, system-ui, sans-serif"
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: -0.5px
  title:
    fontFamily: "'Geist', -apple-system, system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.2px
  body:
    fontFamily: "'Geist', -apple-system, system-ui, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-sm:
    fontFamily: "'Geist', -apple-system, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  label:
    fontFamily: "'Geist', -apple-system, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0
  caption:
    fontFamily: "'Geist', -apple-system, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.1px
  numeral:
    fontFamily: "'Geist', -apple-system, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.2
    fontFeature: "tnum"

rounded:
  none: 0px
  sm: 8px
  md: 12px
  lg: 20px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px

components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 14px 22px
    height: 48px
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    borderColor: "{colors.line}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 13px 21px
    height: 48px
  button-text:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.label}"
  meal-hero:
    aspectRatio: "4 / 5 mobile, 16 / 9 desktop"
    rounded: "{rounded.none} mobile (full-bleed), {rounded.lg} desktop"
    titleTypography: "{typography.display-lg}"
  meal-card:
    aspectRatio: "4 / 3"
    rounded: "{rounded.md}"
    titleTypography: "{typography.title}"
    metaTypography: "{typography.body-sm}"
    gap: "{spacing.md}"
  meal-thumb:
    aspectRatio: "1 / 1"
    rounded: "{rounded.sm}"
    size: 56px
  type-tile:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.display-md}"
    rounded: "{rounded.md}"
  vote-button:
    backgroundColor: transparent
    textColor: "{colors.ink-muted}"
    borderColor: "{colors.line}"
    typography: "{typography.numeral}"
    rounded: "{rounded.full}"
    height: 36px
  vote-button-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    borderColor: "{colors.accent}"
  picked-tag:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  list-row:
    backgroundColor: transparent
    borderColor: "{colors.line}"
    typography: "{typography.body}"
    height: 52px
  list-row-done:
    textColor: "{colors.ink-muted}"
    textDecoration: line-through
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: transparent
    focusRing: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: 48px
  top-bar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    height: 56px
  tab-bar:
    backgroundColor: "{colors.canvas}"
    borderColor: "{colors.line}"
    activeColor: "{colors.ink}"
    inactiveColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
---

## Overview

Fork is a dinner planner for one household. People open it on a phone, usually in the late afternoon, to answer one question: what are we eating tonight? The interface's job is to show the answer — a big photo of the meal and its name — and then get out of the way.

The page is built from three things only: **photography**, **type**, and **whitespace**. Everything else (borders, fills, color) is used at the minimum needed to make a control legible.

- **Photos lead.** Every meal is shown as an image first. On a phone, tonight's meal is a full-bleed 4:5 photo with its name set large below it.
- **Type is the second voice.** One family, Geist, everywhere. Meal names and headings are set bold (700) and tight (about -0.04em), big enough to sit over a photo. Everything functional (buttons, lists, amounts) is Geist at regular or medium weight.
- **Chrome is nearly colorless.** White or near-black canvas, ink text, hairline rules. Primary actions are solid ink pills, not a brand color.
- **One accent, used for state.** Basil green marks what is live or decided: tonight's pick, your vote, a ticked shopping item. If green appears, it means something.
- **Cardless by default.** Sections are separated by space and a hairline, not boxes. A meal card is just a photo with a title underneath — no border, no shadow, no fill.

## Colors

### Neutrals
- **Canvas** (`{colors.canvas}` #ffffff / dark `{colors.canvas-dark}` #111110): the page. Pure white so food photography isn't tinted.
- **Surface** (`{colors.surface}` #f6f6f4 / dark #1b1b19): input fills, the shopping-list sheet, grouped settings. Never used to box content that space can separate.
- **Surface Strong** (`{colors.surface-strong}` / dark #262623): placeholder behind images while loading, and the background of a type tile.
- **Ink** (`{colors.ink}` #151514 / dark #f4f4f2): all headings and body text.
- **Ink Muted** (`{colors.ink-muted}` #6b6b66 / dark #a3a39d): meta lines (who suggested it, chef, servings), inactive tabs, done list items. Passes 4.5:1 on canvas in both themes.
- **Line** (`{colors.line}` #e6e6e2 / dark #2c2c29): 1px hairlines between list rows and sections.

### Action
- **Action** (`{colors.action}`): ink. Primary buttons are ink on white in light mode and flip to near-white on near-black in dark mode. The primary action is recognisable by being solid, not by being colored.

### Accent
- **Basil** (`{colors.accent}` #2f7a4f / dark #5fb385): the only hue in the UI. Used for the picked-meal tag, your active vote, the shopping-list check, and the "you're cooking" state. Never for headings, links, or decoration.
- **Basil Soft** (`{colors.accent-soft}`): background of an active vote pill.

### Semantic
- **Danger** (`{colors.danger}`): destructive confirmations and inline errors only.
- **Scrim** (`{colors.scrim}` at 0–55% as a bottom gradient): only where text must sit on a photo. Prefer putting text below the photo instead.

Dark mode swaps every token via `prefers-color-scheme`; surfaces are tonal near-blacks, never pure #000, and Basil is lightened so it holds 4.5:1.

## Typography

### Families
- **Geist** (Google Fonts, variable, 400–800) for everything. Headings 700 with tight tracking; no serif.
- **Geist** (Google Fonts, variable) for everything functional: buttons, labels, body, ingredient amounts, the shopping list.

### Scale
| Token | Size / line | Use |
| --- | --- | --- |
| `display-xl` | 64 / 1.0 (40 on phones) | Landing hero only |
| `display-lg` | 44 / 1.05 (34 on phones) | Tonight's meal name, page titles |
| `display-md` | 32 / 1.1 (26 on phones) | Day headings in the week, type tiles |
| `title` | 20 / 1.25 | Meal names in cards and lists |
| `body` | 17 / 1.5 | Running text, list rows |
| `body-sm` | 15 / 1.45 | Meta lines under titles |
| `label` | 15 / 1.2, 500 | Buttons, tabs, form labels |
| `caption` | 13 / 1.3, 500 | Tags, timestamps, tab-bar labels |
| `numeral` | 15, tabular | Vote counts, amounts, servings |

### Principles
- Big jumps between levels. A screen should have one display-size line and everything else at `title` or below.
- Sentence case everywhere. No all-caps eyebrows over headings.
- Amounts and counts use tabular figures so lists align.
- Lines of running text stay 45–75 characters.

## Imagery

Photography is the brand. Treat it with care.

- **Ratios:** hero 4:5 on phones, 16:9 on desktop; cards 4:3; thumbnails 1:1. Always `object-fit: cover`, always width and height set so nothing shifts.
- **Edges:** on phones the hero runs full-bleed (no radius, no side margin). Everywhere else images take `{rounded.md}`; thumbnails `{rounded.sm}`.
- **Style:** natural light, real home-cooked plates, overhead or 45°. No hands-in-frame stock clichés, no heavy props, no filters.
- **Text on images:** avoid it. Put the meal name under the photo. If text must overlay (landing hero), use a bottom scrim gradient to 55%.
- **Photos:** every meal can have one, per family: taken or uploaded on the phone, or picked from image search (Wikimedia Commons and Openverse), then copied into Fork's storage. Tonight's meal fills the top of the Week screen edge to edge with its name over it; recipe and idea pages open on the photo the same way; lists use 64px rounded thumbnails.
- **No photo yet:** a tinted tile in one of six warm food tones (picked by the meal's name, so it keeps its colour) with the name set bold. Always offer "Add photo" beside it.
- **Loading:** `{colors.surface-strong}` block at the final ratio, then fade the image in (150ms, opacity only).

## Layout

### Spacing
4px base. Tokens: `xs` 4 · `sm` 8 · `md` 12 · `base` 16 · `lg` 24 · `xl` 32 · `xxl` 48 · `section` 80.

- Between a photo and its title: `{spacing.md}`. Between title and meta: `{spacing.xs}`.
- Between sections on a screen: `{spacing.xxl}` on phones, `{spacing.section}` or more on desktop, with no rule — space alone separates.
- List rows are separated by a 1px `{colors.line}` hairline.

### Grid
One grid for every screen. Columns only exist inside the container; outside it, only full-bleed photos.

| | Phone (< 768px) | Tablet (768–1023px) | Desktop (≥ 1024px) |
| --- | --- | --- | --- |
| Columns | 4 | 12 | 12 |
| Gutter | 16px | 24px | 24px |
| Side margin | 20px | 32px | 32px |
| Container | fluid | fluid | 1200px max, centered |

Content widths, all centered inside the container:

- **Wide** — the full container (1136px of content at desktop). Landing sections, meal grids.
- **Flow** — 640px. One reading column for lists and detail screens: the week, shopping list, family, a recipe.
- **Narrow** — 440px. Forms: sign in, start a family, join.

Common spans on the 12-column grid: a photo-and-text pair is 6 + 5 with one empty column between (`col-span-6`, `col-start-8 col-span-5`); a text-and-list pair is 5 + 6 (`col-span-5`, `col-start-7 col-span-6`). On phones every span is the full 4 columns.

**Card grids** (meals, ideas, the week on the landing) use their own repeat: 2 across on phones, 3 at 768px, 4 at 1024px, with the same 16/24px gutters and 32px between rows.

In code: `container`, `grid12`, `cardGrid`, `flow`, `narrow` in `client/layout.tsx`.

### Templates
Every screen uses one of five templates (`client/layout.tsx`).

| Template | Width | Used by |
| --- | --- | --- |
| **Marketing** | Wide | Landing (`/`, signed out) |
| **Auth** | Narrow, with a photo panel on desktop | Sign in / start (`/start`), join (`/join`, `/join/:code`) |
| **App frame** | — | Wraps every signed-in screen: top bar, and the tab bar (bottom on phones, inline in the top bar on desktop) |
| **App page** | Flow or wide | Week (`/`), Meals (`/meals`, `/meals/ideas`, `/meals/ingredients`), New recipe, Shopping list (`/list`), Family (`/family`) |
| **Detail** | Flow, with an optional full-bleed hero photo | Recipe (`/recipe/:slug`), Idea (`/idea/:slug`) |

- **App page header:** optional back link, the page title in `display-lg`, an optional one-line description, actions to the right on desktop (below on phones), then an optional sub-nav of text tabs (active is ink with a 2px underline).
- **Tab bar:** Week · Meals · List · Family. 64px plus the safe area, line icons over `caption` labels.
- **Detail hero:** a photo full-bleed on phones and `{rounded.lg}` on desktop. Without a photo there is no hero and no type tile; the title carries the page.

## Component system

Built in atomic layers in `client/ui.tsx`, with templates in `client/layout.tsx`. Screens compose these; they don't style raw elements.

- **Atoms:** Button (primary, secondary, ghost, danger × md, sm), TextLink, Input, Textarea, Tag, VoteButton, CheckCircle, Thumb, Icon.
- **Molecules:** Field, SearchField, MealTile, SuggestionRow, ListRow, EmptyState, SectionHeading.
- **Organisms:** DayPlan (one day on the Week screen), AisleGroup (the shopping list).
- **Templates:** Marketing, Auth, App frame, App page, Detail.

See them all live, in light and dark side by side, at **/dev/components** on a local dev server. Testing scenarios and screenshots are in DEV.md.

## Elevation

Flat. There is one shadow, for things that float over content: sheets, menus, the sticky action bar.

- `0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08)` (dark: borders replace shadows — 1px `{colors.line}`).
- No shadow on cards, images, or buttons.

## Components

Every component comes from [shadcn/ui](https://ui.shadcn.com) (Base UI underneath), copied into `client/components/ui/` and tuned to these tokens: pill buttons, 44px tap targets, filled 48px inputs at 17px (no iOS zoom), and shadcn's neutral `accent` hover fills swapped for `muted`, because Basil only means state. `client/ui.tsx` wraps them in Fork's names (Button, Input, Select, Field, Tag, Sheet, Confirm…), and screens use those, never raw elements. To add one: `npx shadcn@latest add <name>` in a scratch project with the `base-nova` style, copy the file in, point `cn` at `../../lib/utils`, take lucide icons off its default export, and wrap it in `client/ui.tsx`. A startup style in `client/index.tsx` maps shadcn's `primary` to ink and `ring` to ink.

- **Confirm:** destructive steps (remove a recipe, make a new invite link) ask first in a shadcn AlertDialog: what happens, then Cancel and the danger action.
- **Buttons:** primary is a solid ink pill (`button-primary`), 48px tall. Secondary is a hairline pill. Tertiary is text only. One primary per screen.
- **Sheet:** every focused task (suggest a meal, edit ingredients, plan for a day, add or edit an ingredient, paste a list) opens in a sheet, never inline in a list. shadcn Drawer on phones (drag down to dismiss, 20px top corners, swipe handle, safe-area padding), shadcn Dialog from 768px, 520px wide. Title in display type with the day under it, labelled fields, then Cancel (secondary) and one primary, full width side by side on phones. Esc, the scrim, or Cancel closes it.
- **Meal hero:** full-bleed photo, then the meal name in `display-lg`, then one meta line ("Sam is cooking · 3 votes"), then the primary action.
- **Meal card:** photo (4:3) + `title` + one `body-sm` meta line. No border, no fill, no shadow. The whole card is the tap target.
- **Vote button:** hairline pill with a tabular count. Active state fills Basil Soft with a Basil border and text.
- **Picked tag:** small solid Basil pill reading "Picked" over the top-left corner of a meal image. The only colored element allowed on a photo.
- **Shopping list row:** 52px row, circular check on the left, item name, amount right-aligned in `numeral`. Done rows go muted with a strike-through and sink to the bottom of their aisle group. Aisle headings use `caption` in ink-muted, sentence case.
- **Inputs:** filled `{colors.surface}`, no border, 48px, `{rounded.md}`. Focus shows a 2px ink ring. Labels sit above, visible, in `label`.
- **Tab bar:** text labels with simple line icons (1.5px stroke), active is ink, inactive is ink-muted. No pill highlight.
- **Empty states:** one `display-md` line saying what's missing and one button that fixes it. No illustration.

## Motion

- 150–200ms ease-out on opacity and transform only.
- One moment of delight allowed: when a meal is picked, its tag scales in from 0.9.
- Honor `prefers-reduced-motion`: all transitions become instant.

## Voice

- Plain, warm, short. "What's for dinner tonight?" not "Unlock effortless meal planning."
- Name people: "Sam is cooking", "Maya suggested this".
- Buttons say what happens: "Pick this", "I'll cook", "Add to list".
- No emoji in UI copy or as icons.

## Do's and Don'ts

**Do**
- Lead every meal with its photo or a type tile.
- Let one thing per screen be big.
- Separate with space first, a hairline second, a fill last.
- Keep color for state: if it's green, it's picked, voted, or done.

**Don't**
- Wrap content in cards, or cards in cards.
- Use emoji as icons or bullets (the current 🌮 🗳️ 👩‍🍳 go).
- Add gradients, glass, blur, glows, or grain.
- Use the accent for links, headings, or decoration.
- Put chips everywhere — tags show at most two per meal.
- Center body text or set headings in all caps.

## Responsive Behavior

- Mobile-first. Breakpoints: 768px (tablet, grid goes to 12 columns), 1024px (desktop, tab bar moves into the top bar).
- No horizontal scroll at 320px. Display sizes use `clamp()` between the phone and desktop values in the scale.
- Touch targets at least 44px.
- The bottom tab bar becomes a top nav at 1024px; the pinned action bar becomes an inline button.

## Implementation Notes

- Fork runs on Spacefast Zero, which ships Tailwind v4 with semantic tokens: `canvas`, `surface`, `ink`, `ink-muted`, `line`, `accent`, `accent-foreground`, `danger`. Color names above match those on purpose.
- **Tokens live in `theme.json`** at the project root (WordPress theme.json v3). Zero turns each palette slug into a Tailwind color (`bg-canvas`, `text-ink-muted`, `bg-action`…) and each font family slug into a font utility (`font-sans`, `font-display`). Every color is `light-dark(light, dark)`, so light and dark mode follow the system with no extra classes.
- **Fonts** load from Google Fonts (`Newsreader:opsz,wght@6..72,400..600`, `Geist:wght@400..600`). Zero has no stylesheet hook, so `client/index.tsx` adds the `<link>` once at startup.
- Zero rejects custom CSS, `@plugin` and `@config`; `theme.json` plus utility classes are the whole styling surface.

## Known Gaps

- **There are no photos for recipes yet.** Recipes in `shared/recipes.ts` have no image field. The landing page uses hand-picked Unsplash photos (hotlinked, credited in the footer). Inside the app, picking a photo source (family uploads, a licensed library, or generated images) is still open.
- Fonts arrive after first paint (swap), so headings briefly render in Georgia.
