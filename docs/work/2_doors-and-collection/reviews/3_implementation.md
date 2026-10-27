# Review 3: implementation

## Target

Repository `met`, branch `walk2`: `6ce8ab6..a9f6f5a` (48 files, +2,061/−495), milestone M1, given to the reviewer as a diff on stdin with a detached snapshot worktree at `a9f6f5a` as working directory. Main `6ce8ab6` is merged into the branch, so the diff is the milestone alone: the eye on stairs, the walking screen and the walk's numbers, contracts C1 (piece tags) and C2 (the hit query and the look target), and the fixes for the Dendur pool, the gate's axis and the dead end at the top of the Grand Staircase (a doorway into gallery 600, route R5).

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m1.md` (ignored). By its own account it ran 124 focused test bodies, typecheck and lint; it probed the stair formula (all 24 real-model walks pass, all 24 fail with the old formula, reversals up to 14.8 cm, and all 24 fail without the ease), walked both dais flights both ways, and checked the model totals (736 meshes, 1,579,160 triangles) and the composition, year-in-chapter and file-length gates. It did not run the browser tests, the throttled runs or the frame and build budgets.
- Coordinator: the standard shot set at `a9f6f5a` against main `6ce8ab6`, read at native resolution. The top of the Grand Staircase (`int-grand-stair-west`, 0.35%) shows the new doorway through the blind arch, with gallery 600's paintings beyond; gallery 600 (`int-european-paintings-600`, 0.89%) shows the doorway's granite lining on its east wall; the Medieval Hall's east arch (`int-medieval-hall-east`, 182 px) is the lower drop arch under the doorway, marked as an estimate in `vaux-shell.ts`; the front views (`ref-front-axis` 130 px, `ref-front-street` 36 px, `walk-plaza` 62 px) see the doorway through the entrance and the Great Hall; every other view differs by at most 101 px. The new walking-screen captures at 1280×720 and 390×844 show the crosshair at the centre, the hint, the menus' buttons and the folded bar, nothing overlapping. The model went from 729 to 736 meshes and from 1,578,674 to 1,579,120 triangles; ready 3.6 s cold.
- Claude: not run. The milestone's worker was a Claude session.

## Reports

### Codex (`gpt-6-astra`, xhigh)

Reviewed `a9f6f5a` against `6ce8ab6`.

1. **Medium — Closed glazed doors do not block the look target.** [src/viewer/pick.ts:97](C:/Users/38909/Documents/github/met-worktrees/review-m1/src/viewer/pick.ts:97). Reproduced: a tagged glass door 3 m away is rejected as beyond its 2 m reach, then passed through because it is transparent; artwork 4 m away becomes the target. This contradicts the documented closed-door occlusion rule. Separate target acceptance from pass-through permission: vitrine glass may pass the ray, but a rejected door must block it. Add this case to `look.test.ts` before C2’s consumers land.

2. **Medium — The stair e2e gate does not observe the rendered camera.** [tests/e2e/stairs.spec.ts:42](C:/Users/38909/Documents/github/met-worktrees/review-m1/tests/e2e/stairs.spec.ts:42). It records `walk.eye`, which comes from WalkMode’s cached vector, rather than the camera supplied to rendering. A regression that adds a dip in `setWalkView`, or skips drawing movement frames, can leave these assertions green. Record the render-frame counter and actual camera position, assert agreement with the walker, and apply the monotonicity and jump checks to those rendered samples.

3. **Low — Gates text overstates coverage.** [AGENTS.md:88](C:/Users/38909/Documents/github/met-worktrees/review-m1/AGENTS.md:88) describes all routes both ways through real input; e2e walks R1, R3 and R4 only outward, and R5 returns only to the cross hall. Likewise, line 84 suggests running budgets in the interiors, but those calls use walking speed; only the plaza/front-step measurement runs. Correct the descriptions or add the missing cases so a green gate cannot be mistaken for that coverage.

The stair interpolation fix itself is sound: it interpolates matching eased endpoints without depending on a particular riser height or frame rate. All 24 real-model walks passed my in-memory probe; restoring the old formula failed all 24, with reversals up to 14.8 cm. Removing easing also failed all 24.

C1’s instance mapping and door isolation look sound. The original determinism assertions remain, with the landed-matrix grouping extended for doors. R5, pool escape, gate access and collection clearance passed their unit checks; additional probes traversed both dais flights both ways. The geometry choices match the recorded research descriptions. The walking UI and restoration logic look coherent, and the recorded desktop/mobile captures show no layout defect.

**Verification:** 124 focused tests, typecheck and lint passed. Model totals: **736 meshes, 1,579,160 triangles**; composition, chapter-year and file-length gates passed. I did not rerun browser tests, the three repeated 4× throttle runs, or browser performance budgets, so the 16.7 ms and navigation-to-ready 4 s claims remain unverified here. No repository files changed.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F18 | A transparent tagged piece the query rejects is passed through, so a closed glass door beyond its reach lets the look target reach an artwork behind it | Accepted: a closed door must hide what is behind it, and M2a and M3b build on this query | `8b64510`: only untagged transparent pieces let the ray on; a rejected tagged piece stops it; tested red at `a9f6f5a` |
| F19 | The stair e2e records walk mode's cached eye, not the rendered camera | Accepted: the gate must bind to what is drawn | `8b64510`: the checks run on the camera position of each drawn frame, which must agree with the walker's eye; still red with `db4cc47`'s eye |
| F20 | AGENTS.md's Gates text overstates the e2e routes' directions and the interiors' running budgets | Accepted | `8b64510`: running frames measured at the ends of R3 and R4; the directions stated exactly; walking every route both ways in e2e stays with the unit's integration |
| None | `src/repo-conventions.test.ts`'s line check timed out at 6.5 s against Vitest's 5 s default in a fresh worktree under load (coordinator) | Accepted as a test-bound defect, not a product one | `8b64510`: an explicit timeout sized to the files it reads |

## Verification

The coordinator's `npm run verify` at `a9f6f5a` in the snapshot worktree: the first run timed out `src/repo-conventions.test.ts`'s line check (6.5 s against Vitest's 5 s default, first reads in a fresh worktree under load); the rerun passed, 493 unit tests in 51 files, typecheck, lint, build and 69 e2e. The worker's at `a9f6f5a`: 493 unit and 69 e2e, and the route walks and the plaza walk three times in a row at 4× CPU throttle.

## Round outcome

Three findings accepted and repaired in `8b64510`; review 4 is a focused check of the repair.
