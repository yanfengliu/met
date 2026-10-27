# Review 11: implementation

## Target

Repository `met`, branch `labels`: `1fd3a50..42722e9` (4 files, +245/−111). The orbit view's click gate (`src/viewer/click.ts`) is rewritten as a small state machine with idle, pressing and passing states, and tested by one table of eight sequences.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m3b-r3.md` (ignored). By its own account it ran the six current test bodies in memory, substituted each earlier gate to see its row fail, and probed lost capture, releases off the canvas, button chords and mixed mouse and touch on the real rig. It ran no browser check.
- Coordinator: `npm run verify` at `42722e9`: 562 unit tests in 61 files, typecheck, lint, build and 85 e2e green.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

1. **P2 — Capture loss leaves inconsistent pointer state.** [click.ts:104](C:/Users/38909/Documents/github/met-worktrees/review-m3b/src/viewer/click.ts:104) removes a pointer that may still be down; [zoom.ts:151](C:/Users/38909/Documents/github/met-worktrees/review-m3b/src/viewer/zoom.ts:151) only hears releases on the canvas. Reproduced: lose capture, release outside, then drag one new finger—the stale touch produces zoom factors **0.9615 and 0.9455**. Another mouse press before the original finger lifts also incorrectly counts as a click. [Capture loss does not end the pointer](https://www.w3.org/TR/pointerevents3/#the-lostpointercapture-event). Keep it in `passing` until its actual end, and deliver off-canvas terminal events to both consumers. Add a capture-loss/outside-release test.

2. **P2 — Button changes still produce clicks.** [click.ts:73](C:/Users/38909/Documents/github/met-worktrees/review-m3b/src/viewer/click.ts:73) checks only travel; the release at line 94 does not check the button. Left down → right down → left up → right up, without movement, invokes `onClick`. Additional button transitions arrive as [pointer moves](https://www.w3.org/TR/pointerevents3/#chorded-button-interactions), so the `pointerdown` transition misses them. Disqualify a press when its button state changes, pass its held move once, and test explicit `button`/`buttons` transitions.

3. **P2 — Mixed mouse/touch input throws in the real rig (pre-existing).** [OrbitControls.js:1323](C:/Users/38909/Documents/github/met-worktrees/review-m3b/node_modules/three/examples/jsm/controls/OrbitControls.js:1323) assumes the other pointer has a stored touch position. Mouse down followed by touch down throws `Cannot read properties of undefined (reading 'x')`; touch down → mouse down → touch up also throws. Both reproduce with and without the click gate. Add mixed-input arbitration before the consumers, preserving complete pointer lifecycles, and test both orders.

F36 itself is repaired. In-memory execution of the six current test bodies passed; substituting each historical gate reproduced the documented failures. The spec and Gates accurately describe those eight rows, which omit these cases. Browser tests were not run; no files were changed.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F36 | Verified | Closed | None |
| F37 | A lost capture ends a pointer in the gate that may still be down, and the zoom hears releases only on the canvas: a later drag zooms 0.96 | Accepted | `4e16588`: a lost capture does not end a pointer; the zoom follows each press to its end on the document; the rig passes an off-canvas cancel to OrbitControls |
| F38 | A press whose buttons change still clicks | Accepted | `4e16588`: a chord is no click |
| F39 | Mixed mouse and touch at once throws inside three's OrbitControls, with or without the gate | Accepted as a defect that predates M3b, outside its scope | Filed as a follow-up task, "Fix OrbitControls crash on mixed mouse and touch" |

## Verification

Above.

## Round outcome

This was the fourth round on this gate, so the coordinator asked for a check of the class, not the case: a seeded randomized test of pointer sequences against stream invariants on the real rig. F37 and F38 were repaired in `4e16588`. Review 13 is the focused check.
