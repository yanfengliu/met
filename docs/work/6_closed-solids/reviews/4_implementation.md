# Review 4: the repairs of review 3

## Target

Work unit 6 on the met repository's branch `claude/kind-brahmagupta-01cb19`: commit `c73e52e`, the diff `3165aa5..c73e52e` (4 files, 52 insertions and 10 deletions), the repairs of review 3's findings F33 to F38.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-28 with the same short prompt (`tmp/review-runs/w6-r4/prompt.md`, ignored): each repair against its finding, `upright` for degenerate, level, upright and nearly upright faces, the new refusal against every caller of `wall`, and the changed claims and numbers. The diff came on stdin, and nothing edited the worktree while they ran. Raw captures stay under the ignored `tmp/review-runs/w6-r4/`.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker. It ran 43 focused Vitest tests, TypeScript, ESLint and `git diff --check`, and probes. It left the worktree clean.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. Its result's one model key is the pin. It ran the full unit suite, tsc and ESLint, and probes on an export in its scratchpad; it wrote only there.

## Reports

### Codex (`gpt-6-astra`)

One **nit**; no blocker, major or minor findings.

- **The documented formula is off by two.** [closure.test.ts:203](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/closure.test.ts:203), its header and `AGENTS.md:107` say “area in plan over its longest edge.” The implementation uses **twice** that area—the projected triangle’s minimum altitude. A triangle with projected legs 0.15 mm and 1 m has area/edge ≈0.075 mm, yet correctly returns false. Change the prose to “twice its area in plan over its longest edge,” and “at most” to match `<=`.

Read the four changed files, repository rules/spec, wall callers and supporting geometry/collision code, including [collision.ts:454](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/walk/collision.ts:454) outside the diff.

Verification:

- **43 focused Vitest tests**, TypeScript, scoped ESLint and `git diff --check` passed; changed source files remain below 500 lines.
- In-memory mutations reproduced **38, 504, 8** missing-inside points and **48/96/160** pendentive seam edges.
- Boundary probes confirmed rejection beyond the wall’s foot/top and acceptance when channels touch those bounds.
- Initial Vitest forks were blocked by sandbox temporary-file permissions; the threads run passed. Build/browser checks were not run.

No repository files were changed.

### Claude (`claude-opus-5-5[1m]`)

F33/F34, F36/F37 and F38 are resolved, and every changed number reproduces. F35 is only partly resolved: the new refusal's bound is wrong at both ends, and no test reaches it. There are no blocker or major findings: five minor findings (one is older than this diff) and two nits.

#### Minor

**1. The refusal checks `stop`, not the last joint actually built** (`src/model/lib/wall.ts:268-269`)
- **Evidence:**
  - The builder puts joints at `start + k·course` up to `stop` (`wall.ts:295`), but `Rustication.stop`'s doc calls it "Height of the last joint" (`wall.ts:42`).
  - 8 of the model's 15 rusticated walls pass a `stop` that no joint lands on, for example:

    | Wall | `stop` | Last joint built |
    |---|---|---|
    | Hunt skin | 9.37 m | 9.0 m |
    | Hunt end piers | 14.1 m | 13.8 m |
    | Bank | 7.05 m | 6.76 m |

  - So the bound overstates the channels' top by up to 0.37 m. It can refuse a wall whose channels all lie inside, and the message then names a span no channel has.
  - `wall({ width: 12, height: 7.2, thickness: 0.9, rustication: { course: 0.6, joint: 0.06, depth: 0.05, start: 0.6, stop: 7.19 } })` throws "channels run from 0.57 to 7.220000000000001 m", but its top channel ends at 6.63 m.
  - A rustication with no joints at all (start 3.5, stop 3.4, height 3) is refused with "run from 3.45 to 3.45 m".
  - No caller trips it today. I logged all 15 walls; the tightest is 0.255 m under the bound (the end piers).
- **Fix:** compute the joints once in `wallSpec` with the builder's own loop and pass them in `WallSpec`. Then bound `joints[0] − joint/2` and `joints.at(-1) + joint/2`, and name those values in the message.

**2. The bounds accept a channel lying exactly on the foot or the top, which builds an unsound wall** (`wall.ts:269`)
- **Evidence:** on a 4 m wide, 0.5 m thick wall with course 1, joint 0.1, depth 0.05:
  - Channel floor on the foot (start 0.05): 6 edges borne by an odd number of faces. A normal rusticated wall has 0.
  - Channel ceiling on a 2.1 m top: 6.
  - Both together: 12, and 0.41% of `backfaceFraction`'s 400 rays meet a back face.
  - `openAlong` reads all three closed, so the closure gate would pass such a wall.
  - The removed clamp changed nothing at these values, so this is not new. The repair just stops one step short of its own boundary.
- **Fix:** make the bounds strict (`low > 1e-6 && high < height − 1e-6`) and say "above the foot and below the top" in the message.

**3. The new refusal has no test** (`src/model/lib/wall.test.ts:85`)
- **Evidence:** `AGENTS.md:107` now lists "`wall` refuses channels past the wall's foot or top" as part of the gate. The only refusal test ("caches, and names what is wrong with an opening") covers openings only. No test expects the refusal to throw and no caller comes near it, so removing it would leave the suite green.
- **Fix:** add cases past the foot, past the top and at the bounds, matching `/rustication's channels run from/`, and record that they go red with the refusal removed (R18).

**4. The definition of upright is off by a factor of two** (`src/model/closure.test.ts:21`, `:203-204`, `AGENTS.md:107`)
- **Evidence:**
  - The docs say a face's width is "its area in plan over its longest edge in plan". The code's `twice` (`:207`) is twice the plan area, so the rule actually measures the face's height across its longest plan edge.
  - For the unit check's own "leaning 0.05 mm" face, area over edge is 0.025 mm; the rule measures 0.05 mm.
  - Separately, the code uses `<=` (`:212`), while the docs and the test name (`:338`) say "less than BEHIND wide".
- **Fix:** write "twice its area in plan over its longest edge in plan (its height across that edge)" and "at most BEHIND wide".

**5. Older than this diff: nothing refuses channels that overlap or meet** (`wall.ts:256-266`)
- **Evidence:** joint 0.4 with course 0.3 builds silently, with 27 odd edges and 4.5% of rays meeting a back face. Joint equal to course gives 0.74%. This is the neighbouring case to the new refusal, which R26 asks a repair to check.
- **Fix:** `require(part, joint < course, …)`, naming both values.

#### Nits

**6. "48, 96 and 160 edges borne by one face" is not quite right** (`AGENTS.md:107`)
- **Evidence:** with dc1a7dc's spandrels, at low, medium and high, 44, 92 and 156 edges are borne by one face, plus 4 at each level borne by three. The totals 48, 96 and 160 count edges borne by an odd number of faces, which is what the test's own message says.
- **Fix:** write "borne by an odd number of faces".

**7. The new unit check's red is not recorded** (`closure.test.ts:24-31`, `AGENTS.md:107`)
- **Evidence:** with 3165aa5's `upright`, the unit check fails with "a point: expected false to be true". Every reading of the real model stays green under both rules, so this check is the only guard for F33/F34.
- **Fix:** name it in the header's "Red with" list.

#### What holds
- **`upright` (F33, F34):** it handles points, segments in plan, level faces, upright faces and nearly upright ones correctly. Under the new rule the gate's other upright-dependent red counts are unchanged: 8 for the old pendentives, and 19 upright shapes and 10 `SHEETS` counts off for unsheeted window panes.
- **Red counts and the bound (F36, F37):**
  - Leaving out the pier core's top and bottom gives exactly 38.
  - Leaving out the moon gate panel's foot, top and ends gives exactly 504.
  - The header's new wording on the crossing rule's bound matches `src/walk/collision.ts:456-459` and `docs/design/spec.md:133`.
- **The seam check (F38):** it is red at every detail level with the old spandrels and green at HEAD.
- **Repo rules:** the files are 453, 359 and 99 lines. `tsc --noEmit` and ESLint `--max-warnings 0` on the changed files pass, and the full unit suite passes (70 files, 638 tests).

#### What I read and ran
- **Read:**
  - the diff, and `git diff dc1a7dc 3165aa5` for `dome.ts`, `wall.ts` and `crossings.test.ts`
  - all of `closure.test.ts` and `wall.ts`; `dome.ts:120-215` and `dome.test.ts`; `wall.test.ts:1-90`
  - `collision.ts:456-459` and `spec.md:78,133`
  - `astor-court.ts:35-118`, `medieval-hall.ts:56-98` and `window.ts:195-210,386-402`
  - every `wall` caller that sets rustication
- **Ran:** in an export of HEAD with the worktree's packages aliased, I put each defect back one at a time and ran the tests:
  - the pier core, the moon gate panel, and dc1a7dc's spandrels (in both the closure gate and a per-level probe)
  - the window panes unsheeted, under both the old and new rule
  - 3165aa5's `upright` rule
  - I also logged every rusticated wall in the sequence and the parts gallery, and probed `wall` at, past and between its channel bounds.
- **Worktree:** clean at `c73e52e` before and after.

#### Leftovers
Deleting my scratch copy was refused, so these files remain outside the repository:
- `(scratchpad path redacted)` (the export)
- `(scratchpad path redacted)`
- `(scratchpad path redacted)` (pendentive edge counts)
- `(scratchpad path redacted)` (the 15 walls' channel spans)
- `(scratchpad path redacted)` (the bounds probe)

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F39 | The refusal bounds the channels by `stop`, not by the last joint the wall builds, up to 0.37 m higher on 8 of the model's 15 rusticated walls, so it could refuse a wall whose channels all lie inside, naming a span none has (Claude 1, minor) | Accepted | The joints come from one helper (`jointsOf`) for the refusal and the builder, and the refusal bounds the first and last of them |
| F40 | The bounds accept a channel lying exactly on the foot or the top, which builds an unsound wall (Claude 2, minor) | Accepted. Not new; no caller comes near | The bounds are strict, and the message says "above the wall's foot and below its top" |
| F41 | Nothing tests the refusal (Claude 3, minor) | Accepted | `src/model/lib/wall.test.ts`: past the foot, on the foot, on the top, a joint as tall as the course, and two walls that build; red with each refusal removed |
| F42 | The upright width is twice the area in plan over the longest edge in plan, not the area, and the rule is "at most", not "less than" (Codex, nit; Claude 4, minor) | Accepted | Reworded in `upright`'s comment, the gate's header, its test's name and AGENTS.md |
| F43 | Nothing refuses channels that overlap or meet (Claude 5, minor) | Accepted. Older than this work | `wall` refuses a joint as tall as its course or taller, naming both |
| F44 | "Edges borne by one face" where the count is of edges borne by an odd number; the new check of `upright` has no recorded red (Claude 6 and 7, nits) | Accepted | Reworded; the gate's header and AGENTS.md record the check red with review 3's rule |

## Verification

`npm run verify` passed with `MET_PORT=5348` on the repairs: 70 files and 639 unit tests, typecheck, lint, build and 84 e2e tests in 12.8 min. The refusal's tests are red with each refusal removed (past the foot; a joint as tall as the course), and no wall of the model trips either: the whole sequence builds. No shots were taken: no geometry of the model changed.

## Round outcome

Neither lane found a blocker or a major; every finding is repaired. These are the fifth set of repairs in this work unit, the canon's cap on automatic repair (R11), so they close the review here without a further round: each is small, and each new refusal or check is pinned by a test that goes red without it.
