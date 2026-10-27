# Review 8: implementation

## Target

Repository `met`, branch `doors`: `52a0fb0..7b7fe94` (11 files, +265/−130), the repair of review 5, given to the reviewer as a diff on stdin with the snapshot worktree moved to `7b7fe94` (main `acc0e0a` merged in at `52a0fb0`).

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m2a-r.md` (ignored).
  - By its own account it ran 62 test bodies in an in-memory harness, TypeScript and changed-file ESLint.
  - It put back the old geometry, which fails all 146 poses, and the old pivot alone, which fails too.
  - It cast the leaves against the real sequence at 2.5° steps, and replayed the frame callback with a renderer recorder.
  - It ran no browser or GPU check.
- Coordinator: `npm run verify` at `7b7fe94` passed: 532 unit tests in 55 files, typecheck, lint, build and 74 e2e. The shot set against main's changed only at the entrance doors, plus 39 px in one row of the Engelhard Court, where the tagged Bank door is now drawn from a mesh of its own. Ready was 2.5 s cold.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

Two medium findings remain, plus one wording mismatch.

1. **Medium — F22 remains incomplete at the columns.** [door.test.ts:103](/C:/Users/38909/Documents/github/met-worktrees/review-m2a/src/model/lib/door.test.ts:103) checks only the unit’s frame and fanlight. On the real sequence, four entrance leaves intersect the adjacent Ionic bases (`hunt-arches#4`) at every sampled 2.5° pose, including ±90°. The closed middle-right leaf’s intersection spans X 0.750–0.806 m and Y 4.204–4.298 m. This is a remaining installation defect, rather than a newly introduced collision. **Fix:** reconcile the installed leaves/frame with the column bases while preserving the opening, and extend the swing check to the surrounding model geometry.

2. **Medium — F24 still observes callback-end state, not the first drawn state.** [doors.spec.ts:219](/C:/Users/38909/Documents/github/met-worktrees/review-m2a/tests/e2e/doors.spec.ts:219) reads live facts after `callback(now)` returns. Replaying the actual frame callback with a renderer recorder, moving synchronization after rendering within that callback produces a closed first frame, while this probe records `open, 90°` and passes its facts/timestamp comparisons. **Fix:** observe the first render’s door matrices/state and camera at the render boundary; add this same-callback mutation control. The current production setup order itself is correct.

3. **Low — The specified meeting gap is inaccurate.** [spec.md:137](/C:/Users/38909/Documents/github/met-worktrees/review-m2a/docs/design/spec.md:137) says each leaf is 4 mm clear of its partner. Their closed edges are −0.004 and +0.004 m: an **8 mm** gap. **Fix:** distinguish the 4 mm perimeter clearance from the 8 mm meeting gap.

Other areas checked sound:

- The transom, sill and jamb repair works. Restoring the old geometry reproduces all **146** failing entrance poses; restoring only the old pivot also fails. The paired entrance leaves remain mutually clear.
- F23’s material change affects only entrance leaves. Frames, transoms and other bronze still cast. Neither closed leaves nor stand-ins cast, so there is no old leaf-pose shadow to retain when a swing ends. The revised timing code covers real opening/closing input facing inward, without added pacing.
- Lifecycle, determinism isolation, cut/cap, picking, locked-door collision, window-parts, collection clearances and budgets passed the focused checks. Detached door facts remain intact.

**Verification:** 62 existing test bodies passed in an in-memory harness, plus TypeScript and changed-file ESLint. Vitest itself was blocked before running tests by its directory-creation attempt. Browser/GPU tests and shadow-image comparisons were not run, so I cannot independently confirm the reported timing mutation or vestibule shadow’s visual acceptability. No files changed.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F22 | Verified against the unit's own parts | Closed by F31 | None |
| F23 | Verified: the change touches only the entrance leaves, other bronze still casts, and no stale shadow is left after a swing | Closed | None |
| F31 | Four entrance leaves pass through the neighbouring Ionic bases at every pose; the swing check looked only at the door unit | Accepted: the second attempt at F22, so the check now reads the finished model | `6198d1a`: the entrance doors stand behind the columns, as photos S8 and S10 show; `src/model/door-fit.test.ts` sweeps every leaf against the finished model's solids, red at `7b7fe94` (four leaves through the plinths in all 73 poses) |
| F32 | The first-frame probe reads the state after the frame callback, not what was drawn | Accepted: the second attempt at F24, so the probe reads at the render boundary | `6198d1a`: each door is read back from its meshes right after the render (`perf.lastDrawn.doors`); red with the sync moved after the render |
| F33 | The spec gives the partner leaves a 4 mm gap; it is 8 mm | Accepted | `6198d1a`: the spec states the 4 mm clearance and the 8 mm meeting gap; a test checks the gap |

## Verification

Above.

## Round outcome

F22 and F23 closed; F31–F33 repaired in `6198d1a`. Review 9 is a focused check of the repair.
