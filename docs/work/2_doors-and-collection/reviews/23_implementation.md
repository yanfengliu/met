# Review 23: implementation (fixed places for the route walks)

## Target

Repository `met`, the uncommitted working tree of branch `walkgate` (worktree `met-worktrees/walkgate`) on origin/main `8a6a0c2`, by worker `walkgate`: work unit 2's follow-up for F66. The reviewed bytes are the patch `tmp/review-runs/walkgate/reviewed.patch` (ignored), sha256 `cb2f627019d947494275309e99c3eee2ab49b372dc9a853b63ab5f36fb4ba816`, and the files themselves, kept in `tmp/review-runs/walkgate/tree-snapshot/reviewed-files.tar` (sha256 `1bfb5cedc1b65fa8f1b780caab4418d53da14aa0b2e3b7746e2bd96979420194`). The tree's digest was the same after both lanes had run.
- A query place, `walk=1&spawn=x,y,z,tx,ty,tz` (`src/walk/spawns.ts` `placeOf`, `src/walk/walk-mode.ts`, `src/main.ts`), with unit tests.
- `tests/e2e/routes.spec.ts` rewritten: one short real-key walk with F30, ten fixed places, two unthrottled frame budgets; the helpers in `route-walk.ts` and `route-places.ts`.
- AGENTS.md's routes.spec line and Load rule, `docs/design/spec.md`, `docs/learning/gate-proofs.md`, the devlog.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `-s read-only`, prompt `tmp/review-runs/walkgate/prompt-codex.md` (ignored), from the worktree, 346 s. By its own account it reviewed the working-tree changes and the untracked `spawns.test.ts`: placement, warnings, capture ordering, the shared helpers' callers, the model constants and the named red proofs. It ran no tests. It cited `src/walk/look.ts:17`, outside the diff, which says what it reports. No DLL failure in its log.
- Claude `claude-opus-5-5[1m]`, effort max, `claude -p` with `--tools "Read,Glob,Grep,Task,Bash"`, `--allowedTools "Read,Glob,Grep,Task,Bash(git diff *),Bash(git log *),Bash(git show *)"`, `--permission-mode dontAsk`, `--setting-sources=`, `--strict-mcp-config` and subagents forced to the lane's model, 1,487 s. A login and model check came first (`tmp/review-runs/walkgate/claude-login.jsonl`): init named the pin with no tools and no MCP servers, and the result's `modelUsage` held the pin alone. The review's init event showed exactly those five tools, `dontAsk` and no MCP servers. It made 73 tool calls (29 Read, 29 Grep, 13 git reads through Bash, 2 Glob) and no subagent call. The runbook's extraction kept the lane: success, `modelUsage` `claude-opus-5-5[1m]` alone.
- Worker: the red proofs (`docs/learning/gate-proofs.md`), the gates (Verification).

## Reports

### Codex (`gpt-6-astra`, xhigh)

1. **Should-fix — Weston’s allowed stopping range can leave the closed door unreachable.** [route-places.ts:116](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/route-places.ts:116) checks reach to the **open** leaf only. After closing it, [routes.spec.ts:293](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/routes.spec.ts:293) turns toward the closed door and expects “E Open” without moving. A position about 2.2 m behind the closed leaves satisfies the open-leaf range but exceeds the 2 m door reach defined in unchanged [look.ts:17](C:/Users/38909/Documents/github/met-worktrees/walkgate/src/walk/look.ts:17). Delayed release within the advertised 0.5 s allowance can therefore fail a correct product. Intersect the range with closed-door reach and revise the lag bound, or reposition into reach while remaining clear of the swing before reopening.

2. **Should-fix — `rest` does not enforce its advertised deadline.** [route-walk.ts:108](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/route-walk.ts:108) awaits `sample(page)` before checking elapsed time; each later sample has the same problem. `sample` waits for an animation frame without its own timeout. If the page stops producing frames, the promised 5 s × throttle diagnostic never executes; only the much longer test timeout ends the wait. Bound each sample by the remaining deadline using a timer in the test process, retaining the last successful eye for the error.

3. **Note — timing and success claims remain unfinished.** [gate-proofs.md:64](C:/Users/38909/Documents/github/met-worktrees/walkgate/docs/learning/gate-proofs.md:64) says “all pass” but leaves `__1X__` and `__4X__` placeholders; [summary.md:5](C:/Users/38909/Documents/github/met-worktrees/walkgate/docs/devlog/summary.md:5) repeats them. Record measured whole-file durations and results, or mark them pending. These bytes do not establish the roughly two-minute target.

I reviewed the working-tree changes and untracked `spawns.test.ts`, including placement, warnings, capture ordering, shared helper callers, model constants, and the named red proofs. I ran no tests and changed nothing. F30/F46/F54/F55 retain plausible failure assertions; I found no further correctness defect in the coordinate query path.

**Verdict: not accept.**

### Claude (`claude-opus-5-5[1m]`, max)

I didn't run any tests, as instructed. One thing found while reading: `test-results/` already holds a failed run of the short walk. It is the 0.7 s key-lag red proof.

#### Findings

**1. Blocking: the run times are placeholders, so the time target has no evidence.** `docs/learning/gate-proofs.md:64` and `docs/devlog/summary.md:5`
- **What:** both lines still read `__1X__` / `__4X__`. gate-proofs.md also says "With the work as committed, all pass", but nothing is committed and no green run is recorded.
- **Why:** the owner's target (about 2 min a run at 4×) and `AGENTS.md:123` (three runs in a row at 4× as well as at 1×) both need these numbers.
  - The only run on record in this checkout is red: `test-results/.last-run.json:2` reads `"failed"`, and its `error-context.md:15` is the 0.7 s key-lag proof.
  - That run's quoted source (`error-context.md:215-216`) is older than the reviewed `routes.spec.ts:216-219`: the `onLanding.length` guard was added after it. So these exact bytes have no green run yet.
- **Fix:** fill both lines from a verify run of these bytes plus three 4× runs in a row. If 4× takes over about 2 min, report that as an unmet target.

**2. Should-fix: Weston's reopen step has a tighter release bound than the header states.** `tests/e2e/routes.spec.ts:289-294`, `tests/e2e/route-places.ts:111-122`, header `routes.spec.ts:26-28`
- **What:** after `throughAndShut`, the test turns and opens Weston's door again straight on, from wherever the walker came to rest.
  - `useStretch` limits that resting place only by how far the open leaf is (far ≈ 2.46 m).
  - Opening it again needs the closed doorway within the door's 2 m reach (`src/walk/look.ts:17`).
  - Weston's pair is 2.83 m wide with a 0.08 m frame (`weston-facade.ts:51,162`, `window.ts:68,350-354`), which puts near at about 1.26 m. That matches the header's own 1.21 m stretch.
  - So the walker must stop by about 2.0 m. That allows only about 0.74 m past near, so a release later than about 0.37 s at 2 m/s (`walker.ts:59`) fails.
  - It fails at `looksAt('weston','E Open')` with "not the look target". The header promises 0.5 s and a failure "saying how far it went".
- **Why:** the old `standOff` (`git show HEAD:tests/e2e/route-places.ts`) required both the closed and the open leaf within reach. `route-keys.ts:3-5` measured 4× releases at 0.23–0.33 s on 2026-10-28, "and more on a loaded machine". That leaves 0 to 0.2 m of margin, which is the load flakiness this change exists to remove.
- **Fix:** either give `useStretch` an option to also require the closed doorway within reach (about 1.26 to 1.9 m at Weston's) and state that bound (about 0.3 s), or walk back with `into` until the walker is within 1.8 m before E.

**3. Should-fix: the docs say the walk goes "into gallery 600" and "back to the door"; it does neither.** `AGENTS.md:89`, `docs/design/spec.md:218,229`, `gate-proofs.md:45`, `devlog/summary.md:5`, `routes.spec.ts:9-10,211`
- **Into gallery 600:** the approach stops once the card shows (within 6 m). The Triumph hangs on the gallery's west wall (`spaces-b.ts:141`), so the walker stops at about Z −69.1 to −69.5, inside the doorway's passage. Gallery 600 starts at Z −70.0 (`routes.ts:56`).
- **Lost check:** the old arrival check (`top.eye[2] < INNER_EAST_Z`) is gone. `routes.spec.ts:221` only asks for samples between −69.5 and −67.29.
- **Back to the door:** the walker gets there by the view menu (`:224`), not on foot.
- **Misleading wording:** `spec.md:229`'s "down a Grand Staircase flight into gallery 600" reads as if the flight leads into the gallery.
- **Fix:** reword all of these, or keep walking and check the arrival.

**4. Should-fix: stale references to the old route walks** (files outside the diff)
- `tests/e2e/labels.spec.ts:8` says routes.spec "walks R1 and R5 through a door to the painting and back".
- `src/model/hunt/routes.test.ts:13` says "the e2e walks steer by real keys and drags".
- `src/model/hunt/routes.ts:3` says the routes are "shared by … the e2e walks".
- `docs/work/2_doors-and-collection/plan.md:157` still lists F66 under "Left open".

**5. Note: the run phase has an unstated release bound.** `routes.spec.ts:119`, `route-walk.ts:376-379`
- If Shift comes up more than about 0.5 s late, the walker enters the 1.9 m zone at 5 m/s. That gives roughly 3–4 frames at the 0.1 s cap, so `coming.near > 5` fails.
- The old header's "at least 7 frames under any load" (HEAD `routes.spec.ts:33`) no longer holds.
- **Fix:** state the bound, or end the run farther out.

**6. Note: a wrong allowance in a comment.** `route-places.ts:108-109` says "far − near less that coast". The let-go line already takes off the coast, so the allowance is far − near. Gate-proofs.md:62's own numbers show it: 1.47 m past the line = 0.14 coast + 1.33.

**7. Note: one check can pass on an empty record.** `expectClean` (`routes.spec.ts:105-107`) never checks that the screen record holds frames. At the doorway, landing, Dendur and pool places, the F30 check would pass if the record never ran.

**8. Note: gaps around the new query form**
- `main.ts:341`'s warning and the query table in `spec.md:167` don't say a place fails when its target is straight above or below the feet (`spawns.ts:44-46`).
- No test reads the spawn warnings: not for an unknown id, not for a malformed place.
- AGENTS.md doesn't list `src/walk/spawns.test.ts`, and line 105 names walk-mode.test.ts for the hook only. The header at `walk-mode.test.ts:1-6` doesn't cover the new place test.

**9. Note: two wrong test messages.** `spawns.test.ts:17` calls −X "due west", but it is south (`frame.ts:2`: +X is north). The arithmetic is right. `:15`'s message "level with the eye: looking down" contradicts itself.

**10. Note: a comment disagrees with the red proof.** `routes.spec.ts:309` says a walled-up doorway "would hold the walker inside it". `gate-proofs.md:56` records that the walker is lifted 7 m onto the wall's top.

**11. Note: coverage that leaves e2e without being recorded.** This is within the owner's mandate, but `AGENTS.md:89` doesn't say it:
- No test I found now climbs the Dendur platform's side flight or the dais's north flight.
- The eye level through the McKim, Mead & White seams, the Engelhard passage and the Petrie corridor is now read only as feet heights, headless (`routes.test.ts:14`).

**12. Note: waits only the test timeout bounds.** `approach`'s run phase swallows its own timeout (`route-places.ts:298`). `into`'s waits rely on Playwright's in-page timeouts, which `route-keys.ts:158` notes don't fire while the page is frozen. Both are bounded only by the test timeout (600 s for the short walk at 4×).

#### What I checked and found sound
- **The new query form:**
  - `placeOf` parses six finite numbers and refuses a target straight above or below the feet.
  - A spawn id is tried before a place, and anything else warns and falls back to the plaza.
  - `shot=1` places the walker before the first frame, through `prepareNow`.
  - No spawn has the id `place`.
  - Placement is the page's own path (`walker.ts:131-154`).
  - There's no import cycle: walker.ts doesn't import spawns.
- **Red proofs:** each of the 14 in `gate-proofs.md:49-62` still turns the named test red on the reviewed code.
- **Other bounds:**
  - Middle door: about 0.665 s.
  - Landing (3.01 m deep): about 1.18 s.
  - Gate passage: 1.4 s.
  - The rail stands on the terrace, 0.245 m before the gate slabs (`plan.ts:96,114`).
  - The forecourt, terrace and walkway past each let-go line are open floor or a stop.
- **Shared helpers:**
  - The `face`/`tilt` step change is safe for doors.spec and labels.spec at both viewports.
  - door-look.spec uses its own drag.
  - `approach` and the screen record are used only by routes.spec.
  - The removed helpers have no other users.
- **File sizes:** every changed file is under 500 lines.

**Verdict: not accept.** The run times behind the 2-minute target are unfilled placeholders, and Weston's release bound is understated. Accept once those times are measured and filled, and findings 2–4 are fixed.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F67 | Weston's door was opened again from wherever the walker rested after walking through, which the stretch bounded only by the open leaf's reach, so a release 0.37 s late could leave the closed door out of its 2 m reach (Codex 1, Claude 2, should-fix) | Accepted | Gallery 529's side is a fixed place of its own, with `doors=open`: on the axis midway between where the body clears the sweep (1.26 m) and where both the open leaf and the closed door straight ahead are in reach (1.8 m). The court side only walks through, past the sweep. Review 24 |
| F68 | `rest()` read frames with no bound of its own, so a page that stopped drawing outlasted its 5 s deadline (Codex 2, should-fix) | Accepted | `inTime` (`tests/e2e/route-holds.ts`) races each read with a timer in the test's process, failing with the eye last seen |
| F69 | The run times in `gate-proofs.md` and the devlog were placeholders, so nothing yet showed the 2-minute target (Codex 3, note; Claude 1, blocking) | Accepted | Filled from the gates (Verification) |
| F70 | The docs said the walk goes into gallery 600 and back to the door; it stops in the doorway's passage once the card shows, and goes back by the view menu (Claude 3, should-fix) | Accepted | Reworded in AGENTS.md, spec.md, gate-proofs.md, the devlog and the spec's header. The walk into gallery 600 itself stays with the headless walker (`routes.test.ts`, R5); the browser no longer checks the arrival there |
| F71 | Stale references to the old walks: `labels.spec.ts:8`, `routes.test.ts:13`, `routes.ts:3`, the plan's "Left open" (Claude 4, should-fix) | Accepted | Reworded; the plan's follow-up closes F66 |
| F72 | The run up the front steps ended 5 m out, so Shift let go more than about 0.5 s late would run into the prompt's 1.9 m (Claude 5, note) | Accepted | The run ends 8 m out: Shift may come up 1.1 s late and the last 1.9 m are still walked, at least 7 frames under the 0.1 s cap |
| F73 | `useStretch`'s comment took the coast off twice; the allowance is far − near (Claude 6, note) | Accepted | Comment and the header's numbers: 1.33 m, a release 0.66 s late at the middle door |
| F74 | `expectClean` passed on an empty screen record (Claude 7, note) | Accepted | It requires frames |
| F75 | The warning and the spec did not say a place's target must lie off the vertical; no test read the spawn warnings; AGENTS.md and `walk-mode.test.ts` did not name the new tests (Claude 8, note) | Accepted | `startOf` (`src/walk/spawns.ts`) resolves `spawn=` and makes the warning, which `spawns.test.ts` checks for an unknown id and two malformed places; the texts name it |
| F76 | Two wrong test messages in `spawns.test.ts` (Claude 9, note) | Accepted | Corrected: −X is south |
| F77 | The comment at R5's place said a walled-up doorway would hold the walker in it; it is lifted onto the wall (Claude 10, note) | Accepted | Corrected |
| F78 | Coverage that leaves the browser was not recorded: the Dendur side flight and the dais's north flight climbed, the eye's level through the seams and passages (Claude 11, note) | Accepted | AGENTS.md's line says the routes are walked headless only; the coverage dropped is listed in the plan's follow-up |
| F79 | `approach`'s run phase swallowed its timeout, and `into`'s waits relied on Playwright's in-page timeouts, which a frozen page does not fire (Claude 12, note) | Accepted | `inTime` bounds both; a run that never arrives fails, naming where the eye was |

## Verification

__VERIFICATION__

## Round outcome

Both lanes: not accept. Codex's two should-fix findings and Claude's blocking and three should-fix findings, F67 to F71, are repaired, and every note, F72 to F79, with them. Review 24 checks the repair.
