# Review 10: implementation

## Target

Repository `met`, branch `labels`: `691b8f7..1fd3a50` (21 files, +1,895/−5): milestone M3b exactly as it would land on main. Main `691b8f7`, with M2a's doors and door prompt, is merged into the branch at `eaf093c`. Since review 7:
- F29: a pinch starts from where the fingers are (`fed19d7`);
- the merge with M2a;
- F30: a walk from the entrance's middle doors to Tiepolo's *Triumph of Marius* in gallery 600 and back, reading the card and the door prompt every frame (`1fd3a50`).

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m3b-r2.md` (ignored). By its own account it probed mouse, pen and touch taps and drags, the right-button pan, the wheel and walk-mode touch on the real rig; checked that each consumer subscribes once to the look-target hook; found all 94 artworks by both queries; and compared tagged and untagged builds over 12 samples. It ran no browser check.
- Coordinator: `npm run verify` at `1fd3a50`: 563 unit tests in 61 files, typecheck, lint, build and 85 e2e green; the shot set identical to main's at `691b8f7`; 744 meshes and 1,579,480 triangles.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

Reviewed `691b8f7..1fd3a50`. One finding:

1. **P2 — F29 replays stale movement after a drag crosses the threshold.** [src/viewer/click.ts:29](C:/Users/38909/Documents/github/met-worktrees/review-m3b/src/viewer/click.ts:29). First finger presses at x=600, moves to 604, then drags to 700. A second finger lands at 740; the first moves to 701. `press.held` still contains the move to 604, which is replayed before the second press, rewinding both input handlers’ coordinates. A real-rig probe observed zoom factor **136/39 = 3.487**, instead of **40/39 = 1.026**, also corrupting the pan baseline. **Fix:** clear the held event when movement starts passing through, and replay only while still below the threshold. Add this drag-then-pinch regression alongside the existing under-threshold case. An in-memory repair passed both scenarios.

Other areas:

- **Input:** ordinary mouse, pen and touch taps/drags, right-button pan, wheel and walk-touch probes passed. No separate damping or camera-floor regression found.
- **Merge:** one subscription per consumer to the shared look-target hook; no duplicate action wiring. E still uses doors, orbit clicks cannot operate them, and snapshots retain both `doors` and `label`.
- **F30:** reads the real card, prompt and crosshair each animation tick after the app. Its assertions would reject either sticky-card or sticky-prompt failure. It does not independently assert rendered-frame continuity using `lastDrawn.frame`.
- **Collection:** all 259 pieces cover 94 artwork IDs; all 94 artworks were found by both queries. Tagged/untagged builds retain 38 meshes, 40,290 triangles and identical scene bytes across 12 samples. Catalogue content uses text nodes; links introduce no automatic request.
- **Bounds:** merged model has 744 meshes and 1,579,520 triangles. All 298 scanned source/test/script files satisfy the 500-line limit. Spec, layout rules and Gates are coherent.

TypeScript, changed-file lint and diff checks passed. Browser suites, rendered layouts at both sizes, and timing budgets were not rerun. No files changed.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F29 | Verified for pinches that start under the slop | Closed, but see F36 | None |
| F30 | Verified: the walk rejects a card left up at a door and a prompt left up at an artwork | Closed | None |
| None | The merge: one subscription per consumer, E still uses doors, both `doors` and `label` in the snapshot | Closed | None |
| F36 | After a drag passes the slop, a held move from below it is replayed when a second finger lands: a pinch scaled 3.487 | Accepted. This was the third repair of this gate, so the coordinator asked for it as a small state machine, tested by one table of sequences | `42722e9`: idle, pressing and passing states; one table-driven test of eight sequences on the real rig, the drag-then-pinch row red at `1fd3a50` |

## Verification

Above.

## Round outcome

F29 and F30 closed; F36 repaired in `42722e9`; review 11 is a focused check.
