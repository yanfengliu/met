# Review 2: the repairs of review 1

## Target

Work unit 7 on the met repository's branch `claude/kind-brahmagupta-01cb19`: commit `7a17145`, the diff `3ac62d7..7a17145` (11 files, 550 lines of diff), the repairs of review 1's findings F17 to F29.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-28 with the same prompt (`tmp/review-runs/facing-r2/prompt.md`, ignored), Codex's with a line asking for a file and line for every finding: each repair and its red proof, the cell index, the recast and the lines beside open edges, the new noise bound, the vault's openings and rounding, the new tests and the docs.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker. It ran 58 test callbacks through an assertion harness, the finished model's closure checks among them, and cross-checked the cell index against exhaustive reads on 45 fixtures. It cited `closure.test.ts:288` outside the diff. It changed no file.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. Its result's one model key is the pin. It probed scratch copies of `7a17145` and `3ac62d7` and ran 105 affected tests, tsc and ESLint; the reviewed worktree stayed clean.

## Reports

### Codex (`gpt-6-astra`)

Two **minor** findings at `7a17145644abf2a1704e5f2acefe162dfdef4794`:

1. **The new volume tolerance can suppress a real inverted part.** [facing.ts:101](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/facing.ts:101)

   Build an inward-wound tetrahedron with vertices `(0,Y,0)`, `(1,Y+1,0)`, `(0,Y,1)`, `(0.001,Y,0)`. Using the builder’s Float32 geometry, its volume stays `−0.000166666675` when translated from `Y=0` to `Y=1,000,000`, but its noise allowance grows from `6.66e−10` to `0.001000000666`. The unchanged consumer at [closure.test.ts:288](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/closure.test.ts:288), read outside the repair diff, consequently skips it.

   This demonstrates a regression in the per-part guard; the separate grid check still catches this standalone tetrahedron. Compute heights relative to a per-part reference before projection, derive rounding allowances from local arithmetic, and add a translated-inverted-part regression while retaining both membrane tests.

2. **The stated sampling bound omits demonstrated misses beside open edges.** [facing.ts:154](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/facing.ts:154), [facing.ts:218](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/facing.ts:218)

   Scale the new open-bow fixture by `0.01`, then append an outward box from `(1,0,1)` to `(2,1,2)`. At the production grid size of 64, `inwardAlong` returns zero: the expanded bounds let the grid miss the bow, and `BESIDE=1e−4` steps beyond its `8e−5` tube radius. Changing only that offset to `1e−6` finds eight lines through a roughly `0.00566 m` pocket.

   Under R19, document that open-edge pockets can also escape the samples, including in [spec.md:78](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/docs/design/spec.md:78). For stronger coverage, derive probes from incident-triangle interiors and retain this regression; simply shrinking the constant moves the scale limit.

Otherwise, the claimed repairs checked out: vault angles, insets, messages and rounded advice; F18/F19 red controls; nine reopened-bow lines; capital counts 29/40; and smooth/flat `flattest` cases. Cell indexing matched exhaustive triangle reads on 45 fixtures, and a closed T-junction fixture produced no false pocket.

All 58 selected test callbacks passed through an in-memory Node assertion harness, including finished-model closure checks. Vitest and full `verify` were not run. No files changed.

### Claude (`claude-opus-5-5[1m]`)

No blocker or major findings. The four repairs are correct, and every red proof I re-ran went red. The gaps are in what the docs claim and in how strong some tests are: one minor finding and eight nits.

I ran the probes on scratch copies of HEAD and 3ac62d7, wired to the worktree's packages through a scratch Vitest config; the worktree is unchanged (`git status` clean). The reviewer left its probes in its own scratchpad (paths redacted).

#### Minor

**M1. Open ends that line up but wind to an inside pass all five readings, though the docs say the readings catch such a part.**
- **Where:** `AGENTS.md:107`, `src/model/closure.test.ts:25-27` and `:47-49`, `src/model/lib/facing.ts:151-154`. They say `inwardAlong`'s lines "read a part whose open ends line up along vertical lines, as `openAlong` reads such a part closed".
- **Scenario:** `TorusGeometry(0.3, 0.008, 4, 16, 1.2π)`, turned 0.4π about Z, has both ends on one vertical line at (0.093, ±0.285).
  - `openAlong` returns null.
  - `inwardAlong` on a grid of 64, open-edge lines included, finds 0 lines.
  - `partVolumes` reads one part of +1.66e-4.
  - `windingAlong` (`closure-readings.ts:112`) on the ends' line reads sum 0, inward 0.
  - So the walk and the cap pass read about 0.57 m of inside between the ends, where nothing is drawn.
- **Why:** the lines beside open edges only see ends that wind −1 between them, as Diana's orientation does (68 lines). Wound the other way, the stretch reads +1, like any inside.
- **No instance in the model today:** the bow is capped (`src/model/roche-north/figures.ts:35-52`) and the other tori are whole (`src/model/mmw/armor-figures.ts:116-118`).
- **Fix:** name this bound in the test header, `AGENTS.md` and the defect register, and add this torus as a fixture of the documented miss. Or close it by reading open edges in 3D: a T-junction's open edges lie along one another in space, while lined-up open ends meet only in plan.

#### Nits

- **N1. The level-membrane test can't tell F19's two halves apart** (`facing.test.ts:97-105`, `facing.ts:99-101`).
  - Levelling alone: volume 0, noise 3.1e-22.
  - The added noise term alone: volume −4.6e-13, noise 4.25e-6.
  - Both pass; only 3ac62d7, with neither, goes red.
  - No case needs the `|h|·|across|` term. It can't hide a real part: only one thinner along v than about 2e-9 of its height above the frame's origin (0.2 µm at 100 m).
  - Fix: drop the term, or add a fixture that needs it.
- **N2. The named thickness and depth are checked only against the refusal itself** (`dome.test.ts:110-111`, `not.toThrow`), which is self-agreement under R19. The numbers are right; with the refusal off:
  - The Hunt soffit at 0.1072 m shows 544 pocket lines; at 0.1074 m, none (read along vertical and five facet normals, 400 lines a side).
  - The openings case shows 1,100 lines at 0.038 m and none at 0.0392 m.
  - Fix: also run `inwardAlong` on the vaults built at 0.1074 m and at 0.0527 m deep. Both build, so this is possible.
- **N3. The shared-edge fixture's direction is tuned to today's arithmetic** (`facing.test.ts:157-162`). The direction 0.0015990724361849436 lands one grid line on a diagonal only under the current OFF and bounds. If either changes, the test stays green without reaching an edge. It is a real red proof today: with recasting off it reads 1 line, 2.0 m. Fix: build the coincidence by construction, or have `inwardAlong` report how many lines it recast.
- **N4. The spec still states the upright reading twice** (`docs/design/spec.md:78`). "an inside lies on one side" stands beside "more inside behind it than in front", while the rule now says "behind it". Review 1's nit is only half done; drop the first sentence.
- **N5. Some docs overstate or are stale.**
  - `AGENTS.md:107` and `defect-register.md:15` say the refusal names "a thickness and a depth that pass". Where the openings stand out, it names the thickness alone (`dome.ts:257`).
  - `facing.ts:10` still says pockets are read "on a grid of lines" only.
  - The `facing.test.ts` header (lines 2-5) lists none of the three new fixtures.
  - `AGENTS.md:107` leaves out the face-to-face pass that the test header names (`closure.test.ts:49`).
- **N6. Error message wording, R26** (`dome.ts:257`). It names `coffers.depth` and `coffers.rib` by their parameter names, but says only "a shell 0.06 thick", with no `thickness` and no unit, while its advice uses "m".
- **N7. Cost** (`facing.ts:177`, `:191`). The inner loop destructures `coords.subarray(o, o + 9)` for every line-and-triangle test.
  - The closure grid test took 1.08 s at 3ac62d7 and 2.1–2.5 s at HEAD; with plain indexing, 1.73 s.
  - The lines beside open edges cost only about 0.2–0.3 s.
  - All of it is within the 10 s headroom.
- **N8. Pre-existing, next to the refusal** (`dome.ts:316-319`). `barrelVault` builds coffers whose ribs leave no floor.
  - Example: `{ across: 10, along: 1, depth: 0.05, rib: 0.5 }` on span 4, length 3, thickness 0.3. Each floor is inset 0.4 m from both sides of a 0.63 m cell, so its sides cross in an X.
  - 116 of 400 vertical lines over the crown read an overlap of up to 2.9 cm, with no pocket, and nothing refuses it.
  - Fix: refuse a rib where 1.6 × rib is at least the cell's width or length, and name the widest rib that fits.

#### What I verified

- **F17 (vault refusal):**
  - The corners it reads match `buildVault` (`dome.ts:304-319`): openings at `ia = rib/2/radius` on the inner face, floors at `1.6·ia` and `radius + depth`.
  - The facet count and angles match too.
  - Those corners are the points farthest out, and the outer face's section is convex since rise ≤ span/2, so reading them is enough.
  - It names the right kind. Thickness rounds up and depth rounds down, so following the advice passes.
  - It goes red with the openings unread, its thresholds are tight (N2), and the model's and the parts catalogue's vaults pass.
- **F18 (lines cast aside):**
  - The cell index can't leave out a triangle a line meets: the cell lookup is monotone and computed the same way for lines and for triangle bounds.
  - Zero width is held at 1e-12. Each try looks up its own cell, clamped outside the bounds.
  - A doubled hit always lies within EDGE, so it always triggers a recast. A recast moves at most 3.2 µm, so it can't hide a real pocket.
  - Red at 3ac62d7 and with recasting off: 1 line, 2.0 m.
- **F19 (membrane volume):** red at 3ac62d7 (4.6e-13 against a bound of 4.6e-22); see N1 for its two halves.
- **F23 (lines beside open edges):**
  - BESIDE (1e-4) equals `openAlong`'s 0.1 mm joining distance, so these lines never land in a gap it tolerates.
  - A T-junction fixture reads clean, and sheets aren't read (`closure.test.ts:177-180`).
  - The tube fixture goes red with the open-edge lines off (0 lines).
  - With the bow reopened, the model reads 9 lines, 0.7363 m; with the open-edge lines off, 1 line, 0.7212 m.
- **Review 1's nits:**
  - The upright test's comment is accurate.
  - The capitals read 29 and 40 at medium with one diagonal, and the closure test reads 3 shapes and 2 lines.
  - The headroom numbers are dated.
  - The `flattest` test's expectations check out by hand.
  - The face-to-face pass is named in the test header.
- **Checks:** the affected tests pass (58), as do the hunt, mmw, walker and parts tests (47). Typecheck and lint of the changed files are clean.

## Findings and disposition

The coordinator asked on 2026-10-28 that sessions wrap up: fix the blocking and should-fix findings, note the rest in a line.

| ID | Finding | Disposition and reason | Repair or note |
|---|---|---|---|
| F30 | The noise bound added in review 1 grows with a part's distance from the frame's origin: a small part wound inside out a million units up reads as noise (Codex 1, minor); the term it added is needed by no case (Claude N1, nit) | Accepted | Heights are measured from one of each part's own corners, and the term is gone; the far part is a regression, red with review 1's module (1.67e−4 against 1.0e−3), and both membranes still pass |
| F31 | Lined-up open ends that wind to an inside between them pass every reading, though the docs say the lines beside open edges read such a part (Claude M1, minor) | Accepted as a bound | Stated in `facing.ts`, the gate's header, the spec, AGENTS and the defect register, and pinned by a fixture of that torus; none is in the model |
| F32 | The lines beside open edges stand 0.1 mm off, so a pocket narrower than that, as in a bow a hundred times smaller, is missed (Codex 2, minor) | Accepted as a bound | Stated alongside F31 |
| F33 | The vault's named thickness and depth are checked only against the refusal (Claude N2, nit) | Accepted | The vaults built at them are read for pockets on 160 lines a side |
| F34 | The shared-edge fixture's direction is tuned to today's arithmetic (Claude N3, nit) | Noted | It is a real red proof today (1 line, 2.0 m, with the recast off); a change to OFF or the bounds can leave it green unreached |
| F35 | The spec states the upright reading twice (Claude N4, nit) | Accepted | The older sentence is gone |
| F36 | Docs overstate: the refusal names a depth only where one helps, `facing.ts` says pockets are read on a grid only, the facing tests' header lists none of the new fixtures, and AGENTS leaves out the face-to-face pass (Claude N5, nit) | Accepted | Each reworded |
| F37 | The vault's message says "a shell 0.06 thick", with no parameter name and no unit (Claude N6, nit) | Accepted | It names `thickness`, `coffers.depth` and `coffers.rib` in metres |
| F38 | The line reader destructures a subarray for every line and triangle, doubling the grid test's time (Claude N7, nit) | Noted | 2.1 to 2.5 s, within the headroom check's 10 s |
| F39 | `barrelVault` builds coffers whose ribs leave no floor, their sides crossing (Claude N8, nit, older than this work) | Noted, out of scope | A follow-up: refuse a rib where 1.6 ribs reach the cell's width or length |

## Verification

The repairs passed `npm test` (675 tests), typecheck, lint and build; the far part's regression is red with review 1's module (1.67e−4 against a bound of 1.0e−3), and the torus pinning F31's bound reads no line, as stated. The full `npm run verify` then passed with `MET_PORT=5348` on the tree merged with origin/main at `7438a1b`: 75 files and 679 unit tests, typecheck, lint, build and 84 e2e tests in 13.3 min. On that tree the closure gate's ten tests pass, the choir screen and the voussoirs that came in by the merge among the pieces it reads.

## Round outcome

Neither lane found a blocker or a major. The two minors on the readings' bounds are stated and pinned, the minor on the noise bound is repaired, and the nits are repaired or noted. These are the third set of repairs; at the coordinator's request to wrap up, they close the review here, each pinned by a test or stated as a bound.
