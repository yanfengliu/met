# barrelVault refuses ribs that leave a coffer no floor

Status: active
Owner: barrel, a worker of the met coordinator
Created: 2026-10-29
Updated: 2026-10-29

## Problem and outcome

Work unit 7's review 2 found that `barrelVault` (`src/model/lib/dome.ts`) builds coffers whose ribs leave no floor (F39, Claude N8, older than that work; `docs/work/7_faces-out/reviews/2_implementation.md`). On N8's vault, span 4 m, length 3 m, thickness 0.3 m, ten coffers across, one along, depth 0.05 m and rib 0.5 m, each floor is inset 0.4 m from both sides of a 0.63 m cell, so its sides cross. Nothing refused it. Unit 7 proposed the follow-up: refuse a rib where 1.6 ribs reach the cell's width or length.

Outcome: `barrelVault` refuses, before it builds, a rib that leaves a coffer less than 1 mm of floor across or along. The message names `coffers.rib`, the cell's width and length in metres, and a rib that passes with any thickness that rib needs. Every vault the model builds still builds, with the same geometry.

## Scope

Included: the refusal in `barrelVault`, with constants for the floor's inset and its least size; its tests in `src/model/lib/dome.test.ts`; the red proof in `docs/learning/gate-proofs.md`; a clause in AGENTS.md's "Closed solids" bullet; this record and a devlog line.

Excluded: any vault's parameters, since a refused vault would mean a changed render, which goes to the coordinator first (none was refused); the thickness refusal's own rounding; `src/walk/`, `src/viewer/` and `tests/e2e/`.

## Approach

**The threshold, read from `buildVault` and checked on built vaults.** A cell spans `da = arc / across` of the inner face's angle and `dz = length / along` along Z. Its opening is inset half a rib from each side, an angle of `rib / 2 / radius` across, and its floor 1.6 times that, `depth` farther out. So a floor's width on the inner face is `radius · da − 1.6 · rib` and its length `dz − 1.6 · rib`. The floor closes where 1.6 ribs reach the cell's arc on the inner face (not its chord) or its length. Neither the sides nor the opening can cross sooner while the inset stays above 1 half-rib: in a section, each side runs between two points on one side of the cell's middle radius.

A probe of the built faces at `8a6a0c2`, before the refusal, agreed. Across N8's vault the floor's width on the inner face is 0.628319 − 1.6 · rib: 0.468319, 0.308319 and 0.148319 m at ribs 0.1, 0.2 and 0.3 m. At a rib of 0.39269 m its 20 faces face the axis, 15 µm wide; at 0.39270 m all 20 face away; the computed closing is 0.392699 m. Along, with ten cells 0.3 m long, the floor's length is 0.3 − 1.6 · rib. At 0.1875 m `MeshBuilder.polygon` leaves the floor out, finding it no normal, and past it the floor faces away. Where both the width and the length are passed, the two reversals keep the floor's winding, but its sides still cross.

**The least floor.** Review 0 found that a floor short of closing can still be lost (F0). `MeshBuilder.polygon` leaves out a face under 5e-13 m², and Float32 positions, about a micrometre apart 10 m out, could close a floor narrower than that or turn it round. So each floor must keep `FLOOR_LEAST` = 1 mm across and along, the repo's usual tolerance for touching.

**The refusal** runs before the thickness refusal and builds only where `min(width, length) − FLOOR_INSET · rib ≥ FLOOR_LEAST`. Its message names the rib (and that it is the default, where it is), the floor's inset of 0.8 ribs from each side, the cell's width on the inner face and its length. Then it says "make coffers.rib at most" the widest rib that keeps 1 mm of floor, rounded down to four significant digits and kept below it. Where that rib would leave the shell too thin for the thickness refusal, the message names the thickness it needs too (F1), from one reading of the shell, `shell(rib)`, which both refusals share. Cells of 1 mm or less get no rib; the message says to make them larger. One constant, `FLOOR_INSET` = 1.6, feeds `buildVault`'s floor ring, the thickness refusal's floor corners and the new refusal, so the three cannot drift apart.

**The tests read the threshold off the geometry, not off the constant.** Three vaults: semicircles of 2 m radius whose floors close across (ten cells across, one along) or along (two across, ten along), and a segmental vault, rise 1 m, 2.5 m in radius about an axis 1.5 m below its springing (F6). For each, the first test reads the floors' width or length from the built faces of two vaults that build, ribs 0.05 and 0.1 m. It finds where that line gives 1 mm of floor: 0.3920737, 0.1868750 and 0.2891548 m, each within 4e-7 m of `(least − 0.001) / 1.6`. A rib 0.1 mm short of it must build every floor, each face toward the axis, 1 to 1.2 mm across. A rib 0.1 mm past it must be refused, naming a rib that builds every floor facing the axis, 1 to 1.4 mm across (0.392, 0.1868 and 0.2891 m).

The second test checks the advice on two shells that the rib named would leave too thin. These name 0.1868 m with 0.0594 m and 0.1957 m with 0.0564 m, and both pairs build; the second shell, too thin at its own rib as well, pins the order. It also holds N8's whole message, Codex's floor 1.6e-14 m long, a defaulted rib and cells 0.8 mm long.

**The model's coffered vaults keep a wide margin**, each a semicircle with its default rise:

| Vault | Cell, on the inner face × along | Floor at its rib | Rib the refusal would name |
|---|---|---|---|
| Hunt arches' soffit (`src/model/hunt/arches.ts`, rib 0.16 m) | 1.1624 × 0.79 m | 0.534 m | 0.4931 m |
| Great Hall balcony vault (`src/model/hunt/hall-vaults.ts`, rib 0.16 m) | 1.7822 × 1.5625 m | 1.3065 m | 0.9759 m |
| Great Hall arches' soffit (`hall-vaults.ts`, rib 0.2 m) | 1.708 × 1.28 m | 0.96 m | 0.7993 m |
| Parts catalogue's `vault-coffered` (`src/parts/catalogue-architecture.ts`, rib 0.22 m) | 1.3963 × 1.5 m | 1.0443 m | 0.872 m |

The Grand Staircase's vault (`src/model/hunt/stair.ts`) and the parts catalogue's `vault-barrel` have no coffers.

## Acceptance criteria

- [x] `barrelVault` refuses, before it builds, a rib that leaves a coffer under 1 mm of floor across or along: where 1.6 ribs and 1 mm reach a cell's width on the inner face or its length. The message names `coffers.rib`, the cell's width and length in metres, and a rib that passes with any thickness it needs (`src/model/lib/dome.test.ts`).
- [x] The threshold is derived from the geometry: the tests find where the floors keep 1 mm from vaults that build, round and segmental. A rib 0.1 mm short of it builds floors facing the axis, and 0.1 mm past it is refused.
- [x] Every vault the model builds still builds with the same geometry. The unit suite builds the finished model, and `parts.html`'s smoke test builds every exhibit.
- [x] The tests are red with the refusal removed, and with nine other mutations (`docs/learning/gate-proofs.md`).
- [x] AGENTS.md's clause lists the new refusal.
- [ ] `npm run verify` passes on the merged tree, the review rounds are answered, and the work lands on origin's main.

## Implementation steps

- [x] Probe the built floors around the threshold.
- [x] The refusal, `FLOOR_INSET` and the test.
- [x] Review 0, by Codex and Claude (`reviews/0_implementation.md`): F0 to F8, all accepted, F7 in part; the repairs.
- [ ] Review 1, focused on the repairs; `npm run verify`; landing.

## Outcome

Pending. Record the verified revision, checks and limitations at closure.
