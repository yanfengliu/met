# Review 7: implementation

## Target

Repository `met`, branch `labels`: `61f0648..e06cc70` (10 files, +648/−266), the repair of review 6, given to the reviewer as a diff on stdin with the snapshot worktree moved to `e06cc70`. (A first run was stopped for a computer restart and run again in full.)

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m3b-r.md` (ignored). By its own account it ran 55 targeted unit tests, TypeScript and lint on the changed files, put each repair's defect back in memory to see its test fail, and probed the click gate with mouse and touch input; it ran no browser check.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

1. **P2 — F25 introduces a pinch-zoom jump.** [click.ts:34](C:/Users/38909/Documents/github/met-worktrees/review-m3b/src/viewer/click.ts:34) suppresses moves from the touch-coordinate bookkeeping in `bindZoomInput` as well as OrbitControls. Reproduction: first finger presses at x=600, moves to 604, second lands at 644, then first moves to 605. The actual zoom factor is **44/39 = 1.1282**, instead of **40/39 = 1.0256**. An in-memory probe reproduced this; OrbitControls’ two-finger pan also starts with stale coordinates. **Fix:** keep touch positions current while withholding camera movement, and initialize pinch/pan from current positions when another finger joins. Add a real-touch regression test; the existing pinch test checks only event delivery.

2. **P2 — F28’s required artwork-to-door check is missing.** [labels.spec.ts:113](C:/Users/38909/Documents/github/met-worktrees/review-m3b/tests/e2e/labels.spec.ts:113) compares card visibility with the crosshair attribute, but never reads prompt visibility or requires a door-target frame. Its transition is artwork → floor → artwork; this revision contains no door-prompt UI. A prompt remaining visible beside an artwork card would escape this check. **Fix:** test artwork → door → artwork through real input on the integrated page, observe both elements each frame, and require prompt-visible frames. Until then, Gates/spec overstate verification of the exception.

F25’s mouse repair otherwise looks sound: moves are held before the threshold, accumulated travel prevents out-and-back clicks, and ordinary drags retain their settled displacement. Right-button pan matched the original behavior. F26’s preset dismissal and F27’s per-frame cut/layer checks look correct. No additional regression found in damping, camera-floor handling, wheel/keyboard input, walk handling, frozen snapshots or network behavior.

**Verification:** 55 targeted unit tests, TypeScript, changed-file lint and diff checks passed. In-memory mutations made the relevant unit tests fail when the repairs were removed. All 290 checked source/test/script files are below 500 lines. Browser suites—including `camera.spec` and `controls.spec`—and visual layout checks were not rerun in the read-only environment. Repository unchanged.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F25 | Verified for the mouse: moves held before the slop, out-and-back travel never a click, drags and the right-button pan unchanged | Closed, but see F29 | None |
| F26 | Verified | Closed | None |
| F27 | Verified | Closed | None |
| F29 | F25's gate also holds back the touch positions the pinch zoom and the two-finger pan start from: a pinch scaled 1.128 where 1.026 was meant | Accepted | `fed19d7`: touch positions kept current while camera movement is held; a pinch or pan starts from current positions; a real-touch test, red at `e06cc70` |
| F30 | The check that the card and the door prompt never show together never meets a door, as the prompt was not on the branch | Accepted | After M2a merged (review 10): on the integrated page, looking from an artwork to the Bank door ("Locked") and back through real input, both read every frame, prompt frames required |

## Verification

The worker's at `fed19d7`: unit tests (57 files, 521), typecheck, lint and build green; e2e 78 of 79, the miss being `walk-screen.spec`'s fold check, which also failed on main and was fixed there in `fd781de`.

## Round outcome

F25–F27 verified; F29 repaired in `fed19d7`; F30 waits for M2a on main; review 10 checks the integrated branch.
