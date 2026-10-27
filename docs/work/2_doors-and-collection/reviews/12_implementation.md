# Review 12: implementation

## Target

Repository `met`, branch `reach`: `691b8f7..69cfa11` (12 files, +681/−19), milestone M4, added after the labels worker found the Engelhard Court unreachable on foot. The milestone has two parts:
- a reachability gate (`src/walk/reach.ts`, `src/model/reach.test.ts`): a flood fill over 0.5 m cells from the Great Hall spawn with the real walker, the Hunt central doors open and every other door closed, required to reach every space holding artworks and every preset and route end;
- two corridors from the floor map through McKim, Mead & White party walls, cited in `docs/research/interior.md`, each 4.0 m high (an estimate). One runs from gallery 374 to the Engelhard Court's east walk, the other from Exhibition Gallery 199 to gallery 549 (the Petrie Court). Route R6 walks into the Engelhard Court.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m4.md` (ignored). By its own account it ran 36 existing test cases in memory, typecheck and changed-file lint; repeated the fill (about 62,600 places in about nine seconds); sealed each court in turn; built a bridged-groove fixture and a wall-crossing segment to test the gate itself; and walked the Engelhard mezzanine stair. It did not run `verify` or the browser.
- Coordinator: `npm run verify` at `69cfa11`: 552 unit tests in 58 files, typecheck, lint, build and 75 e2e green. The shot set against main's changed only in 8 cut and floor views, by at most 45 px, at the two openings. 746 meshes and 1,579,520 triangles.
- Claude: not run. The milestone's worker was a Claude session.

## Reports

### Codex (`gpt-6-astra`, xhigh)

Two material findings at `69cfa11`:

1. **High — restarting a move can teleport the fill onto another floor.** [src/walk/reach.ts:210](/C:/Users/38909/Documents/github/met-worktrees/review-m4/src/walk/reach.ts:210) calls `Walker.place`, which probes downward beneath the centre rather than preserving the walker’s supported position. I reproduced this with a 0.2 m groove between floor slabs: continuous walking bridges it at Y=0, but the fill restarts over the groove at Y=−3 and records 60 lower-floor places without reporting a fall. The actual model also produced restart relocations of 6.86 m. **Fix:** restore saved walker state without placement or teleportation, and add a bridged-groove regression plus continuous replay of discovered paths.

2. **Medium — the visibility check accepts lines through solid walls.** [src/model/reach.test.ts:87](/C:/Users/38909/Documents/github/met-worktrees/review-m4/src/model/reach.test.ts:87) treats zero capsule displacement as proof of unobstructed sight. A segment from `(−2, 1.6, 0.2)` to `(2, 1.6, 0.2)` through a centred, 0.8 m thick wall returns zero displacement and therefore “clear.” An artwork behind a partition can pass this requirement. **Fix:** use an intersection query that detects crossings through triangle interiors, retaining the stated clearance requirement, and test a wall crossing explicitly.

The remaining checks were sound within these limits:

- The fill repeated at **62,600 places, about nine seconds**. Its door, grid and `t=N` bounds are explicit. Sealing Engelhard independently leaves its eight artworks, preset and R6 endpoint unmet; sealing Petrie leaves its ten artworks and preset unmet.
- Passage dimensions match the research notes, including the documented Petrie offset and estimated height. Both thresholds remain at **Y=4.11**. Placement checks pass. No additional geometry defect emerged from code inspection and existing captures.
- R6 passes headlessly both ways. The e2e helper uses real keys/drags and position-based completion under throttling; e2e covers **outward only**, as documented.
- The Engelhard stair stops at **Y=7.7975** and can be descended without leaving the ground. It is an escapable dead end. Excluding spaces without collection/preset/route targets fits this gate’s stated scope; this is not a global trap detector.
- Changed files remain below 500 lines. The model has **746 meshes and 1,579,560 triangles**, within budget.

Verification: 36 existing test cases passed in an in-memory harness; typecheck and changed-file lint passed. I did not rerun full `verify`, browser/throttled runs, or fresh cap captures, and did not independently re-decode the live map. The repository remains untouched.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F40 | Restarting a move puts the walker down by a probe under its centre, so the fill can drop to another floor without a fall: a bridged 0.2 m groove sent it 3 m down, and the real model saw jumps of 6.86 m | Accepted: a gate that teleports cannot prove reach | The `reach` repair (review 14) |
| F41 | The sight check reads zero capsule movement as a clear line, so a line through a 0.8 m wall passes | Accepted | The `reach` repair (review 14) |
| None | The passages match their sources with level thresholds; the Engelhard mezzanine stair is a dead end a walker can go back down from, not a trap; spaces without artworks, presets or routes are out of the gate's scope | Closed | None |

## Verification

Above.

## Round outcome

Two findings accepted, repair in progress; M4 is not merged.
