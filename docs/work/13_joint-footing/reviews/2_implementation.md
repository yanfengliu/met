# Review 2: implementation

## Target

The met repository at `c2a9bcc`, the repairs of review 1's findings: the diff `e6bc4eb..c2a9bcc` (`src/walk/collision.ts`'s `LineCrossings.facings` and `setBox`, `src/walk/footing.ts`'s winding in `Footing.under`, `src/walk/walker.ts`'s rise counted from the feet in `ontoRims`, and `src/walk/settle.test.ts`). The work unit's record, `141d1cf`, landed after it and changes only docs.

## Reviewers and coverage

- **Codex:** a focused re-review of review 1's repairs, which changed logic after review (fleet canon R10), run by the coordinator's review driver. codex-cli 0.163.0, `gpt-6-astra` at `xhigh`, approval `never`, sandbox `read-only`, `--ephemeral`, the prompt and the diff on stdin, a detached worktree at `c2a9bcc` as its working directory. It ran 732 s; the runbook's check of its log found no command that exited `STATUS_DLL_INIT_FAILED`. It ran 63 of the repository's test bodies through a harness of its own in memory, as Vitest could not write its temporary folder in the sandbox, and changed nothing. Its citations outside the diff hold at `c2a9bcc`: `src/walk/collision.ts:481` is the line that drops an edge hit, and `src/model/closure.test.ts:383` and `:386` read the crossings' heights and work out the winding apart from them.
- **Claude:** not run in this round. It was a focused check by the lane that found review 1's findings.

The worktree's `git status`, `git diff HEAD` and HEAD were the same before and after. Local file paths in the report are shortened to repository paths; nothing else is changed.

## Reports

### Codex (`gpt-6-astra`)

**Verdict: request changes.** The stated F6 and F7 regressions are repaired, but two boundary failures remain at `c2a9bcc`. No files were changed.

1. **Major — deduplicated crossings can falsely mark the space above a valid rim as inside.** `src/walk/footing.ts:76`

   The winding sum assumes crossing multiplicity survives deduplication. It does not: `src/walk/collision.ts:481`, outside this diff, merges same-facing edge hits from distinct overlapping parts.

   Reproduced with two outward-wound `MeshBuilder.box` parts:
   - `[-2,0,-2] → [2,2,2]`
   - `[-1,0,-1] → [3,2,3]`

   Apply scale `(0.03125, −0.125, −0.03125)` and translation `(0.484375, 0.25, 0.015625)`. Its determinant is **positive**. At `(x,z)=(0.5,0)`, the real collision query returns heights `[0,0,0.25]` and facings `[-1,-1,1]`. The new rule therefore reports winding **1 above the entire piece**, rejecting its exposed top.

   With workspace ground −1, a floor at 0, the walker at `(0.2,0,0)`, and an opposite box `[-0.125,0,-0.125] → [-0.075,0.25,0.125]`, current `place` leaves feet at **0**, and settling returns **`kept`**. Restoring the parent’s parity check places and settles it at **0.25**.

   **Suggested repair:** use an occupancy query that preserves distinct-part multiplicity or resolves ambiguous edge rays. Preserve the existing walking path. Add this placement/settling regression and assertions on the actual `LineCrossings.facings`. The existing closure gate reads runtime **heights** at `src/model/closure.test.ts:383`, then computes winding independently at line 386; it does not validate this new field.

2. **Minor — F7 still excludes the exact lower boundary at some heights.** `src/walk/walker.ts:177`

   Move the existing deck fixture to **Y=0.75** and call `place(0, 1.1, 0, 0)`. The deck is nominally exactly **0.35 m below** the request, but feet land at **−1**.

   `1.1 − 0.35` becomes `0.7500000000000001`; the reconstructed `top − length` retains that value. The strict candidate/hit bounds in `src/walk/collision.ts:410` and line 422 exclude the deck. The same failure occurs at deck height **0.875**, requested from **1.225**. The committed 1 m deck happens to pass from exactly 1.35 m.

   **Suggested repair:** make the inclusive lower boundary tolerant of floating-point error in both candidate selection and hit filtering, while retaining the 0.36 m refusal. Add exact-boundary tests at multiple elevations.

Other conclusions:

- The inverse-transpose calculation is appropriate for outward normals under nonsingular affine transforms. The model’s closure checks constrain winding and prohibit mirrored instances. Door leaves do not supply ground or crossings: `src/walk/door-world.ts:119`.
- Sampling at **1 mm** is weaker than checking the former **1–2 mm span**. A fixture with another solid beginning 1.5 mm above a valid top is now accepted. That demonstrates a tolerance change, but did not demonstrate underside support.
- Counting rise from the feet preserves `place`’s second read and both `settle` reads: their lower bound already equals the feet. The walking-step logic remains unchanged.
- `facings` adds an array and one stored number per retained crossing; the normal/sign calculation already existed. I found no added crossing query in ordinary walking. Browser performance remains unmeasured.

Verification: **63 repository test bodies passed** through an in-memory TypeScript/Node assertion harness, including settling, crossings, walker, doors, choir lanes, and closure. Both new regressions failed with their repairs reverted. Tests caught reversed winding, `>= 0`, counting faces at/above the sample, and empty facings; changing `<` to `<=` survived.

An observational check of the closure test’s **57,352 model lines** found balanced runtime facings. Across **120 moving-piece transforms**, boxes, ground hits, and capsule pushes matched the parent. **`tsc --noEmit` passed.**

Standard Vitest, full verification, browser checks, performance gates, and the author’s placement scan were not run under this read-only review. The harness is narrower evidence than those gates. No browser, server, or temporary artifact was created.

### The driver's checks

The review driver ran its own probes on the same tree, in memory through a TypeScript loader, with e6bc4eb's `src/walk/footing.ts` swapped in for the parity rule. It reproduced both findings and found the opposite direction of the first. One piece of two parts, the shorter from local Y 0 to 1 and the taller from 0 to 2, scaled (±0.03125, 0.25, ±0.03125), sets their bottoms in one plane with their diagonals crossing at (0.5, 0). The query merges the two bottoms there into one crossing, `[0, 0.25, 0.5]` facings `[−1, 1, 1]`, so the winding reads the inside of the taller part as outside. `place(0.2, 0, 0)` then stands the walker on the shorter part's top, 0.25 m up inside the taller. The parity rule does the same, so this predates review 1's repair. It falls within the bound `src/walk/collision.ts:448-449` states. With the piece moved 25 to 75 µm so the line misses the coincident edges, both directions read right. Nothing checks `facings` on the real model, as the closure gate works out the winding itself.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F8 | The crossing query counted hits at one height facing one way on edges once, whatever the edges, so where edges of two overlapping parts' faces in one plane cross at the line it dropped a crossing. Its winding then read outside as inside, refusing a valid rim (Codex 1, major), or inside as outside, standing the walker on a part's top inside another (the driver's check, which parity does too); and no test read `facings` on the real model | Accepted: both reproduced at `c2a9bcc` | The crossing rule moves to `src/walk/crossing-rule.ts`: a merge counts only where the hits lie on one edge or corner of their triangles by the places of its ends; where they lie on edges that are not one, the line is read again about 30 µm off, where it meets no edge, and every hit there counts. The walking step reads no crossings and is unchanged. Tests: both directions set down and settled (`src/walk/settle.test.ts`), their crossings and facings (`src/walk/crossings.test.ts`), and the closure gate's walk reading checks the facings on its 57,352 lines of the model. All red at `c2a9bcc`. Reviews 3 and 4 refined when the second reading stands (F10, F16, F17) |
| F9 | A rim exactly a step under the height asked was in `place`'s window or out of it as `top − length` rounded: decks 0.75 and 0.875 m up asked from a step over them were fallen through (Codex 2, minor) | Accepted: reproduced | `Walker.ontoRims` reads its window 1 µm past its foot (`FOOT_SLACK`), which lowers both bounds `groundBelow` derives from the length; the walking step's own reads keep theirs. Test: decks 0.75, 0.875, 1, 2.5 and 10.875 m up asked from a step over them and from 0.36 m, the refusal; red at `c2a9bcc` at 0.75 and 0.875 m |

## Verification

The repairs are commit `f6fa16a` on branch `jointfix`, from origin/main `1002016` (`1002016..f6fa16a`).

- Measured first, over work unit 13's scan of 486,052 places (its plan). The lines `place` reads: 37,010 reads by `Footing.under`'s probes (14,476 distinct lines), 4,407 with a hit on an edge and 3,998 with hits merged at one height, none of them a merge of faces that share no edge or corner at the line. And 10,806 reads of the centre's line (3,857 distinct): 5,651 with a merge, 3 of them unshared, each a T-junction of one welded part of a floor at Z −69, none across parts. So on the finished model F8 does not occur at the scan's places; its fixtures are what it guards.
- The trigger was chosen by the scan, `settle(0)` read after each `place`. Reading again every line that merges hits changed it at 10,234 places: 10,226 walkers moved as before but by up to 1.05 cm (7,212 of them under 2 µm), and 8 kept walkers by Z −138 lifted from 4.71 to 19.9 m. Reading again every line that meets an edge changed 10,302 places and `place` at 2. Reading again only where the merged hits lie on edges that are not one changed nothing. The scan run again on the landed code and on the repaired code gives the same `place` result to 1e-9 m and the same `settle(0)` result at all 486,052 places, and the same feet at the spawns, the route starts, ends and points and `routes.spec`'s fixed places, doors closed and open (237 places).
- The walking step is unchanged: routes R1 to R7 walked both ways, running and walking, doors open and closed, at 60 frames a second, give the same 175,217 frames of `Walker.save` state byte for byte on both, and no crossing query while walking.
- Red proofs: the new and changed tests fail at `c2a9bcc` (six), with the line in doubt not read again or every merge taken for one edge (five), and with no slack at the window's foot (one); a slack of 1.1 cm turns the 0.36 m refusal red. Reading again every merge, or every line on an edge, turns the pin of a piece's own outer corner red. The closure gate's facings check is red on all 57,352 lines with the facings turned over, all 0 or none, and on 342 with the normals taken out by the matrix rather than its inverse transpose.
- Gates: `npm run verify` passed on `f6fa16a`'s tree through the gate lock with `MET_PORT=5367`: 724 unit tests in 80 files, typecheck, lint, build and 125 e2e tests, 10.4 min. So did the Load rule's three runs of `routes.spec` and `walk.spec` at 4×, in a row: 21 passed each, the 2 unthrottled budget walks skipped, 136, 130 and 129 s.
- Review 3, Codex and Claude, focused on these repairs (`3_implementation.md`), found F10 to F15. All were accepted and repaired in `1d9eb63`.

## Round outcome

Codex requested changes: one major finding, F8, and one minor, F9; the driver's own check found F8's other direction. Both were accepted and repaired in `f6fa16a`, each with a test red without its repair. The repairs changed logic that no review had read, so review 3 followed.
