# Review 28: implementation (fixed places for the door specs)

## Target

Repository `met`, branch `doorspawn` at `0f4a1e9` (worktree `met-worktrees/doorspawn`, its tree clean): `ace6e2f` by worker `doorspawn`, with origin/main `b6e3e91` (docs only) merged in. The reviewed diff is `git diff b6e3e91 0f4a1e9`, kept as `fleet/tmp/review-runs/met-2-r28/round28.patch` (ignored), sha256 `6496108304ab15f224844b4b42274695035ec2714881738b5b19a5ba3cdec8b7`; both commits are recoverable. The worker's session stopped before this review, which a later session ran.

- `tests/e2e/doors.spec.ts` and `door-look.spec.ts` stand the walker at fixed places set by `walk=1&spawn=x,y,z,tx,ty,tz`, through `standAt` and `feetOn` (`tests/e2e/route-places.ts`) and `lockPointer` (`tests/e2e/helpers.ts`).
- Retired: `route-walk.ts`'s `walk`, `legs` and corner settle; `route-keys.ts`'s key log, lag learning and stops.
- AGENTS.md's door specs line, the spec's Doors gate item, `docs/learning/gate-proofs.md`, the plan, the devlog, and `src/repo-conventions.test.ts`'s header.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `fleet/tmp/review-runs/met-2-r28/prompt.md` (ignored), from the worktree, 582 s. Its delegated reviewer failed to start, so it reviewed directly. It cited `tests/e2e/walk.spec.ts:193`, `tests/e2e/routes.spec.ts:145`, `src/model/hunt/arches.ts:50` and `src/walk/walk-mode.ts:35`, outside the diff; the integration owner read the first, third and fourth, and they say what it reports. No failed sandbox command in its log.
- Claude `claude-opus-5-5[1m]`, effort max, `claude -p` with `--tools "Read,Glob,Grep,Task,Bash"`, `--allowedTools "Read,Glob,Grep,Task,Bash(git diff *),Bash(git log *),Bash(git show *)"`, `--permission-mode dontAsk`, `--setting-sources=`, `--strict-mcp-config` and subagents forced to the lane's model, 1,364 s. A login and model check came first (`claude-login.jsonl`): init named the pin with no tools and no MCP servers, and the result's `modelUsage` held the pin alone. The lane's own init showed its five tools, `dontAsk` and no MCP servers, and its result's `modelUsage` held the pin alone. It made 24 reads, 37 searches and 4 shell commands, and did not delegate. One command, a `cd` to fleet's checkout to read `scripts/test/canon-budget.test.mjs`, was refused by `dontAsk`. No call named the run folder.
- The tree's `git status --porcelain` and `git diff HEAD` were the same before and after both lanes.
- Integration owner: the landing session (Claude Code desktop, 2026-11-03), which ran the gates (Verification).

## Reports

### Codex (`gpt-6-astra`, xhigh)

Found one coverage gap and two documentation errors.

1. **Medium — the actual Walk toggle’s axis alignment is no longer checked.** [door-look.spec.ts:81](C:/Users/38909/Documents/github/met-worktrees/doorspawn/tests/e2e/door-look.spec.ts:81) replaces the old browser assertion of `start.eye[0] === 0` and `start.look[0] === 0` with a query place constructed from spawn data. The named replacement, [walk.spec.ts:193](C:/Users/38909/Documents/github/met-worktrees/doorspawn/tests/e2e/walk.spec.ts:193), checks position within 5 cm but never checks facing. `mouse-look.spec.ts` checks relative mouse turns; routes uses F with pointer lock disabled. Consequently, a small unwanted yaw introduced when the Walk toggle acquires pointer lock could pass these replacements while failing the old test. **Fix:** move the original browser alignment assertion into the existing Walk-toggle test, after placement and locking.

2. **Low — the side doors are not outside the budget camera’s view.** [doors.spec.ts:434](C:/Users/38909/Documents/github/met-worktrees/doorspawn/tests/e2e/doors.spec.ts:434), repeated in the plan, incorrectly justifies opening them all. From the source geometry, the north doorway’s centre is approximately 60° from +Z; this camera faces approximately 29° from +Z. Its roughly 91.5° horizontal field includes that doorway. These values follow from [arches.ts:50](C:/Users/38909/Documents/github/met-worktrees/doorspawn/src/model/hunt/arches.ts:50) and [walk-mode.ts:35](C:/Users/38909/Documents/github/met-worktrees/doorspawn/src/walk/walk-mode.ts:35). This is a geometric inference, not a rendered observation. The second navigation therefore changes visible neighbouring door states as well as removing the walk. **Fix:** correct the comment and plan; preserve the original side-door states before timing, or explicitly document and substantiate the changed benchmark scene.

3. **Low — the old walk count is wrong.** [plan.md:211](C:/Users/38909/Documents/github/met-worktrees/doorspawn/docs/work/2_doors-and-collection/plan.md:211) says “up the front steps (all five walking tests).” The baseline contains **six** walking tests across these files: **four** climb the front steps and **two** approach the link along the plaza. **Fix:** state those counts, making the coverage inventory consistent with the six placed tests recorded above it.

By reading the baseline, current code and named coverage homes, I otherwise verified:

- Entrance traversal and resting clear of the swings remain explicitly checked in [routes.spec.ts:145](C:/Users/38909/Documents/github/met-worktrees/doorspawn/tests/e2e/routes.spec.ts:145). The headless W-only approach and browser pointer-lock checks have the stated homes. Removed helper exports have no remaining consumers.
- Prompt bands, seam alignment, E, locked clicks, scrubber checks, pixels, walking cycles and the GPU-synced render retain their assertions.
- `standAt` uses the stronger settled-eye check. `placeOf` interprets feet and target consistently with its construction. `firstSurface` reads all drawn surfaces rather than only walkable ones, but I found no conflicting surface at these specific step, bay or plaza coordinates.
- The timing init script is registered on the same `Page` before both navigations; each navigation gets its own log. The error listeners remain attached, and `timedSwing` reads the current document. The middle door’s initial `+90°` state is asserted.
- The proof record accounts for every previous mutation and the new eye-height mutation. The merge adds only documentation changes. AGENTS.md measures **23,418 bytes** with CRLF, below 30,000.

The reported timings do not expose a concrete problem with the default 30-second deadlines or the budget test’s 50 seconds. Their behaviour under load, and the reported green gates and red proofs, remain execution claims I did not independently reproduce.

No files changed; no tests, builds, servers or browsers ran. The delegated reviewer failed to initialize, so this assessment is my direct review.

**Verdict: accept once the findings are repaired.**

### Claude (`claude-opus-5-5[1m]`, max)

**Verdict: accept once findings 1 and 2 are repaired.** Both are wording fixes to a test comment and the plan. Nothing I found weakens a gate, and nothing makes the 4× criterion doubtful. Findings 3 and 4 and the nits are optional. The comment fix touches a `.ts` file, so it needs `npm run verify` before it is committed.

#### Findings

**1. Low: the open north doorway is in the bay page's view.**
- **Where:** `tests/e2e/doors.spec.ts:433-434` says "The side doorways, open too, stand out of the view". `docs/work/2_doors-and-collection/plan.md:216` says the same.
- **What's wrong:** the geometry says otherwise.
  - The north door spans X 1.654 to 3.146 (`src/model/hunt/arches.ts:45-54`, `:68-69`). Its leaves' back face is at Z −1.759 (`src/model/lib/window.ts:352`, `:372-374`).
  - The bay eye is at (0, 5.71, −3.124).
  - The closing swing looks 29.4° toward +X. `WALK_FOV` is 60° (`src/walk/walk-mode.ts:35`), so at 1280×720 the view reaches 45.7° either side, out to 75.1°.
  - The north doorway lies at 50° to 67°, and its near open leaf at 52° to 68°. Both are in view, at the left of the frame.
  - The opening swing looks 14° toward +X and reaches 59.7°, so part of the doorway is in view there too. Only the south doorway is out of both views.
- **Where it bites:** the record claims the facing-out frames are as the old walk's were. They are not. The old walk saw this doorway shut, drawn by the timeline's batched leaves. The new page draws its leaves open, with the plaza through the opening.
- **Why only low:** that is more work per frame, so the budget check is no weaker. A later change that relies on the claim would still be misled.
- **Fix:** reword both. For example: "The north doorway, open too, stands at the left of the view, so these frames draw more than the walk's did; the south one is out of view."

**2. Low: the plan's "Checks moved or dropped" names homes for only the middle door's walks.**
- **Where:** `plan.md:211`.
- **What's wrong:** the bullet lists three walks, then names two homes. Both homes hold only the middle door's walks:
  - routes.spec goes up the front steps and through the door both ways (`routes.spec.ts:8-10`, `:145-170`).
  - `doors.test.ts` walks W alone, headless (`src/model/doors.test.ts:204-219`).
- **What has no home, and isn't said to be dropped:**
  - The 94 m walk along the plaza to the north link door. No test walks it now.
  - The run through the open doorway into the bay. routes.spec only walks through it.
  - The old door-look walk with the pointer locked by the Walk toggle. It showed held keys turn nothing while locked: the look's X component was under 1e-6 after about 25 m. No browser test now walks while locked and reads the look; mouse-look.spec holds no movement key.
- **Why only low:** all three are "the walks themselves", which the acceptance criterion lets go.
- **Fix:** add one line naming these three as dropped, with no home.

**3. Low: five tests now run on the 30 s default with no recorded time.**
- **Where:** doors.spec's entrance, link door and 390×844 tests, and both door-look tests. `playwright.config.ts` sets no `timeout`.
- **What's wrong:** the old comments gave each test's measured time and a four-times margin. Now only the budget test does (`doors.spec.ts:373`).
- **The new cost:** door-look's first test likely runs first in a full run. If so, it now pays for building the finished model in the test process (`doorPlan` → `finishedTimeline`, and `feetOn`), which the old test never did.
- **My estimate:** 30 s is enough. Seven tests took 28.1 s, about 4 s each.
- **Fix:** record each test's time in the plan's Result, or set explicit timeouts with a time comment, as routes.spec's place tests do (`routes.spec.ts:341`, `:348`).

**4. Low: the place check exists twice, and a header misstates who uses it.**
- **Where:** `tests/e2e/route-places.ts:4-5`.
- **What's wrong:** the header implies routes.spec stands at these places. routes.spec uses neither `standAt` nor `feetOn`. Its own `openAt` (`routes.spec.ts:94-108`) repeats `standAt`'s checks line for line, so a later fix to one copy misses the other. `route-walk.ts:4` has the same mismatch.
- **Fix:** export the checks that follow `rest`, and call them from both. Or correct the two headers.

**Nits.**
- `doors.test.ts` lets W go 1.3 m from the leaves' face and rests 0.6 to 1.3 m out (`:216-217`). So "where W alone brings the walker" is about 0.1 to 0.3 m off the place. That is harmless within the 1 to 1.6 m band.
- `route-keys.ts:25-28` still describes `WATCH_MS` in terms of the retired legs.
- `door-look.spec.ts:16-17` mentions "the click that locks it", but only the first test clicks.
- `standAt` checks where the walker stands but not where it looks. A placement a few degrees off would still meet the right leaf at the entrance.

#### The eight points

1. **Lost coverage.** Every explicit check of the old specs is kept. What `walk` checked on its own (not stuck, walk mode not left, the 0.25 m corner settle) belongs to the walks themselves, so see finding 2. The claimed moves hold:
   - The toggle's lock: `walk.spec.ts:183-188` and `mouse-look.spec.ts:81-83`.
   - Where the toggle puts the walker: `walk.spec.ts:191-193`.
   - The old 1e-9 check on the plaza spawn's axis and facing is now covered in two parts. The toggle and a query place share `placeAt` (`src/walk/walk-mode.ts:372-377`). door-look then reads the axis and the facing below 1e-6 (`door-look.spec.ts:85-86`).
   - W alone at 30, 60 and 144 frames a second: `doors.test.ts:204-219`.
   - Walking through the door: routes.spec's `throughAndShut`.
2. **The places.** Each place is the middle of where the old walk came to rest:
   - before the entrance: Z −0.424 ± 0.25;
   - before the link door: (69, −0.9) ± 0.25;
   - in the bay: Z −3.124 ± 0.25.

   Each looks at the same point, at the spawn's 8° pitch, which the old turns never changed. The prompt and its band, the facing-in budget, the GPU-synced render, the scrubber and the locked click are all tested from the same view as before. The facing-out budget differs only by finding 1.
3. **`standAt` and `feetOn` are sound.**
   - The page drops the feet onto the first surface below a point 1 m above them (`src/walk/walker.ts:127-139`). `feetOn` casts one ray down through every drawn mesh. If the two disagree, the 2 cm check fails loudly, and the 3 cm plant shows that check bites.
   - The entrance places sit on the doorway's second step, 2.4 cm in from its riser (`podium.ts:161-164`, risers every 0.4 m). The next step's nosing is 0.356 m ahead, clear of the 0.35 m body.
   - The link door's floor is 0.57 m up. That is below where either search starts, and the old walk reached the same point on foot.
   - Nothing assumed about `placeOf` or `rest` fails to hold.
4. **The second page.**
   - `addInitScript` runs again on every navigation, so the frame log starts fresh.
   - `timedSwing` reads the new page's clock.
   - The error listeners are on the Page object, so they persist.
   - `doors=open` gives the middle door open at 90°, as E from before it does, and the test asserts it (`:437`).
   - The 0.51 m clearance from the swing is right: 1.513 − 0.35 − 0.652. It isn't asserted, but a held swing would make `doorIs` time out.
5. **Timeouts:** enough, by my estimate (finding 3). The 50 s budget timeout is four times 12.4 s.
6. **Retired exports:** nothing imports them; I grepped tests/, src/ and scripts/. routes.spec never ran `walk`, the key log or stops. So its slower 4× runs aren't explained by code, and passing under extra load doesn't weaken the gate.
7. **Docs:** one line per paragraph, accurate apart from findings 1 and 2. AGENTS.md is 23,418 bytes over 131 lines, so about 23,549 with CRLF, under 30,000. The 8,704 figure matches `CORE_CEILING_BYTES = 8_704` in `../fleet/scripts/test/canon-budget.test.mjs:23`.
8. **Tests that pass with the behaviour broken:** I found none.
   - If the free click that locks the pointer used the door, door-look's "E Open" would fail.
   - If `doors=open` failed, the bay page's facts check would fail.
   - If the spawn moved off the axis, the place would move with it, and the axis check would fail.

#### Verified by reading vs inferred

- **Read:** every changed file and its old version at `b6e3e91`. Also the homes the checks moved to, the entrance geometry (`arches.ts`, `dims.ts`, `podium.ts`, `window.ts`, `frame.ts`), `place` and `placeAt`, the Playwright config, and fleet's ceiling.
- **Inferred:** the north doorway being in view, which I worked out from the geometry and the field of view, not from a render. Also the timeout margins, and the cause of the slower 4× runs.
- I ran nothing, and I did not delegate; the scope fit in one pass.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F84 | The Walk toggle's facing is no longer read in the browser. door-look's old check after the toggle, the eye on the axis and the look along it to 9 digits, became a query place, and walk.spec, named as its home, reads the toggle's place within 5 cm but not its facing (Codex 1, medium) | Accepted. It was an explicit check, not part of a walk, so the plan's first acceptance criterion keeps it. Claude read it as covered, since the toggle and a query place share `placeAt` and door-look reads the facing on the query path. The shared code is real, but the toggle's click and the lock it takes are the toggle's own, and only a browser check reads them | walk.spec's toggle test reads the eye on the spawn's line and the look along its facing, to 9 digits, once the pointer is locked (`tests/e2e/walk.spec.ts`). Red with one pixel of turn planted at the lock, as is door-look's middle-door test (`docs/learning/gate-proofs.md`). The plan names it |
| F85 | The bay page's open north doorway stands in the view facing out, at its left, where the comment and the plan said the side doorways stood out of it; the walk saw that doorway shut (Codex 2, Claude 1, low) | Accepted. The scene changed in that one doorway: its leaves are drawn open and the plaza shows through it. The budget's subject, the middle door's swings facing out, is unchanged. Claude reads the change as more work per frame, so no weaker a check; that is not measured | Reworded in `doors.spec.ts` and the plan; the scene is kept |
| F86 | The plan said the front steps were walked by "all five walking tests"; four tests climbed them, and two walked the plaza to the link door (Codex 3, low) | Accepted | Corrected, naming the tests |
| F87 | The plan named homes for the middle door's walks only. Three walks were dropped without saying so: the plaza walk to the link door, the walk into the bay, and door-look's walk under the toggle's lock, which showed that held keys turn nothing while locked (Claude 2, low) | Accepted. All three are the walks themselves, which the acceptance criteria let go | A line in the plan's "Checks moved or dropped" names them as dropped, with no home |
| F88 | Five tests now run on Playwright's 30 s default with no recorded time, and door-look's first test may now build the finished model itself (Claude 3, low) | Accepted | The times recorded in the plan from the verify run on `0f4a1e9`: 24.6 s for all seven, door-look's middle-door test 4.0 s alone. No timeout set |
| F89 | `route-places.ts`'s header said routes.spec stands at its places, and `route-walk.ts`'s that route-places sets the places walks start from; routes.spec's `openAt` repeats `standAt`'s checks (Claude 4, low) | Accepted in part: the headers are corrected. The checks stay apart: `standAt`'s comment names `openAt` as their twin, and sharing them would change routes.spec, which the 4× runs hold, for no change of behaviour | Both headers reworded |
| F90 | `WATCH_MS`'s comment spoke of the retired legs (Claude, nit) | Accepted | Reworded |
| F91 | door-look's Bound spoke of "the click that locks it" at both places; only the middle door's test clicks (Claude, nit) | Accepted | Reworded |
| F92 | `doors.test.ts` lets W go 1.3 m out and rests 0.6 to 1.3 m out, so "where W alone brings the walker" is 0.1 to 0.3 m off the 1.3 m place (Claude, nit) | Noted, no change: the place is on that line and within the 1 to 1.6 m band the test checks | None |
| F93 | `standAt` checks where the walker stands, not where it looks (Claude, nit) | Noted, no change: `src/walk/spawns.test.ts:13-17` holds `placeOf`'s look toward its target, the page places it by the same `placeAt` as the named spawns, and door-look reads the look where its checks rest on it (to 1e-6 on the axis, 3 mm at the link door's seam) | None |

## Verification

- `npm run verify` on `0f4a1e9`, through the gate lock: 732 unit tests in 81 files and 125 e2e in 9.3 min, 625 s in all (the log in the landing session's scratchpad, not kept). The seven door tests took 24.6 s.
- The worker's 4× runs (`met/tmp/load-doorspawn.log`, ignored): three runs of routes.spec with walk.spec, 21 passed and 2 skipped each, exit 0, in 160, 205 and 198 s, as the plan's Result says.
- F84's red proof, planted on the repaired tree and undone (`docs/learning/gate-proofs.md`, `tests/e2e/walk.spec.ts`): both tests red, then green with the plant undone.
- The repairs' gates: the records of reviews 29 and 30.

## Round outcome

Both lanes: accept once the findings are repaired. F84 to F91 are repaired, and F92 and F93 are noted with no change. Review 29 checks the repairs, and review 30 the repairs of review 29's findings.
