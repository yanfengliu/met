# Review 0: implementation

## Target

Repository `met`, branch `barrel`: commit `1e3b272` on base `8a6a0c2`, work unit 9's first change, over seven paths: `src/model/lib/dome.ts`, `src/model/lib/dome.test.ts`, `AGENTS.md`, `docs/learning/gate-proofs.md`, `docs/devlog/summary.md`, `docs/work/registry.json` and `docs/work/9_barrel-rib-refusal/plan.md`. The reviewers read it uncommitted, from a patch whose sha256 is `94202036c67f06c83b6282801533460484c6ee28c4d21945cef5f10f83ab2f2e`; `git diff 8a6a0c2 1e3b272` hashes to the same digest.

## Reviewers and coverage

- **Codex**, `gpt-6-astra` at `model_reasoning_effort=xhigh`, codex-cli 0.163.0, `--sandbox read-only --ephemeral`, the patch on stdin, run from the worktree. Lens: the acceptance criteria, the threshold's derivation, the interplay with the thickness refusal, floating-point edges, the message (R26), the test's independence and bounds (R19), the records. It cited lines outside the patch (`src/model/lib/builder.ts:28` and `:84`, `src/model/lib/params.ts:20`), spot-checked as quoted. No `STATUS_DLL_INIT_FAILED` or `-1073741502` in its log. 5 min 55 s.
- **Claude**, `claude-opus-5-5[1m]` at `--effort max`, Claude Code 2.1.308, the patch as the user message, the same lens. Tools `Read`, `Glob`, `Grep`, `Task` and `Bash` limited to `git diff`, `git log` and `git show`, `--permission-mode dontAsk`, `--setting-sources=`, `--strict-mcp-config`; its `system/init` showed those five tools, `dontAsk` and no MCP servers. The login check and the report's keep rule passed: `modelUsage` held only the pin. It made 13 reads, 22 searches (20 `Grep`, 2 `Glob`; this read "20 searches" until review 1's round) and two read-only `git` calls, and no subagent. 14 min 57 s.
- Both were asked to run no tests or builds, since `npm run verify` ran on the same tree meanwhile, and ran none. Neither changed the worktree: its diff hashed to the patch's digest after both.

## Reports

Codex's links are rewritten as repository paths and Claude's headings demoted two levels to sit under this record's own; nothing else is changed.

### Codex (`gpt-6-astra`, xhigh)

1. **Should-fix — Accepted ribs can still produce no floor.** `src/model/lib/dome.ts:244` checks mathematical width and length, but the builder discards sufficiently small polygons. Consider `{ span: 4, length: 3, thickness: 0.3, coffers: { across: 2, along: 10, depth: 0.05, rib: 0.18749999999999 } }`. The comparison passes, while each floor is only about `1.6e-14 m` long. Its Newell normal falls below the `1e-12` cutoff in `src/model/lib/builder.ts:28`, so `src/model/lib/builder.ts:84` omits it. Float32 conversion creates another nearby degeneracy boundary. Validate that the constructed floor survives the builder’s tolerances and position representation, and add a regression near that boundary. The present ±0.1 mm fixtures cannot detect this.

2. **Should-fix — The recommended rib need not pass the thickness refusal.** `src/model/lib/dome.ts:245` promises a remedy without evaluating the shell at that rib. For `{ span: 4, length: 3, thickness: 0.055, coffers: { across: 2, along: 10, depth: 0.05, rib: 0.5 } }`, it recommends `0.1874 m`. Those floor corners require approximately `0.0594 m` thickness, so the next call fails at `src/model/lib/dome.ts:274`. Smaller ribs can clear this shell. This misses criterion 1’s “rib that would pass.” Evaluate the proposed remedy against both constraints; recommend a passing rib, or explicitly include the additional thickness adjustment required. Add a fixture exercising both refusals.

3. **Nit — The recommended-rib assertion can pass with no floors.** At `src/model/lib/dome.test.ts:179`, an empty result from `floorsOf` has `away === 0` and dimension `Infinity`, satisfying both assertions. Unlike the preceding “short” fixture, this assertion never checks the face count. Require `2 * across * along` faces and a finite positive dimension. Strictly inward, nonzero normals would also better express “faces toward the axis.”

4. **Nit — `below()` does not support every positive bound.** At `src/model/lib/dome.ts:217`, a bound around `1e-321` makes `unit` underflow to zero, yielding `NaN` advice. Such positive inputs pass `src/model/lib/params.ts:20`. Moreover, no positive value exists below `Number.MIN_VALUE`. Either establish and validate a supported numeric range or handle subnormal bounds and the absence of a positive representable remedy. Narrow the “any cell” claim in `docs/work/9_barrel-rib-refusal/plan.md:26`.

5. **Nit — Three table values labelled “passes” are refused.** `docs/work/9_barrel-rib-refusal/plan.md:35` lists `0.9766`, `0.8`, and `0.8727 m`. The first and third round above their limits; `0.8` reaches the strict length limit. Use the downward recommendations `0.9765`, `0.7999`, and `0.8726 m`, or label the column as approximate excluded thresholds.

6. **Nit — Crossing both dimensions does not make the floor face outward.** The unconditional claim at `src/model/lib/dome.ts:239`, repeated in the records, is false when both width and length reverse: the two reversals preserve the floor’s original winding. For example, N8’s dimensions with `along: 10` and `rib: 0.5` cross both dimensions. The refusal correctly rejects this, but the explanation should say the sides meet or cross; outward winding applies when only one dimension reverses.

What I verified by reading:

- **The real-arithmetic threshold is correct.** `src/model/lib/dome.ts:323` and `src/model/lib/dome.ts:334` give angular clearance `da − 1.6·rib/radius` and longitudinal clearance `dz − 1.6·rib`. The inner-face arc is the correct measure. Segmental vaults translate the axis through `cy`; springing and end cells use the same construction. Neither opening nor opposing sides cross earlier in this mathematical construction.
- **Existing geometry is unchanged by inspection.** The substitutions at `src/model/lib/dome.ts:260` and `src/model/lib/dome.ts:337` preserve constants and operation order. Actual ribs remain below the new limit in `src/model/hunt/arches.ts:116`, `src/model/hunt/hall-vaults.ts:40`, its line 46, and `src/parts/catalogue-architecture.ts:241`. `src/model/hunt/stair.ts:159` and the plain catalogue vault have no coffers.
- **The main threshold test is independent of the constant.** `src/model/lib/dome.test.ts:168` extrapolates from built positions. For these semicircular fixtures, the radial filter isolates floors, `atan2` does not wrap, and Float32 error is comfortably smaller than the 0.1 mm offsets.
- **Required records exist.** The clause is at `AGENTS.md:107`, the devlog at `docs/devlog/summary.md:5`, and allocation at `docs/work/registry.json:41`. The five mutations recorded at `docs/learning/gate-proofs.md:49` are consistent with the test logic; their execution and exact reported counts were not independently verified.

No edits, tests, builds or Node tooling were run. These findings are from static reasoning.

### Claude (`claude-opus-5-5[1m]`, max)

I found nothing blocking. There are **two should-fix findings and four nits**. The refusal is correct as derived, and no vault the model builds changes. I only read code; I ran no tests, builds or Node, as the lane requires.

#### Findings

##### 1. Should-fix: the plan's "Widest rib that passes" column names three ribs the refusal refuses
**Where:** `docs/work/9_barrel-rib-refusal/plan.md:35-37`

**What:** the refusal builds only where `1.6 · rib < min(width, length)` (`dome.ts:244`).
- Balcony vault, 0.9766 m: 1.6 × 0.9766 = 1.56256 m, more than its 1.5625 m cell. Refused.
- Great Hall arches' soffit, 0.8 m: 1.6 × 0.8 = 1.28 m, exactly the cell's length, and `<` refuses equality.
- `vault-coffered`, 0.8727 m: 1.6 × 0.8727 = 1.39632 m, more than its 1.39626 m cell. Refused.

Only the Hunt row (0.4937 m) passes. The column holds each bound rounded to the nearest value, not a rib that passes.

**Why it matters:** this is a lasting record that makes a checkable claim, and it is false for three of four rows. The margins themselves hold.

**Fix:** use what `below()` names (0.4937, 0.9765, 0.7999, 0.8726 m). Or rename the column "bound (excluded)" and give 0.49375, 0.9765625, 0.8 and 0.87266 m.

##### 2. Should-fix: the gate reads only semicircular vaults and does not say so (R19)
**Where:** `src/model/lib/dome.test.ts:51,55,165`, `AGENTS.md:107`, `docs/learning/gate-proofs.md:45`

**What:**
- `floorsOf` assumes the axis is at the origin (`Math.hypot(p.x, p.y)`, `Math.atan2(p.y, p.x)`).
- Every fixture is `span: 2 * radius` with the default rise.
- The code is right for segmental vaults: `radius = span²/(8·rise) + rise/2` and `arc = 2·asin(span/2/radius)` (`dome.ts:236-237`) match `buildVault`'s radius and `2·half` (`:283-285`). But no test reads one.

So a refusal that took the arc as π, or the radius as span/2, passes every fixture, because these agree only when rise = span/2. Take span 4, rise 1: radius 2.5, axis at y = −1.5, ten cells 0.4636 m wide, floors closing at 0.2898 m.
- With π for the arc, crossed floors up to a rib of 0.4909 m would build.
- With span/2 for the radius, ribs above 0.2318 m would be refused although their floors still have width.

The AGENTS.md clause and the gate-proofs entry state the refusal for every vault, and neither names this bound.

**Fix:** give `floorsOf` the axis height (`cy = rise − radius`) and run the same loop on `{ span: 4, rise: 1 }`. At least, name the bound in the test and in AGENTS.md.

##### 3. Nit: the named-rib check passes on a vault with no floors
**Where:** `dome.test.ts:178-179`

**What:** when `floorsOf` finds no faces, width and length stay at `Infinity`, so `[passes.away, passes[side] > 0]` still equals `[0, true]`. A zero-area floor is left out by `polygon` (`builder.ts:84`). So "builds floors facing the axis" goes unchecked if the named rib ever lands on the bound and the comparison is `≤`. The `short` check guards against this with `faces`.

**Fix:** `expect([passes.faces, passes.away, passes[side] > 0]).toEqual([2 * across * along, 0, true])`.

##### 4. Nit: no test holds how the two refusals interact
**Where:** `dome.ts:242-276`, `docs/devlog/summary.md:5`, `AGENTS.md:107`

**What:**
- The devlog and the plan say the rib refusal runs first, but no fixture fails both. Swapping the two refusals stays green.
- The named rib can then be refused for thickness. `{ span: 4, length: 3, thickness: 0.055, coffers: { across: 20, along: 1, depth: 0.05, rib: 0.25 } }` names 0.1963 m. At that rib the floors' corners sit under a facet's middle (one facet per cell at medium detail) and need 0.0563 m of shell, so the build is refused again: "make thickness at least 0.0564 m or coffers.depth at most 0.0486 m".
- The plan says so; AGENTS.md and the devlog only say "a rib that passes".

**Fix:** pin the order with this vault, and write "a rib that passes this refusal".

##### 5. Nit: the message blames `coffers.rib` even when it was left at its default (R26)
**Where:** `dome.ts:245`

**What:** the default rib is span / 40, so on a semicircle any `across ≥ 40` is refused with it. For example, `{ span: 8, length: 12, coffers: { across: 45, along: 8 } }` gives "coffers.rib 0.2 m … at most 0.1745 m", a value the caller never passed. Fewer coffers would also fix it, and the message does not say so.

**Fix:** add "(the default, span / 40)" when `c.rib` is undefined, or name `coffers.across` or `coffers.along` as the other way out.

##### 6. Nit: the shared constant hides an assumption
**Where:** `dome.ts:212-213`

**What:** the refusal, and the plan's "the sides cannot cross sooner", hold only while `FLOOR_INSET > 1`. Below 1 the openings close first (at 1 rib = cell) while the refusal accepts up to cell / FLOOR_INSET. The constant is presented as the one place to change the inset.

**Fix:** state "more than 1" there, or compare `Math.max(1, FLOOR_INSET) * rib`.

#### What I verified

**Threshold** (`dome.ts:325-337`, `:240`)
- The floor's angle is `da − 1.6·rib/radius`, so its width on the inner face is `radius·da − 1.6·rib` and its length `dz − 1.6·rib`.
- Arc, not chord, is right: the chord refuses floors that still exist. The floor's own radius scales the width but not where it reaches zero.
- The coffer loop (`:327-353`) has no special case for the cells at the springings or the ends.

**Sides and openings**
- An opening closes at 1 rib, after the floor.
- Opposite sides lie on either side of the plane through the axis at the cell's middle angle, or of the middle Z plane, so they cannot cross before the floor closes.
- Adjacent sides share an edge. Every side and frame is a planar trapezoid.

**Unchanged geometry**
- The only change to the build is `1.6` → `FLOOR_INSET`, the same double (`:337`, and `:260` in the thickness refusal).
- `full`, the cache key and the vertex order are untouched. The refusal runs before `cached`, so nothing refused is cached.

**The model's vaults**
- Read from `arches.ts:111-116`, `hall-vaults.ts:18,40,46`, `catalogue-architecture.ts:240-241`, `stair.ts:159`, `dims.ts:91,95,99,136-137,144` and `frame.ts:85`.
- All four coffered vaults are semicircles. Their ribs (0.16, 0.16, 0.2 and 0.22 m) sit far below their bounds (0.494, 0.977, 0.8 and 0.873 m).
- The existing fixtures in `dome.test.ts:124-155` all pass the new refusal.

**`below()`** (`:216-219`)
- For any finite positive bound, its result is strictly below the bound and positive. Where `log10` lands one off at a power of ten it gives three significant digits instead of four, still below.
- The rib it names passes the float comparison: 0.3926 m across and 0.1874 m along.

**The comparison's floating-point edges**
- The refusal (`:236`) and the build (`:283`) compute the radius by different formulas. On a semicircle, a one-ulp difference becomes about 2e-8 rad through `asin` near 1, so the two can disagree only for ribs within about 10 nm of the closing.
- Floors that narrow collapse in Float32 rather than flip. So "exactly" holds only up to this, with no practical effect.

**Message**
- `require` adds the "barrelVault: " prefix (`params.ts:51-53`). N8's message matches `dome.test.ts:182` character for character.

**Test** (`dome.test.ts:157-184`)
- Reading the closing as a line's zero crossing does not depend on how `floorsOf` scales its width. Float32 noise is about 2e-7 m, against offsets of 1e-4 m.
- `floorsOf` selects only floor triangles. `polygon` fans from the first corner (`builder.ts:88`), so each triangle spans the floor both ways.
- The floors' angles lie strictly between 0 and π, so `atan2` never wraps.
- I also checked mutations the doc doesn't list: using the floor's own radius, max instead of min, and width or length alone are all caught, on semicircles.

**Red proofs** (`gate-proofs.md:49-53`)
- Each stated failure follows from the code: the 1.5 bound is 0.4189 m; at 1.7 the message's rib is the closing less 1e-4 m; the chord gives "0.391". The file has 9 tests.
- I did not re-run any of them.

**Docs**
- A word diff of AGENTS.md shows that only the `barrelVault` clause changed.
- Registry id 9 matches the folder name, and the devlog line follows the format.
- The defect register and the spec need no change.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | An accepted rib can still leave no floor: `MeshBuilder.polygon` leaves out a face whose Newell vector is 1e-12 or shorter (`src/model/lib/builder.ts:28`, `:84`), as with a floor 1.6e-14 m long at a rib of 0.18749999999999 m, and Float32 positions make another such edge; the ±0.1 mm fixtures cannot see it (Codex 1, should-fix) | Accepted: a refusal that lets a floor go missing does not keep the floor | Each floor must keep `FLOOR_LEAST`, 1 mm, across and along; the fixtures stand 0.1 mm of rib either side of 1 mm of floor, and Codex's rib is refused; red with `FLOOR_LEAST` 0 (review 1) |
| F1 | The rib named can be refused next by the thickness refusal: `{ span: 4, length: 3, thickness: 0.055, coffers: { across: 2, along: 10, depth: 0.05, rib: 0.5 } }` names 0.1874 m, whose floors need 0.0594 m (Codex 2, should-fix); no test pins the two refusals' order, and `{ …, coffers: { across: 20, along: 1, depth: 0.05, rib: 0.25 } }` shows the same (Claude N4, nit) | Accepted: "a rib that would pass" should lead to a vault that builds | One reading of the shell, `shell(rib)`, serves both refusals; where the rib named would leave the shell too thin, the message names the thickness that rib needs. Both vaults are fixtures and their named pairs build; the second, too thin at its own rib as well, pins the order. Red with no thickness named and with the shell read first (review 1) |
| F2 | The named rib's check passes on a vault with no floors, where `floorsOf` gives `away` 0 and an `Infinity` width (Codex 3, Claude N3, nit) | Accepted | It checks every floor's faces and a width or length from 1 to 1.4 mm (review 1) |
| F3 | `below()` gives NaN for a bound near 1e-321, which `positive` lets through, and no positive rib lies below `Number.MIN_VALUE`; the plan's "stays positive for any cell" overstates (Codex 4, nit) | Accepted | With `FLOOR_LEAST`, `below()` reads a bound of at least about 1.36e-19 m, 2⁻⁶² over 1.6, or none, and states its range (corrected by review 1, F11, from "at least 1.4e-19 m"); cells of 1 mm or less are told that no rib leaves them a floor and to make them larger; the plan's claim is gone (review 1) |
| F4 | The plan's "Widest rib that passes" names three ribs the refusal refuses: 0.9766, 0.8 and 0.8727 m (Claude N1, should-fix; Codex 5, nit) | Accepted | The column now names the rib the refusal would name, by `below()`, with the 1 mm floor: 0.4931, 0.9759, 0.7993 and 0.872 m (review 1) |
| F5 | Past both the width and the length, the two reversals keep the floor's winding, so "the floor faces out" is false there (Codex 6, nit) | Accepted | The comment and the records say that the sides cross, and that the floor faces away where only one of the two is passed (review 1) |
| F6 | The gate reads semicircles only, so a refusal taking π for the arc or half the span for the radius passes it (Claude N2, should-fix, R19) | Accepted | `floorsOf` takes the axis's height, and a segmental vault, rise 1 m and radius 2.5 m, joins the loop; red with half the span for the radius and with π for the arc (review 1) |
| F7 | The message blames `coffers.rib` when the caller left it at its default, and fewer coffers would also do (Claude N5, nit, R26) | Accepted in part: one remedy that builds is enough, and the rib is the parameter this refusal reads | The message says "(span / 40, the default)"; fewer coffers are named only where no rib passes (review 1) |
| F8 | The refusal holds only while `FLOOR_INSET` stays above 1, which the constant does not say (Claude N6, nit) | Accepted | Its comment says it stays above 1, so that a floor closes before its opening (review 1) |

## Verification

- `npm run verify` on the reviewed tree, through the gate lock with `MET_PORT=5361`, while the lanes ran: passed, 75 files and 680 unit tests in 17.5 s, typecheck, lint, build and 84 e2e tests in 13.7 min, 14 min 19 s in all (log `tmp/gate-runs/verify-1.log` in the worktree, ignored).
- Before the review, the first test was red with the refusal deleted, at 1.5 and 1.7 ribs, with the cell's chord for its width and with only the floors moved (`docs/learning/gate-proofs.md` at `1e3b272`).
- The repairs are checked in review 1.

## Round outcome

Nothing blocking. Four findings that a reviewer rated should-fix (F0, F1, F4 and F6) and five nits; all accepted, F7 in part. (Corrected by review 1, F17: this sentence first read "Three should-fix findings (F0, F1, F6) and six nits, among them the shared F4, which Claude rated should-fix", counting F1 by its higher rating and F4 by its lower.) The repairs change the refusal's bound, its message and its tests, so review 1 reviews them.
