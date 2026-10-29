# Review 0: implementation

## Target

Repository `met`, branch `orbit`: the working tree on base `8a6a0c2` (origin/main), as the patch `snapshots/0_target.patch.txt` (SHA-256 `17abbd6643d125746a45f1da150e6d8e47c2ce01d793b8cf1dcc8f1269c64364`; 14 files, 830 lines in and 160 out, new files included), rebuilt afterwards as the commit object `c5a0c92` (tree `14f224e`). Its code was committed unchanged as `7c59f42`, which differs from it only in AGENTS.md and `docs/learning/gate-proofs.md`, edited while the review ran at the coordinator's request (each gate as a clause or one short line, the red proofs moved to gate-proofs.md), and in leaving this unit's plan out. Review 1 covers those edits.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-29 with the same prompt (`tmp/review-runs/u10-r0/prompt.md`, ignored), the patch on standard input: the arbitration over the whole class of mixed input (presses, moves, button changes, capture losses, releases and cancels of mice, pens and fingers, on the canvas or elsewhere, hovers, changes of mode), its interplay with the click gate, the rig's relay of cancels and the page's other listeners, the coupling to OrbitControls' private listener fields and its guard's error, the tests' oracles, bounds and red claims, and the docs. Both were told to run no tests, builds or browsers, since a verify run measuring frame budgets shared the machine.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log's two DLL-marker lines are text it read from the fleet's review runbook, not a failure. It cited `OrbitControls.js:1553`, `src/walk/walk-mode.ts:365` and `tests/e2e/helpers.ts:151` outside the patch, each checked. It changed no file.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show, permission mode dontAsk, no MCP servers; its result's one model key is the pin (`keep`). It made 21 reads, 8 searches, git calls and one grep of `node_modules`, and changed no file. It noted that gate-proofs.md changed in the worktree during its review.

## Reports

### Codex (`gpt-6-astra`)

No blocking or should-fix findings in the supplied patch.

**R1 — nit, high confidence — [click-random.test.ts:28](C:/Users/38909/Documents/github/met-worktrees/orbit/src/viewer/click-random.test.ts:28).** The claimed 1,336 refusals “while another kind held the camera” also include same-type refusals: a second pen increments `refused` at line 280 while the first pen holds it. Rename this to “presses refused while the camera was held,” or count cross-type refusals separately. This affects the coverage description, not arbitration.

I checked the consumer lifecycles, click replay, off-canvas cancel relay, mode changes, private-listener guard, random oracle, and CDP comparison. Outside the patch, I traced r186’s [pointer handlers](C:/Users/38909/Documents/github/met-worktrees/orbit/node_modules/three/examples/jsm/controls/OrbitControls.js:1553), [walk-mode listeners](C:/Users/38909/Documents/github/met-worktrees/orbit/src/walk/walk-mode.ts:365), window listeners for menus and scrubbing, and the [settled-camera helper](C:/Users/38909/Documents/github/met-worktrees/orbit/tests/e2e/helpers.ts:151). The wrapping covers r186’s external pointer-entry paths; the guard’s error is actionable.

Review was read-only against `8a6a0c2`. I inspected existing measurement artifacts but ran no tests, builds, or browsers; historical failure counts were not independently reproduced.

### Claude (`claude-opus-5-5[1m]`)

I found no blocking defect in the arbitration. There is one should-fix, about how the red results are reported, and five nits. I only read code: no test, build or browser was run, so the measured numbers in the docs are unconfirmed.

**Process note:** `docs/learning/gate-proofs.md` changed in the worktree while I was reviewing. It was not in the patch I was given or in the status at session start. I read it there, and R1 covers part of it. The final revision should be checked again.

#### Findings

**R1 — should-fix (high confidence in the cause; numbers unconfirmed). The random sequences' red results against older revisions don't describe swapping those files back in as they were.**
Where: `src/viewer/click-random.test.ts:19-25`, `AGENTS.md:96`, and `docs/learning/gate-proofs.md:49` and `:53` (worktree only).
- **How the test listens:** it hears the zoom only through the new fourth parameter of `bindZoomInput` (`click-random.test.ts:55-59`). It hears the controls by replacing three listener fields after `super()` (`:66-77`).
- **Why that fails at `8a6a0c2`:**
  - That revision's `bindZoomInput` takes three parameters (`git show 8a6a0c2:src/viewer/zoom.ts`, line 109), so the zoom's recorder is never installed.
  - Its rig passes the canvas to the OrbitControls constructor (`git show 8a6a0c2:src/viewer/camera-rig.ts`, line 50). The constructor then connects the original `_onPointerDown` and canvas `pointercancel` listener (`OrbitControls.js:457-460`, `:499-500`) before the mock wraps them.
- **What follows:**
  - At `8a6a0c2`, every seed with a press that holds the camera fails the arbiter check at `:290`, because the zoom never hears that press, whatever OrbitControls does.
  - So "237 of the 400 seeds threw" can only count throws inside a run where every seed is red. gate-proofs' "the random sequences red in 237 of the 400 seeds" is not what that procedure produces.
  - "With its zoom: 268 of the 800 runs" (test header and AGENTS.md) has the same problem. `42722e9`'s zoom also takes three parameters, so swapping it in as-is turns every run red. gate-proofs:53 says the run used that zoom "given the arbiter's filter"; the header and AGENTS.md don't.
- **Fix:** say what was run. For example: "at `8a6a0c2` every seed red, the test hearing neither its zoom nor its controls' presses; 237 seeds threw inside OrbitControls", and "`42722e9`'s zoom, its listeners put through the filter: 268 runs".

**R2 — nit. The arbiter's stated limit understates what a lost finger end does** (`pointer-arbiter.ts:15`, and the plan's Tradeoffs).
- The doc says such a pointer "holds the camera until it presses again". A new touch never reuses a finger's pointerId, so a finger whose end is lost holds the camera until the page reloads. Every mouse and pen press is refused meanwhile, and OrbitControls keeps the finger in its `_pointers` list.
- I found no path on this page by which the document misses an end, hence nit.
- Fix: say this in the limit. Optionally, when a primary touch is pressed (meaning no other finger is on the screen), send each consumer a synthetic cancel for any stale finger holders.

**R3 — nit. The guard and its messages** (`camera-rig.ts:41-57`).
- The function's doc says the controls must not yet be connected, but nothing checks it. A throw when `controls.domElement !== null` would catch a later refactor that passes the canvas to the constructor; the canvas listeners would then go unfiltered.
- The fix text in the error (`:52`) is garbled and partly wrong. `_onPointerMove` and the document `_onPointerUp` are added on a press (`OrbitControls.js:1559-1562`), not by `connect()`. Suggested wording: "list in CONTROLS_LISTENERS every instance field this release adds as a pointer listener, in connect() or on a press".
- The test mock's error at `click-random.test.ts:72` doesn't say what would satisfy it (R26).
- Otherwise the guard is enough: together with the table and the random runs, it catches a renamed or bypassed field.

**R4 — nit, behaviour that predates this change. A pointer held through a mode change makes the view jump** (`spec.md:103`).
- The spec now says a pointer "keeps the camera through a change of mode". But OrbitControls ignores moves while disabled (`OrbitControls.js:1594`; the rig disables it at `camera-rig.ts:285`), so its stored start positions go stale.
- The first move back in the orbit view turns the view by all the travel made while walking. `8a6a0c2` does the same, and no test checks the camera across a mode change.
- Fix: say so in the spec, or end holders when the mode changes.

**R5 — nit. The wheel isn't covered** (`spec.md:103`).
- The spec's "one kind of input holds the camera at a time … one mouse or pen" reads as including the wheel. The wheel listener isn't arbitrated (`zoom.ts:113-122`), so it zooms while fingers or a pen hold the camera.
- The plan excludes the wheel on purpose. Fix: write "one kind of pointer".

**R6 — nit. Wording that is wrong or loose:**
- `AGENTS.md:96` and `spec.md:103` say "a second mouse" is refused. No browser has two mouse pointers, and `pointer-arbiter.test.ts:47-71` presses a second pen, not a second mouse.
- `AGENTS.md:96` says "the pen's hover turned the view 6.07 m". The 6.07 m comes from the camera floor lifting the camera after the hover's jump took it to y = −5.67 m; the turn itself is undone by the later mouse move. The mixed-pointers header ("the camera ending 6.07 m off") has it right.
- `tests/e2e/mixed-pointers.spec.ts:4-5`: the first order also threw as the finger lifted (`OrbitControls.js:1639`), not only as it landed (`:1323`).
- `click-random.test.ts:28`: "refused while another kind held the camera" also counts a second pen pressed while a pen holds.
- `click-random.test.ts:30-31`: the stated limits don't say that the mode changes only through `rig.setWalking`. No walk mode instance runs, and walk mode's canvas listeners take pointer capture on a press while walking (`walk-mode.ts:365-368`).
- `AGENTS.md:96` files the arbiter's and the mixed table's gates under "Labels (unit)". They are camera-input gates, and the spec files them under "the orbit view's pointer input".

#### What I checked and found sound

- **OrbitControls r186 coverage:** the wrapping covers every pointer path.
  - It connects without an element at construction (`:457`), and `connect` adds the wrapped down and cancel listeners (`:499-500`).
  - The first press adds the wrapped move and up listeners by reading the instance fields (`:1561-1562`), and `onPointerUp` and `disconnect` remove those same references.
  - The context menu, wheel and keys are not pointer paths.
- **Arbiter invariants:**
  - Each consumer's open set stays inside the arbiter's held set, which only ever holds one kind of pointer.
  - Each press is decided once, keyed by the event object; the click gate's copies are only ever moves.
  - The camera is freed only after every consumer has heard each end, and both consumers hear an end within the same dispatch, including through the cancel relay.
  - OrbitControls' `_pointers` list matches the controls' open set, except on the lost-end re-press path. So `_getSecondPointerPosition` only ever meets fingers it has tracked.
- **Click gate:**
  - It never holds a move of a refused pointer, because the holder is always in its set of pointers down.
  - The new release-while-walking rule is right. The copy reaches disabled controls, an inactive zoom, and walk mode's listener, which ignores any pointer that isn't its own drag. Nothing depended on the old behaviour.
- **Other listeners:** walk mode's canvas listeners and the click-to-open-door listener in `main.ts` are not arbitrated, and nothing about them changed. The timeline bar's window `pointerup` (`timeline-bar.ts:74`) and the menus' window `pointerdown` (`menus.ts:180`) are unaffected. `camera-floor.test.ts`'s stand-in element still works.
- **Red results traced by hand at `8a6a0c2`:**
  - Mixed-pointers table: eight of the ten rows throw (at `OrbitControls.js:1323`, `:1371` or `:1639`). The hover row's 6.07 m and the pinch row's roughly 6 cm missing pan also check out.
  - `click.test.ts`: the new release-while-walking assertion fails there, as claimed.
  - e2e spec: three throws, as claimed.
- **E2E soundness:**
  - Damping adds up the same whatever the frame timing, and `settledCamera` leaves under about 0.15 mm, well inside the 1 cm tolerance.
  - The more-than-10 m checks confirm both pressed points are on the canvas.
  - 1280×720 is the viewport in `playwright.config.ts:25`.
- **Oracles:** each check's expectations come from rules or values written in the test, not from the code it checks. I found no check that passes vacuously. Counters aside from those in R6 measure what they say.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The random sequences' red results against older files did not say what was run: at `8a6a0c2` the test hears neither that zoom (no filter to hear through) nor that rig's presses (its controls connect before the mock wraps them), so every run is red; review 11's zoom has three parameters too (Claude R1, should-fix) | Accepted: the numbers came from a copy of the test whose mocks were adapted to the older files, which the record did not say | gate-proofs.md says how each red run was made (the mock adapted, the zoom left unheard; review 11's zoom given the filter); the test header points there; AGENTS.md carries no numbers |
| F1 | A lost finger end holds the camera until the page reloads, not until the pointer presses again: a finger's id never comes back (Claude R2, nit) | Accepted for the wording. The suggested self-healing, synthetic cancels for stale fingers on a primary touch, declined: no path on this page loses an end, and a second source of ends would need its own lifecycle checks | The arbiter's Bound and the plan's tradeoffs say so |
| F2 | The guard does not refuse an OrbitControls already connected; its error text is wrong about where the listeners are added; the test mock's error does not say what would satisfy it (Claude R3, nit) | Accepted | `hearThrough`, exported, refuses a connected controls and names what to do; both messages rewritten; a test of the guard, red without the connected check |
| F3 | A pointer that holds the camera across a change of mode turns the view at its next orbit-view move by all it travelled while walking, since the controls follow no move while disabled; this predates the work (Claude R4, nit) | Accepted as a known limit, behaviour unchanged: it is as old as walk mode, and walk mode's input belongs to another session | The spec's Camera paragraph and the plan name it; the handoff tells the walk-mode session |
| F4 | "One kind of input holds the camera" reads as covering the wheel, which is not arbitrated (Claude R5, nit) | Accepted | "One kind of pointer"; the spec names the wheel as no pointer, zooming whatever holds the camera |
| F5 | "A second mouse" is refused, yet no browser has two mouse pointers (Claude R6, nit) | Accepted | "A second pen" in the spec, the arbiter's header, its test's header and the plan |
| F6 | "The pen's hover turned the view 6.07 m": the 6.07 m is where the camera ended, after the camera floor lifted it (Claude R6, nit) | Accepted | AGENTS.md no longer gives it; gate-proofs.md and the plan say the camera ended 6.07 m off |
| F7 | The e2e header says the first order threw as the finger landed; it also threw as the finger lifted (Claude R6, nit) | Accepted | The red note moved to gate-proofs.md, which names all three throws |
| F8 | The `refused` counter also counts a second pen refused while a pen holds the camera (Codex R1, Claude R6, nit) | Accepted | Split into `refused` (another type held the camera, 1,276 over the 800 runs) and `second` (a second pen, 60) |
| F9 | The random test's Bound does not say that the mode changes by the rig's `setWalking` alone, with no walk mode running (Claude R6, nit) | Accepted | Its Bound says so |
| F10 | AGENTS.md filed the arbiter's and the mixed table's gates under "Labels (unit)" (Claude R6, nit) | Accepted | A Gates line of their own, "Mixed pointer input (unit)" |

## Verification

- `npm run verify` on the target's code (`7c59f42`), through the gate lock with `MET_PORT=5362`: 684 unit tests in 77 files, typecheck, lint, build and 85 e2e, in 887 s (`tmp/verify-1.log`, ignored).
- The red proofs as `docs/learning/gate-proofs.md` records them, each run on this machine before the review.
- The repairs, committed in `02db823`, are verified and re-reviewed in review 1.

## Round outcome

No blocking finding. One should-fix (F0) and ten nits, all accepted. F3, which predates the work, is documented rather than changed; F1's suggested self-healing is declined. Review 1 is the focused re-review of the repairs and of the documentation moves made during this round.
