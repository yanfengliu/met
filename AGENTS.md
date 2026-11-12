# AGENTS.md — met

## What this is

A procedural three.js reconstruction of The Metropolitan Museum of Art's Fifth Avenue building in New York, outside and inside. The model is assembled from an ordered list of build steps, grouped in the chapters of the building's history, and the page shows the finished building; the owner removed the animated build replay (2026-11-11: "I don't need the animation of how the building came into being").

Non-goals: no imported meshes, scans or photo textures; no runtime network assets; no gallery-by-gallery interior (the major public spaces only). Artworks are procedural placeholders of real objects on view, built from The Met's CC0 collection data, which a script fetches by hand and never at runtime (owner, 2026-10-25); colours sampled from a public-domain object's image are data, not a photo texture.

Stack: Vite + TypeScript (strict) + Vitest + three.js, Playwright for capture and control tests. Node 24 (`.nvmrc`).

Read the section map at the top of `docs/design/spec.md` before substantial work, then the sections the work needs: it is the contract for the world frame, the build-step API and the page. Repo-specific rules: `docs/policies/local-rules.md`. Research and reference images: `docs/research/`.

<!-- FLEET-CANON:BEGIN sha=fa6416c07600 generated from ../fleet/FLEET.md by `npm run sync-canon` — do not edit inside this block; this repo's own rules go in docs/policies/local-rules.md -->
## Fleet constitution

Shared rules for every repo under `github/`, kept in `../fleet/FLEET.md`; `../fleet/` is fleet's checkout beside this repo's primary checkout. Where a rule gives its reason, use the reason to judge cases the rule does not name; each `[Rn]`'s history is in `../fleet/docs/canon-rationale.md`. This repo's `docs/policies/local-rules.md` may add rules but cannot change these permissions or limits. [R13]

The main agent owns delivery and may implement directly. Use subagents when bounded, independent work or independent judgment materially improves speed or quality; keep small or tightly coupled work with one agent (owner directive, 2026-11-07). [R2, R3]

The designated coordinator reads `../fleet/docs/skills/coordinator.md` before planning and after each compaction, and any agent reads that file's "Delegate" section before delegating. Before these kinds of work, read the matching section of `../fleet/docs/work-rules.md`: standing loops and unattended runs; editing skills, agent instructions or rules; handing off or stopping mid-task.

### Permissions

- Commit, merge to main and push without asking. Force-pushing and rewriting history (they destroy history), and deploying and publishing (they reach other people), need the owner's OK. [R14]
- Ask before a major architecture or product change, a new major dependency, a change to a persistent format or a security boundary, or any other consequential action outside this machine, such as posting or sending something. [R8]
- Change fleet rules (FLEET.md, fleet skills and runbooks, agent memory) or add a rule to a repo's `docs/policies/local-rules.md` only when the owner asks, because the owner sets policy. You may add a proposal with its evidence to `../fleet/canon-candidates.md`, but not edit its entries. [R8]

### Sharing the machine

- Other Claude and Codex sessions may be working in this checkout, and you cannot see them. Do anything beyond a quick read in your own worktree, because two sessions in one tree spoil each other's gates and commits. Never revert, overwrite or delete changes you did not make. When resuming, check which worktrees, branches and files already exist. [R7]
- Done means merged to main and pushed: the owner archives sessions, and work left on a branch is lost. Merge on your branch, get the gates passing there, then move main, because other worktrees build on local main. Judge the merged result itself, not a worker's summary. Then remove your worktree and branch, and report where any unmerged work is. [R14]

### Doing the work

- The repo's gates must pass on the tree that is handed back or reaches main. Unless the repo's own rules ask more of a commit, commit on your own branch at every stopping point and say in the message what was not checked, because a session can end without warning. Docs-only changes need content checks and any gate the repo names for docs, not runtime tests or CI waits. [R14]
- Check the thing that should have changed (the file, the page, the number), not just the exit code or a tool's report: both can pass over a defect. Retest a blocker you inherit before repeating it. Never weaken a test or hide a failure to get green. [R9]
- Look at visual and interactive work rendered at full resolution, through the real controls, from fixed and random views, because passing tests say nothing about pixels. Run it headless unless a visible window is needed. [R16]
- Slowness on the critical path, such as a gate rendering on the CPU of a machine with a GPU, is a defect to fix. [R22]
- After pushing code, follow CI to the end; read a failed job's steps before blaming the code, since a billing limit fails jobs before any step runs. [R15]
- If a fix fails twice for one reason, rethink it. After five real repair attempts at one problem, whatever the approach and counting earlier sessions, stop and report, unless the owner set another limit; for a problem that keeps winning, run the search in `../fleet/docs/skills/hard-problem.md`. Stop when the task's criteria are met; do not invent follow-up work. [R11]
- For substantial or high-risk changes, use independent review when available. High-risk includes persistence and migrations, security and auth, concurrency, money, supply chain, and code changes in another repo. Review the exact revision against the task's criteria, and say so when review was unavailable. Fix the findings that matter and have those fixes checked; note minor ones instead of starting another round. `../fleet/docs/skills/multi-cli-review.md` provides the review mechanics. [R10]
- A defect the owner reports gets a test for its whole class and an entry in `docs/learning/defect-register.md`, because a fix without a check tends to come back. [R17]
- Sessions run long: take new requests in the same session, and never hand off to a new session to shed context. Split work expected to need more than about 200k tokens of context into milestones, each merged to main. [R6]

### Records, sized to the work

- Read `docs/learning/lessons.md` at session start; it lists this repo's known traps, and its header says how to add one. [R18]
- Every change that alters behaviour adds a dated line to `docs/devlog/summary.md` (`../fleet/docs/devlog-template.md`) when it lands, because later sessions orient from its newest entries. Work that spans sessions, has several agents writing, or gets an independent review also keeps its plan and review records in `docs/work/` (`../fleet/docs/work-docs.md`); other work needs none. [R24]
- Raw output (logs, captures, screenshots) stays in ignored folders. Never commit a binary over 512 KiB or any file over 1 MiB; LFS needs the owner's OK. [R23]

### Style and environment

- Plain words; one line per paragraph, no hard wrapping. A report says what changed, how it was checked (including any check skipped or failed) and what is not done. [R25]
- Node 24 is the baseline. Products pin the model IDs they call in their own repo, and nowhere else. Reviewer model pins live only in `../fleet/docs/skills/multi-cli-review.md`. Runtime model calls are allowed and paid for; make per-item calls one-shot, not agent sessions. [R28, R29]
<!-- FLEET-CANON:END -->

## Gates

Node 24 (`.nvmrc`), npm, Vite, strict TypeScript, Vitest, ESLint and Playwright on the installed system Chrome (no browser download).

Each gate below is one line on what it checks. Read more when the work reaches it: a gate's bounds and reproducing inputs in its test file's header, its red proofs there or in [gate-proofs.md](docs/learning/gate-proofs.md), the behaviour it holds in [spec.md](docs/design/spec.md), its findings in its work unit's reviews (`docs/work/`).

`npm run verify` is the gate for a tree that is handed back or lands: the five commands below, in this order. It checks behaviour, and passes or fails the same whatever else the machine is doing: each timing budget in it is measured and printed, not asserted.

- `npm test`: Vitest over `src/**/*.test.ts` and `scripts/**/*.test.ts`, including `src/repo-conventions.test.ts`, which fails on a file over 500 lines under `src/`, `scripts/` or `tests/`, on an `import.meta.env` or `process.env` read under `src/`, and on an AGENTS.md over 30,000 bytes with CRLF line endings. Every test has 60 s (`vitest.config.ts`). Off GitHub's runner (`CI` not `true`), a passed test that takes over a sixth of its timeout is printed, and fails the run under `npm run budgets`; one whose time or timeout Vitest does not give fails it always (`scripts/test-headroom.ts`, whose header says why).
- `npm run typecheck`: `tsc --noEmit`, strict plus `noUncheckedIndexedAccess`, over `src/`, `scripts/`, `tests/` and the root configs.
- `npm run lint`: ESLint with typescript-eslint strict type-checked rules, `--max-warnings 0`.
- `npm run build`: `tsc --noEmit && vite build`, the two-page site (`index.html`, `parts.html`) into `dist/`.
- `npm run test:e2e`: Playwright (`tests/e2e/`) against a dev server it starts: the specs below, most of them through real input. On Windows its Chrome runs in a separate, non-interactive window station, where its pointer lock cannot confine or move the owner's cursor, and the workers connect to it (`tests/e2e/global-setup.ts`, `scripts/window-station.ts`). A headed run, `PWDEBUG`'s inspector or `MET_E2E_DESKTOP=1` keeps it on the desktop, where the lock confines and moves the cursor; `MET_E2E_DESKTOP=1` needs the owner's agreement and fails `cursor.spec`. The setup decides once, so a browser to be shown needs `--headed` when the run starts.

`npm run budgets` is the gate for the timing budgets (`scripts/budgets.ts`): with `MET_BUDGETS=1` it runs `npm test`, whose headroom check then fails the run, and `npm run test:e2e -- --grep @budget`, the e2e tests that hold a budget, which then fail on one: the 4 s build, the collision's 2 s, the walking frame, a door's swing, the walk through two door cycles and the render through the open doorway (docs/design/spec.md, Budgets; a test that holds one is tagged `@budget`, or `tests/e2e/helpers.ts` `budgetCheck` fails it). Run it through the gate lock, with nothing else heavy running, before landing a change that can alter what a frame, the build or a test costs (rendering, the walk, the model's pieces, the build engine, a new or slower test); a landing that cannot (documents, the catalogue's text, a script the page never runs) says so in its record instead.

The e2e specs:

- `smoke.spec`: both pages load, draw one canvas, reach `window.__shotReady` and log no console error; without WebGL 2 the page says so; `parts.html` falls back to three-quarter for an inherited `view=` name.
- `menus.spec`, `layout.spec`: every preset through the View menu settling on its camera and changing the canvas, and the cut toggle and slider by mouse; the control inventory at 1280×720 and 390×844, the walk strip at the bottom right and the open View menu above it; the build replay gone for good: the default page and the old links (`t=0`, `step=1`, `replay=1`, `autoplay=1`) the same finished building with none of its controls or facts, still without input, and its old keys changing nothing; the 4 s build budget from navigation to ready.
- `camera.spec`: a preset lands and stays, chosen after a drag or in walk mode; a drag leaves no preset in view; a fit preset is fitted again after a resize, framing the whole canvas; an unknown `view=` starts as if none were named; every fact of `window.__met` frozen, deep and through getters.
- `walk.spec`: the orbit view's movement keys; the Walk toggle, F and the spawns, each locking the pointer, and F and Esc leaving; holding W up the front steps; a free pointer's drag look and the click that asks for the lock; a key pressed in the same frame as F; the walking frame budget.
- `mouse-look.spec`: the locked mouse turning the view with no button held, a menu closing as the pointer locks, the pointer free after `walk=1` until a click, Esc leaving walk mode locked or free and after an open menu, the lock lost leaving, and a tap and a finger's drag asking for no lock, the drag also under the mouse's lock; in `npm test`, `src/walk/walk-lock.test.ts` holds the lock's rules on a stand-in page.
- `walk-screen.spec`: the walking screen at both sizes, the browser giving no lock (`noPointerLock`), since a locked pointer reaches no control: the crosshair at the centre of the whole canvas, the View button and the walk strip's Walk toggle, alone there in either mode, the floor picker hidden, every control inside the viewport, the hint gone at the first step, and the toggle leaving and F entering again.
- `stairs.spec`: on the front steps and the Grand Staircase every frame is drawn from the walker's eye, which never drops climbing or rises descending and rests 1.6 m over the floor; in `npm test`, `src/walk/stairs.test.ts` holds the same at 30, 60 and 144 frames a second.
- `routes.spec`: one short real-key walk through the closed middle door, down a Grand Staircase flight and up to the Triumph's card, and fixed places on routes R1 to R7 set by `spawn=x,y,z,tx,ty,tz` (`src/walk/spawns.test.ts`): both doors used by E, R5's doorway, the landing, the Dendur forecourt, flight, rail and pool, two artworks' cards; in `npm test`, `src/model/hunt/routes.test.ts` walks the routes headless and `src/model/roche-north/walk.test.ts` leaves no trap at Dendur.
- `zoom.spec`: every wheel notch moves along the ray under the pointer until 0.5 m before the surface or the camera floor, and back out again: the gate for "camera input stops responding at a limit" (`docs/learning/defect-register.md`).
- `floors.spec`: the floor picker by mouse and Page Up and Page Down: each floor's cut, landscape and framing, All, the cut by hand, walk mode, `floor=`, and the cut colour across stairs and none on a roof.
- `network.spec`: the pages ask nothing of any host but their own, nothing of metmuseum.org and nothing under `/research/`.
- `labels.spec`, `labels-view.spec`: an artwork's card in walk mode and on a click in the orbit view, its fields and link, its place at both sizes, what hides it, and with the pointer locked its hint and place and Esc, held or not, keeping it for its link; in `labels.spec`'s last block the fit-out pieces Diana and the Temple of Dendur, walking and clicked, and the temple's card under a cut, dragged by the slider, that leaves its gate alone drawn.
- `doors.spec`, `door-look.spec`: at fixed places set by `spawn=x,y,z,tx,ty,tz`, a door's prompt, E and the locked click, the prompt's band, a swing's frame budget, and the prompt between a pair's leaves; `doors=` in the first frame.
- `mixed-pointers.spec`: a finger joining a mouse drag, and a mouse joining a finger's drag that lifts first, through the browser's own mouse and touch, throw nothing and turn the view as the pointer that holds the camera alone does.
- `cursor.spec`: on Windows a pointer lock in the e2e browser leaves the system cursor free: while the page holds the lock, the cursor's clip, read from the worker on the desktop, is the whole screen; in `npm test`, `scripts/window-station.test.ts` holds the launcher's quoting, a run through it, and the browser server ending with its input, its temporary folder removed.

The unit gates, in `npm test`:

- Engine: each step's pieces in its meshes at their matrices in the order added, the timeline built again byte for byte, its bounds, batching, lights and the light cap (`src/build/timeline.test.ts`); the integrity, composition and budgets of what `src/build/sequence.ts` exports, each step's `year` in its chapter's `years` and every step array an area module's `index.ts` exports reaching `COMPOSITION` (`src/build/sequence.test.ts`); a window or door part's roles placed together (`src/build/window-parts.test.ts`).
- Reachability (`src/model/reach.test.ts`): from the Great Hall spawn the real walker reaches every space with artworks and looks at each artwork, and reaches every interior preset, spawn and route end; `src/walk/reach.test.ts` checks the fill on fixtures.
- Doors: the door unit's leaves and swing (`src/model/lib/door.test.ts`), each swing clear of the finished model (`src/model/door-fit.test.ts`), the leaves against the walker (`src/walk/door-world.test.ts`, `src/walk/door-settle.test.ts`), Weston's door (`src/model/core/weston-door.test.ts`), the door layer (`src/viewer/doors.test.ts`), the real doors' tags, budget, locks and look targets (`src/model/doors.test.ts`) and `doors=` and its warning (`src/viewer/query.test.ts`).
- Piece tags and the hit query: tags kept with their instances (`src/build/tags.test.ts`), what a ray meets (`src/viewer/pick.test.ts`), the look target's reach (`src/walk/look.test.ts`) and its hook (`src/walk/walk-mode.test.ts`).
- Labels: the 94 placeholders' tags (`src/model/collection/artwork-tags.test.ts`), each artwork the look target and the click's answer (`src/model/collection/labels.test.ts`), the card's text (`src/ui/art-card.test.ts`), its show and hide rules (`src/viewer/art-label.test.ts`), and a click told from a drag on the real camera rig (`src/viewer/click.test.ts`, `src/viewer/click-random.test.ts`).
- Fit-out pieces of the collection (the Temple of Dendur and its gate, Diana, the loggia from Laurelton Hall, the choir screen from Valladolid): the catalogue's 94 placeholders and 4 fit-out records counted apart (`src/model/collection/catalogue.test.ts`), the script's fit-out records and its run that keeps the committed placeholders (`scripts/met-catalogue-fit-out.test.ts`), each part's tags on the real steps, splitting no mesh (`src/model/collection/fit-out.test.ts`), each part the look target from the floor before it and a click's answer, with its card's text (`src/model/collection/fit-out-labels.test.ts`), each part walked to and looked at (`src/model/reach.test.ts`), and a clicked artwork's card kept while the camera draws any piece of it, in whichever steps build them: the temple's under a cut that leaves its gate (`src/viewer/art-pieces.test.ts`, `src/model/collection/fit-out-card.test.ts`).
- Pointer input: one kind of pointer holds the orbit view's camera, by the arbiter alone (`src/viewer/pointer-arbiter.test.ts`), on the real rig over a table of mixed sequences with the click and without (`src/viewer/mixed-pointers.test.ts`), and over seeded random mixed input (`src/viewer/click-random.test.ts`).
- The cut and floors: only the building is cut and the cap pass draws what the cut passes through (`src/viewer/section-cut.test.ts`, `src/viewer/cap-pass.test.ts`); the floors' levels and cuts (`src/viewer/floors.test.ts`), the floor view's landscape filter (`src/viewer/floor-view.test.ts`) and the user's own cut kept and given back (`src/viewer/floor-mode.test.ts`).
- Closed solids (`src/model/closure.test.ts`): every piece of the finished model the walk collides with or the cut caps, and each door's leaves apart, is closed along vertical lines or a declared sheet, read five ways; the readings and builders have their own tests (`src/model/lib/{check,facing,column,dome,core,wall}.test.ts`, `src/walk/crossings.test.ts`, `src/model/{core/core,hunt/hunt,mmw/mmw}.test.ts`).
- Walk mode: the walker on fixtures (`src/walk/walker.test.ts`), its place checked against a world built again with more steps, a floor's joint and the rims it stands on (`src/walk/settle.test.ts`), the zoom (`src/viewer/zoom.test.ts`), the camera floor (`src/viewer/camera-floor.test.ts`) and the orbit keys (`src/viewer/orbit-keys.test.ts`).
- Query: the parameters the page reads, their warnings, and none of the build replay's old ones read (`src/viewer/query.test.ts`).
- Collection: the catalogue read offline (`src/model/collection/catalogue.test.ts`) and the script that writes it (`scripts/met-catalogue.test.ts`), the forms (`src/model/collection/kinds.test.ts`), and every artwork placed on its floor or wall, clear of the routes, passages and doors, within budget (`src/model/collection/placement.test.ts`).
- Choir screen: the walker through the Valladolid screen's open gate, on the hall's axis too (`src/model/core/choir-gate.test.ts`), and the screen one group standing on the floor (`src/model/core/choir-connected.test.ts`).
- Petrie Court: the court wall's nine doorways and four round columns symmetric about Weston's door, nothing else standing in the doorways and the wall solid between them (`src/model/roche-south/roche-south.test.ts`), and the walker through both bays of each columned doorway, both ways: the café's and the first, seventh and eighth doors' (`src/model/roche-south/court-bays.test.ts`).
- Cited photographs (`src/cited-images.test.ts`): a file under `src/model/` cites `docs/research/interior-images.md` or `exterior-images.md` entries by ID, each marked viewed.
- Also unit-tested: the framing maths `fitBox` and `resolvePreset`, the facts' detached frozen `snapshot`, the WebGL 2 failure message, the parts gallery's `view=` names, and capture's `--solo` check, delete guard and benchmark query through the real run with recorders in place of the disk, git, Vite and the browser (`scripts/capture.test.ts`).

Capture (not part of `verify`; run before a visual handoff and read every image at native resolution): `MET_PORT=<port> npm run shots` writes the standard set to `.shots/shots/` and prints the revision, dirty flag, GPU, build, ready and frame times; `npm run sweep -- [--count 12] [--seed <n>] [--solo <chapter>]` writes seeded random cameras to `.shots/sweep-<seed>/` and prints the seed. Both start and stop their own Vite server on `MET_PORT` and drive the system Chrome.

Catalogue (not part of `verify`, never in CI; run by hand when the picks change): `npm run met-catalogue` regenerates `src/model/collection/catalogue.ts` from `src/model/collection/picks.ts` through The Met's Collection API, all or nothing; `npm run met-catalogue -- --fit-out` regenerates the fit-out pieces' records alone and keeps every placeholder's entry as committed; how it fetches, caches, samples and exits: `docs/research/collection.md`.

Deploy (not part of `verify`): every push to `main` runs `.github/workflows/pages.yml`, which runs the unit tests, typecheck, lint and build, then deploys `dist/` to GitHub Pages; e2e stays local.

Dependency audit gate: `npm run audit:runtime` (`npm audit --omit=dev --audit-level=high`) and `npm run audit:full` (`npm audit --audit-level=high`) must both report 0 vulnerabilities; rerun both on every dependency change. Runtime dependencies: `three` and `three-mesh-bvh`, the latter pinned exactly (0.9.15) for the walk collision and the zoom's pick.

Load: `MET_CPU_THROTTLE=<n>` slows the page's CPU n times once it has loaded (`tests/e2e/helpers.ts` `throttle`); `routes.spec` and `walk.spec` must pass three runs in a row at 4× as well as at 1×.

Ports: each worktree sets its own `MET_PORT` (default 5310) for `npm run dev` and `npm run test:e2e`, and a server is never reused across worktrees; a taken port fails the run.

## Invariants & boundaries

- Reference photos are never committed. `docs/research/` records each one's URL, licence and what it shows; local copies, renders and captures live only under ignored paths (`.shots/`, `output/`, `tmp/`, `research/cache/`).
- Screenshot contract: `?shot=1` renders the requested state with no animation and sets `window.__shotReady` after at least 5 frames; the renderer keeps `preserveDrawingBuffer: true`; capture reads state only from the read-only `window.__met`.
- Determinism contract: building the steps gives the same meshes (instance matrices, counts, visibility) and lights byte for byte every time, which `src/build/timeline.test.ts` asserts; the page builds them once, and nothing it does afterwards writes them but layer masks (the door layer's and the floor view's).

## Conventions

- One line per paragraph, no hard wrapping. Files under 500 lines.
