# barrelVault refuses ribs that leave a coffer no floor

Status: complete
Owner: barrel, a worker of the met coordinator
Created: 2026-10-29
Updated: 2026-10-29

## Problem and outcome

Work unit 7's review 2 found that `barrelVault` (`src/model/lib/dome.ts`) builds coffers whose ribs leave no floor (F39, Claude N8, older than that work; `docs/work/7_faces-out/reviews/2_implementation.md`). On N8's vault, span 4 m, length 3 m, thickness 0.3 m, ten coffers across, one along, depth 0.05 m and rib 0.5 m, each floor is inset 0.4 m from both sides of a 0.63 m cell, so its sides cross. Nothing refused it. Unit 7 proposed the follow-up: refuse a rib where 1.6 ribs reach the cell's width or length.

Outcome: `barrelVault` refuses, before it builds, a rib that leaves a coffer less than 1 mm of floor across or along. The message names `coffers.rib`, the cell's width and length in metres, and a rib that passes, with the thickness enough for any rib up to it where the shell is too thin. Every vault the model builds still builds, with the same geometry.

## Scope

Included: the refusal in `barrelVault`, with constants for the floor's inset and its least size; its tests in `src/model/lib/dome.test.ts`; the red proof in `docs/learning/gate-proofs.md`, under that test since work unit 12 cut AGENTS.md to one line a gate, where the clause in its "Closed solids" bullet went; this record and a devlog line. The reviews added three things the refusal's advice leans on: a check of the inner face's radius, for any vault (review 2, F18), and in both refusals' rounding a step past the need and below the room where the rounding loses its last digit (review 1, F10; review 2, F20).

Excluded: any vault's parameters, since a refused vault would mean a changed render, which goes to the coordinator first (none was refused); any other change to the thickness refusal; `src/walk/`, `src/viewer/` and `tests/e2e/`.

## Approach

**The threshold, read from `buildVault` and checked on built vaults.** A cell spans `da = arc / across` of the inner face's angle and `dz = length / along` along Z. Its opening is inset half a rib from each side, an angle of `rib / 2 / radius` across, and its floor 1.6 times that, `depth` farther out. So a floor's width on the inner face is `radius · da − 1.6 · rib` and its length `dz − 1.6 · rib`. The floor closes where 1.6 ribs reach the cell's arc on the inner face (not its chord) or its length. Neither the sides nor the opening can cross sooner while the inset stays above 1 half-rib: in a section, each side runs between two points on one side of the cell's middle radius.

A probe of the built faces at `8a6a0c2`, before the refusal, agreed. Across N8's vault the floor's width on the inner face is 0.628319 − 1.6 · rib: 0.468319, 0.308319 and 0.148319 m at ribs 0.1, 0.2 and 0.3 m. At a rib of 0.39269 m its 20 faces face the axis, 15 µm wide; at 0.39270 m all 20 face away; the computed closing is 0.392699 m. Along, with ten cells 0.3 m long, the floor's length is 0.3 − 1.6 · rib. At 0.1875 m `MeshBuilder.polygon` leaves the floor out, finding it no normal, and past it the floor faces away. Where both the width and the length are passed, the two reversals keep the floor's winding, but its sides still cross.

**The least floor.** Review 0 found that a floor short of closing can still be lost (F0). `MeshBuilder.polygon` leaves out a face under 5e-13 m², and Float32 positions, about a micrometre apart 10 m out, could close a floor under a micrometre or turn it round. So each floor must keep `FLOOR_LEAST` = 1 mm across and along, a wide margin over both and the repo's usual tolerance for touching.

**The refusal** runs before the thickness refusal and builds only where `min(width, length) − FLOOR_INSET · rib ≥ FLOOR_LEAST`. `barrelVault` first refuses a rise so small for its span that the radius overflows, naming span and rise, for a plain vault too (F18), so a cell's size is a number for any vault far from float64's limits; review 3 found extremes that still pass (F24, F25; see the outcome). Its message names the rib (and that it is the default, where it is), the floor's inset of 0.8 ribs from each side, the cell's width on the inner face and its length. Then it says "make coffers.rib at most" the widest rib that keeps 1 mm of floor, rounded down to four significant digits and kept below it. Every narrower rib passes this refusal too, but not always the thickness refusal: a corner needs the most shell under a facet's middle, which a narrower rib can put it at (review 1, F9). So the shell is read at the rib named and at the ribs where an opening's or a floor's corner first reaches a facet's middle, `facet · radius` and that over `FLOOR_INSET`, where those are narrower. Short of those a corner's need grows with the rib, so these readings bound every rib up to the one named. Where the shell is too thin for any of them, the message names the thickness enough for all, rounded up to 0.1 mm and kept above the need (F10); the thickness refusal's depth is kept below the room the same way (F20). One reading of the shell, `shell(rib)`, serves both refusals. Cells of 1 mm or less get no rib; the message says which way to grow them, wider or longer or both, offering fewer coffers only where there are more than the least (F16, F21). One constant, `FLOOR_INSET` = 1.6, feeds `buildVault`'s floor ring, the thickness refusal's floor corners and the new refusal, so the three cannot drift apart.

**The tests read the threshold off the geometry, not off the constant.** Three vaults: semicircles of 2 m radius whose floors close across (ten cells across, one along) or along (two across, ten along), and a segmental vault, rise 1 m, 2.5 m in radius about an axis 1.5 m below its springing (F6). For each, the first test reads the floors' width or length from the built faces of two vaults that build, ribs 0.05 and 0.1 m. It finds the rib where that line gives 1 mm of floor: 0.3920737, 0.1868750 and 0.2891548 m, each within 4e-7 m of the cell's smaller side less 1 mm, over 1.6. A rib 0.1 mm short of it must build every floor, each face toward the axis, 1 to 1.2 mm across or along. A rib 0.1 mm past it must be refused, naming a rib that builds every floor facing the axis, 1 to 1.2 mm across or along (0.392, 0.1868 and 0.2891 m).

The second test checks the advice on three shells that some rib up to the one named would leave too thin, with the pairs named pinned as worked by hand (F13): 0.1868 m with 0.0594 m, 0.1957 m with 0.0564 m, and 1.874 m with 0.06 m. The third fits the rib named but not 0.25 m. In each shell named, every rib up to the one named, 5 mm apart, builds. The second shell, too thin at its own rib as well, pins the order. It also holds a need of 2097152 m, whose thickness named must clear it, and a room as large, whose depth named must stay under it, which check the advice's arithmetic only; N8's whole message; Codex's floor 1.6e-14 m long, refused for its floor; a defaulted rib; cells under 1 mm long, wide and both, with the least coffers and with more; and a rise whose radius overflows, with coffers and without.

**The model's coffered vaults keep a wide margin**, each a semicircle with its default rise:

| Vault | Cell, on the inner face × along | Floor at its rib | Rib the refusal would name |
|---|---|---|---|
| Hunt arches' soffit (`src/model/hunt/arches.ts`, rib 0.16 m) | 1.1624 × 0.79 m | 0.534 m | 0.4931 m |
| Great Hall balcony vault (`src/model/hunt/hall-vaults.ts`, rib 0.16 m) | 1.7822 × 1.5625 m | 1.3065 m | 0.9759 m |
| Great Hall arches' soffit (`hall-vaults.ts`, rib 0.2 m) | 1.708 × 1.28 m | 0.96 m | 0.7993 m |
| Parts catalogue's `vault-coffered` (`src/parts/catalogue-architecture.ts`, rib 0.22 m) | 1.3963 × 1.5 m | 1.0443 m | 0.872 m |

The Grand Staircase's vault (`src/model/hunt/stair.ts`) and the parts catalogue's `vault-barrel` have no coffers.

## Acceptance criteria

- [x] `barrelVault` refuses, before it builds, a rib that leaves a coffer under 1 mm of floor across or along: where 1.6 ribs and 1 mm reach a cell's width on the inner face or its length. The message names `coffers.rib`, the cell's width and length in metres, and a rib that passes, with the thickness enough for any rib up to it where the shell is too thin (`src/model/lib/dome.test.ts`).
- [x] The threshold is derived from the geometry: the tests find where the floors keep 1 mm from vaults that build, round and segmental. A rib 0.1 mm short of it builds floors facing the axis, and 0.1 mm past it is refused.
- [x] Every vault the model builds still builds with the same geometry. The unit suite builds the finished model, and `parts.html`'s smoke test builds every exhibit.
- [x] The tests are red with the refusal removed, and with sixteen other mutations (`docs/learning/gate-proofs.md`).
- [x] The refusal is listed with its red proofs: AGENTS.md's "Closed solids" line names `src/model/lib/dome.test.ts`, and `docs/learning/gate-proofs.md` holds the entry under it.
- [x] `npm run verify` passes on the merged tree, the review rounds are answered, and the work lands on origin's main.

## Implementation steps

- [x] Probe the built floors around the threshold.
- [x] The refusal, `FLOOR_INSET` and the test (`1e3b272`).
- [x] Review 0, by Codex and Claude (`reviews/0_implementation.md`): F0 to F8, all accepted, F7 in part; the repairs (`ecb6db6`).
- [x] Review 1, focused on those repairs (`reviews/1_implementation.md`): F9 to F17, all accepted; the repairs (`3e0b2c5`).
- [x] Review 2, focused on review 1's repairs (`reviews/2_implementation.md`): F18 to F23, all nits, all accepted; the repairs (`41d194b`).
- [x] Review 3, focused on review 2's repairs (`reviews/3_implementation.md`): F24 to F29, all nits, all accepted; F24 to F27 stated as bounds, F28 moot, F29 fixed in the gate proofs.
- [x] The merge with origin/main at `897a4b4`, after work units 2, 10 and 12 (`0a0ee04`); `npm run verify`; landing.

## Outcome

Landed on origin's main, 2026-10-29, as the merge `0a0ee04` of `41d194b` with `897a4b4` and this record's commit after it. `barrelVault` refuses a rib that leaves a coffer less than 1 mm of floor across or along, before the thickness refusal. It names the rib, the cell's width on the inner face and its length, and a rib that passes, with the thickness enough for any rib up to it where the shell is too thin. It also refuses a rise whose radius overflows, and both refusals' rounding steps past the need and below the room.

Checks. `npm run verify` passed through the gate lock with `MET_PORT=5361` on the merged tree `0a0ee04`: 78 files and 695 unit tests, typecheck, lint, build and 96 e2e tests in 8.2 min. It passed on each reviewed revision before that: `1e3b272`, `ecb6db6`, `3e0b2c5` and `41d194b`, each with 75 files, 680 or 681 unit tests and 84 e2e tests. Both tests in `src/model/lib/dome.test.ts` are red with the refusal deleted and with sixteen other mutations, recorded in `docs/learning/gate-proofs.md` under that test.

Review: four rounds by Codex (`gpt-6-astra`, xhigh) and Claude (`claude-opus-5-5[1m]`, max), each reading the exact revision. They found F0 to F29, nothing blocking. F0, F1, F4, F6 and F9 were rated should-fix by at least one reviewer and were repaired. Of the nits, all were accepted: F7 in part, F24 to F27 as bounds, F28 moot, the rest repaired.

No render changed. `buildVault` is untouched, and every vault the model builds passes both refusals with a wide margin, so their geometry is byte for byte what it was; the standard shots were not retaken.

Limitations, all at inputs far from any vault the model builds (review 3):
- The radius check lets a radius of 0 through (F24), as for a span and rise of 5e-324 m. Its message also calls an overflow on the way to a radius that is a number a radius too large (F25), as at spans over about 1.34e154 m. It stops float64 overflow, not positions past Float32's 3.4e38 m.
- The depth named can be refused again at radii over about 1e5 m, where numbers lie farther apart than its margin (F26). The comment that bounds it by the room, "for a room under about 1e11 m", is wrong in that variable.
- Fewer coffers can be offered where even the least count leaves the cells 1 mm or less (F27).

Follow-up, proposed, not started:
- Read the radius by `buildVault`'s own formula and refuse it unless it is a number above 0.
- Name the depth only where the shell read again at it passes.
- Offer fewer coffers only where the least count clears 1 mm.

Review 3's record describes each repair. The same repair was dry-run against `41d194b`, all twenty mutations matching once.
