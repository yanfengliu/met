# Review 3: implementation

## Target

The met repository's branch `jointfix`: commit `f6fa16a`, the diff `1002016..f6fa16a`, the repairs of review 2's F8 and F9 (`reviews/2_implementation.md`): the new `src/walk/crossing-rule.ts`, `src/walk/collision.ts`'s `crossings` and `hitsAlong`, `src/walk/walker.ts`'s `FOOT_SLACK`, `src/model/closure-readings.ts`, the tests in `src/walk/settle.test.ts`, `src/walk/crossings.test.ts` and `src/model/closure.test.ts`, and the spec's walk section. `1002016` was origin/main.

## Reviewers and coverage

- **Codex:** codex-cli 0.163.0, `gpt-6-astra` at `xhigh`, approval `never`, sandbox `read-only`, `--ephemeral`, the prompt and the diff on stdin, the worktree at `f6fa16a` as its working directory. It ran 426 s; the runbook's check of its log found no command that exited `STATUS_DLL_INIT_FAILED`. It ran test bodies through a harness of its own in memory, as Vitest cannot write its temporary folder in the sandbox, and changed nothing. Its citation outside the diff holds: `src/walk/footing.ts:76` is `Footing.under`'s winding.
- **Claude:** Claude Code 2.1.308, `claude-opus-5-5[1m]` at `--effort max`, tools Read, Glob, Grep, Task and Bash with `git diff`, `git log` and `git show` allowed, permission mode `dontAsk`, no settings sources and no MCP servers, as its `system/init` event showed; one `result` event, its `modelUsage` the pin alone, which the runbook's report command keeps. The login check passed first. It ran 1,430 s: 22 reads, 15 searches, 2 globs and 3 Bash commands, which Claude Code ran as read-only (a `git log` and `git diff --stat` after a `cd`, and `sed`, `grep` and `cut` printing two lines of the spec and the devlog's lines on work unit 13). It started no subagent. Its citations outside the diff hold at `f6fa16a`: `src/walk/walker.ts:137` is `place`'s branch test, and `src/model/lib/builder.ts:250` is `MeshBuilder.box`.

Both lanes ran at once against the same commit. The worktree's `git status`, `git diff HEAD` and HEAD were the same before and after. Local file paths in Codex's report are shortened to repository paths; nothing else is changed.

## Reports

### Codex (`gpt-6-astra`)

**Verdict: request changes to `f6fa16a`.** F8’s supplied cases and F9 pass, but the replacement ray introduces an underside-support regression. The new closure assertion also has a coverage gap. No files were changed.

1. **Major — an offset outside the piece erases valid crossings.** `src/walk/crossing-rule.ts:71`

   An empty `moved` array satisfies `!moved.some(hit => hit.edge)`, so it replaces the original nonempty reading immediately.

   Reproduced with one geometry containing these two closed boxes:

   ```
   [0.375,   0.25, -1]   → [0.5, 0.375, 0]
   [0.40625, 0.25, -0.5] → [0.5, 0.375, 0.5]
   ```

   At `(x,z)=(0.5,0)`, a corner and an edge trigger `inDoubt`. The first offset leaves both boxes because X exceeds 0.5. Crossings become empty; the parent returns heights `[0.25, 0.375]`, facings `[-1,1]`.

   Add a floor at Y=0 and an opposite support box `[-0.125,0,-0.125] → [-0.075,0.25,0.125]`. For a walker at `(0.2,0,0)`, both `place` and rebuilding then `settle` now lift its feet to the **underside at 0.25**. The parent keeps both at 0. This follows through unchanged `src/walk/footing.ts:76`: the missing crossing makes `under` return false.

   **Repair:** reject empty replacement readings and try another offset or retain the original. Also guard against losing one component while another remains; nonempty alone is insufficient. Add boundary regressions for placement and settling. This affects ordinary-sized boxes, beyond the documented narrow-feature bound.

2. **Minor — equal inside lengths do not establish correct occupancy.** `src/model/closure.test.ts:396`

   The assertion compares total occupied length, allowing false-positive and false-negative intervals to cancel.

   I confirmed this on an actual sampled line: instance `7572`, `vaux-west-front/core.granite`, at X=`-11.567518718242646`, Z=`-138.00759572692215`. Its ten crossings run approximately from 8.81 to 10.61 in 0.2 m increments. Replacing only its facings with:

   ```
   [-1,-1,1,-1,1,1,1,1,-1,-1]
   ```

   leaves the entire closure test **passing**, although occupancy disagrees over approximately **0.8 m**. Both totals remain approximately 1 m, differing by only `8.94e-8` m. `Footing.under` needs occupancy at a particular height, not its total length.

   **Repair:** compare the occupied intervals’ symmetric difference against the tolerance. Add a mutation that preserves total length while moving occupancy between intervals.

Verification: all **33 crossing/settling test bodies** passed through an in-memory TypeScript/assertion harness. Parent-code and repair-removal mutations reproduced the expected F8/F9 failures. The closure test passed across **57,352 lines**; reversed facings failed it. Also passed: 11 crossing bodies with non-indexed geometry, 10,000 non-ambiguous counting comparisons, `tsc --noEmit`, and diff whitespace checking. F9’s slack remains confined to `ontoRims`; ordinary walking keeps its existing query lengths.

I did not run Vitest itself, full verification, browser checks, the 486,052-place scan, or the 175,217-frame comparison. The sandbox is read-only; the in-memory checks do not establish those broader results.

### Claude (`claude-opus-5-5[1m]`)

**Verdict: approve the repairs.** F8 and F9 are fixed as claimed. The refactor is exact away from lines in doubt, and the new tests prove the repairs. I found no blocker and no major. There are two minor findings, C1 and C2, each a line or two to fix, and three nits. Everything below is by reading: I ran no code (see the end).

#### Findings

**C1 (minor): F9's rounding is still there, at `place`'s branch test.** `src/walk/walker.ts:137`
- `bridged = this.feet.y < y - BODY.step` still decides by rounding whether ground exactly a step under the height asked counts as "more than a step".
- The two branches read different windows. The bridged one reaches up to `y + 0.37`; the other only to the feet + 0.37. So rims 0.37 to 0.72 m over the ground are taken in one case and not the other.
- Reproduction (worked by hand, not run): a `block` floor from 0.55 to 0.75, plus the `plinths` fixture raised onto it (tops 1.2, at X ±0.25..1). Then `place(0, 1.1, 0, π)`.
  - The float32 instance matrix puts the floor's top at 0.7499999776.
  - `fl(1.1 − 0.35)` is 0.75 + 2⁻⁵³, so the branch is taken.
  - The X probes find the plinths at 1.2. `under` gives a winding of 0 there, and the body stands clear, so the feet go to 1.2.
  - The spec says a walker set down there stands on the floor, since 1.2 is more than a step over its centre's ground.
- On the existing floor at 0 asked from 0.35, the outcome depends on the last bit of the centre's hit.
- Repair: `this.feet.y < y - BODY.step - FOOT_SLACK`. Then "a step" means the same in both branches. Test it with that raised fixture at 0.75 and 0.875, asked from a step over: it should stay on the floor. The deck cases are unaffected, because their centre falls to −1.

**C2 (minor): the bound is stated narrower than the rule.** `src/walk/crossing-rule.ts:9`, `docs/design/spec.md:134`
- `oneEdge` (`crossing-rule.ts:98-101`) merges any hits whose triangles have an edge or a corner at the same places. It does not check whether the faces lie on one another.
- So two overlapping parts that only meet at a shared ridge or apex also read once.
- Example: two prisms along X sharing the ridge (−2,2,0)–(2,2,0), with bases Z ±1 and Z ±0.5. At (0.5, 0) the four slope hits merge into one: `[0, 0, 2]`, facings `[−1, −1, 1]`. That count is odd, and the winding just over the ridge is 1, the same failure as F8.
- This is not a regression (c2a9bcc merged these too) and the line has zero width. But the spec's "found, unless it stands on such a line" rests on this bound.
- Repair: state the rule as written, e.g. "hits facing one way at one height whose triangles have an edge or a corner at the same places count once: a part doubled, or a ridge or apex two overlapping parts share". Optionally pin a shared ridge in `crossings.test.ts`.
- The spec also omits the fallback (when every try meets an edge, the merged reading stands).

**C3 (nit): on a piece's outline, the second reading takes a side.** `src/walk/crossing-rule.ts:69-72`
- Example: A = [−4,0]×[−4,1] and B = [−4,1]×[−4,0] in X and Z, 0 to 1 m tall, in one piece. At (0,0) A's edge on X 0 and B's on Z 0 cross, so the line is in doubt.
- The first offset falls outside both parts. The moved line has no hits, so the piece drops out of the crossings there. The merged reading gave `[0, 1]`, inside, which is true of three of the four quadrants.
- The same happens for a false doubt on an outline (a T-junction, or a corner read as an edge by rounding). Inside the piece such a false doubt is harmless.
- Repair: name it in the bound. Also `LineCrossings` (`collision.ts:55`) could say its heights may come from a line 30 to 42 µm off.

**C4 (nit): the closure gate's tolerances assume the walk read the line where it lies.** `src/model/closure.test.ts:389, 396`
- If a gate line were ever re-read, its sloped faces would read up to 42 µm × slope off.
- That exceeds the 1e-5 m inside check on slopes steeper than about 1 in 4, and the 1e-4 m `misread` check on slopes steeper than about 2.4.
- No current line is affected, if the author's run is green. Name it in the gate's bound.

**C5 (nit): records.** `docs/work/13_joint-footing/plan.md` still reads "Status: complete", landed at c2a9bcc. There is no devlog line for this behaviour change (R24). I expect both come with review 2's record.

#### The six questions

1. **The "in doubt" test is right.**
   - The weights map to the right corners: three's `getBarycoord` returns them for a, b, c (`node_modules/three/src/math/Triangle.js:121`).
   - Under the `indirect` BVH (`src/walk/bvh-cache.ts:27`), `face.a/b/c` are the original vertex numbers (`three-mesh-bvh/src/core/utils/iterationUtils_indirect.generated.js:13-14`). They index the shared position buffer, so positions are compared in the geometry's own frame.
   - Indexed and non-indexed geometry both work, since positions are compared and not indices. The model's `IcosahedronGeometry` rocks (`src/model/mmw/astor-court.ts:234`) are non-indexed; no fixture covers that path.
   - At most one edge hit per facing is kept per level. So any other edge at that level raises doubt, whatever the hit order.
   - The cases:
     - A T-junction, or a corner one triangle reads as an edge: re-read, which is harmless inside the piece (C3 on its outline).
     - No barycoord: every hit counts as an edge, every retry fails, and the c2a9bcc merge stands.
     - No face: `ends` is empty, so the line is in doubt and re-read.
   - Beyond the stated bound: C2.
2. **The second reading** accepts only a line with no edge hit at all. That is stricter than needed, but it never accepts a line still in doubt.
   - The offsets' size is fine. At the model's largest scale (99×) the local offset still gives barycentric weights of about 1e-7, far above `ON_EDGE`.
   - Heights move by at most about 35 µm on a walkable slope, well under `under`'s 1 mm.
   - The fallback is the old reading.
   - Inside the piece the result is never worse than the merged reading; on its outline see C3.
3. **The refactor is exact.** These are unchanged: the ray and its direction, the inverse-transpose normals, `abs` and `sign`, the edge flag, the sort comparator over the same raycast order (stable), the 1 µm grouping from the level's first hit, the skip test (`filter` non-empty is the old `some`), and the `LineCrossings` fields. The `bvh === undefined` skip equals the old `?? []`.
4. **F9's slack** only matters in `place`'s bridged call. In the other three `ontoRims` calls `low` is the feet, and `rims`' `above` (feet + 1 mm, `footing.ts:52,56`) already shuts out anything the slack adds. It never reaches the walking step or `place`'s centre read. It takes in at most 1 µm past a step, and the 0.36 m refusal stays 1 cm outside. The gap left is C1.
5. **Tests.**
   - Each new case fails without its repair, by my arithmetic:
     - F8 turned: c2a9bcc's winding is 1 at 0.251 m, so the tops are refused.
     - F8 upright: c2a9bcc's winding is 0, so it stands at 0.25 inside the taller part.
     - F9: `low` rounds to 0.75 + 2⁻⁵³ and 0.875 + 2⁻⁵³, so both decks fall through. At 1, 2.5 and 10.875 it rounds back exactly, so those three cases are controls.
   - Mutations they catch: comparing ends by index (the doubled test goes red), mis-mapped weights or all three corners as ends (the outer-corner test goes red), and no second reading or every merge taken as one edge (the F8 tests go red).
   - Not pinned: the offsets' size (anything up to a few cm passes), the corner form of the bound, and non-indexed geometry.
   - The closure gate checks the facings' sign and count, which `under` relies on. It does not exercise F8's merge on the model, because its lines are chosen off edges (`closure.test.ts:142-147`); the fixtures cover F8. Its tolerance is right apart from C4.
6. **Docs:** the `windingAbove` and `insideAlong` docs and the `footing.ts` and `walker.ts` comments are accurate. Gaps are in C2, C3 and C5.

**Read outside the diff:** `src/walk/walker.ts:137`, `src/walk/footing.ts:50-77`, `node_modules/three/src/math/Ray.js:641-653` (on-edge hits are accepted for both triangles), `node_modules/three-mesh-bvh/src/utils/ThreeRayIntersectUtilities.js:119-139`, `src/model/lib/builder.ts:250-263` (how a box face is split into triangles).

**What I ran:** Read, Grep and Glob over the worktree and `node_modules`; `git log`, `git diff --stat` and `git show`. I also used `sed`, `grep` and `cut` in Bash to print a few lines of the spec and devlog. Those are read-only, but outside the git-only commands you listed. I changed nothing and started no subagent.

**What I could not check, and why:** I cannot run code in this lane, so none of Vitest, tsc, lint, e2e, the closure gate, the 486,052-place scan or any fixture ran. C1's and C2's reproductions are worked by hand and need running. The request also doesn't say `npm run verify` passed on `f6fa16a`. The closure gate's time against the 10 s headroom rule (`scripts/test-headroom.ts`) is unmeasured; the new per-hit objects add some allocation.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F10 | A line in doubt on a piece's own outline could be read again off the piece: the first offset whose line met no edge was taken even when it met nothing there, so a probe meeting the piece's bottom on its outline stood on that underside, set down or settled, where `c2a9bcc` kept the walker on the floor (Codex 1, major; Claude C3, nit, the same on a crossed outline) | Accepted: both reproduced at `f6fa16a` | A line read again counts only where it keeps every crossing of the line's own reading, one facing its way at a height within what its face's slope makes of the offset (`keeps`, `src/walk/crossing-rule.ts`); else the next offset, else the line's own reading. Tests: Codex's two boxes on their outline, set down and settled (`src/walk/settle.test.ts`), their crossings and Claude's crossed outline (`src/walk/crossings.test.ts`), red at `f6fa16a` (moved onto the bottoms 0.25 m up; the piece read as nothing) and green at `c2a9bcc`; and a piece tilted 20° about Z, whose second reading reads its tops 5.8 µm higher, red with no allowance for the slope |
| F11 | The closure gate's facings check compared the inside's total length, so facings that move the inside along a line pass (Codex 2, minor) | Accepted: reproduced on Codex's line | `insideApart` (`src/model/closure-readings.ts`) measures the length where the walk's facings and the faces' own winding disagree on what is inside, within 1e-5 m. Red with Codex's facings planted on its one line of `vaux-west-front/core.granite`, which `f6fa16a`'s check of totals passed |
| F12 | `place`'s branch test, `feet.y < y − STEP`, still let rounding decide whether ground exactly a step under the height asked lay more than a step under it, so a walker set down on a floor a step under could take the plinths 0.45 m over the floor that the read about the height asked reaches (Claude C1, minor) | Accepted: reproduced | The branch takes the same 1 µm slack (`FOOT_SLACK`), so a step means the same in both reads. Test: floors 0.75, 0.875, 1, 2.5 and 10.875 m up with plinths 0.45 m high on them, the walker set down from a step over the floor, on the floor; red at `f6fa16a` and `c2a9bcc`, on the plinths at 1.2 m |
| F13 | The bound named only faces lying on one another, but the rule merges any hits whose triangles have the edge or corner they lie on at the same places, as two overlapping parts sharing a ridge or an apex, whatever their faces (Claude C2, minor) | Accepted: the rule stands and its bound is stated as written; `c2a9bcc` merged these too, along a line of no width | The bound restated in `src/walk/crossing-rule.ts` and the spec, which also names the fallback; a pin of two prisms sharing a ridge, read once along it (`src/walk/crossings.test.ts`) |
| F14 | The closure gate's tolerances assume the walk reads a line where it lies, but a line in doubt is read 30 to 42 µm off (Claude C4, nit) | Accepted | Named in the gate's bound, with the count measured: none of its 57,352 lines is in doubt for a piece it meets. `LineCrossings` says a line in doubt's heights are those of the line read again |
| F15 | The plan still read complete at `c2a9bcc`, and no devlog line recorded the change (Claude C5, nit) | Accepted | This round's records: the plan's follow-up section, reviews 2 and 3, and a devlog line |

Claude also noted that no fixture covered non-indexed geometry; `src/walk/crossings.test.ts` now reads both F8 pieces without an index too.

## Verification

The repairs are commit `1d9eb63` (`f6fa16a..1d9eb63`).

- Red proofs: the new tests fail at `f6fa16a`, three of them: the outline read as nothing, the walker there moved onto the boxes' bottoms 0.25 m up, and the floors' walker on the plinths at 1.2 m. At `c2a9bcc` eight fail: the F8 tests, the tilted piece, the floors and the decks; the outline's pass there, since `c2a9bcc` read the outline right. With `keeps` always true the two outline tests fail; always false, the six F8 tests; with no allowance for the slope, the tilted piece; with no slack at the branch, the floors. Codex's facings planted on its one line fail the interval check on that line, and `f6fa16a`'s check of totals passes them.
- Every other result kept: on the scan's 486,052 places `place` and `settle(0)` match `c2a9bcc`'s code to 1e-9 m, the 237 fixed places stand where they stood, and routes R1 to R7 give the same 175,217 walking frames byte for byte, with no crossing query while walking. None of the closure gate's 57,352 lines is in doubt for a piece it meets (counted by instrumenting the rule).
- Gates: `npm run verify` passed on `1d9eb63`'s tree: 728 unit tests in 80 files, typecheck, lint, build and 125 e2e tests, 10.4 min. So did the Load rule's three runs of `routes.spec` and `walk.spec` at 4×, in a row: 21 passed each, 2 skipped, 134, 133 and 131 s.
- Review 4, a focused Codex check of these repairs (`4_implementation.md`), found F16 and F17 in `keeps`.

## Round outcome

Codex requested changes: one major finding, F10, and one minor, F11. Claude approved F8's and F9's repairs, with two minor findings, F12 and F13, and three nits: F14, F15 and its C3, which is F10. All were accepted and repaired in `1d9eb63`, each with a test red without its repair or, for a bound, a pin. The repairs changed logic, so review 4 followed.
