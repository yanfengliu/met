# Review 1: implementation

## Target

The met repository, branch `claude/optimistic-mayer-d1fe0b`, commit `817b4ae` ("Answer review 0 of work unit 17: the Weston walks come back out past the porch; the records' depths and the porch's exception"): the diff `ff9fcbd..817b4ae`, the repairs of review 0's findings F0 to F11 (`reviews/0_implementation.md`), in `src/model/core/weston-porch.ts`, `weston-facade.ts`, `core.test.ts`, `weston-door.test.ts`, `tests/e2e/routes.spec.ts`, `docs/design/spec.md`, `docs/research/interior.md` and `interior-images.md`, the devlog, this unit's plan and review 0's record.

## Reviewers and coverage

Both reviewers ran read-only on 2026-11-04 with the same prompt, from `../fleet/tmp/review-runs/met-u17-r1/` (ignored, the raw captures): review 0's findings table to read first, then three lenses (each repair against its finding, in code and records, the return walks' new bounds and the head band's two parts named; anything the repairs broke or left inconsistent; the findings taken in part or recorded rather than changed), and the findings format, reusing review 0's IDs. The diff came on stdin. The worktree's `git status` and `git diff HEAD`, saved before both lanes ran, were empty, and the owner's own edits for this round came after both lanes had finished.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. The runbook's check kept the lane: no command failed to start. It ran in-memory geometry and walker probes (the headless walk's return replayed to X −55.593; the head band's parts against the porch's triangles; the lower panel's frame against the bases), read the files it lists outside the diff, and edited nothing.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show, permission mode `dontAsk`, no MCP servers. The lane rule passed: one result, one model key, the pin. It ran no tests by its own choice, worked its numbers by hand from the code (its model of the walker matching review 0's replay to 2 cm), read nothing in the run folder or fleet's tree, and did not delegate.

## Reports

### Codex (`gpt-6-astra`)

Approve with minor findings.

1. **F5 — Final verification remains open — minor.** [plan.md:44](C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/docs/work/17_weston-porch/plan.md:44) and [0_implementation.md:161](C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/docs/work/17_weston-porch/reviews/0_implementation.md:161) explicitly leave the repair revision’s full gate and repeated browser runs pending. The concluding statement at line 165 that all twelve findings are repaired overstates F5’s completion. Before landing, record `verify` and three consecutive `routes.spec.ts` passes at both 1× and 4×; keep the gallery follow-up explicitly pending until completed.

2. **F11 — Drawing-plan wording remains inconsistent — nit.** [devlog/summary.md:5](C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/docs/devlog/summary.md:5), [plan.md:22](C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/docs/work/17_weston-porch/plan.md:22), and [weston-porch.ts:9](C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/model/core/weston-porch.ts:9) still say the drawing stops at the wall. The repaired [interior.md:298](C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/docs/research/interior.md:298) says it is cut off along the porch’s front, before the wall. These give contradictory reasons for estimating depth. Apply the corrected wording to all three remaining locations.

3. **F10 — Height-bound annotation uses the wrong floor elevation — nit.** [core.test.ts:14](C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/model/core/core.test.ts:14) calls Y = 13.2 “9 m over the main floor,” but [frame.ts:44](C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/model/frame.ts:44) sets that floor at 4.11: the allowance is **9.09 m**. The guard works, but its stated bound is inaccurate. Describe it as 9.09 m, or use literal 13.11 if exactly nine metres is intended; update the disposition likewise.

The substantive repairs check out:

- **F0:** Replaying the unit walk’s movement produced X = **−55.593**, comfortably past `COURT_X = −52.9` at [weston-door.test.ts:123–124](C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/model/core/weston-door.test.ts:123). The browser return uses the correct outward normal and requires crossing the court line before release. Headless probes from its actual starting point crossed in 2.67–2.70 seconds at 60, 20 and 10 Hz; another half-second of movement followed by coast stayed on the court floor. Browser timing remains unverified.
- **F6/F3:** Triangle-versus-box probes found no porch surface intruding into either head-band segment. The roundels and narrower capitals clear them. The raised lower frame clears the larger pilaster base by **6 cm**. Relevant placements are [weston-facade.ts:114–122](C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/model/core/weston-facade.ts:114) and [weston-porch.ts:157–179](C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/model/core/weston-porch.ts:157).
- **F7/F11:** Orders now follow pedestals → pilasters → masonry → ornament → balcony block; railing and side-roundel placement use `PORCH`. F1, F2, F4 and F9 are consistent with the implementation.
- **Retained decisions:** F3’s corner overlap is now disclosed and reasonably retained as a modelling approximation. F8’s recorded **0.24 m** window-foot concealment matches the code; its documented rationale does not warrant reopening it.

No files changed or browsers launched. I ran in-memory geometry and walker probes, not `verify`, browser tests or visual captures. `git diff --check` flagged only the two Markdown hard breaks in the copied review text at lines 20 and 23.

Outside-diff files read included:

- `tests/e2e/route-holds.ts:115–134`, `route-keys.ts:57–93`, `route-places.ts:79–152`: crossing, release, coast and starting position.
- `src/model/lib/pilaster.ts:113–139,235–274`, `cornice.ts:259–281`, `profiles.ts:25–94`: bases, capitals and entablature profiles.
- `src/model/hunt/routes.ts:117–128`, `src/walk/walker.ts:47–64,238–255,315–335`: approach and movement.
- `src/model/core/wings.ts:44–58`, `galleries.ts:56–79`, `materials.ts:55–62`, `src/model/frame.ts:44–46`: build order, partition, shadow rationale and levels.

### Claude (`claude-opus-5-5[1m]`)

**Verdict: approve with minor findings.** Every repair does what its finding asked, and none breaks anything. Two records are now wrong or inconsistent, and the shots were not retaken after the repairs changed what renders.

I ran no tests. The brief is read-only, and the headless walk builds the whole sequence, which would compete with other worktrees' timed gates outside the lock. I worked every number by hand from the code. My model of the walker (2 m/s, τ 0.07 s) matches round 0's replay to 2 cm (Codex got X −51.593 after 4 s; I get −51.61). `git status` is clean at `817b4ae`.

## Findings

### F2 (continues). The owner's record says moving the leaves would free the 528/529 wall, but it would not — minor
- **Where:** `docs/research/interior.md:302` ("the swing, which would no longer reach gallery 529, so the 528/529 wall would no longer need moving"), repeated at `docs/work/17_weston-porch/plan.md:26`.
- **What is wrong:**
  - `clearOf` (`src/model/core/galleries.ts:63-67`) moves any wall that stands in the doorway's opening. It reads only `WESTON_DOOR.z` and `width`, never the leaves' plane or their swing.
  - Its own comment (`:60-61`) gives two reasons for the move: the wall stood "0.80 m inside the doorway *and* in the swing".
  - Review 0's Claude F3 ("exists only because the west leaf swings into 529") had the premise wrong, and the repair copied it into the records.
- **Evidence:**
  - The wall is `[0, -104.7, -48.8, -40.9]` (`plan-data.ts:21`), 0.4 m thick (`constants.ts:32`).
  - Its faces stand 0.40 and 0.80 m inside the opening's west edge (Z −105.295).
  - Its end, at X −48.8, reaches 0.1 m into the 1888 wall's lined hole (`weston-facade.ts:53`, `:70`).
  - Move the leaves to the porch's front and that hole stays. Left on its map line, the wall would be a wall end standing in the doorway, and the code would move it anyway.
- **Failure scenario:** the owner weighs the move expecting the map's wall to come back, and nothing changes.
- **Fix:** "…no longer reach gallery 529, but the 528/529 wall also stands in the 1888 wall's opening, so it stays on the reveal."

### F5 (continues). The shots were taken before the repairs, and no open step retakes them — minor
- **Where:** `plan.md:30` (before-and-after shots, every changed image read) and `plan.md:44` (the open step lists verify, `routes.spec` three times at 1× and 4×, and the re-review); `0_implementation.md:161` (the shots were of `ff9fcbd`).
- **What is wrong:** `817b4ae` changes what renders at the porch:
  - the head band on each side at Y 10.41–10.82;
  - the frames of the lower blind panels;
  - the railing's inner posts, by 3 mm.
  The first two are in view in `doors-weston` and `preset-int-petrie-court`. The e2e change has not run at all yet, which the record says (`:163`).
- **Fix:** add the standard shots on the repaired revision, compared and read at native size, to `plan.md:44`.

### F6 (continues). Brick still shows under the porch's side cornice, while the records say the band meets the porch — nit
- **Where:** `src/model/core/weston-facade.ts:102-103` and `:114-124`; `interior.md:300` ("runs on to the porch's sides under the cornice and stops at the cornice above").
- **The question asked: does any part run into the porch?** No. Positions below are in the porch's frame: u along the front from the doorway's middle, d out from the brick face, heights over L1.
  - **Lower part** (6.30–6.71 m, from |u| 2.85, 0.16 m out) clears:
    - the frieze's face (u 2.768, its bead 2.775) by 7.5 cm (`cornice.ts:276-278`, `profiles.ts:87-95`);
    - the architrave's top moulding (out to 2.8175, ending at 6.26 m) by 4 cm in height;
    - the side roundels (u ≤ 2.808, d ≥ 0.34) by 4 cm across and 18 cm out;
    - every capital (tops at 5.81 m; the narrow pilasters' volutes end at 5.76 m) by 0.49 m.
  - **Upper part** (6.71–7.05 m, from |u| 3.40) clears the whole cornice, which reaches at most ±3.35.
- **What is wrong:**
  - The upper part stops 0.05 m past ±3.35, the reach of the cornice's top moulding. That moulding sits at 7.29–7.31 m, above the band.
  - At the band's own height the cornice reaches only u 2.75–2.89 (its bed moulding, up to 7.01 m), then 3.23 (soffit and corona) (`profiles.ts:49-65`).
  - So a pocket of brick up to 0.65 m wide and 0.30 m tall stays against the wall under the soffit, plus 0.17 m beside the corona. The lower part stops 8 cm short of the frieze.
- **Fix:** split the upper part at the soffit (L1 + 7.01): below it, run to the bed moulding (≈ 2.90); above it, to the corona (≈ 3.24). Run the lower part to the frieze's face. Or reword the records to say where the band actually stops.

### F11 (continues). "The drawing's plan stops at the wall" survives in three places, and the side roundels are only half derived — nit
- **Where:** `src/model/core/weston-porch.ts:9`; `plan.md:22` ("is cut off at the wall"); `docs/devlog/summary.md:5`.
- **What is wrong:** only `interior.md:298` was corrected, to "is cut off along the porch's front, before the wall". The other three still describe a plan that reaches the wall, which is the contradiction the finding named.
- **The roundels** (`weston-porch.ts:189`): only the run's end comes from `PORCH.depth`. The start (0.45) and spacing (0.5) are literals, so a depth change adds or drops a roundel at the same places rather than moving them.
- **The railing is fully derived:** 2.60 and 2.10 m, the inner posts at ±0.867 where the literals gave ±0.87.
- **Fix:** use interior.md's wording in all four places, and space the side roundels evenly between their two ends.

### F9 (continues). "The drawn base and pedestal cap run 0.47 m" names the wrong parts — nit
- **Where:** `interior.md:300`; `weston-porch.ts:49`.
- **What is wrong:** `interior.md:298` reads the pedestals as 0.96 m "to their caps' top" and the bases as reaching "about 1.43 m". So 0.47 m is the drawn base alone; the cap lies below 0.96 m. The 0.36 m against 0.47 m comparison is right; only the label is wrong.
- **Fix:** "where the drawn base runs 0.47 m".

### F3 (taken in part). The reason holds, but the new comment's "so the walk and the cut read each alone" skips what a cut shows — nit
- **Where:** `weston-porch.ts:157-159`.
- **The reason is sound:** no gate reads overlap between pieces, the walk meets only outer surfaces, and the standard cuts miss both bands.
- **What the comment leaves out:** the cut's cap pass draws each crossed piece's own back faces (`cap-pass.ts:2-3`). Where one corner pilaster's base or capital lies inside the other, a cut at Y 5.07–5.43 or 9.58–9.92 shows the inner piece's stone inside the outer piece's cap. That was review 0's own evidence.
- **Fix:** say so in the comment or in the disposition.
- **The frame repair is correct:**
  - The lower frame now starts at 1.38 m, above the side pilaster's base (top at 0.96 + 0.36 = 1.32 m; 0.5 D per `column.ts:58`) and the narrow pilaster's (1.15 m).
  - The upper frame's top (5.46 m) stays under the lowest volutes (5.47) and the capital blocks (5.55). Across, it ends at u 2.655, where the volutes start at 2.786.

### F0 (continues). The repair is correct; no red proof is recorded, and the e2e change has not run — nit
- **Headless test** (`weston-door.test.ts:123-124`):
  - The line is X −52.9 (`COURT_X`). That is one body radius past the cornice's front (−52.55) and 0.71 m past the pedestal caps (−52.19), so the whole body has left the porch's footprint.
  - Walking in ends near X −43.89. The 6 s walk back crosses the line at about 4.65 s and ends near −55.61: 1.35 s and 2.7 m of margin.
  - Under it is the court's floor at the main floor's level from X −61.45 to −49.85 (`kravis.ts:33`, `:125`). Artworks keep 1.35 m outside X −55.4 there (`placement.test.ts:61`, `:83`), so the body (out to −55.96) meets nothing.
  - The test is deterministic and adds 120 frames.
- **E2E test** (`routes.spec.ts:335`):
  - The line is the eye at X ≤ −52.9, the place the court test starts from (`routes.ts:118`).
  - The walker must cross it, or the watch fails as stuck after 1.5 s without 5 cm of progress (`route-keys.ts:50`, `:74-78`). After the release it coasts 0.14 m plus the release lag, on open floor.
  - The walk grows by about 1 s, against a 45 s × throttle timeout.
  - I found no new way for it to flake, and the existing red proof at `gate-proofs.md:75` still goes red.
- **Gaps and fix:**
  - No red proof was planted for the new bound. A box across the front of the porch's body would stop the feet at X −51.48: red under the new line, but green under the old one (−51.40). Plant it once and record it in the header and in `gate-proofs.md`.
  - The comment on `COURT_X` (`weston-door.test.ts:40`) says "where the walk starts and ends"; the way back must pass it and ends about 2.7 m beyond. Reword it.

### F10 (continues). "9 m over the main floor" is 9.09 m — nit
- **Where:** `core.test.ts:14` and `:43`.
- **What is wrong:** 13.2 − L1 (4.11) = 9.09 m. The bound itself works:
  - The railing's top is at Y 12.635, 8.525 m over L1 (7.6 + 0.9 + 0.025; the cylinder runs y 0–1, `shapes.ts:38-39`).
  - The great window's ring of voussoirs (within ±3.1 m of the door's middle, up to Y 16.7) now falls outside the allowance, as it should.
- **Fix:** use 13.11, or say "9.1 m".

## Checked and sound
- **F1:** the records' figures match the code and agree with each other: 2.5 m from the architrave's face (d 2.21, `weston-porch.ts:126`) to the leaves (X ≈ −49.375), and the 2.43 m passage (2.13 + 0.3). They match in `spec.md:176`, `interior.md:302`, `interior-images.md` #33, the devlog and the plan.
- **F2 (the code part):** the door unit is placed at `WESTON_DOOR.x` (`weston-facade.ts:193`); the windows rightly keep their own `x`.
- **F4:** `spec.md:39` gives the code's 2.25 and 2.85 m.
- **F7:** the facade step staggers by `order` (`wings.ts:51-52`), over 12 ranks each 0.25 of the step long. The parts arrive in the order the new comment gives: pedestals 1, pilasters 2, the body with its entablature 3, panels 4, roundels 5, top block 6. The railing's order 8 has no effect, because its step staggers by `z` (`wings.ts:103`).
- **F8:** the reason holds. The 0.24 m (11.71 − 11.47 m) is right, and it is the estimated sill that would give way, not the measured balcony.
- **F9's other figures:** capitals 0.26 m (`column.ts:25`), modillions 0.345 m apart (`cornice.ts:219-222`), the cornice reaching ±3.35 m.
- **The estimates:** `interior.md`'s list of estimates matches `PORCH`'s comments (`weston-porch.ts:37-55`).

## Read outside the diff
- `AGENTS.md`; `docs/policies/local-rules.md`; `docs/design/spec.md:1-41`, `:172-185`, `:273`
- `src/model/lib/cornice.ts:160-283`; `src/model/lib/profiles.ts:20-185`; `src/model/lib/pilaster.ts:100-276`; `src/model/lib/column.ts:23-26`, `:58`; `src/model/lib/window.ts:4-7`, `:289`
- `src/model/core/constants.ts:10-70`; `src/model/core/shapes.ts:35-43`; `src/model/core/galleries.ts:40-89`; `src/model/core/plan-data.ts:21`; `src/model/core/wings.ts:40-114`
- `src/model/roche-south/kravis.ts:1-135`; `src/model/collection/placement.test.ts:40-109`; `src/model/hunt/routes.ts:108-121`; `src/walk/walker.ts:47-60`, `:300`; `src/viewer/cap-pass.ts:1-60`
- `tests/e2e/routes.spec.ts:1-200`, `:270-349`; `tests/e2e/route-holds.ts`; `tests/e2e/route-keys.ts`; `tests/e2e/route-places.ts:1-180`
- `docs/learning/gate-proofs.md:60-89`; `docs/research/interior.md:284-302`

## Findings and disposition

Every finding continues one of review 0's. Two corrections to review 0's record, which stays as it was written: its round outcome called all twelve findings repaired, where F5 asked for checks still to run (Codex 1); and its F10 repair called Y 13.2 "9 m over the main floor", which is 9.09 m (Codex 3; Claude F10).

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The return walks' repair holds, but no red proof is recorded for the headless test's new bound, and `COURT_X`'s comment says the walk ends there, where the way back passes it and ends 2.7 m beyond (Claude F0) | Accepted | Planted and recorded in `weston-door.test.ts`'s header: with the way back held 4 s, as before the repair, the feet stop at X −51.593 inside the porch, red under the new line, where the old line (X −51.40) passed; the comment names `COURT_X` the line the way back must pass. The e2e release line has no planted proof: a walker held in the porch fails there as stuck, by the hold's own watch (`tests/e2e/route-holds.ts`) |
| F2 | The records say moving the leaves would free the 528/529 wall, but `clearOf` moves any wall standing in the doorway's opening, and the wall's end stands in the 1888 wall's lined hole (Claude F2) | Accepted: review 0's premise was wrong and the repair copied it | `interior.md` and the plan say the wall would still stand on the west reveal, its end being in the 1888 wall's opening |
| F3 | The corner overlap's comment says the cut reads each piece alone, but a cut through the overlap caps each piece, so one's stone shows inside the other's cap (Claude F3) | Accepted | The comment gives the heights (0.96 to 1.32 m and 5.55 to 5.81 m over the main floor) and what such a cut shows |
| F5 | Checks still open on the repaired revision: `verify`, the throttled `routes.spec.ts` runs at 1× and 4×, the shots, which `817b4ae` changes at the head band and the side panels (Codex 1; Claude F5) | Accepted | On `817b4ae`: `npm run verify` green and `routes.spec.ts` three runs green at 1×. The first 4× run there failed in three Dendur tests, each with the page's context destroyed: the owner edited files the dev server serves during it, so Vite reloaded the page (docs/policies/local-rules.md warns of this); it proves nothing either way. `verify`, the shots and both throttle levels run again on this round's repair, with no edit in between |
| F6 | Brick still shows under the porch's side cornice: the band's upper part stops 0.05 m past the cornice's top moulding, which stands above the band, while at the band's height the cornice reaches only its bed mouldings (to 7.01 m) and corona; the lower part stops 8 cm short of the frieze (Claude F6) | Accepted | The band ends 1 cm short of what it meets at each height: the frieze (to 6.71 m), the cornice's bed mouldings (to its soffit, 7.01 m) and its corona, by `PORCH_REACH.frieze`, `bed` and `corona`, which follow the parts library's cornice profile |
| F9 | "The drawn base and pedestal cap run 0.47 m" names the wrong parts: 0.47 m is the drawn base alone (Claude F9) | Accepted | "the drawn base runs 0.47 m" in `interior.md` and `PORCH`'s comment |
| F10 | "9 m over the main floor" is 9.09 m (Codex 3; Claude F10) | Accepted | "9.1 m" |
| F11 | "The drawing's plan stops at the wall" survives in `weston-porch.ts`, the plan and the devlog; the side roundels' start and spacing are literals (Codex 2; Claude F11) | Accepted | The four places say the plan is cut off along the porch's front; the side roundels are four, evenly spaced between 0.45 m off the wall and 0.3 m short of the front |

## Verification

On `817b4ae`: `npm run verify` through `tmp/gate.sh` (81 test files, 732 unit tests; typecheck; lint; build; 125 e2e tests in 11.0 min); `routes.spec.ts` three runs in a row at 1× (14 tests each, 1.6 min each); the 4× attempt void, as F5 says.

On this round's repairs: the typecheck, ESLint on the changed files, and `core.test.ts`, `weston-door.test.ts`, `closure.test.ts`, `door-fit.test.ts`, `placement.test.ts`, `reach.test.ts` and `sequence.test.ts` (62 tests) green; the red proof above. `verify`, the shots and the throttled runs on the commit that carries them belong to review 2.

## Round outcome

Both reviewers approve with minor findings: no blocker or major finding. Every finding is accepted and repaired in the next commit, which review 2 reviews; the checks F5 names run on that commit.
