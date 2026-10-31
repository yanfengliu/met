# AGENTS.md — met

## What this is

A procedural three.js reconstruction of The Metropolitan Museum of Art's Fifth Avenue building in New York, outside and inside, whose construction is the product: the model is assembled by an ordered list of build steps that play forward and backward, one step at a time or scrubbed, and the finished building is only the last frame.

Non-goals: no imported meshes, scans or photo textures; no runtime network assets; no gallery-by-gallery interior (the major public spaces only). Artworks are procedural placeholders of real objects on view, built from The Met's CC0 collection data, which a script fetches by hand and never at runtime (owner, 2026-10-25); colours sampled from a public-domain object's image are data, not a photo texture.

Stack: Vite + TypeScript (strict) + Vitest + three.js, Playwright for capture and control tests. Node 24 (`.nvmrc`).

Read the section map at the top of `docs/design/spec.md` before substantial work, then the sections the work needs: it is the contract for the world frame, the build-step API and the page. Repo-specific rules: `docs/policies/local-rules.md`. Research and reference images: `docs/research/`.

<!-- FLEET-CANON:BEGIN sha=e54f2a9ae007 generated from ../fleet/FLEET.md by `npm run sync-canon` — do not edit inside this block; this repo's own rules go in docs/policies/local-rules.md -->
## Fleet constitution

Reasons and evidence per `[Rn]`: `../fleet/docs/canon-rationale.md`. `../fleet/` is fleet's checkout beside the repo's primary checkout, also from a worktree. The designated coordinator reads `../fleet/docs/skills/coordinator.md` before planning and after each compaction, and any agent reads that file's "Delegate" section before delegating. Before these kinds of work, read the matching section of `../fleet/docs/work-rules.md`: visual and interactive work; games, simulations and research; measuring, debugging and slow steps; writing error messages; toolchains, dependencies and model calls; standing loops and unattended runs; pushing executable changes; a user-reported defect; editing skills, agent instructions or rules; run output and files over 256 KiB; handing off or stopping mid-task.

### Fleet Orchestration Policy

Deliver the requested outcome with verified correctness, coherent architecture and minimal necessary complexity. Optimize useful progress, not agent count, code volume or maximum reasoning. Adapt rigor to risk. This policy grants no new permissions or capabilities. [R1]

**Roles.** Only an explicitly designated agent coordinates; each scope has one accountable integration owner. [R2]

Workers own bounded outcomes and local implementation decisions. [R3]

Inspect instructions, code, docs, tree state and active tasks; set outcome, non-goals, acceptance criteria, dependencies and verification; settle ambiguity with evidence and reversible defaults. [R4]

**Session size** (owner directives, 2026-09-23 and 2026-10-22). Sessions run long: take new requests as separate assignments in the same session, and never hand off to a successor session to shed context; auto-compaction carries the session. Split tasks expected to exceed about 200k context tokens into milestones within that budget, each committed and merged to main once green. Milestones are task boundaries; a compaction never justifies wrapping up or handing off. [R6]

**Coordinate safely.** Beyond a trivial read, each session or agent defaults to its own worktree; serialize overlapping writes only when none is available, and say why. Finish each bounded increment in its session: merge to main, push, then `git worktree remove`, remove completed task-owned branches and unneeded temporary files, and explicitly transfer the ownership and location of still-needed resources. Report any merged worktree left and its location as a defect. Never overwrite or discard another participant's work. On resumption, first inspect surviving worktrees, artifacts and task status, assuming nothing survived until checked; recover what exists and preserve unfinished work. [R7]

Workers act autonomously in scope; escalate cross-task interfaces, persistent formats, security boundaries, major dependencies and scope changes to the coordinator for resolution within the approved mandate. Unapproved major architecture or product changes and consequential external actions need human authorization. Fleet rules (FLEET.md, the fleet's skills and runbooks, canon candidates, and agent memory) change only when the owner asks (owner directive, 2026-10-28). Agents propose changes instead of making them. The one exception: they may add a proposal to `../fleet/canon-candidates.md`, with the lesson, its evidence and the rule it would change (owner directive, 2026-10-29). They never change, promote or delete an entry: the owner decides each one, and the session the owner asks makes the change. Never reset consumed allowances. [R8]

**Implement and verify.** Inspect, implement a coherent increment, check, diagnose, fix, recheck. Preserve architecture; no unrelated rewrites, speculative abstractions or unnecessary dependencies. Implement when requested. Use task-appropriate evidence and baselines; prototype uncertain ideas before generalizing. Never weaken tests or conceal failures to claim success. Docs-only work uses content and version checks; skip runtime tests and CI waits. [R9]

During authorized work and within scope and budget, proactively improve products and the task's orchestration, learn from recorded outcomes and propose improvements to fleet rules. Read `../fleet/docs/skills/self-improvement/SKILL.md` when proposing a fleet-rule change or turning a mistake into a gate (owner directive, 2026-10-29). [R33]

Obtain independent, preferably read-only review for substantial or high-risk changes when available. Review the exact revision against acceptance criteria. Report unavailable review; fix justified findings, rerun affected checks, and obtain focused re-review when fixes invalidate earlier review. [R10]

**Integrate, report, and stop.** Reassess after two failures for one reason. Unless another budget is set or the user authorizes more, cap automatic repair at five substantive attempts, then report; explicit overrides hold for their stated scope without asking again. Keep updates brief and decision-relevant. Stop when acceptance criteria and material findings are resolved; invent no follow-up work. [R11]

**Final acceptance gate.** The integration owner integrates in dependency order and on the final integrated revision's actual changes and evidence, not worker summaries, checks every acceptance criterion, runs relevant automated checks and exercises affected end-to-end behavior and cross-task interactions. Substantial or high-risk work gets independent read-only review of the integrated changes, integration fixes included. Confirm the merge to main; report that revision, review status and every failed, skipped or unavailable check and unmet criterion. Nothing is fully verified with an open material finding or required check. [R12]

### Fleet conventions

- Repository rules add local constraints consistent with this policy; they cannot override its permissions, adaptive workflow or stopping limits. [R13]
- Gates pass before any commit touching code, a merge included: merge on a detached HEAD or its own branch and move main to it once its gate passes. The user's standing grant covers committing, merging to main and pushing in their repos; force-pushing, rewriting history, deploying and publishing still need authorization. Work is done only once merged to main, regardless of green branch or worktree gates; report unmerged work's location. [R14]
- For substantial or high-risk changes, use independent review when available. High-risk includes persistence and migrations, security and auth, concurrency, money, supply chain, and executable changes in sibling repos; `../fleet/docs/skills/multi-cli-review.md` provides the review mechanics. [R10]
- Reviewer model pins live only in `../fleet/docs/skills/multi-cli-review.md`; every model a product calls is pinned in its calling repo. No model IDs are hardcoded elsewhere. [R29]
- Read `docs/learning/lessons.md` at session start. Record the session's lessons there; each names its retiring gate and is deleted in the commit landing it. A gate counts only after going red with the defect reintroduced, following `../fleet/docs/lessons-template.md`. [R18]
- Gates prove nothing beyond their bounds: name the bound in the header and pin every reproducing input. Distinguish passed from did-not-run; a check built from its checked symbol proves only self-agreement. [R19]
- Verify outcomes beyond exit status, red or green, and return values: read the artifact that should have changed. Retest inherited blockers before repeating them. [R20]
- Keep plans and every authored review round in permanent `docs/work/<id>_<theme>/` folders (`../fleet/docs/work-docs.md`). Record history, not status: a dated devlog line per behaviour-changing session in `docs/devlog/summary.md` (`../fleet/docs/devlog-template.md`). [R24]
- Use common words with the same meaning in chat, docs, commits, PRs, comments and errors. One idea per sentence unless a rule needs more. Cut length, not facts: keep exact terms, numbers and evidence. Quotes and pastes are exempt; do not copy this canon's style. One line per paragraph, no hard wrapping. [R25]
- When blocked, immediately hand over the redacted artifact with the named blocker, before analysis; continue safe independent work. [R27]
- The owner's directions that outlive a task land that session in `../fleet/FLEET.md` if fleet-wide, otherwise the repo's `docs/policies/local-rules.md`; report where. [R31]
- When a hard problem blocks progress, run the search in `../fleet/docs/skills/hard-problem.md`. [R32]
<!-- FLEET-CANON:END -->

## Gates

Node 24 (`.nvmrc`), npm, Vite, strict TypeScript, Vitest, ESLint and Playwright on the installed system Chrome (no browser download).

Each gate below is one line on what it checks. Read more when the work reaches it: a gate's bounds and reproducing inputs in its test file's header, its red proofs there or in [gate-proofs.md](docs/learning/gate-proofs.md), the behaviour it holds in [spec.md](docs/design/spec.md), its findings in its work unit's reviews (`docs/work/`).

`npm run verify` is the pre-commit gate: the five commands below, in this order.

- `npm test`: Vitest over `src/**/*.test.ts` and `scripts/**/*.test.ts`, including `src/repo-conventions.test.ts`, which fails on a file over 500 lines under `src/`, `scripts/` or `tests/`, on an `import.meta.env` or `process.env` read under `src/`, and on an AGENTS.md over 30,000 bytes with CRLF line endings. Every test has 60 s (`vitest.config.ts`). Off GitHub's runner (`CI` not `true`), a passed test that takes over a sixth of its timeout fails the run, as does one whose time or timeout Vitest does not give (`scripts/test-headroom.ts`, whose header says why).
- `npm run typecheck`: `tsc --noEmit`, strict plus `noUncheckedIndexedAccess`, over `src/`, `scripts/`, `tests/` and the root configs.
- `npm run lint`: ESLint with typescript-eslint strict type-checked rules, `--max-warnings 0`.
- `npm run build`: `tsc --noEmit && vite build`, the two-page site (`index.html`, `parts.html`) into `dist/`.
- `npm run test:e2e`: Playwright (`tests/e2e/`) against a dev server it starts: the specs below, most of them through real input.

The e2e specs:

- `smoke.spec`: both pages load, draw one canvas, reach `window.__shotReady` and log no console error; without WebGL 2 the page says so; `parts.html` falls back to three-quarter for an inherited `view=` name.
- `controls.spec`, `menus.spec`, `layout.spec`: the build replay opened by the Build menu, then every button (every speed), shortcut, the scrubber and cut slider by mouse, every chapter and every preset through the menus, and the follow toggle, checking the label, the scrubber, `window.__met`, settled cameras and canvas pixels; the first load with no timeline; the full control inventory, the replay closed and open, and chapter summaries at 1280×720 and 390×844; the 4 s build budget from navigation to ready.
- `replay.spec`: the build replay at both sizes: no timeline on the default page, the Build menu's item and the bar's close button opening and closing it, the framing either way, a timeline key opening it, and the queries that open it.
- `camera.spec`: a preset lands and stays, chosen after a drag or in walk mode; the follow camera stays on through a press, goes off with a drag and closes on each step's framing in playback; a fit preset is fitted again after a resize; an unknown `view=` starts as if none were named.
- `walk.spec`: the orbit view's movement keys; the Walk toggle, F and the spawns, each locking the pointer, and F and Esc leaving; holding W up the front steps; a free pointer's drag look and the click that asks for the lock; a key pressed in the same frame as F; the walking frame budget.
- `mouse-look.spec`: the locked mouse turning the view with no button held, a menu closing as the pointer locks, the pointer free after `walk=1` until a click, Esc leaving walk mode locked or free and after an open menu, the lock lost leaving, and a tap and a finger's drag asking for no lock, the drag also under the mouse's lock; in `npm test`, `src/walk/walk-lock.test.ts` holds the lock's rules on a stand-in page.
- `walk-screen.spec`: the walking screen at both sizes, the build replay closed and open, the browser giving no lock (`noPointerLock`), since a locked pointer reaches no control: the crosshair, the strip's Walk and Timeline buttons, the bar opened, folded and closed while walking, every control inside the viewport.
- `walk-build.spec`: the walker on the real model while the bar's buttons, and closing the build replay, build and unbuild the ground under it.
- `stairs.spec`: on the front steps and the Grand Staircase every frame is drawn from the walker's eye, which never drops climbing or rises descending and rests 1.6 m over the floor; in `npm test`, `src/walk/stairs.test.ts` holds the same at 30, 60 and 144 frames a second.
- `routes.spec`: one short real-key walk through the closed middle door, down a Grand Staircase flight and up to the Triumph's card, and fixed places on routes R1 to R7 set by `spawn=x,y,z,tx,ty,tz` (`src/walk/spawns.test.ts`): both doors used by E, R5's doorway, the landing, the Dendur forecourt, flight, rail and pool, two artworks' cards; in `npm test`, `src/model/hunt/routes.test.ts` walks the routes headless and `src/model/roche-north/walk.test.ts` leaves no trap at Dendur.
- `zoom.spec`: every wheel notch moves along the ray under the pointer until 0.5 m before the surface or the camera floor, and back out again: the gate for "camera input stops responding at a limit" (`docs/learning/defect-register.md`).
- `floors.spec`: the floor picker by mouse and Page Up and Page Down: each floor's cut, landscape and framing, All, the cut by hand, walk mode, `floor=`, and the cut colour across stairs and none on a roof.
- `network.spec`: the pages ask nothing of any host but their own, nothing of metmuseum.org and nothing under `/research/`.
- `labels.spec`, `labels-view.spec`: an artwork's card in walk mode and on a click in the orbit view, its fields and link, its place at both sizes, what hides it, and with the pointer locked its hint and place and Esc, held or not, keeping it for its link.
- `doors.spec`, `door-look.spec`: a door's prompt, E and the locked click, the scrubber through the doors' step, `doors=` in the first frame, the prompt's band, a swing's frame budget, and the prompt between a pair's leaves.
- `mixed-pointers.spec`: a finger joining a mouse drag, and a mouse joining a finger's drag that lifts first, through the browser's own mouse and touch, throw nothing and turn the view as the pointer that holds the camera alone does.

The unit gates, in `npm test`:

- Engine: timeline determinism over seeded random histories, rest positions, batching and each mesh's matrices (`src/build/timeline.test.ts`); motion endpoints and stagger order (`src/build/motion.test.ts`); the player (`src/build/player.test.ts`); the integrity, composition and budgets of what `src/build/sequence.ts` exports, each step's `year` in its chapter's `years` and every step array an area module's `index.ts` exports reaching `COMPOSITION` (`src/build/sequence.test.ts`); a window or door part's roles placed together (`src/build/window-parts.test.ts`).
- Reachability (`src/model/reach.test.ts`): from the Great Hall spawn the real walker reaches every space with artworks and looks at each artwork, and reaches every interior preset, spawn and route end; `src/walk/reach.test.ts` checks the fill on fixtures.
- Doors: the door unit's leaves and swing (`src/model/lib/door.test.ts`), each swing clear of the finished model (`src/model/door-fit.test.ts`), the leaves against the walker (`src/walk/door-world.test.ts`, `src/walk/door-settle.test.ts`), Weston's door (`src/model/core/weston-door.test.ts`), the door layer (`src/viewer/doors.test.ts`), the real doors' tags, budget, locks and look targets (`src/model/doors.test.ts`) and `doors=` and its warning (`src/viewer/query.test.ts`).
- Piece tags and the hit query: tags kept with their instances (`src/build/tags.test.ts`), what a ray meets (`src/viewer/pick.test.ts`), the look target's reach (`src/walk/look.test.ts`) and its hook (`src/walk/walk-mode.test.ts`).
- Labels: the 94 placeholders' tags (`src/model/collection/artwork-tags.test.ts`), each artwork the look target and the click's answer (`src/model/collection/labels.test.ts`), the card's text (`src/ui/art-card.test.ts`), its show and hide rules (`src/viewer/art-label.test.ts`), and a click told from a drag on the real camera rig (`src/viewer/click.test.ts`, `src/viewer/click-random.test.ts`).
- Pointer input: one kind of pointer holds the orbit view's camera, by the arbiter alone (`src/viewer/pointer-arbiter.test.ts`), on the real rig over a table of mixed sequences with the click and without (`src/viewer/mixed-pointers.test.ts`), and over seeded random mixed input (`src/viewer/click-random.test.ts`).
- The cut and floors: only the building is cut and the cap pass draws what the cut passes through (`src/viewer/section-cut.test.ts`, `src/viewer/cap-pass.test.ts`); the floors' levels and cuts (`src/viewer/floors.test.ts`), the floor view's landscape filter (`src/viewer/floor-view.test.ts`) and the user's own cut kept and given back (`src/viewer/floor-mode.test.ts`).
- Closed solids (`src/model/closure.test.ts`): at t = N every piece the walk collides with or the cut caps, and each door's leaves apart, is closed along vertical lines or a declared sheet, read five ways; the readings and builders have their own tests (`src/model/lib/{check,facing,column,dome,core,wall}.test.ts`, `src/walk/crossings.test.ts`, `src/model/{core/core,hunt/hunt,mmw/mmw}.test.ts`).
- Walk mode: the walker on fixtures (`src/walk/walker.test.ts`), the build moving under it, a floor's joint and the rims it stands on (`src/walk/settle.test.ts`), the zoom (`src/viewer/zoom.test.ts`), the camera floor (`src/viewer/camera-floor.test.ts`), the orbit keys (`src/viewer/orbit-keys.test.ts`), and the default start and `autoplay` (`src/viewer/query.test.ts`).
- Build replay: when it opens at load and the `replay=0` warning (`src/viewer/query.test.ts`), the bar's shape (`src/ui/timeline-bar.test.ts`).
- Collection: the catalogue read offline (`src/model/collection/catalogue.test.ts`) and the script that writes it (`scripts/met-catalogue.test.ts`), the forms (`src/model/collection/kinds.test.ts`), and every artwork placed on its floor or wall, clear of the routes, passages and doors, within budget (`src/model/collection/placement.test.ts`).
- Choir screen: the walker through the Valladolid screen's open gate, on the hall's axis too (`src/model/core/choir-gate.test.ts`), and the screen one group standing on the floor (`src/model/core/choir-connected.test.ts`).
- Cited photographs (`src/cited-images.test.ts`): a file under `src/model/` cites `docs/research/interior-images.md` or `exterior-images.md` entries by ID, each marked viewed.
- Also unit-tested: the framing maths `fitBox`, `resolvePreset` and `followGoal`, the facts' detached frozen `snapshot`, the WebGL 2 failure message, the parts gallery's `view=` names, and capture's `--solo` check, delete guard and benchmark query through the real run with recorders in place of the disk, git, Vite and the browser (`scripts/capture.test.ts`).

Capture (not part of `verify`; run before a visual handoff and read every image at native resolution): `MET_PORT=<port> npm run shots` writes the standard set to `.shots/shots/` and prints the revision, dirty flag, GPU, build, ready and frame times; `npm run sweep -- --t <t> [--count 12] [--seed <n>] [--solo <chapter>]` writes seeded random cameras to `.shots/sweep-<seed>-t<t>/` and prints the seed. Both start and stop their own Vite server on `MET_PORT` and drive the system Chrome.

Catalogue (not part of `verify`, never in CI; run by hand when the picks change): `npm run met-catalogue` regenerates `src/model/collection/catalogue.ts` from `src/model/collection/picks.ts` through The Met's Collection API, all or nothing; how it fetches, caches, samples and exits: `docs/research/collection.md`.

Deploy (not part of `verify`): every push to `main` runs `.github/workflows/pages.yml`, which runs the unit tests, typecheck, lint and build, then deploys `dist/` to GitHub Pages; e2e stays local.

Dependency audit gate: `npm run audit:runtime` (`npm audit --omit=dev --audit-level=high`) and `npm run audit:full` (`npm audit --audit-level=high`) must both report 0 vulnerabilities; rerun both on every dependency change. Runtime dependencies: `three` and `three-mesh-bvh`, the latter pinned exactly (0.9.15) for the walk collision and the zoom's pick.

Load: `MET_CPU_THROTTLE=<n>` slows the page's CPU n times once it has loaded (`tests/e2e/helpers.ts` `throttle`); `routes.spec` and `walk.spec` must pass three runs in a row at 4× as well as at 1×.

Ports: each worktree sets its own `MET_PORT` (default 5310) for `npm run dev` and `npm run test:e2e`, and a server is never reused across worktrees; a taken port fails the run.

## Invariants & boundaries

- Reference photos are never committed. `docs/research/` records each one's URL, licence and what it shows; local copies, renders and captures live only under ignored paths (`.shots/`, `output/`, `tmp/`, `research/cache/`).
- Screenshot contract: `?shot=1` renders the requested state with no autoplay, follow or animation and sets `window.__shotReady` after at least 5 frames; the renderer keeps `preserveDrawingBuffer: true`; capture reads state only from the read-only `window.__met`.
- Determinism contract: the scene at `t` is a pure function of `t` (instance matrices, colours, counts, visibility, light intensities), whatever the history of plays, steps and scrubs; caching may only skip redundant writes, and `src/build/timeline.test.ts` asserts it byte for byte.

## Conventions

- One line per paragraph, no hard wrapping. Files under 500 lines.
