# Review 1: implementation

## Target

The repairs for round 0 (`reviews/0_implementation.md`, F0 to F6), staged on top of `795956f` and not yet committed, for the same reason as round 0's target. The repairs alone are the diff from round 0's tree `a905826321a0af2eb9ce339355642248c70b0e91` to this round's tree `1a6f36328494dbc87652120ae1788b1013677e1d`: 10 files, preserved under the ignored `tmp/review-runs/w5-r1/repairs.diff` (sha256 `bf683935461488c5ffa255542033211cef4e92a677474edee40cb0fcbc42029a`). The whole change, `git diff --cached 795956f`, is `tmp/review-runs/w5-r1/target.diff` (sha256 `4bd2449ad1f3c6c86de6e5299c1bfbfbf935fcd29950c36bbdc2ce3683c9c9ec`). Round 0's tree was rebuilt by applying round 0's preserved patch to `795956f` in a separate index. In code: `src/model/closure.test.ts` (the walk reading's four lines a face, each meeting its own piece; names by step, mesh and slot; the shape key), `src/model/core/arches.ts` (one list of doors; overlapping doors refused), `src/model/lib/check.ts` (`levelFaces`), and the builders' tests. In docs: AGENTS.md, the spec, the devlog, the plan and round 0's record.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-28 with the same focused prompt: whether F0 to F6 are resolved as their dispositions say, and four lenses (the walk reading's remaining ways to pass without reading, and its lines' weights and height match; the overlap check against every caller and its error message; `levelFaces`; the docs and repo rules). The repairs came on stdin. Raw captures stay under the ignored `tmp/review-runs/w5-r1/`.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker. It ran 38 existing test callbacks through an in-memory loader, the mutations of each repair, `levelFaces` probes, the census, a byte-for-byte comparison of the model's geometry and instance buffers with round 0's, a typecheck and ESLint on the changed code.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. The lane rule passed: one model key, the pin. It ran Vitest on the five changed test files (38 tests), tsc, ESLint, `git diff --cached --check`, the walk reading and `openAlong` under each mutation, `levelFaces` on wound-up copies, the census and 1,600 touching-door pairs, and left the worktree unchanged.

## Reports

Each report is as its reviewer wrote it, but for Codex's link, whose absolute target is shortened to the repository path.

### Codex (`gpt-6-astra`)

No blocker or major found. One minor defect remains in F2.

1. **Minor — touching doors with decimal dimensions can be rejected.** `src/model/core/arches.ts:127` compares endpoints without allowing floating-point rounding. A `10 × 5 × 1` wall with doors `{x:0,width:2.2,height:3}` and `{x:2.3,width:2.4,height:3}` should accept their shared edge at x=1.1. Instead, `2.3 - 2.4/2` evaluates slightly below 1.1, triggering the overlap error. Removing the guard in memory produces closed geometry. Allow a small numerical tolerance and add this decimal-touch fixture alongside a genuine-overlap control. No current model caller is affected.

Disposition:

| Finding | Status |
|---|---|
| F0 | Resolved: missing crossings and incorrect instance numbering fail. |
| F1 | Resolved: unique labels; all 113 bottomless walls fail, including the 12 arcade panels. Sampling limits remain explicit. |
| F2 | Partially resolved: overlaps are refused, but decimal touching fails as above. |
| F3 | Resolved: both tolerances are documented. |
| F4 | Resolved: revised census numbers reproduce. |
| F5 | Resolved: reversed bottom/foot winding fails the new assertions. |
| F6 | Resolved: sentences and collision-world description are corrected. |

Checks run:

- **38 existing test callbacks passed**, using an in-memory TypeScript loader and Vitest assertions, **not the Vitest runner**.
- Closure reading: **116 pieces, 20,208 lines**, approximately **197 ms**, maximum face-height discrepancy **4.41 × 10⁻¹³ m**.
- In-memory mutations reproduced failures for missing bottoms, missing feet, suppressed passage crossings, incorrect instance numbering, reversed winding and removal of overlap validation.
- `levelFaces` probes covered indexed/unindexed triangles, both windings, degenerate triangles and height exclusion.
- Census: **2,980 shapes**; before **2,385 open / 14,885 pieces**; after **2,370 / 14,771**.
- Current model geometry and instance buffers matched round 0 byte-for-byte.
- Typecheck, changed-code ESLint, staged whitespace check and line limits passed.
- Full verify, build and e2e were not run. Index matches target tree; no unstaged changes or files written.

Outside-diff reads included:

- `src/walk/collision.ts:1–480`; `src/walk/bvh-cache.ts:1–34`.
- `src/model/lib/builder.ts:1–130,202–300`; `src/model/core/shapes.ts:1–30`.
- `src/viewer/section-cut.ts:1–85`; `src/main.ts:85–110`.
- Callers: `medieval-hall.ts:85–110,145–214`; `vaux-shell.ts:55–120,218–245`; `weston-facade.ts:51–85`; `wings-walls.ts:50–90`; `vaux-front.ts:1–48`, all under `src/model/core/`.
- `docs/policies/local-rules.md:1–7`; `docs/learning/lessons.md:1–13`; package, Vitest and TypeScript configuration.

### Claude (`claude-opus-5-5[1m]`)

**Verdict:** the repairs resolve F0 to F6 as their dispositions say, and there is no blocker or major finding. There is one new minor defect: the overlap check refuses some doors that touch. There are also three doc nits.

##### Findings

**1. Minor: `src/model/core/arches.ts:127` refuses some doors that touch.**
- **What is wrong:** the check compares `q.x − q.width/2 < p.x + p.width/2` with no tolerance. When the two sums round differently, doors that touch read as overlapping. That breaks the rule stated at `arches.ts:123`, `plan.md:22`, `AGENTS.md:107` and in the test name at `core.test.ts:107`.
- **Failure scenario:** `openWall({ width: 20, height: 5, thickness: 1, holes: [{ x: -3.9, width: 0.4, height: 3 }, { x: -3.5, width: 0.4, height: 3 }] })` throws "the doors at x -3.9 (0.4 wide) and x -3.5 (0.4 wide) overlap; keep doors apart."
  - The two doors touch at −3.7, but −3.9 + 0.2 gives −3.6999999999999997.
  - I built 1,600 touching pairs placed by `x2 = x1 + width`; 57 were refused.
  - The 1,543 that were taken are all closed (`openAlong` returns null) and stand on faces that look down.
  - The bottom-face loop already copes with an overlap at rounding level, because `bottom()` skips an empty stretch. Only the check is too strict.
  - As printed, the doors in the message touch, so the message misleads.
  - `keyOf` (`core/shapes.ts:22-24`) rounds the cache key to the millimetre. So whether a sub-millimetre overlap throws depends on which call comes first.
  - No caller is affected today. The only door holes in the model are the medieval hall's arcade panels, one per panel.
- **Fix:** allow for rounding, for example `q.left < p.right − 1e-6` (the same 1e-6 as the sill test at `:124`). Add the −3.9 / −3.5 pair to the touching case at `core.test.ts:108`. The hint could read "let them at most touch".

**2. Nit: `docs/work/5_closed-pieces/reviews/0_implementation.md:161` gets the tally wrong.** It says "Both reviewers found two minor defects … (F0, F1) and … (F2)".
- F0 to F2 are three minor findings, not two.
- F1 was Claude's alone; the table at `:148` says "(Claude 1)".
- **Fix:** "The reviewers found three minor defects, two in the gate's walk reading (F0, F1) and one in `openWall`'s handling of overlapping doors (F2), and four nits."

**3. Nit: some new sentences still join two ideas (R25).**
- `plan.md:26` puts F0's repair and F1's into one sentence ("…cannot pass (review 0, F0), and the corner lines reach…").
- The split sentence at `spec.md:132` still joins two: "Many are open … , and the build may leave a walker inside one of those."
- `plan.md:22` is borderline.
- **Fix:** split each at ", and".

**4. Nit: `src/model/closure.test.ts:13-14` splits the path `docs/work/5_closed-pieces/plan.md` across two comment lines.**
- A search for the plan's path finds `settle.test.ts:8` but not the gate.
- **Fix:** keep the path whole on one line.

##### F0 to F6

- **F0: resolved.**
  - Every line must cross its own piece within 1e-4 m of the face's height, an even number of times.
  - With the instance numbering off by a mesh, all 116 pieces read wrong. The old reading caught only 2.
  - The 1e-4 m match is sound. The largest error between a crossing and the face's height is 4.4e-13 m. The nearest other crossing of the same piece is 1.68 cm away, so the match cannot pick up another face.
  - The floors hold: 116 pieces against > 100, and 20,208 lines against > 10,000.
  - The walk reading costs 370 ms, which is acceptable.
- **F1: resolved.**
  - Each piece is named by step, mesh and slot.
  - With the bottom left out, the four lines read all 113 walked `openWall` pieces open, the 12 arcade panels among them. The old single line read 101 and none of the panels.
  - All `LINES` weights are positive and sum to 1. The nearest any line comes to its face's edges, seen from above, is 0.41 mm.
  - The bound is as the header says. The corner lines sit about 6% of the way in from each corner, so an open strip narrower than that, such as a very narrow jamb, is seen only by `openAlong`.
- **F2: resolved for overlaps, with finding 1 still open.**
  - Nested and partial overlaps are both refused. Checking neighbours in centre order is enough.
  - The geometry is unchanged for every input that does not throw. The door flag and the bottom loop read the same filtered, stably sorted list as before.
  - No caller has two doors.
- **F3: resolved.** Both limits are named at `closure.test.ts:14-15`, `plan.md:24` and `AGENTS.md:107`, in agreement with `check.ts:274-275`.
- **F4: resolved.** I reproduced every number.
  - 26,794 pieces in 2,980 shapes (2,981 without the −0 fix).
  - After the fixes: 2,370 open shapes and 14,771 pieces, of which 2,311 shapes are walk-only and 59 capped.
  - With the bottoms and feet taken out: 2,385 open and 14,885 pieces, with 74 capped.
- **F5: resolved.**
  - `levelFaces` reads the winding as `invertedFraction` does.
  - The 1e-6 tolerance is safe for float32 sills such as 0.4.
  - Triangles with no area are skipped.
  - The only faces at each piece's base are its bottoms and feet: the box's bottom and each door's sill are left out.
  - On wound-up copies of all 17 named geometries, every base face reads as not looking down. With those faces removed, the "> 0 faces" assertion fails.
- **F6: resolved.** The header now says "a collision world of the meshes the walk collides with", and both spec sentences are split. Finding 3 lists the join that remains.

##### Checks run

- **Tests:** Vitest on the five changed test files: 38 pass.
- **Static checks:**
  - ESLint with `--max-warnings 0` on the 8 changed `.ts` files: clean.
  - `tsc --noEmit`: clean.
  - `git diff --cached --check 795956f`: clean.
  - Every file is under 500 lines.
- **Probes**, run in memory from my scratchpad:
  - The walk reading as built, with the numbering shifted, with `openWall`'s bottom out, and with `archedPassage`'s and `holeLining`'s feet out (each caught: 113, 1 and 2 pieces). I also ran the old single-line reading.
  - `openAlong` under each mutation: 14, 1 and 2 shapes open.
  - `levelFaces` on wound-up copies.
  - The census, with and without the fixes.
  - The 1,600 touching-door pairs.
- **Worktree:** still the staged tree `1a6f363`, with nothing unstaged.
- **Not run:** the full `npm test`, the build and e2e, since the machine is held for the pre-commit gate.

##### Read outside the diff

- `src/walk/collision.ts:1-480`
- `src/model/core/medieval-hall.ts:85-110, 140-215`
- `src/model/core/vaux-shell.ts:55-120, 216-244`
- The holes passed by every other `openWall` caller: `vaux-front.ts:20-44`, `weston-facade.ts:53-76, 145`, `wings-walls.ts:70-83`, and `constants.ts:17-58`
- `src/model/core/shapes.ts:15-25`
- `src/build/batch.ts:73-80`
- `src/viewer/section-cut.ts:38-40`
- `src/main.ts:97-109`
- `docs/policies/local-rules.md:1-7`
- `docs/work/3_weston-door-head/reviews/2_implementation.md` (its format)
- `vitest.config.ts` and `package.json`

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 to F6 | Round 0's findings | Both reviewers find F0, F1 and F3 to F6 resolved, and F2 resolved for overlaps but for F7 | None beyond F7 |
| F7 | `openWall`'s overlap check has no tolerance, so doors that touch can be refused where their edges' sums round apart: x 0 and 2.3 (2.2 and 2.4 wide) at 1.1, and x −3.9 and −3.5 (0.4 wide) at −3.7; 57 of 1,600 touching pairs (Codex 1, Claude 1) | Accepted: it breaks the rule the code, the plan and AGENTS.md state, though no caller has two doors | Doors may overlap by up to 1e-6 m, the sill test's tolerance; the error says "let them at most touch"; both pairs join the touching case in `core.test.ts`, which is red without the tolerance, and a 1 mm overlap is still refused |
| F8 | Round 0's outcome says the reviewers found two minor defects; they are three, and F1 was Claude's alone (Claude 2) | Accepted | A labelled correction at the end of round 0's record, keeping the sentence it corrects |
| F9 | Sentences in the plan and the spec still join two ideas (Claude 3) | Accepted | Split |
| F10 | The gate's header breaks the plan's path across two comment lines, so a search for the path misses it (Claude 4) | Accepted | The path is whole on one line |

## Verification

After the repairs: `src/model/core/core.test.ts` and the gate pass; the touching case is red with the tolerance taken out (the 2.2 and 2.4 m pair refused). F8 to F10 change words only.

## Round outcome

No blocker or major finding. Both reviewers find round 0's repairs resolved but for one new minor defect, F7, which both found; Claude adds three nits. All four are accepted and repaired. Review 2 checks F7's repair.
