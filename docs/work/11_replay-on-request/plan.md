# The timeline shows only when a build replay is asked for

Status: complete
Owner: replay, a worker of the met coordinator
Created: 2026-10-29
Updated: 2026-10-29

## Problem and outcome

The owner, 2026-10-29: "Lose the timeline on default rendering. It should only show if the user is interested in seeing a build replay. Hide the option behind some menu."

The page showed the whole timeline bar from load, over the bottom of the view. Outcome: the default page shows the finished building, paused, with no timeline, and the replay is opened and closed from a menu. Everything else stays reachable as before: the Walk toggle, the menus, the floor picker, the cut.

## Scope

Included: the page contract in `docs/design/spec.md` (Page: Build replay, Timeline bar, Build menu, View menu, Camera framing, Keyboard, Walk mode's screen, First load, the query table and the facts, the label card's place). The code is in `src/main.ts`, `src/ui/` and `src/viewer/query.ts` and `facts.ts`. The e2e specs that drove the bar from load, a new `tests/e2e/replay.spec.ts`, the capture script's UI shots, and AGENTS.md's gate lines for the specs changed.

Excluded: the camera rig, zoom and click (worker "orbit", unit 10), the route walks (worker "walkgate"), and walk-mode input (the mouse-look worker after this unit).

## Approach

- **Menu.** The Chapters menu, renamed Build (the owner, 2026-10-29: "Ok"), holds the Build replay item (a checkbox item, `replay-toggle`) above the chapters. It is about the build already, and choosing a chapter opens the replay at that chapter's start. The menu keeps its test ids (`chapter-menu`).
- **Closing.** The same item or the bar's close button (`replay-close`) closes the replay. Closing pauses and goes back to the finished building, t = N, so a part-built model shows only inside the replay.
- **Default page.** The bar is a strip at the bottom right holding the Walk toggle alone, as the walking strip does. The View menu's follow-camera toggle shows only while the replay is open, since it belongs to playback.
- **Rules.**
  - `autoplay=1` opens the replay and plays from t = 0.
  - `replay=1` opens it without playing.
  - `t=` and `step=` open it at their position.
  - `shot=1` shows the replay exactly when the rest of the query opens it, and plays, follows and animates nothing.
  - A timeline key in the orbit view opens it and acts there: Space at t = N runs the build from the start, as Play does. While walking the keys stay off.
  - Opening the replay while walking shows the whole bar. With the replay closed, walking shows no Timeline button.
- **Framing.** The view is the whole canvas, except while the whole bar shows, the replay open in the orbit view. Then it is the part above the bar, as before. Opening or closing the replay fits the preset in view and a floor's framing again, as a resize does. The label card sits above the bar, whole or a strip.
- `src/main.ts` stays under 500 lines: the error panel moved to `src/ui/error-panel.ts`.

## Acceptance criteria

- [x] Default page: no timeline control, every other control in view, the whole canvas framed (`replay.spec`, `layout.spec`, both sizes).
- [x] The Build menu's item opens the replay, every timeline control then works as `controls.spec` drives it, at both sizes.
- [x] The close button and the menu item close it, back at t = N, paused (`replay.spec`). Closing while walking at a part-built t leaves the walker where it stands at t = N (`walk-build.spec`).
- [x] `autoplay=1`, `replay=1`, `t=`, `step=` and `shot=1` behave as the rules say (`replay.spec`, `query.test.ts`).
- [x] A timeline key on the default page opens the replay and acts; walking, none does (`replay.spec`).
- [x] The walk screen with the replay open and closed (`walk-screen.spec`, both sizes).
- [x] Framing: presets and the floor view fitted again when the replay opens and closes, and the follow camera framed above the bar (`replay.spec`). `camera.spec`, `floors.spec` and `labels.spec` stay green.
- [x] Each new check is red with the old default put back (`docs/learning/gate-proofs.md`, under `tests/e2e/replay.spec.ts`).
- [x] Screenshots of each state at both sizes in `.shots/replay/`, read at native resolution; `npm run shots` before and after, every changed image read.
- [x] `npm run verify` green on the merged tree; review rounds with both lanes; landed on origin/main.

## Implementation steps

- [x] Design sent to the coordinator; the owner chose the menu's name.
- [x] Code: query rule, bar shapes and close button, Build menu, follow toggle, framing, facts.
- [x] Specs updated and `replay.spec` added; the spec, AGENTS.md and gate-proofs updated.
- [x] Red proofs, screenshots, shots before and after.
- [x] Review, both lanes, three rounds (`reviews/0_implementation.md` to `2_implementation.md`); every finding repaired but two parts of F18.
- [x] Verify on the merged tree, landing; then these records, once units 9 and 10's were on origin/main.

## Outcome

Landed on origin/main at `cd2c5fa` (the change `9eaf976`, its repairs `0718468`, the merges `a6a166f` and `cd2c5fa` with work units 12, 9 and 10 and the route places). The merged tree passed `npm run verify`: 701 unit tests, typecheck, lint, build and 119 e2e tests (634 s).

- Review: three rounds, Codex and Claude each (`reviews/0_implementation.md` to `2_implementation.md`). Round 0 found no blocking defect: the close button lost keyboard focus, two tests had too short a deadline, the README and some docs overclaimed, and the red proofs were still to run. Rounds 1 and 2 checked the repairs; round 2 ended with Codex accepting and Claude accepting once one sentence of `gate-proofs.md` was reworded, which it was. All 23 findings were accepted, but two parts of F18 (the focus hand-off driven by Enter alone; F with a bar control focused, older than this unit).
- Red proofs: `docs/learning/gate-proofs.md`, under `tests/e2e/replay.spec.ts` and the two unit files. With the old default put back, the replay open from load, 24 of 28 tests go red, every new check among them.
- Shots: of the 64 standard shots only the six UI images changed (the default page, the replay mid-build and walking, at both sizes); the 58 model shots are unchanged. Each state of the replay was captured at both sizes and read at native resolution (ignored, `.shots/replay/`).
- Limits: the screenshot contract and the determinism contract are untouched (the replay changes only the chrome and the camera's inset). `no-refit` stays green at 1280×720, where the default preset's and the floors' fits are limited by the view's height. The `aria-checked` wait in `openReplay` has no delayed-frame proof. F with a focused bar control still folds the bar under the focus (older than this unit; a proposal in the hand-off).
