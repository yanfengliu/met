# Review 1: implementation

## Target

Repository `met`, branch `barrel`: commit `ecb6db6` on `1e3b272`, the repairs to review 0's findings F0 to F8, over seven paths: `src/model/lib/dome.ts`, `src/model/lib/dome.test.ts`, `AGENTS.md`, `docs/learning/gate-proofs.md`, `docs/devlog/summary.md`, `docs/work/9_barrel-rib-refusal/plan.md` and `docs/work/9_barrel-rib-refusal/reviews/0_implementation.md`. The reviewers read it uncommitted, from a patch whose sha256 is `34f0d46b883fccf476fa96f8f046b122c4999b44e777bf86e95e555b07b8f01f`; `git diff 1e3b272 ecb6db6` hashes to the same digest.

## Reviewers and coverage

- **Codex**, `gpt-6-astra` at `model_reasoning_effort=xhigh`, codex-cli 0.163.0, `--sandbox read-only --ephemeral`, the patch on stdin, run from the worktree. Lens: does each repair answer its finding; new defects in the 1 mm bound, the advice and its rounding, the order, the no-rib branch, the default note and `below()`'s range; the tests' geometry, bounds and independence (R19); the records against the code. It cited lines outside the patch (`src/model/lib/builder.ts:28` and `:304`, `src/model/lib/params.ts:20`, the model's callers), spot-checked as quoted. Its log's one match for the DLL markers is the echoed patch, review 0's record quoting them, not a failure. 8 min 0 s.
- **Claude**, `claude-opus-5-5[1m]` at `--effort max`, Claude Code 2.1.308, the patch as the user message, the same lens and the same limits as in review 0; its `system/init` showed the five tools, `dontAsk` and no MCP servers, and the report's keep rule passed. It made 10 reads, 10 searches (9 `Grep`, 1 `Glob`) and three read-only `git` calls, and no subagent. 17 min 43 s.
- Both were asked to run no tests or builds, since `npm run verify` was queued on the same tree, and ran none. Neither changed the worktree: its diff hashed to the patch's digest after both.

## Reports

Codex's links are rewritten as repository paths and Claude's headings demoted two levels to sit under this record's own; nothing else is changed.

### Codex (`gpt-6-astra`, xhigh)

1. **Should-fix — “At most” recommends ribs that can still fail.** `src/model/lib/dome.ts:284` checks the shell only at the named rib, but shell clearance is not monotonic in rib width. For:
   ```ts
   { span: 4, length: 3, thickness: 0.057,
     coffers: { across: 2, along: 1, depth: 0.05, rib: 2 } }
   ```
   the advice names **at most 1.874 m**, without another thickness. That exact rib needs about 0.0559 m and passes. Choosing **0.25 m**, which follows the advice, needs about **0.0599 m** and fails. F1 is therefore only partly resolved. **Fix:** recommend setting the rib to the named value, or calculate thickness sufficient throughout the advertised interval. Add this fixture.

2. **Nit — Even the exact named thickness can fail at large accepted values.** `src/model/lib/dome.ts:271` inherits the old rounding formula, whose `+ 1e-6` can disappear:
   ```ts
   { span: 4, rise: 1e-8, length: 3, thickness: 0.055,
     coffers: { across: 2, along: 10, depth: 2097152, rib: 0.5 } }
   ```
   Here the chord calculations round to 1, giving a required thickness of exactly `2097152`. The advice names rib `0.1868` and thickness `2097152.0000`; applying both fails the strict thickness comparison. At `20971520000`, adding `1e-6` rounds away. These extreme values pass `src/model/lib/params.ts:20`, outside the patch. **Fix:** verify that the parsed thickness in the new rib advice strictly exceeds the requirement, advancing it when necessary. The existing thickness refusal’s formatter can remain unchanged. This is an inherited numerical limitation exposed by the new advice, not a rounding regression.

3. **Nit — The recorded lower bound is rounded upward.** `docs/work/9_barrel-rib-refusal/reviews/0_implementation.md:161` says `below()` receives at least `1.4e-19`. The next double above `0.001` differs by `2^-62`, giving a smallest positive `most` of approximately **1.3552527156e-19**. The implementation remains safely within `below()`’s stated range. **Fix:** use the exact expression or a conservative lower bound such as `1.3e-19`.

4. **Nit — The proof record overstates the sliver’s message check.** `docs/learning/gate-proofs.md:48` says N8’s whole message is checked and “So must Codex’s” be. `src/model/lib/dome.test.ts:204` checks only `/less than 1 mm of floor/`. **Fix:** describe that substring assertion accurately, or assert the complete message.

Verified by reading:

- **F0’s original sliver is rejected.** `src/model/lib/dome.ts:277` requires the computed remaining width and length to be at least 1 mm. This provides ample clearance from the polygon cutoff at the fixture and model scales; that cutoff is in unchanged `src/model/lib/builder.ts:28`, with Float32 conversion at `src/model/lib/builder.ts:304`.

- **F2 and F6 are repaired.** `src/model/lib/dome.test.ts:45` translates radial distance, winding and angles by the axis height. The segmental fixture has radius 2.5 m and axis −1.5 m; its angles remain inside `(0, π)`, avoiding `atan2` wrapping. The radial filter selects floor triangles. At `src/model/lib/dome.test.ts:171`, interpolation uses built positions rather than `FLOOR_INSET`; face counts and finite dimension bounds remove the empty-result loophole. The 1–1.2 mm and 1–1.4 mm bounds are consistent with the fixtures.

- **The order fixture works.** The second fixture at `src/model/lib/dome.test.ts:192` needs approximately 0.0559 m thickness at its original rib, exceeding 0.055 m. Moving the thickness refusal first would change its result. The two exact recommended pairs are consistent with the recorded `0.1868 / 0.0594` and `0.1957 / 0.0564`.

- **The thickness refusal’s own output is preserved.** Comparing HEAD with `src/model/lib/dome.ts:255` and `src/model/lib/dome.ts:291`, the arithmetic, operation order, rounding and message text are unchanged for inputs reaching that refusal.

- **F3’s underflow route is removed; F5, F7 and F8 are addressed.** `src/model/lib/dome.ts:278` avoids recommending a rib when the computed available allowance is nonpositive. The winding explanation distinguishes one reversal from two, the default note is conditional on omitted `rib`, and `src/model/lib/dome.ts:214` states the inset assumption.

- **F4’s table and existing geometry agree with the code.** The revised recommendations at `docs/work/9_barrel-rib-refusal/plan.md:38` follow the new bound and downward rounding. I read the unchanged callers in `src/model/hunt/arches.ts:116`, `src/model/hunt/hall-vaults.ts:40`, its line 46, `src/model/hunt/stair.ts:159`, and `src/parts/catalogue-architecture.ts:240`. Their geometry construction is unchanged and their coffer floors retain wide margins.

No edits, tests, builds, Node tooling or subagents were used. Numerical counterexamples above are from static reasoning; recorded mutation runs and gate results were not independently executed.

### Claude (`claude-opus-5-5[1m]`, max)

I found nothing blocking or should-fix, and eight nits. Every repair answers its finding, and following the advice exactly (the rib named and any thickness named) always builds. The thickness refusal's message is byte for byte what it was. The plan's table, the gate-proofs numbers and the order fixture all follow from the code. I ran no tests, builds or Node tools: only Read, Grep, `git diff`, `git show` and `git log`, with no subagents.

#### Findings

**N1. Nit: "at most" allows ribs that the thickness refusal then refuses (left over from F1).** `src/model/lib/dome.ts:284`
- **What:** the thickness clause is read only at the rib named.
  - Where a cell spans more than one facet (`across` under 16 at medium detail, `dome.ts:250`), a narrower rib can put the floor corners under a facet's middle.
  - Example: N8's vault with thickness 0.053 m is told "make coffers.rib at most 0.392 m." with no thickness clause. At 0.392 m the floor corners stand 0.28 mrad before the facet edge at π/20 and need 0.0500 m.
  - Rib 0.2 m is within "at most". Its corners stand 1.5 mrad from the first facet's middle and need 0.0563 m. The vault is refused: "make thickness at least 0.0564 m or coffers.depth at most 0.0466 m." Ribs of 0.25 and 0.3 m fail the same way.
  - At thickness 0.04 m the message names "0.392 m, and thickness at least 0.0501 m", and 0.2 m at 0.0501 m is still refused.
- **Why:** F1's own reason (`reviews/0_implementation.md:159`) is that the rib named should lead to a vault that builds. That holds for the value named, not for the range "at most" offers. Each message is right for its own inputs, so the cost is one extra refusal, never wrong geometry.
- **Fix:** read the thickness clause over every rib up to the one named. Each cell's edges are facet edges, and the floor corners sweep from there to their inset at the rib named.
  - If `FLOOR_INSET * named / 2 / radius >= facet / 2`, also take `(radius + depth) / Math.cos(facet / 2) - radius`. Name the larger, and say "that rib or a narrower one".
  - No fixture's message changes. N8 at 0.3 m would need 0.0564 m, still under 0.3. Test 2's corners never reach half a facet.
  - Or word the advice as the one rib it vouches for.

**N2. Nit: the thickness named is only checked against the refusal that computed it (R19).** `src/model/lib/dome.test.ts:195-198`
- **What:** the advice and the thickness refusal both read `shell(named)` (`dome.ts:283`, `:291`), so "the named pair builds" holds by construction. A thickness named too large stays green. The values 0.0594 and 0.0564 m (`plan.md:32`) are not pinned, yet the test's name and `gate-proofs.md:48` claim "the thickness it needs".
- **Fix:** pin `['0.1868', '0.0594']` and `['0.1957', '0.0564']`, as `:139` pins 0.1074. Both can be checked by hand:
  - 2.05·cos(0.023455)/cos(π/32) − 2 = 0.05935
  - 2.05/cos(π/40) − 2 = 0.05634

**N3. Nit: a test comment out of date.** `dome.test.ts:179`
- **What:** the comment says "within 0.2 mm of the least". The assertion at `:183` allows a floor up to 1.4 mm, which is 0.4 mm of floor or 0.25 mm of rib. The comment comes from `1e3b272`'s `closing - 2e-4`.
- **Fix:** say "1 to 1.4 mm of floor". Or tighten to `< 0.0012`: `below()` drops less than 0.1 mm of rib between 0.1 and 1 m, so floors stay at 1.16 mm or less. The fixtures give 1.118, 1.12 and 1.088 mm.

**N4. Nit: `FLOOR_LEAST`'s reason is overstated.** `dome.ts:219-220`, `docs/devlog/summary.md:5`
- **What:** "Less is as good as none … could close a narrower floor" claims every floor under 1 mm is lost. In fact `builder.ts:28` drops a face only at 5e-13 m². Float32 resolves about 1 µm at 10 m, so a 0.5 mm floor is about 500 steps wide.
- **Fix:** say, as `plan.md:26` and `gate-proofs.md:43` do, that Float32 threatens floors under a micrometre and 1 mm is a wide margin.

**N5. Nit: a wrong number in F3's disposition.** `reviews/0_implementation.md:161`
- **What:** it says `below()` reads "at least 1.4e-19 m". The smallest `least` above 0.001 is `FLOOR_LEAST` + 2⁻⁶², for example `length` 0.0010000000000000002 with `along` 1. Then `most` is 2⁻⁶²/1.6 ≈ 1.355e-19 m.
- **Fix:** write "about 1.36e-19 m". The code's own stated range, "from 1e-300 up" (`dome.ts:224`), is right.

**N6. Nit: three records claim more than the tests hold.**
- `gate-proofs.md:48`: "So must Codex's floor" reads as a pin on the whole message. `dome.test.ts:204` matches only `/less than 1 mm of floor/`.
- `gate-proofs.md:47` and `plan.md:30` say "1 to 1.2 / 1.4 mm across". The second vault reads its floors' length, so say "across or along".
- `plan.md:30`'s `(least − 0.001) / 1.6` uses `dome.ts:276`'s `least`, a cell's smaller side. The test's `least` (`dome.test.ts:172`) is a rib (R25).

**N7. Nit: the "no rib" advice offers fewer coffers where none can be removed (R26).** `dome.ts:279`
- **What:** its own fixture (`dome.test.ts:206`) has `along: 1`, the minimum `integer` allows (`dome.ts:240`), and it is the length that binds. The same holds for `across: 2` when the width binds.
- **Fix:** name the side that binds, and drop "fewer coffers" where that count is already at its minimum.

**N8. Nit: the round outcome counts split severities two ways.** `reviews/0_implementation.md:176`
- **What:** F1 (Codex should-fix, Claude nit) is counted as should-fix, while F4 (Claude should-fix, Codex nit) is counted as a nit.
- **Fix:** use one rule for both, for example "four should-fix: F0, F1, F4, F6".

#### What I verified

**F0.**
- The 1 mm comparison is at `dome.ts:222` and `:277`.
- `builder.ts:28` keeps a face only when its area is over 5e-13 m², and `:84` drops it otherwise.
- Codex's sliver has a 1.6e-14 m floor and is refused.

**F1 and the order.**
- One `shell` (`dome.ts:255-269`) serves both refusals.
- The rib named passes this refusal by at least 1e-6 of a unit. `shell` reads the thickness only for `room`. `enough` rounds up by at least 1e-10. So the named pair always builds.
- The second shell at its own rib of 0.25 m needs 0.0559 m, more than its 0.055 m. The first needs 0.0507 m, so only the second pins the order, as the records say.

**F2.** `dome.test.ts:180-183` counts the faces and bounds the floor's size.

**F3.**
- `most > 0` holds exactly when the cell is over 1 mm.
- At the smallest `most`, the subtraction rounds back to exactly `FLOOR_LEAST`, which `<` lets through, so the rib named builds.
- At exactly 1 mm, ribs under about 7e-20 m pass. That falls inside the `<`/`≤` bound already stated at `gate-proofs.md:50`.

**F4.** The table's values follow from the code: `arches.ts:111-116`, `dims.ts:95`, `:99`, `:136-137`, `:144`, `frame.ts:85`, `hall-vaults.ts:18`, `:40`, `:46` and `catalogue-architecture.ts:241`.
- Floors: 0.534, 1.3065, 0.96 and 1.0443 m.
- Ribs named: 0.4931, 0.9759, 0.7993 and 0.872 m.

**F5.** A search finds no "faces out" claim left in this work's records or comments.

**F6.**
- `floorsOf`'s axis (`dome.test.ts:51`, `:54`, `:55`) matches `buildVault`'s `cy` (`dome.ts:307`, `:315`).
- The angles run from 0.6435 to 2.498 rad, so `atan2` never wraps.
- Only floors have all three corners at radius + depth, and each fan triangle spans the whole floor (`dome.ts:374`, `builder.ts:88`).
- Width and length fall exactly linearly with the rib, so the line reading is exact: 0.392074, 0.186875 and 0.289155 m.
- The floors 0.1 mm of rib short of that are 1.16 mm. Float32 noise is about 1e-7 m.

**F7.** The default note is at `dome.ts:288`. The fixture's cells are 4π/45 m wide, giving 0.1739 m and no thickness clause (0.2026 < 0.4).

**F8.** The comment is at `dome.ts:213-214`.

**Unchanged behaviour.**
- The thickness refusal (`dome.ts:291-299`) is byte for byte `1e3b272`'s.
- N8's whole message matches by hand.
- `buildVault` and the cache key are untouched, and every vault the model builds keeps at least 0.534 m of floor.

**Records and lint.**
- All ten red claims in `gate-proofs.md:54-63` follow from the code, and the file has 10 tests.
- The AGENTS.md change at line 107 is one clause.
- Under `strictTypeChecked` (`eslint.config.js:9`), every template expression is a string, and `c?.rib` is needed because `c` is not narrowed.

**One old edge case, not a finding.** A `rise` under about 1e-308 makes `cell.width` NaN. The new comparison lets that through where `1e3b272`'s refused it. The thickness refusal still refuses it, with "NaN m" in its message.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F9 | "At most" offers ribs that the thickness refusal then refuses: a corner needs the most shell under a facet's middle, which a narrower rib can put it at. `{ span: 4, length: 3, thickness: 0.057, coffers: { across: 2, along: 1, depth: 0.05, rib: 2 } }` is told "at most 1.874 m" with no thickness, and 0.25 m then needs 0.0599 m (Codex 1, should-fix); N8's vault in a 0.053 m shell is told "at most 0.392 m", and 0.2 m is refused (Claude N1, nit) | Accepted: the advice offers a range, so it must hold over the range | A cell's edges are facet edges, since `facets` is a multiple of `across`. As the rib grows from nothing, a corner moves in from a facet's edge toward its middle, where its need peaks at (radius + out) / cos(facet / 2) − radius; past the middle the need falls, and it rises to the same peak at each later middle. So over every rib up to the one named, the need is greatest at the rib named or, where that is wider, at the rib that first puts the corner under a middle: `facet · radius` for an opening and that over `FLOOR_INSET` for a floor. The shell is read at those, and the thickness enough for all is named, "enough for any rib up to that". Codex's vault is a fixture, told 1.874 and 0.06 m, and every rib up to 1.874 m, 5 mm apart, builds in that shell; red with the shell read at the rib named alone (review 2) |
| F10 | Where rounding up loses its 1e-6, the thickness named equals the need, which the strict comparison refuses: `{ span: 4, rise: 1e-8, length: 3, thickness: 0.055, coffers: { across: 2, along: 10, depth: 2097152, rib: 0.5 } }` is told 2097152.0000 m (Codex 2, nit, older than this work in the thickness refusal) | Accepted | `enough` steps 0.1 mm past the need where its rounding does not clear it, for both refusals, so the thickness refusal's messages are unchanged wherever they passed; the vault is a fixture, told 2097152.0001 m, and builds in it; red without the step (review 2) |
| F11 | Review 0's F3 row says `below()` reads at least 1.4e-19 m; the least is 2⁻⁶² over 1.6, about 1.36e-19 m (Codex 3, Claude N5, nit) | Accepted | Corrected in review 0's record, labelled |
| F12 | Records claim more than the tests hold: "So must Codex's floor" reads as a pin on its whole message, which the test does not hold; "1 to 1.2 / 1.4 mm across" where the second vault reads its floors' length; the plan's `(least − 0.001) / 1.6` takes the code's `least`, a cell's smaller side, beside the test's `least`, a rib (Codex 4, Claude N6, nit) | Accepted | The gate proofs say "refused … with one under 1 mm" and "across or along"; the plan says "refused for its floor" and "the cell's smaller side less 1 mm, over 1.6" (review 2) |
| F13 | The thicknesses named are checked only by building with them, which the code that computed them makes pass (Claude N2, nit, R19) | Accepted | The three pairs are pinned as worked by hand, the working in the test's comment: 0.05935, 0.05634 and 0.05992 m (review 2) |
| F14 | A test comment says "within 0.2 mm of the least" where the bound allows 1.4 mm of floor (Claude N3, nit) | Accepted | The bound is 1.2 mm, which `below()`'s rounding keeps for ribs from 0.1 to 1 m, and the comment says "1 to 1.2 mm across or along" (review 2) |
| F15 | `FLOOR_LEAST`'s comment and the devlog say that less than 1 mm is as good as none, though only floors under a micrometre are at risk (Claude N4, nit) | Accepted | Both call 1 mm a wide margin over the two risks (review 2) |
| F16 | The no-rib advice offers fewer coffers where the count is at its least, as in its own fixture with one coffer along (Claude N7, nit, R26) | Accepted | It names the side that binds, wider or longer, and offers fewer coffers only above the least; cells 0.8 mm long with one coffer along and with ten are fixtures; red with fewer coffers always offered (review 2) |
| F17 | Review 0's outcome counts F1 by its higher rating and F4 by its lower (Claude N8, nit) | Accepted | Corrected in review 0's record, labelled |

Claude's closing note, that a rise under about 1e-308 makes a cell's width NaN and the new comparison let it through to the thickness refusal, was raised as no finding. The comparison now reads `!(least − 1.6 · rib ≥ 1 mm)`, so such a cell is refused by the rib refusal, as at `1e3b272`; a fixture holds it, red with `ecb6db6`'s comparison.

## Verification

- `npm run verify` on the reviewed tree, through the gate lock with `MET_PORT=5361`: passed, 75 files and 681 unit tests, typecheck, lint, build and 84 e2e tests in 13.4 min, queued at 12:06:08 and done at 12:31:46 (log `tmp/gate-runs/verify-2.log` in the worktree, ignored). `gate.sh` itself exited 130: I had sent its waiting loop a TERM to cancel the run, and bash deferred it until the command, which had just taken the lock, finished.
- After the repairs: the file's 10 tests pass, `tsc` and ESLint are clean, and fourteen mutations turn them red (`docs/learning/gate-proofs.md`).
- The repairs are checked in review 2.

## Round outcome

Nothing blocking. One finding a reviewer rated should-fix (F9, which Claude rated a nit) and eight nits; all accepted. The repairs change the advice's reading of the shell, its rounding and the no-rib branch, so review 2 reviews them.
