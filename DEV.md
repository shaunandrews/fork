# Local development

## Run the app

```bash
sf dev --state-backend sqlite --watch
```

Open the private URL it prints. This is the app exactly as deployed: sign-in is required, so on a local server you'll only see the signed-out screens.

## Scenario mode: test as anyone

```bash
FORK_SCENARIOS=1 sf dev --watch
```

Open the private URL, then go to **/dev**:

1. **Reset and seed** wipes local data and builds a known world: the Andrews (Sam, Maya, Leo, Alex) with tonight picked, a half-planned week, a family recipe and a shopping list in progress; the Parks (just Olive, nothing planned).
2. Each scenario links to its screens, signed in as that persona for that tab (`?guest=sam`). Links go through `/dev/go`, which re-seeds first if the data is gone: scenario mode keeps data in memory, and `--watch` wipes it on every file save.

| Scenario | Persona | What it covers |
| --- | --- | --- |
| New visitor | signed out | landing, sign-up, join screens |
| Just signed up | Nina | signed in, no family |
| Has an invite | Ivy | the Andrews' invite link |
| Brand-new family | Olive | every empty state |
| Established family | Sam (owner) | every screen with real data |
| Family member | Maya | the same family, not the owner |

Scenarios live in `shared/scenarios.ts`; their data comes from `devSeed` in `server/dev.ts`. Add a screen or persona in both.

## Screenshots

```bash
node tools/shoot.mjs
```

Starts its own scenario server on port 4190, seeds it, and screenshots every scenario × screen on phone (390px) and desktop (1440px), light and dark. Open `screenshots/latest/index.html` for a contact sheet. Narrow it down:

```bash
node tools/shoot.mjs established member --phone --dark
```

Needs Playwright, found in this project or in `~/.cache/pr-screenshots`. Chromium runs with software WebGL (SwiftShader) so the 3D magnets render; resin renders are slow there, so a magnet may still show its flat photo in a shot.

## On your phone

```bash
sh tools/phone.sh
```

Scenario mode on port 4192 plus a relay on 4193, reachable at `http://<this-mac>.local:4193/dev` on home Wi-Fi or the Mac's Tailscale name.

## Flows

Click-through sequences in `shared/flows.ts`, screenshotted step by step on every run: start a family (Nina), join with an invite (Ivy), change tonight's pick (Maya). Each flow starts from a fresh seed. A step can `go` to a path, `click` a button/link by name (or a CSS selector), `fill` an input by placeholder, wait for a path, and take a `shot`.

## Review and feedback

```bash
node tools/review.mjs
```

Opens http://127.0.0.1:4300 with the latest screenshots: every screen and flow step, on phone or desktop, light or dark, one at a time or all four variants side by side (**Compare**).

- **Hover** a screenshot to see the element under the pointer and the component it belongs to (`SuggestionRow`, `Button`…).
- **Click** to pin a comment on that element. **Drag** to comment on an area. Hold **Alt** to pin a plain point. **⌘↵** saves.
- Comments show as numbered pins, with a list on the right. Resolve, reopen, reply, or delete them there.

Everything is saved in `review/` (not committed):

- `review/FEEDBACK.md`: every comment with the screen, the persona, the component and selector it points at, and the text. This is what Claude reads.
- `review/crops/<id>.png`: the spot, cut from the screenshot and marked.
- `review/comments.json`: the data.

Claude answers from the command line, and the review app shows the reply:

```bash
node tools/review.mjs list
node tools/review.mjs resolve c3 "Moved the tag under the title"
```

After fixes, run `node tools/shoot.mjs` again; comments stay on their screens so you can check the new shot.

## How scenario mode stays out of production

- `spacefast.config.ts` points the server at `server/dev.ts` only when `FORK_SCENARIOS=1` **and** the command is `sf dev`. Anything else (build, publish, git deploys) uses `sf.jsonc` and `server/index.ts`.
- `server/index.ts` requires sign-in. Only `server/dev.ts` turns on named dev guests and adds `devSeed`.
- In the client, `useUser()` counts a guest as signed in only when the server reports sign-in isn't required, which never happens in production.

## Server layout

- `server/app.ts`: every query and mutation.
- `server/index.ts`: the production entry. Spacefast reads the schema and handler names from this file's source, so both are written out here.
- `server/dev.ts`: the scenario entry. Same handler list, a copy of the schema (it refuses to start if the copy drifts), plus `devSeed`.

Adding a handler: write it in `app.ts`, then list it in both entries. Either entry throws at startup if one is missing.

## On your phone (home network or Tailscale)

```bash
tools/phone.sh
```

Starts the scenario server and `tools/lan-proxy.mjs`, then prints the address: `http://<this-mac>.local:4193/dev` on home Wi-Fi, or the Mac's Tailscale name on port 4193 from anywhere. No one-time link: the proxy signs every request in with the dev server's key and rewrites Host, Origin and the realtime URL so the server treats the phone like localhost. Anyone on the home network or Tailscale can open it while it runs.
