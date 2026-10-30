# Review 0: implementation

## Target

The met repository's branch `joint`: commit `36ca301`, the diff `edf76fc..36ca301`, 7 files: `src/walk/walker.ts` and the new `src/walk/footing.ts`, `src/walk/settle.test.ts`, `src/model/core/choir-gate.test.ts`, the spec's walk section, two AGENTS.md gate lines and a devlog line. `edf76fc` was origin/main.

## Reviewers and coverage

- **Codex:** codex-cli 0.163.0, `gpt-6-astra` at `xhigh`, approval `never`, sandbox `read-only`, `--ephemeral`, the prompt and the diff on stdin, the worktree as its working directory. It ran 424 s and read code outside the diff (`src/walk/collision.ts:429` and `:442`, `src/walk/reach.ts:226`, all three checked); no command of its log exited `STATUS_DLL_INIT_FAILED`. It reproduced its findings with probes it ran in memory and wrote nothing.
- **Claude:** Claude Code 2.1.308, `claude-opus-5-5[1m]` at `--effort max`, tools Read, Glob, Grep, Task and Bash limited to `git diff`, `git log` and `git show`, permission mode `dontAsk`, no settings sources and no MCP servers, as its `system/init` event showed; one `result` event, its `modelUsage` the pin alone. It ran 1,080 s and ran no tests. A first login check stalled after its thinking with no result for 7 minutes and was stopped; the second passed in 25 s.

Both lanes ran at once against the same commit. The worktree's `git status`, `git diff HEAD` and HEAD were the same before and after. Local file paths in Codex's report are shortened to repository paths; nothing else is changed.

## Reports

### Codex (`gpt-6-astra`)

I would request changes to `36ca301`. The intended tile-joint repair works, including the real choir-screen axis, and the walking support extraction preserves its previous behavior. However, memory-only probes using the repository’s collision code reproduced three remaining correctness problems. No files were changed.

1. **Major — Side probes can lift the walker onto an underside. High confidence.** At `src/walk/walker.ts:180`, `ontoRims` accepts hits without establishing that they support the feet from below. Outside the diff, `src/walk/collision.ts:429` uses double-sided raycasting, and line 442 turns downward normals upward. Reproducer: floor at Y=0; two boxes separated by an 8 mm joint, each spanning Y=0.1–0.4. The side rays start inside those boxes and return their undersides. `place` and `settle` put the feet at Y=0.1 with `onGround=true`; the next update reaches Y=0.4. The parent stays at Y=0 and returns `kept`. The centre-line clearance check cannot reject pieces beside that line. **Repair:** validate each supporting side hit as an exposed upper surface, using signed facing or side-line occupancy; add this fixture for both placement and settling.

2. **Major — Rejecting the highest rim also discards valid lower support. High confidence.** `src/walk/footing.ts:40` retains only the highest candidate; `src/walk/walker.ts:181` checks its clearance afterward. Reproducer: the requested 8 mm joint over a slab at Y=−0.06, tiles at Y=0, small blocks at X=±0.3 topping out at Y=0.2, and a ceiling at Y=1.8. The X pair selects 0.2, which lacks headroom; diagonal pairs offer valid support at 0. Nevertheless, `place` leaves the feet at −0.06 and `settle` returns `kept`. Removing the small blocks makes both succeed. **Repair:** validate candidate pairs before selecting the highest admissible rim, or try lower candidates after rejection. Preserve the existing walking selection rule separately.

3. **Major — Placement still falls through an elevated sheet seam. High confidence; an incomplete fix rather than a new regression.** `src/walk/walker.ts:139` falls back to workspace ground before the side probes run, so their subsequent search starts far below the intended floor. Reproducer: two horizontal sheets at Y=1 separated by a nominal 2 μm seam, workspace ground at −1, and `place(0, 1, 0, …)`. The feet land at −1, and `settle(0)` returns `kept`; a walker already standing over that same seam remains supported at Y=1. **Repair:** resolve footprint support near the requested placement height before taking the workspace fallback, with a regression covering the sheet-seam case and subsequent `settle(0)`.

Verification: 10,000 finite-hit comparisons found identical walking-support results, selected normals, and query order against the parent, including ties. Memory-only reproductions confirmed the tile fixture’s red/green behavior and all three choir lanes. Caller inspection found no added per-cell flood-fill cost: `src/walk/reach.ts:226` places once before traversal; ordinary walking settles only after collision rebuilds.

I did not run the standard gates, browser checks, performance measurements, or the author’s 486,052-place scan. The adverse fixtures demonstrate algorithmic failures; I did not establish their occurrence at existing museum spawns.

### Claude (`claude-opus-5-5[1m]`)

**Verdict.** No blocker and no major finding. The commit does what F-owner-8 asked: `place` and `settle` now lift a walker out of the joint, the walking step behaves exactly as before, and both new red proofs fail with the old walker. I checked all of this by reading the code; I ran nothing. There is one real gap in the new rule. A side probe that starts inside a piece reads that piece's underside as walkable ground, and the clearance check looks only along the centre's vertical line. So between two overhangs a walker that was standing on the floor can end up more than a step up, in the air. I found no case of this in the finished model. The tests prove the lifts the task asked for, but none of the refusals the rule depends on. The rest is doc nits.

## Findings

**1. Minor (sure of how it happens; whether the real model ever hits it is unknown). A probe that starts inside a piece lifts the walker onto that piece's underside.**
- **Where:** `src/walk/footing.ts:38`, `src/walk/walker.ts:180-181`, with `src/walk/collision.ts:429,442` outside the diff.
- **Why:** `groundBelow` casts against both faces of each triangle and turns every normal up. So a probe starting inside a piece returns that piece's bottom face as walkable ground. `clearAt` checks only the centre's line and a head bump at the centre. The walking step has the same weakness, but it reads the side probes only over a gap; `place` and `settle` now read them everywhere.
- **Fixture:** a floor at 0 and two seats, x from ±0.26 to ±0.66, y from 0.32 to 0.45, z from −1 to 1.
  - At height 0.45 the capsule reaches only 0.245 m sideways, so the old walker stood on the floor between the seats and could walk there.
  - `place(0,0,0,0)` now puts the feet at 0.32: both X probes start inside the seats and hit their undersides.
  - On the next step, `follow` (`walker.ts:349`) probes from 0.69, finds the seat tops, and steps up to 0.45.
  - In walk mode, `settle(0)` after `placeAt` (`walk-mode.ts:316`) makes the same second lift at once, because `builtUnder` sees the seat tops in its window.
  - End state: the walker stands 0.45 m up in the air between the seats, higher than any step it could climb.
- **Real model:** I found no instance. The plaza benches (`src/model/site/furniture.ts:19-23`) are spaced about 5 m apart (`plaza.ts:202`), and the park bench slats sit above 0.37 m. But the devlog accepts "places whose probe began inside a piece" as a category without saying what height the feet reached there, or onto what.
- **Repair:** add the guard only in `ontoRims`, so the walking step stays unchanged. Refuse a pair if either probe starts inside a non-sheet piece: `insideBetween` on `crossings` at the probe's line, at its start height. Alternatively, have `groundBelow` report whether the hit faced down before it was turned up. Add the two-seat fixture, which fails with the committed rule.

**2. Minor (sure). The tests prove the lifts but none of the refusals.**
- **Where:** `src/walk/settle.test.ts:214-258`.
- **What is proven:** the asked-for lifts, plus one control (the 1.2 m channel, which passes with old and new code). Nothing in the commit pins the refusals the design rests on, and the scan found two of them broken in drafts.
  - **The step bound.** Set the walker down over the 0.5 m gap in `walker.test.ts:199-205`, with the gap's floor at −0.8. The committed rule leaves it at −0.8, as before. The draft that read the probes over `place`'s whole 1 m drop would lift it to 0, and no committed test catches that.
  - **The walkable and clear checks** (`walker.ts:181`). There is no groove under a low soffit and no rim on a too-steep slope.
  - **The quiet side of `builtUnder`** (`walker.ts:162`). Replacing `builtUnder(...)` with `true` fails no test. One way to pin it: walk the walker from the channel west along the z = −5.6 joint. Its centre stays on the slab, because walking keeps to its ground. Then complete an unrelated step and expect `'kept'`.
- **Repair:** one fixture per refusal, each failing with the draft it guards.

**3. Nit. Only the highest pair is tried** (`footing.ts:40`, `walker.ts:181`). `rims` keeps only the highest pair. If that pair is too steep or not clear, `ontoRims` refuses without trying a lower pair that would work. This is rare and fails safe.

**4. Nit. Docs.**
- `docs/devlog/summary.md:5` says "(`ontoRims`, `src/walk/footing.ts`)". `ontoRims` is a private method of `Walker` at `walker.ts:178`; `footing.ts` holds `rims`.
- In the spec, "When the build moves" still says a buried or embedded walker goes to "the lowest walkable surface over its feet where it stands clear". It now also goes on onto a groove's rims (`walker.ts:168`): the "built" test case ends on the tiles at 0, not on the slab at −0.06. `walker.ts:16` says the same old thing.
- The Ground bullet's "settled after a build, it reads them" is true for a kept walker only where `builtUnder` fires.
- These docs outside the diff still describe `place` as a plain drop: `src/walk/reach.ts:204-205`, `src/walk/spawns.ts:4` and `:43-44`. The spec's test list (`spec.md:231`) doesn't mention the joint.
- `docs/work/4_cited-images-viewed/plan.md:61` marks F-owner-5 as "since acted on" but not F-owner-8. There is no `docs/work/13_*` record or registry entry yet.

## Checked, no finding
- **Walking step:** the same as before. I compared the old `support` (`edf76fc:src/walk/walker.ts:430-443`) with `Footing.ground` and `rims` line by line:
  - same centre probe, and the same level (`feet.y − 1e-3`, `walker.ts:440`);
  - same pair order, and the lower-rim pick keeps `sideA` on ties;
  - a strict `>`, so the first pair still wins ties;
  - when the centre finds nothing, the first pair is still taken outright (old `!found`, new `rim.y > −∞`);
  - the return is still "a pair assigned, or the centre found".
  - It would differ only for NaN heights.
- **`place`:** `onGround` is true after a lift, and the rim's walkable check has passed. When the centre finds nothing, the floor test short-circuits the stale `hit` (`walker.ts:140`). `rest` resets the same fields as before.
- **`builtUnder`:** it fires in the tiles case (tile tops at 0 fall inside −0.059 to 0.31). It stays quiet when the build goes backward (`walk-mode.ts:338` passes all instances as built), and its window matches `ontoRims`'s. A low piece on one side triggers it, but nothing lifts unless both probes of a pair are raised.
- **Callers:**
  - lost walker → nearest spawn → `place` + `settle(0)` (`walk-mode.ts:339-344`): fine;
  - the doors' `release` uses the lifted feet;
  - door leaves are never ground or crossings (`door-world.ts:119-126`);
  - `reach` and `replay` call `place` once per start; their moves use `restore`, never `place` (`reach.ts:108-118, 226, 270`);
  - `save`/`restore` are unchanged, and `Footing` holds only scratch hits;
  - no caller runs `place` or `settle` in a hot loop.
- **Limits:** `walker.ts` is 494 lines; AGENTS.md is 28,617 bytes with LF line endings in git. The CRLF in the working tree comes from `core.autocrlf`.
- **Claims:** the `footing.ts` claim that grooves under 0.27 m are bridged is correct (0.3 × cos 22.5° = 0.277). `897a4b4`'s `src/walk/` is identical to the parent's, so the test headers' "red with the walker of 897a4b4" is the same as red with the parent.

## Could not check
- I ran no tests (unit or e2e), so the green results and runtimes are the author's.
- The scan is in ignored probe tests that aren't in the commit. That covers its spacing, how the differences were classified, and the claim that the spawns, route ends and `routes.spec` places haven't moved.
- I did not inspect the real geometry behind the scan's categories (Great Hall floor bands, roof gutters, Dendur's gate slabs).
- The devlog's account of the bench-seat draft doesn't fit the committed checks. A seat over the centre would put the centre's line inside the seat, and `clearAt` would refuse the lift. So that draft must have differed by more than counting the centre's probe; I couldn't see it.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | A side probe that starts inside a piece reads its underside as ground, and the check on the centre's line cannot see it, so `place` and `settle` lift a walker between two overhangs onto their undersides, and the walking step or a spawn's check then onto their tops (Codex 1, major; Claude 1, minor) | Accepted: reproduced on both fixtures | A pair counts only where both probes stand on top of what they meet: no closed piece's inside lies just over either hit (`Footing.under`, `src/walk/footing.ts`). The walking step does not read it. Test: Claude's two seats 0.32 to 0.45 m up, 0.52 m apart, set down, settled, checked as a spawn is and walked; red at `36ca301` (0.32 m, then 0.45 m) and with the check removed |
| F1 | `rims` kept only the highest pair, so a refused highest rim hid a lower one that would do (Codex 2, major; Claude 3, nit) | Accepted | Each pair is judged before the highest is kept (`Footing.rims`'s `accept`). Test: Codex's blocks under the X probes and a ceiling 1.8 m up, set down and settled on the joint; red at `36ca301` (on the slab, −0.06 m) |
| F2 | `place` falls through a raised sheet's seam to the workspace ground, and the rims are then read about that ground (Codex 3, major) | Accepted: the gap the task asks bridged, at the height asked | Where the first surface lies more than a step under the height asked, `place` first reads the rims within a step of that height, as the walking step at that height would. Test: Codex's deck of sheets 1 m up, set down, checked as a spawn is and walked along the seam, and a 1.2 m gap that still drops it; red at `36ca301` (−1 m) |
| F3 | The tests proved the lifts but none of the refusals: the step bound, the walkable and clear checks, the quiet side of `builtUnder` (Claude 2, minor) | Accepted | Tests: two plinths 0.45 m high, red with the rims read over `place`'s whole drop (0.45 m); 45° ramps either side of a groove, red without the walkable check (0.296 m); the blocks of F1 for the clear check; a walker walked from the channel onto a joint, which keeps to the slab when a step completes 15 m off, red with `builtUnder` always true. Claude's own example of the step bound, a walker set down over `walker.test.ts`'s 0.5 m gap, now stands on the gap's rims under F2's repair: a gap narrower than the body is bridged, as the task asks, so the plinths hold the bound instead |
| F4 | Docs: the devlog gave `ontoRims` to `footing.ts`; the spec's "When the build moves" and `walker.ts`'s header left out the lift onto the rims; the Ground bullet's "settled after a build" holds for a kept walker only where `builtUnder` fires; `src/walk/reach.ts`, `src/walk/spawns.ts` (twice) and the spec's test list still described `place` as a plain drop or left out the joint; work unit 4's plan does not mark F-owner-8 acted on; no work unit 13 record (Claude 4, nit) | Accepted | All repaired in the code's landing; work unit 4's plan and this unit's record land after it, as the coordinator ordered the records to land in ID order |
| F5 | The devlog's account of the bench-seat draft does not fit the committed checks, since a seat over the centre would fail `clearAt` (Claude, could not check) | Accepted: that draft checked only the head (`bumpsHead`), not the centre's line | The devlog line says so |

## Verification

The repairs are commit `e6bc4eb` (`36ca301..e6bc4eb`), checked as follows.

- The three findings' fixtures (the seats, the blocks under a ceiling, the deck) fail with the walker of `36ca301`. Under it the seats lifted the walker to 0.32 m when set down or settled, then to 0.45 m when checked as a spawn is. The blocks left it on the slab at −0.06 m, and the deck dropped it to −1 m. All three pass with the repairs.
- The refusals' tests go red under their mutations. Reading the rims over `place`'s whole drop lifts the walker onto the plinths and the seats at 0.45 m. Without the walkable check it lands on the ramps at 0.296 m, and with `builtUnder` always true the kept walker is "moved". Without the tops check the seats are "moved". The fixture's channel and the deck's 1.2 m gap still drop a walker, with every rule.
- The scan of the finished model, run again (486,052 places), differs from round 0's commit in 114 places. Lifts now refused: 58, onto rims beside pieces that stand on them (Weston's facade at (−50, −137), a gallery wall at (10, −66), each by a probe inside the wall) and roof features. New lifts: 35, seams the old `place` fell through, among them the axis at Z −70 and −136.8 on the main floor, 6.45 m down, now on 4.11 m. Changed by millimetres: 21. The spawns, the route ends and `tests/e2e/routes.spec.ts`'s fixed places stand where they stood.
- `npm run verify` passed on the repaired tree: 710 unit tests, typecheck, lint, build and 119 e2e tests, 765 s with the wait for the lock. So did the Load rule's three runs of `routes.spec` and `walk.spec` at 4×: 21 passed each, with the 2 unthrottled budget walks skipped.
- Review 1, focused on these repairs (`1_implementation.md`), found two more, F6 and F7.

## Round outcome

Codex requested changes: three major findings. Claude found no blocker and no major finding, one minor gap (the same underside lift), and test and doc gaps. All six findings, F0 to F5, were accepted and repaired in `e6bc4eb`, each with a test red without its repair, and no dissent remains. The repairs replaced the logic this round had read, so a focused re-review followed (review 1).
