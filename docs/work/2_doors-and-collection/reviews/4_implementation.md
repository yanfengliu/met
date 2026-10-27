# Review 4: implementation

## Target

Repository `met`, branch `walk2`: `a9f6f5a..c2b6f44` (13 files, +329/−68), given to the reviewer as a diff on stdin with the snapshot worktree moved to `c2b6f44`. `8b64510` repairs review 3's F18–F20 and gives the file-walking convention tests an explicit timeout; `c2b6f44` finishes contract C2 for M2a and M3b, which started from `a9f6f5a`: `ModelPicker.register` and `unregister` for viewer-side stand-ins with tags of their own, and `WalkMode.onLookTarget`, one hook for each change of the look target. The C2 completion came from a fresh whole-effort check run per R8 while M1 was in repair (see the plan's amendments after M1).

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m1-r.md` (ignored). By its own account it ran 24 focused test bodies and typecheck, restored the old transparency rule (three bodies fail), replayed the stair assertions on eight simulated walks against `db4cc47`'s eye and a camera-only 3.1 cm dip (all eight red under each), probed registration, release and garbage collection of registered meshes and BVHs, and probed the hook through re-entry, the timeline taking pieces away and back, exit and unsubscribing. It did not run `verify` or the browser.
- Coordinator: the standard shot set at `c2b6f44` against the worker's at `a9f6f5a`: all 60 images identical. `npm run verify` at `c2b6f44` in the snapshot worktree: 497 unit tests in 52 files, typecheck, lint, build and 69 e2e green; ready 3.3 s cold; 736 meshes and 1,579,120 triangles.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

One low-severity finding at `c2b6f44`; no implementation defect found.

1. **Low (P3) — [AGENTS.md:84](/C:/Users/38909/Documents/github/met-worktrees/review-m1/AGENTS.md:84): the frame-interval bound remains overstated.** The text says under 16.7 ms, but `expectWalkingBudget` allows a median interval below **18.37 ms**. I confirmed `{work: 15, gpu: 15, interval: 18}` passes. State the actual bounds: median work and mean GPU-synced render below 16.7 ms; median frame interval below 18.37 ms. Clarify the corresponding spec wording too.

The other areas are sound within the verification bounds:

- **R1:** rejected tagged glass blocks correctly; zoom still stops at glass. Restoring the old transparency predicate makes three test bodies fail.
- **R2:** `lastDrawn` copies the camera actually passed to the renderer, and publishes a detached, frozen snapshot. The exact stair assertions passed eight simulated walks; all eight failed with `db4cc47`’s eye, and all eight failed with a camera-only 3.1 cm dip.
- **R3 and timeout:** route directions and walking/running locations now match the tests. Both file-walking tests receive the explicit 30 s timeout.
- **C2:** shared traversal preserves layers, cut, visibility, instance count and transparency behavior. Registered tags remain separate; unregister removes meshes from both queries, and garbage-collection probes confirmed mesh, geometry and BVH release. Matrix changes work without re-registering **provided bounding bounds stay current**, as documented. Hook probes passed re-entry, timeline disappearance/reappearance, exit and unsubscribe behavior. No door or label implementation leaked into the contract.

TypeScript checking and 24 focused test bodies passed in an in-memory harness. Browser/GPU e2e and full `verify` were not run; the stair probe used a renderer recorder at fixed 60 Hz. No files changed.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F18 | Verified: a rejected tagged piece stops the ray; the zoom still stops at glass | Closed | None |
| F19 | Verified: the checks run on the camera handed to the renderer | Closed | None |
| F20 | Verified | Closed | None |
| F21 | AGENTS.md's Gates text puts the frame interval under 16.7 ms, but the check allows a median under 18.37 ms (16.7 ms plus 10%) | Accepted | The coordinator's merge commit: AGENTS.md and the spec state the three bounds as checked |
| None | C2's completion: registered meshes count as the timeline's do by layers, the cut, visibility, count and transparency; a matrix change needs no new registration while the mesh's bounds stay current | Closed | M2a keeps each stand-in's bounds current through its swing |

## Verification

Above. Main was fast-forwarded to `c2b6f44`, and the coordinator's commit on it fixes F21's wording and records reviews 3 and 4.

## Round outcome

F18–F20 verified and F21 fixed in wording; M1 is merged. C2 is frozen for M2a, M2b and M3b.
