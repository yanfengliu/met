# Review 3: implementation

## Target

Repository `met`, branch `barrel`: commit `41d194b` on `3e0b2c5`, the repairs to review 2's findings F18 to F23, over eight paths: `src/model/lib/dome.ts`, `src/model/lib/dome.test.ts`, `AGENTS.md`, `docs/learning/gate-proofs.md`, `docs/devlog/summary.md`, `docs/work/9_barrel-rib-refusal/plan.md`, `docs/work/9_barrel-rib-refusal/reviews/1_implementation.md` and `docs/work/9_barrel-rib-refusal/reviews/2_implementation.md`. The reviewers read it uncommitted, from a patch whose sha256 is `c135279613603e20b80857cbfc7a9e87987c5472365a8595777e6a7d94a1615d`; `git diff 3e0b2c5 41d194b` hashes to the same digest.

## Reviewers and coverage

- **Codex**, `gpt-6-astra` at `model_reasoning_effort=xhigh`, codex-cli 0.163.0, `--sandbox read-only --ephemeral`, the patch on stdin, run from the worktree. Lens: does each repair answer its finding and is anything it removed still needed; the radius check for every input `positive` lets through; the depth step; the fixtures, mutations and records. It cited lines outside the patch (`src/model/lib/params.ts:20`, `src/model/lib/builder.ts:304`, the builder and callers), spot-checked as quoted. Its log's match for the DLL markers is the echoed patch, review 0's record quoting them, not a failure. 5 min 46 s.
- **Claude**, `claude-opus-5-5[1m]` at `--effort max`, Claude Code 2.1.308, the patch as the user message, the same lens and limits as before; its `system/init` showed the five tools, `dontAsk` and no MCP servers, and the report's keep rule passed. It made 10 reads, 8 searches (7 `Grep`, 1 `Glob`) and four `git` calls, one of which, a `git -C`, `dontAsk` refused, as its report says; no subagent. 17 min 35 s.
- Both were asked to run no tests or builds, and ran none. Neither changed the worktree: its diff hashed to the patch's digest after both.

## Reports

Codex's links are rewritten as repository paths and Claude's headings demoted two levels to sit under this record's own; nothing else is changed.

### Codex (`gpt-6-astra`, xhigh)

1. **Nit — Zero radius still permits NaN cell dimensions.** `src/model/lib/dome.ts:237`. With `span` and `rise` both `Number.MIN_VALUE`, explicit `thickness: 1`, `length: 3`, and coffers `{ across: 2, along: 1, depth: 0.05, rib: 0.01 }`, the radius underflows to zero. It passes `Number.isFinite`; `span / 2 / radius` becomes `0 / 0`, and the restored `<` comparison lets the NaN width reach the thickness refusal. A plain vault also passes this guard. These inputs pass the unchanged `src/model/lib/params.ts:20`. **Fix:** require a finite radius **above zero**, give underflow an appropriate remedy, and add a fixture. The “every cell’s size is a number” claims in the plan and F18 disposition need this qualification.

2. **Nit — The radius message misdiagnoses huge semicircles and offers unusable remedies.** `src/model/lib/dome.ts:236`. For `span: 1e308, rise: 5e307`, the mathematical radius is the finite `5e307`, but the expression evaluates `Infinity / Infinity`. Increasing rise or reducing span individually violates the preceding half-span constraint. Refusing this arithmetic is appropriate; attributing it to an unrepresentably large radius and offering those remedies does not satisfy R26. **Fix:** describe failure to compute the radius, offer reducing both dimensions for this case, and pin a huge-span fixture.

3. **Nit — A depth below the computed room can still be refused.** `src/model/lib/dome.ts:316`. Consider `{ span: 4, rise: 2 ** -39, length: 3, thickness: 1, coffers: { across: 2, along: 1, depth: 1, rib: 0.01 } }`. The radius is exactly `2 ** 40`, the chords round to 1, and `need.room` is 1. The offered depth is `0.9999`, but adding it to the radius rounds to `radius + 1`: adjacent doubles there are approximately `0.00024414` apart. The resulting floor need remains 1 and fails the strict thickness comparison. This inherited limitation survives F20’s repair despite the room being below its documented bound. **Fix:** offer the formatted depth only when its forward shell calculation passes; otherwise lower it sufficiently or omit that alternative. Add this fixture and qualify the guarantee.

No blocking or should-fix findings. These cases do not affect the model’s current vaults.

Verified by reading:

- **F18’s reported reproducer is fixed.** `src/model/lib/dome.test.ts:232` checks both coffered and plain vaults against the explicit span/rise message. Ordinary vaults retain the same validation arithmetic and unchanged `src/model/lib/dome.ts:326`.

- **The no-rib fallback is unnecessary with the current comparison.** At `src/model/lib/dome.ts:283`, entering the branch and retaining the no-rib advice implies `least <= FLOOR_LEAST`, so at least one side enters `grow`. NaN instead bypasses the branch, as finding 1 explains.

- **F20 fixes its specific fixture and preserves ordinary messages.** `src/model/lib/dome.test.ts:228` independently pins `2097151.9999` and applies it. The new expression returns the original value whenever its formatted value is already below the room. The existing ordinary-depth pin remains `0.0527` at `src/model/lib/dome.test.ts:139`.

- **F21’s fixtures exercise the missing branches.** `src/model/lib/dome.test.ts:218` covers widths approximately `0.7854` and `0.5236` mm, lengths `0.8` mm, and the two-sided case with length `0.25` mm. Literal expected suffixes catch wrong minimum counts, a deleted width clause, and the old conjunction.

- **The tests avoid the previously identified vacuity.** `src/model/lib/dome.test.ts:174` and line 181 require floor counts, orientation and bounded dimensions. The huge fixtures establish arithmetic only, correctly acknowledged in the records; the unchanged `src/model/lib/builder.ts:304` prevents treating them as geometry proofs.

- **The seventeen mutation descriptions match the relevant assertions.** `docs/learning/gate-proofs.md:54` contains seventeen entries, consistent with the plan’s count. I did not reproduce their execution or independently establish the recorded 424-line measurement.

- **The record repairs otherwise align.** `docs/work/9_barrel-rib-refusal/plan.md:16` resolves F19; `AGENTS.md:107` resolves F22 within the permitted clause; `docs/work/9_barrel-rib-refusal/reviews/1_implementation.md:166` and `docs/learning/gate-proofs.md:48` resolve F23. Review 2’s dispositions and the devlog agree with the implementation, subject to the numeric limitations above.

I read the supplied patch, review records, instructions, validation, cache, builder and callers. No edits, tests, builds, Node tooling or subagents were used.

### Claude (`claude-opus-5-5[1m]`, max)

I found nothing blocking or should-fix, and six nits. Each repair answers its finding for ordinary vaults, and every vault the model builds is unchanged. But two of the repairs' own claims fail at extreme inputs, and I have a reproducer for each, worked by hand.

#### Findings

**N1. Nit: a cell can still be NaN wide, and the plain comparison now hands it to the thickness refusal.** `src/model/lib/dome.ts:236-237`, `:283`; `docs/work/9_barrel-rib-refusal/plan.md:28`; `reviews/2_implementation.md:203`
- **What happens.** Take `{ span: 5e-324, rise: 5e-324, length: 3, thickness: 0.1, coffers: { across: 2, along: 1, depth: 0.05, rib: 0.01 } }`. The parameters are given because their defaults would round to 0 and be refused; `positive` lets Number.MIN_VALUE through (`params.ts:21`).
  - span² and rise / 2 both round to 0, so the radius is 0, and `Number.isFinite` passes it.
  - span / 2 is 0 too, so `arc` = asin(min(1, 0/0)) is NaN, and so is `cell.width`.
  - `NaN < 0.001` is false, so the rib refusal is skipped. `shell` reads NaN, and the thickness refusal says "make thickness at least NaN m."
  - At `3e0b2c5`, the `!(… >= …)` form refused this cell in the rib refusal.
  - Built plain, the vault's `half` is NaN (`dome.ts:330`). Its polygons drop out (`builder.ts:28`, `:84`), but its grids keep NaN positions (`builder.ts:203-209`).
- **Why it matters.** "Every cell's size is a number there" (plan.md:28) and F18's "with every cell's size a number" are false at this input. So the comparison the repair removed is still needed here; the fallback's removal is safe.
- **Fix.** Make the check `Number.isFinite(radius) && radius > 0`, with its own message for a radius of 0 (e.g. "…a radius of 0 m; make rise larger"). Add a fixture at Number.MIN_VALUE, coffered and plain.

**N2. Nit (R26): at huge spans the radius check's message is wrong and its first remedy can't work.** `dome.ts:236-237`
- **What happens.** For any span above about 1.34e154 m, `span * span` overflows, so every rise is refused. `{ span: 1e155, length: 3 }` is told "span 1e+155 m over rise 5e+154 m gives the inner face a radius too large for a number…; make rise larger or span smaller."
  - Its radius is span / 2 = 5e154, which is a number.
  - Its rise is already span / 2, and `:234` refuses more. No rise helps while span² overflows.
- **A bound to know.** The check stops float64 overflow, not unusable positions, which are stored as Float32 (`builder.ts:304`). A plain vault with span 4 and rise 1e-300 passes and builds x ≈ 2e300 · cos(fl(π/2)) ≈ 1.2e284, stored as Infinity. That is the symptom F18's row gives as its reason.
- **Fix.** Where `span * span` is not finite, say span² overflows and advise "make span smaller" alone. Have the plan or F18's row say that the check stops float64 overflow only.

**N3. Nit: following "coffers.depth at most" can be refused again, at a room of only 0.5 m.** `dome.ts:314-316`, `:320`; `reviews/2_implementation.md:205`
- **Reproducer.** `{ span: 4, rise: 2 ** -49, length: 3, thickness: 0.4, coffers: { across: 2, along: 1, depth: 0.6, rib: 0.01 } }`.
  - The radius is exactly 2^50, where numbers lie 0.25 apart, and every `chord` is exactly 1.
  - The floors' need is fl(2^50 + 0.6) − 2^50 = 0.5, and the room is fl(2^50 + 0.4) − 2^50 = 0.5.
  - The vault is told "make thickness at least 0.5001 m or coffers.depth at most 0.4999 m."
  - With depth 0.4999 the need is again 0.5, which is at least 0.4, so the same message comes back, naming the depth it has. That is F20's own symptom. Every depth from 0.375 m to 0.4999 m fails.
- **Why.** The step compares the depth with `need.room`, which is computed through the thickness. The next call instead checks the floors' need, computed through the depth. The two agree in exact arithmetic, not once number spacing near the radius exceeds the depth's margin under the room. That margin can be as little as 1e-10 m, so by the same argument it can start near radii of 1e6 m.
  - The thickness advice has no such gap: its need doesn't depend on the thickness, so the next call reads the very number `enough` cleared.
  - The comment and F20's row bound the guarantee by the room ("under about 1e11 m"), which is the wrong variable.
  - The F20 fixture can't show this: its chords are exactly 1, and its number spacing (3e-8 m) is far under its 0.1 mm step.
- **Fix.** Give `shell` the depth as a parameter. Offer the depth only where `shell(rib, Number(X)).floors < full.thickness` (X being the depth named), and otherwise name the thickness alone; then it holds by construction, as the thickness advice does. Pin this vault as a fixture. Or bound the claim by the radius (about 1e5 m) and say the 2097152 m fixture lies outside that bound.

**N4. Nit (R26): the no-rib advice offers fewer coffers where even the least count can't reach 1 mm, and the new fixtures pin this.** `dome.ts:287-288`; `dome.test.ts:222-223`
- **What happens.** Span 0.001 m with three coffers across is told "fewer coffers.across or a larger span". Its inner face is 1.571 mm round, so at the least count, two across, its cells are still 0.785 mm wide. Following the first remedy just brings back "make them wider, with a larger span." The two-sided fixture's "fewer coffers.along" has the same problem: at one coffer along, its cells are 0.5 mm long. This is F16's fault one step further.
- **Fix.** Use `across > 2 && (radius * arc) / 2 > FLOOR_LEAST` and `along > 1 && full.length > FLOOR_LEAST`. Re-pin those two fixtures, and add one where fewer coffers do suffice: span 0.0015 m with three across has 0.785 mm cells, and 1.178 mm at two.

**N5. Nit: AGENTS.md's clause now reads as if a thickness is always named.** `AGENTS.md:107`
- "Naming a rib that passes and a thickness enough for any rib up to it": a thickness is named only where the shell is too thin. N8's message (`dome.test.ts:213`) names none, and the old "any thickness it needs" carried that condition.
- **Fix.** "…and, where the shell is too thin, a thickness enough for any rib up to it", as in plan.md:12. It stays one short clause.

**N6. Nit: two mutation records only reproduce under a narrower reading than their words.** `docs/learning/gate-proofs.md:59-60`
- "Half the span taken for the radius" gives the recorded 0.3709 m only if applied in the cell's width. With `radius` itself set to span / 2 (`dome.ts:236`), the segmental vault's cells read 0.6283 m and a different assertion fails.
- "π taken for the arc" leaves the second test green only in the width. With `arc` itself set to π (`:249`), the 2097152 m fixture is told about 2097152.0149 m, and both tests go red.
- **Fix.** Add "in the cell's width" to both.

#### What I verified

- **F18, ordinary vaults.** The check sits after the half-span check and before `full` (`dome.ts:234-237`), using the same expression the coffered branch used at `3e0b2c5`. For any finite radius, cells, shell readings and every pinned message are unchanged, and `buildVault` is untouched (`:326-400`).
  - For tiny rises the condition and message are right: with span 4, rises under about 1.1e-308 are refused, and both remedies work.
  - At rise 1e-310 the plain vault would have had an infinite radius and NaN positions (`:328-330`).
  - The model's vaults are ordinary: `src/model/hunt/arches.ts:116`, `hall-vaults.ts:40,46`, `stair.ts:159`, `src/parts/catalogue-architecture.ts:240-241`.
- **The no-rib branch** (`dome.ts:283-290`) can't be reached with no side to name. For numbers, `most > 0` exactly when `least` exceeds 1 mm, so otherwise some side is at most 1 mm. A NaN width (N1) skips the branch entirely.
- **F20, ordinary rooms.** Below about 4e5 m the 1e-6 survives and the depth is already under the room, so nothing changes; the 0.0527 m pin (`dome.test.ts:139`) holds. On the F20 fixture the radius is exactly 2e8, need and room are both exactly 2097152, the depth steps to 2097151.9999, and following it builds (`:228-230`).
- **F21 fixtures** (`dome.test.ts:218-226`): the numbers match the code (radius 0.0005 m, arc π, cells 0.785, 0.524 and 0.25 mm). They go red with fewer coffers across offered at two, with the old join, and with the width line deleted.
- **Tests (R19).** All expected values are literals, so none agrees with itself.
- **The seventeen mutations** (`gate-proofs.md:54-70`): each recorded failure follows from the code, including 0.1874, 0.3904, 0.3709 (N6 aside), 40 faces, 2097152.0000 and the "thickness first" marker. The count, 1 + 16, matches `plan.md:50` and review 2's line 215, and the file has 10 tests.
- **Rib and thickness advice.** Following the rib named passes, by `below`'s margin, even with cells near 1 mm. The thickness advice holds by construction.
- **F19, F22, F23 and the records** match the code apart from N1 to N3: `plan.md:16,18`; `AGENTS.md:107`; `reviews/1_implementation.md:164,166` against `reviews/0_implementation.md:10`; `gate-proofs.md:48`; `docs/devlog/summary.md:5`.

I only read files and ran `git log`, `git diff --stat` and `git show`. One `git -C` call was refused by the permission mode, so I re-ran it without `-C`. I ran no tests or builds, used no subagents and edited nothing.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F24 | A span and rise of `Number.MIN_VALUE` give a radius of 0, which `Number.isFinite` passes; the cell's width is then NaN, which the plain comparison hands to the thickness refusal ("make thickness at least NaN m"), and a plain vault builds NaN positions; "every cell's size is a number there" is false (Codex 1, Claude N1, nit) | Accepted, not repaired: stated as a bound. The coordinator asked for work unit 9 to land first among work units 9 to 12, and nothing blocking or should-fix was open | The plan and the gate proofs state the bound. Follow-up, proposed: read the radius by `buildVault`'s own formula, `(w² + rise²) / (2 · rise)`, and refuse it unless it is a number above 0, the message saying what it computes to |
| F25 | Where the formula overflows on its way to a radius that is a number, as for spans over about 1.34e154 m (`{ span: 1e155 }`, `{ span: 1e308, rise: 5e307 }`), the message says the radius is too large for a number, and "make rise larger" cannot work, since the rise is already half the span (Codex 2, Claude N2, nit, R26). Claude adds a bound: the check stops float64 overflow, not positions too far out for Float32, as a plain vault of span 4 m and rise 1e-300 m shows | Accepted, not repaired: stated as a bound, as F24 | The plan and the gate proofs state both bounds. Follow-up, proposed: with F24's check, a message asking for a span and rise nearer a metre, whose radius is a number above 0 |
| F26 | Following "coffers.depth at most" can be refused again: where numbers near the radius lie farther apart than the depth's margin under the room, the depth named reads as the depth the vault has. At a radius of 2⁴⁰ m, 0.9999 m reads as 1 m (Codex 3); at 2⁵⁰ m, with a room of 0.5 m, 0.4999 m reads as 0.5 m (Claude N3). The comment bounds the guarantee by the room, the wrong variable (nit) | Accepted, not repaired: stated as a bound, as F24. The code's comment, "for a room under about 1e11 m", stays as reviewed and is wrong in that variable | The plan and the gate proofs state the bound: radii over about 1e5 m. Follow-up, proposed: `shell` takes the depth to read, the depth is named only where the shell read again at it passes, otherwise the thickness alone, and the comment says so; Claude's vault as a fixture |
| F27 | The no-rib advice offers fewer coffers where even the least count leaves the cells 1 mm or less, as the span 0.001 m with three across, whose cells are 0.785 mm at two, and its fixtures pin that (Claude N4, nit, R26) | Accepted, not repaired: stated as a bound, as F24 | The plan and the gate proofs state the bound: vaults whose inner face is under about 2 mm round, or 1 mm long. Follow-up, proposed: offer fewer coffers only where two across, or one along, would leave the cells more than 1 mm, and re-pin the fixtures |
| F28 | AGENTS.md's clause reads as if a thickness is always named (Claude N5, nit) | Accepted; moot in AGENTS.md | Work unit 12 cut AGENTS.md to one line a gate before this landed, and the line names `src/model/lib/dome.test.ts`; the gate proofs' entry under that test says "and, where the shell is too thin, a thickness enough for any rib up to it" |
| F29 | Two mutation records reproduce only applied in the cell's width, not to `radius` or `arc` themselves (Claude N6, nit) | Accepted | Both say "in the cell's width" |

The staged repair for F24 to F27, with its fixtures and three more mutations, was dry-run against this tree, all twenty mutations matching once, and not applied.

## Verification

- `npm run verify` on the reviewed tree, through the gate lock with `MET_PORT=5361`: passed, 75 files and 681 unit tests, typecheck, lint, build and 84 e2e tests in 13.6 min, queued at 13:52:14 and done at 14:35:49 (log `tmp/gate-runs/verify-6.log` in the worktree, ignored), so that it could be committed as `41d194b`. An earlier run on it, `verify-5.log`, was cancelled while it waited, before it took the lock, when review 3's first report asked for code changes, and was queued again when this round was answered with bounds.
- The landed code is this tree's: the merge with origin/main changed docs and, from work unit 12, tests and their headers elsewhere.

## Round outcome

Nothing blocking and nothing that a reviewer rated should-fix: six nits, all accepted. F24 to F27 sit at inputs far from any vault the model builds and land as stated bounds, with their repair proposed as a follow-up; F28 is moot and F29 is fixed in the gate proofs. By fleet canon R11 the work stopped at three substantive repairs.
