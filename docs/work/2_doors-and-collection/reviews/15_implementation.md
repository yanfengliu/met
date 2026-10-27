# Review 15: implementation

## Target

Repository `met`, branch `doors2`: `d84bba0..7b054d7` (34 files, +1,814/−272), milestone M2b, given to the reviewer as a diff on stdin with a detached snapshot worktree at `7b054d7`.
- The door leaves get a dynamic part of the walk collision (`src/walk/door-world.ts`), checked swept against the walker's capsule both ways and advanced with the physics substeps. A blocked closing leaf waits.
- A door whose step completes again around the walker opens.
- The door-fit test gains containment and partner checks (review 9's F34 and F35).
- The Weston door works, with a wall between galleries 528 and 529 moved onto its west reveal.
- Route R1 opens the entrance door with E.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m2b.md` (ignored). By its own account it:
  - ran 174 targeted test bodies in memory, TypeScript and changed-file lint;
  - compared 12,750 leaf poses with the drawn matrices;
  - ran M4's reachability gate with the real `DoorWorld`;
  - confirmed the collision's mutation controls fail for omitted leaves, a disabled obstruction check and endpoint-only sweeping.

  It ran no browser check.
- Coordinator:
  - `npm run verify` at `7b054d7`: 596 unit tests in 68 files, typecheck, lint, build and 86 e2e green.
  - The standard shot set against main's at `d84bba0`, read at native resolution. Only four images changed. The Weston door is unchanged itself; through its fanlight the moved 528/529 wall shows. Three main-floor views changed by at most 47 px, all at that wall.
  - The worker's throttled runs: routes R1–R6 and the plaza walk, three times in a row at 4×.
  - The slowest walking frame through door cycles: 5.7 ms. The collision builds in 50 ms.
- Claude: not run. The milestone's worker was a Claude session.

## Reports

### Codex (`gpt-6-astra`, xhigh)

One material finding at `7b054d7`:

1. **P2 / Medium — E fails to reverse a blocked closing door.** [src/viewer/doors.ts:232](C:/Users/38909/Documents/github/met-worktrees/review-m2b/src/viewer/doors.ts:232). Open the entrance inward, stand between its leaves, then close it. In the fixture it stops at **+66.413°**. Pressing E selects **−90°**, based on the walker’s current side, instead of reopening toward +90°. It therefore keeps trying to move into the walker and remains stationary while reporting “opening.” Repeated E presses do not release it. The mirrored case also fails. **Fix:** preserve the existing swing’s side when reversing a closing door; choose the away direction when opening from closed. Add blocked-closing reversal tests on both sides. Preserving the side reopened both reproduced cases successfully.

Otherwise, within the checked bounds:

- **12,750 part poses** matched drawn matrices at float32 precision; no synchronization lag found.
- Timeline isolation, lifecycle/locks, F34/F35 controls, Weston’s passage and collection clearances passed. M4 also passed when substituted with the actual `DoorWorld`, including open entrance leaves.
- Budgets: **746 timeline meshes**, **1,579,576 triangles**, **16 door meshes including stand-ins**. File-length checks passed.

**Verification:** 174 targeted test bodies passed in an in-memory harness, plus TypeScript and changed-file lint. Collision mutation controls correctly failed for omitted leaves, disabled obstruction checks and endpoint-only sweeping.

Full Vitest/build/e2e, browser timings, throttled runs and rendered comparisons were not rerun. The mocked window-parts test could not run in this harness. Weston’s acknowledged square-versus-round head discrepancy remains visually unverified. `git diff --check` reports two extra EOF blank lines.

Repository unchanged; no task-owned processes remain.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F34 | Verified: the fit test finds a leaf inside a solid | Closed | None |
| F35 | Verified: partner leaves tried together | Closed | None |
| F43 | E on a closing door blocked by the walker picks the opening side from the walker's side, so the door pushes on into the walker and stays stuck "opening" | Accepted | `43887b2`: a closing door turns back on its own side; only a closed door opens away from the walker; a reversal test on both sides, red at `7b054d7` |
| None | Photo #33 may show the Weston doorway square-headed while the model keeps it round | Outside M2b: the head is older than this unit | Follow-up task, "Check the Weston doorway's head against the photos" |

## Verification

Above.

## Round outcome

One finding, repaired in `43887b2`; review 16 is a focused check.
