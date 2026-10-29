# Review 2: implementation

## Target

Repository `met`, branch `barrel`: commit `3e0b2c5` on `ecb6db6`, the repairs to review 1's findings F9 to F17, over seven paths: `src/model/lib/dome.ts`, `src/model/lib/dome.test.ts`, `docs/learning/gate-proofs.md`, `docs/devlog/summary.md`, `docs/work/9_barrel-rib-refusal/plan.md`, `docs/work/9_barrel-rib-refusal/reviews/0_implementation.md` and `docs/work/9_barrel-rib-refusal/reviews/1_implementation.md`. The reviewers read it uncommitted, from a patch whose sha256 is `8960e7c3c9c79b0f8eb80cfb2c2bf3e8e49971b46612c2e24ec6cc68152771fc`; `git diff ecb6db6 3e0b2c5` hashes to the same digest.

## Reviewers and coverage

- **Codex**, `gpt-6-astra` at `model_reasoning_effort=xhigh`, codex-cli 0.163.0, `--sandbox read-only --ephemeral`, the patch on stdin, run from the worktree. Lens: does each repair answer its finding, is review 1's F9 argument sound at every detail and every `across`, new defects in `enough`'s step, the no-rib branch and the NaN guard, the tests' bounds, pins and independence (R19), the records against the code. It cited lines outside the patch (`src/model/lib/builder.ts:304`, the parameter checks, the cache and the model's callers), spot-checked as quoted. Its log's matches for the DLL markers are the echoed patch, review 0's record quoting them, not a failure. 7 min 42 s.
- **Claude**, `claude-opus-5-5[1m]` at `--effort max`, Claude Code 2.1.308, the patch as the user message, the same lens and the same limits as before; its `system/init` showed the five tools, `dontAsk` and no MCP servers, and the report's keep rule passed. It made 10 reads, 9 searches (7 `Grep`, 2 `Glob`) and three `git` calls, one of which, a compound `git -C … && git -C …`, `dontAsk` refused, as its report says; no subagent. 20 min 40 s.
- Both were asked to run no tests or builds, and ran none. Neither changed the worktree: its diff hashed to the patch's digest after both.

## Reports

Codex's links are rewritten as repository paths and Claude's headings demoted two levels to sit under this record's own; nothing else is changed.

### Codex (`gpt-6-astra`, xhigh)

1. **Nit — The NaN branch gives the wrong remedy.** `src/model/lib/dome.ts:289`, pinned by `src/model/lib/dome.test.ts:226`. For `span: 4, rise: 1e-310`, the radius overflows; the cells are not demonstrably too small. “Make them larger” does not resolve this: increasing the span worsens the overflow, and increasing the length cannot affect it. The message also omits the responsible `rise`. **Fix:** retain the early refusal but distinguish an uncomputable cell size, name `span` and `rise`, and advise increasing rise or reducing span until the radius is finite. Update the fixture accordingly.

2. **Nit — The plan still excludes a change this patch makes.** `docs/work/9_barrel-rib-refusal/plan.md:18` excludes “the thickness refusal’s own rounding,” but `src/model/lib/dome.ts:318` applies the repaired formatter there too. F10’s disposition correctly acknowledges both refusals. **Fix:** update the scope to include that repair, while retaining the preservation of previously successful recommendations.

No blocking or should-fix findings.

Verified by reading:

- **F9’s interval argument is sound.** `src/model/lib/dome.ts:251` and the unchanged `src/model/lib/dome.ts:332` use the same integer subdivision count. Cell boundaries therefore coincide with facet boundaries mathematically, at every detail and `across`. Each corner’s need increases toward a facet midpoint and decreases afterward; later midpoints have the same peak. The opening and floor critical ribs are respectively `facet * radius` and that divided by `FLOOR_INSET`. Both angular corners of every cell, including the springing cells, are read. With one facet per cell, the floor limit prevents reaching its midpoint, so the named endpoint supplies the maximum.

- **Critical-rib rounding does not introduce a material peak shortfall.** At `src/model/lib/dome.ts:297`, the first cell’s critical corner lands within floating-point noise of its midpoint. Its cosine denominator rounds to 1, attaining the computed peak; another corner cannot exceed that denominator. The sampled ribs all belong to the advertised interval, so the maximum does not demand an irrelevant thicker shell.

- **F10 fixes its reproducer and preserves ordinary messages.** `src/model/lib/dome.ts:272` returns the old string whenever its parsed value already exceeds the need. The stated range below about `1e11 m` is conservative: double precision there resolves substantially less than the added `0.0001 m`. This remains a bounded guarantee, not one covering every finite number.

- **The huge fixture tests rounding, not sound geometry.** `src/model/lib/dome.test.ts:205` pins `2097152.0001` independently and checks that applying it clears the refusals. However, the unchanged Float32 conversion at `src/model/lib/builder.ts:304` loses that 0.1 mm clearance: spacing around `2²¹` is 0.25 m. Its floor and outer-face heights consequently coincide. This is an inherited geometry limitation; the fixture establishes only the formatter/refusal result.

- **F13 and F14 are addressed.** The three literal pairs at `src/model/lib/dome.test.ts:193` agree with the hand calculations at the asserted precision. The second calculation uses the midpoint peak approximation; the actual named-rib need differs too little to change `0.0564`. The named-floor checks at `src/model/lib/dome.test.ts:180` require the expected face count and a dimension strictly between 1 and 1.2 mm, removing the empty-result loophole.

- **The sweep has explicit, limited coverage.** `src/model/lib/dome.test.ts:200` performs 38, 40 and 375 evaluations—453 total—ending near ribs `0.0018`, `0.0007` and `0.004 m`. It does not sample arbitrarily close to zero or every intermediate rib; F9’s argument supplies that coverage. The work is bounded over small meshes; I did not measure runtime.

- **F16 works for finite small cells.** `src/model/lib/dome.ts:285` names both directions when both bind and offers fewer coffers only above the respective minimum. The NaN guard changes which refusal reports invalid derived geometry; those inputs previously failed the thickness refusal too. Ordinary accepted inputs still reach the unchanged builder.

- **The records otherwise match the repairs.** F11 and F17 have labelled corrections at `docs/work/9_barrel-rib-refusal/reviews/0_implementation.md:161` and `docs/work/9_barrel-rib-refusal/reviews/0_implementation.md:176`. F12’s wording and F15’s margin explanation are corrected. The fourteen mutation descriptions at `docs/learning/gate-proofs.md:54` are consistent with the assertions; the sampling limitation is stated separately.

I read both review records, the patched code and records, and unchanged builder, parameter-validation, cache and caller code. No edits, tests, builds, Node tooling or subagents were used. Recorded green and mutation runs were not independently reproduced.

### Claude (`claude-opus-5-5[1m]`, max)

**Review 2 of work unit 9: review 1's repairs**

Nothing is blocking or should-fix. The F9 argument holds at every detail and every `across`, including one facet per cell, and the code does what the records say. Each of the nine repairs answers its finding. I found five nits; the two that matter most are the message for a cell with no size (N1) and the same rounding fault as F10 left in the depth advice (N2).

I only read: I ran `git diff ecb6db6 --stat` and `git show 1e3b272:src/model/lib/dome.ts`. One earlier compound `git` call was refused by the permission mode, so I re-ran the diff on its own. I ran no tests, builds or Node tools, and used no subagents.

#### Findings

##### N1. Nit (R26): a cell with no size gets a message about small cells, and the new fixture pins that message
`src/model/lib/dome.ts:282`, `:289`; `src/model/lib/dome.test.ts:226`
- **What:**
  - The fixture is `{ span: 4, rise: 1e-310, length: 3, coffers: { across: 2, along: 1 } }`. `positive` lets that rise through (`params.ts:20`).
  - The radius, `span² / (8 · rise)`, overflows (`dome.ts:246`). So `arc` is 0 and `cell.width` is `Infinity · 0 = NaN`.
  - The message says: "coffers.rib 0.1 m (span / 40, the default) leaves the coffers less than 1 mm of floor … NaN m wide on the inner face … no rib leaves cells that small a floor; make them larger."
  - The cells are really about 2 m wide: 4 m of nearly flat arc over two coffers. The rib is not the cause.
  - Nothing the message offers can work: `across` is already 2, and a larger span overflows as well.
  - The fallback `'larger'` at `:289` is reached only by NaN. Any finite cell side of 1 mm or less always adds a side to `grow`.
- **Why it matters:**
  - R26 asks a message to name what happened, which input caused it and what would satisfy it. This message names none of the three.
  - The guard sits on a symptom. The cause is `rise` and `span`, not the coffers.
  - `buildVault`'s own radius (`:326`) overflows the same way, so a plain vault with that rise builds non-finite positions without being refused. Nothing in `MeshBuilder.grid` checks them (`builder.ts:127-137`).
  - The split between refused and built vaults is correct, and the same as at `ecb6db6`.
- **Fix:**
  - After `dome.ts:246`, refuse a radius that is not a finite number above 0, naming both inputs. For example: "rise 1e-310 m is too small for span 4 m: the inner face's radius, span² / (8 · rise) + rise / 2, overflows; make rise larger."
  - Keep the comparison that refuses NaN as a backstop, and point the fixture's regex at the new message.
  - Covering plain vaults as well would be a follow-up outside this unit's scope.

##### N2. Nit: F10's fault is still in the depth advice, and the plan still excludes the rounding F10 changed
`src/model/lib/dome.ts:313-314`, `docs/work/9_barrel-rib-refusal/plan.md:18`
- **What:**
  - `deep = Math.floor(room · 1e4 − 1e-6) / 1e4` loses its 1e-6 at the same scale `enough` did.
  - Take `{ span: 4, rise: 1e-8, length: 3, thickness: 2097152, coffers: { across: 2, along: 1, depth: 2097152, rib: 0.01 } }`. It passes the rib refusal, with cells 2 × 3 m.
  - Every chord is exactly 1, so the floors' need and `room` are both exactly 2097152 m.
  - The message says "make thickness at least 2097152.0001 m or coffers.depth at most 2097152.0000 m". That depth is the one the vault already has, so following that half is refused again.
  - The comment at `:313` still says "Rounded so that following the advice passes: the thickness up, the depth down".
  - plan.md:18 lists "the thickness refusal's own rounding" as out of scope. Review 1's F10 row (`reviews/1_implementation.md:155`) applies the step "for both refusals".
- **Why it matters:** the repair fixes one of the two remedies in the message, at the scale F10 was accepted for. The plan's scope now contradicts the repair.
- **Fix:** step `deep` down by 1e-4 wherever `Number(deep.toFixed(4)) >= need.room`, and pin this fixture. Or keep the depth out of scope, and say so in the comment at `:313` and in plan.md:18.

##### N3. Nit (R19): no test reads the no-rib branch's width side or its two-sided sentence, and that sentence reads wrongly
`dome.ts:286`, `:289`; `dome.test.ts:217-224`; `docs/learning/gate-proofs.md:48`
- **What:**
  - Both fixtures are limited by their length.
  - Changing `across > 2` to `across > 1` brings F16's fault back at `across: 2` and stays green. Deleting the width line also stays green.
  - Yet gate-proofs:48 says "offered fewer coffers only where there are more than the least" of cells in general.
  - Where both sides are too small, as in `{ span: 0.001, length: 0.0005, coffers: { across: 3, along: 2 } }` (cells 0.52 × 0.25 mm), the message reads "make them wider, with fewer coffers.across or a larger span and longer, with fewer coffers.along or a longer vault". "a larger span and longer" reads as one item.
- **Fix:**
  - Add `{ span: 0.001, length: 3, coffers: { across: 2, along: 1 } }`, which should be told "wider, with a larger span".
  - Add the same vault with `across: 3`, and the two-sided case.
  - Join the two parts with `', and '`.

##### N4. Nit: AGENTS.md still says the refusal names "any thickness it needs"
`AGENTS.md:107`
- **What:**
  - Since F9, the thickness named is enough for every rib up to the one named.
  - It can be named where the rib named needs no extra thickness. In the third fixture, 1.874 m needs 0.0559 m and fits its 0.057 m shell, yet the message names 0.06 m.
  - The devlog and the plan were reworded; this clause was not.
- **Fix:** within the one clause, write "naming a rib that passes and a thickness enough for any rib up to it".

##### N5. Nit: two record items
- This round changed `reviews/0_implementation.md:10` ("22 searches … this read "20 searches" until review 1's round"). No finding and no line in review 1's record accounts for that change. Add a sentence after review 1's table saying what was recounted, and from what.
- `docs/learning/gate-proofs.md:48`: "and Codex's floor 1.6e-14 m long with one under 1 mm" is hard to parse (R25). plan.md:32's "refused for its floor" says the same thing plainly.

#### What I verified

**F9's argument and its code** (`dome.ts:251-270`, `:290-304`)
- **Cell edges are facet edges.** `shell` divides the arc into `across · max(1, ⌈n / across⌉)` facets (`:251`). `buildVault` uses `divisions · sub`, with `divisions = across` and the same `sub` (`:332-333`, `:340`). This holds at every detail.
- **How a corner's need changes.**
  - `chord` (`:254`) is 1 at a facet's edge and cos(facet/2) at its middle.
  - So a corner's need, (R + out) · cos δ / cos(facet/2) − R, rises toward each facet's middle. It reaches the same peak under every middle.
- **No corner crosses its cell's middle.**
  - For ribs up to the one named, 1.6 · rib < least − 1 mm ≤ width − 1 mm.
  - So each corner moves steadily inward from its cell's edge.
- **The critical ribs are right.**
  - A corner's need is greatest either at the rib named or, once the corner first reaches a facet's middle, at that peak.
  - The corner reaches a middle at an inset of facet/2. That is a rib of facet · R for an opening, and facet · R / 1.6 for a floor (`:297`).
  - Both corners of every cell are read (`:263`), and so are the cells at the springing, through the clamp at `:254`.
- **One facet per cell:** the floor's critical rib is width / 1.6, which is above the rib named and so filtered out. The need really does rise steadily up to the rib named.
- **The opening's reading never decides the result.** The floor's peak exceeds the opening's by depth / cos(facet/2). Keeping that reading is harmless and keeps the code correct for any `FLOOR_INSET`.
- **Floating point cannot undershoot the peak.**
  - At a critical rib, δ is about 1e-16, so cos δ is exactly 1 and the reading equals the computed peak.
  - Elsewhere, `chord` is the same constant divided by cos δ ≤ 1. Division is correctly rounded and monotonic, so no other reading exceeds the peak.
- **The thickness named is not too much.**
  - Some rib in the range needs that thickness, so the advice asks for no more than the worst rib needs, plus at most 0.1 mm of rounding.
  - It can be more than the rib named needs (0.0559 against 0.06 m in the third fixture). "Enough for any rib up to that" says so.

**The pinned numbers** (`dome.test.ts:188-204`)
- **0.1868 m:**
  - The cell's smaller side is 0.3 m.
  - Both critical ribs, 0.3927 and 0.2454 m, are filtered out.
  - δ = π/32 − 0.07472 = 0.023455, so the need is 0.059352 m, which rounds up to 0.0594.
- **0.1957 m:**
  - There are 20 facets, and the critical ribs 0.3142 and 0.19635 m are filtered out.
  - The need is 0.0563399 m, which rounds up to 0.0564.
  - The comment's 2.05 / cos(π/40) − 2 is the peak; the corners stand 0.26 mrad short of it, and it rounds to the same value.
  - At its own rib of 0.25 m this shell needs 0.05587 m, more than 0.055, so it fixes the order of the two refusals.
- **1.874 m:**
  - `shell(1.874)` needs 0.05591 m, which is under 0.057.
  - `shell(0.24544)` needs 0.059919 m, which rounds up to 0.0600.
  - A rib of 0.25 m needs 0.059916 m.
- **No pin sits near a rounding edge.**
- **The 5 mm sweep:**
  - It makes 38 + 40 + 375 small builds.
  - Its two ribs nearest 0.2454 m are within 3.4e-7 m of the peak, against 8.1e-5 m of margin.
  - Its bound is stated at gate-proofs.md:50, and each rib gets its own cache entry (`cache.ts:18`).
- **No other fixture gains a thickness clause.** Test 1's vaults and N8's need at most 0.0594 m against 0.3 m shells. The default-rib vault needs 0.2026 m against 0.4 m.

**`enough`** (`dome.ts:272-275`)
- **Unchanged messages:**
  - It returns `ecb6db6`'s string wherever that string passed.
  - For needs under about 2e5 m the 1e-6 always survives, so no ordinary message changes.
  - The thickness test's 0.1074 and 0.0392 (`dome.test.ts:139`, `:153`) are unchanged.
- **The 1e11 m limit:** below 1e11 m, adjacent doubles are at most 1.5e-5 m apart, so the stepped value reads back above the need. "Under about 1e11 m" is safe.
- **The huge fixture:**
  - R = 2e8 m, every chord is exactly 1, and the need is exactly 2097152 m.
  - `ecb6db6` named 2097152.0000 m; the repair names 2097152.0001 m, which passes both refusals, as F10 requires.
  - But the built vault does not hold up. Positions are stored as Float32 (`builder.ts:304`), whose step near y = 2097152 is 0.25 m. So the floors and the outer face are stored at the same height.
  - The fixture checks the advice's arithmetic. It should not be cited as a vault that keeps its coffers inside the shell.

**The NaN guard and changed behaviour** (`dome.ts:282`)
- `!(x >= 0.001)` agrees with `x < 0.001` for every value that is not NaN.
- NaN comes only from a radius that overflows, or from a span that underflows to 0.
- `ecb6db6` refused those inputs too, through the thickness refusal with "NaN m" in its message. So the same vaults are refused as before, and the thickness refusal no longer sees NaN.
- `1e3b272`'s `FLOOR_INSET * rib < Math.min(…)` sent NaN to the rib refusal ("at most NaN m"). So review 1's "as at `1e3b272`" is right.

**The no-rib branch** (`dome.ts:285-289`)
- `most > 0` holds exactly when the cell's smaller side is over 1 mm.
- `across > 2` and `along > 1` match `integer`'s lower bounds (`:241`).
- The two fixtures' messages are as pinned.

**The records**
- **The 14 mutations** (gate-proofs.md:54-67): each recorded failure follows from the code, including:
  - 0.1874 m with `FLOOR_LEAST` 0;
  - "at most 0.3904 m" from the chord;
  - 0.3709 m from half the span;
  - 40 faces facing away at 1.7;
  - 2097152.0000 without the step;
  - the 1.5- and 1.7-rib mutations failing where recorded.

  I could not work out the 424-line count. The file has 10 tests, and plan.md:50's "thirteen other mutations" agrees.
- **Review 1's F9 to F17 rows and the closing note** match the code and the tests, except for N2's "for both refusals" against plan.md:18.
- **Review 0's labelled corrections are right:**
  - 2⁻⁶² / 1.6 ≈ 1.355e-19.
  - Four should-fix findings and five nits make up F0 to F8.
- **The devlog line** (`docs/devlog/summary.md:5`) matches the code.

**The geometry is unchanged**
- `buildVault` is untouched (`dome.ts:324-398`).
- Both refusals' conditions are unchanged for every finite cell.
- The model's coffered vaults still pass with wide margins: `src/model/hunt/arches.ts:116`, `src/model/hunt/hall-vaults.ts:40` and `:46`, and `src/parts/catalogue-architecture.ts:241`.
- `src/model/hunt/stair.ts:159` has no coffers.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F18 | A rise too small for its span, 1e-310 under 4 m, overflows the radius, and the vault is told that its cells are NaN m wide and too small, and to make them larger, which cannot help: a larger span overflows too, and `rise` goes unnamed; the fixture pins that message (Codex 1, Claude N1, nit, R26) | Accepted | `barrelVault` checks the radius where it reads it, before the coffers, so a plain vault with that rise is refused too, where it had built positions that are not numbers: "span 4 m over rise 1e-310 m gives the inner face a radius too large for a number, span² / (8 · rise) + rise / 2; make rise larger or span smaller." Both vaults are fixtures; red with the check removed. With every cell's size a number, the rib refusal's comparison is back in its plain form, and the no-rib advice's fallback, which only NaN reached, is gone (review 3) |
| F19 | The plan's scope excludes the thickness refusal's rounding, which F10 changed for both refusals (Codex 2, Claude N2, nit) | Accepted | The scope includes the rounding's steps past the need and below the room, and excludes any other change to the thickness refusal |
| F20 | The depth advice loses its 1e-6 at the scale F10 was accepted for: `{ span: 4, rise: 1e-8, length: 3, thickness: 2097152, coffers: { across: 2, along: 1, depth: 2097152, rib: 0.01 } }` is told "coffers.depth at most 2097152.0000 m", the depth it has (Claude N2, nit) | Accepted | The depth named steps 0.1 mm below the room where its rounding does not clear it, for a room under about 1e11 m, so ordinary messages are unchanged; the vault is a fixture, told 2097151.9999 m, and builds with it; red without the step (review 3) |
| F21 | No test reads the no-rib advice's width side, so `across > 1` for `across > 2`, or the width line deleted, stays green; where both sides bind, "a larger span and longer" reads as one item (Claude N3, nit, R19) | Accepted | The two sides join with ", and "; cells under 1 mm wide with two coffers across and with three, and cells too small both ways, are fixtures; red with fewer coffers across always offered and with the old join (review 3) |
| F22 | AGENTS.md's clause says "any thickness it needs", where since F9 the thickness named is enough for any rib up to the one named (Claude N4, nit) | Accepted | It says "naming a rib that passes and a thickness enough for any rib up to it" |
| F23 | Review 1's record does not account for the recount its round made in review 0's coverage line; the gate proofs' "with one under 1 mm" is hard to parse (Claude N5, nit, R25) | Accepted | Review 1's record says what was recounted, labelled; the gate proofs say that Codex's floor is refused for its floor |

Both reviewers also noted that the 2097152 m fixture checks the advice's arithmetic, not a vault that keeps its coffers inside its shell: Float32 positions near 2²¹ m lie 0.25 m apart, so its floors and outer face are stored at one height. The records cite it for the arithmetic only.

## Verification

- `npm run verify` on the reviewed tree, through the gate lock with `MET_PORT=5361`: passed, 75 files and 681 unit tests, typecheck, lint, build and 84 e2e tests in 13.5 min, queued at 13:02:44 and done at 13:38:23 (log `tmp/gate-runs/verify-4.log` in the worktree, ignored). An earlier run on it, `verify-3.log`, was cancelled while it waited, before it took the lock, when review 2's first report asked for code changes; the tree was then gated as it stood so that it could be committed as `3e0b2c5`.
- After the repairs: the file's 10 tests pass, `tsc` and ESLint are clean, and seventeen mutations turn them red (`docs/learning/gate-proofs.md`).
- The repairs are checked in review 3.

## Round outcome

Nothing blocking and nothing that a reviewer rated should-fix: six nits, all accepted. The repairs add a check of the radius, change the depth advice's rounding and the no-rib advice's wording, and add fixtures, so review 3 reviews them.
