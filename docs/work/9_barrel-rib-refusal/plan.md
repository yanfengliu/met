# barrelVault refuses ribs that leave a coffer no floor

Status: active
Owner: barrel, a worker of the met coordinator
Created: 2026-10-29
Updated: 2026-10-29

## Problem and outcome

Work unit 7's review 2 found that `barrelVault` (`src/model/lib/dome.ts`) builds coffers whose ribs leave no floor (F39, Claude N8, older than that work; `docs/work/7_faces-out/reviews/2_implementation.md`). On N8's vault, span 4 m, length 3 m, thickness 0.3 m, ten coffers across, one along, depth 0.05 m and rib 0.5 m, each floor is inset 0.4 m from both sides of a 0.63 m cell, so its sides cross. Nothing refused it. Unit 7 proposed the follow-up: refuse a rib where 1.6 ribs reach the cell's width or length.

Outcome: `barrelVault` refuses such a rib before it builds, naming `coffers.rib`, the cell's width and length in metres and a rib that passes. Every vault the model builds still builds, with the same geometry.

## Scope

Included: the refusal in `barrelVault` and one constant for the floor's inset; its test in `src/model/lib/dome.test.ts`; the red proof in `docs/learning/gate-proofs.md`; the clause of AGENTS.md's "Closed solids" bullet that lists `barrelVault`'s refusals; this record and a devlog line.

Excluded: any vault's parameters, since a refused vault would mean a changed render, which goes to the coordinator first (none was refused); the thickness refusal's rounding; `src/walk/`, `src/viewer/` and `tests/e2e/`.

## Approach

**The threshold, read from `buildVault` and checked on built vaults.** A cell spans `da = arc / across` of the inner face's angle and `dz = length / along` along Z. Its opening is inset half a rib from each side, an angle of `rib / 2 / radius` across, and its floor 1.6 times that, `depth` farther out. So a floor's width on the inner face is `radius · da − 1.6 · rib` and its length `dz − 1.6 · rib`. The floor closes where 1.6 ribs reach the cell's arc on the inner face (not its chord) or its length. The sides cannot cross sooner: in a section, each side runs between two points on one side of the cell's middle radius, and the opening's inset is smaller than the floor's.

A probe of the built faces at `8a6a0c2`, before the refusal, agreed. Across N8's vault the floor's width on the inner face is 0.628319 − 1.6 · rib: 0.468319, 0.308319 and 0.148319 m at ribs 0.1, 0.2 and 0.3 m. At a rib of 0.39269 m its 20 faces face the axis, 15 µm wide; at 0.39270 m all 20 face away; the computed closing is 0.392699 m. Along, with ten cells 0.3 m long, the floor's length is 0.3 − 1.6 · rib. At 0.1875 m `MeshBuilder.polygon` leaves the floor out, finding it no normal, and past it the floor faces away.

**The refusal** runs before the thickness refusal and builds only where `FLOOR_INSET * rib < min(width, length)`. Its message names the rib, the floor's inset of 0.8 ribs from each side, the cell's width on the inner face and its length, and "make coffers.rib at most" the bound rounded down to four significant digits and kept below it. That rib passes this refusal and stays positive for any cell; the thickness refusal then reads the corners it gives. One constant, `FLOOR_INSET = 1.6`, now feeds `buildVault`'s floor ring, the thickness refusal's floor corners and the new refusal, so the three cannot drift apart.

**The test reads the threshold off the geometry, not off the constant.** On vaults of 2 m radius whose floors close across (ten cells across, one along) or along (two across, ten along), it reads the floors' width or length from the built faces of two vaults that build, ribs 0.05 and 0.1 m, and finds where that line meets zero: 0.3926987 m across (exact 0.3926991) and 0.1875000 m along. A rib 0.1 mm short of it must build every floor, each face toward the axis and under 0.2 mm across. A rib 0.1 mm past it must be refused, naming a rib that builds floors facing the axis within 0.2 mm of the closing (0.3926 and 0.1874 m). N8's vault must be refused with its whole message.

**The model's coffered vaults keep a wide margin**, each a semicircle with its default rise:

| Vault | Cell, on the inner face × along | 1.6 ribs | Widest rib that passes |
|---|---|---|---|
| Hunt arches' soffit (`src/model/hunt/arches.ts`) | 1.1624 × 0.79 m | 0.256 m | 0.4937 m |
| Great Hall balcony vault (`src/model/hunt/hall-vaults.ts`) | 1.7822 × 1.5625 m | 0.256 m | 0.9766 m |
| Great Hall arches' soffit (`hall-vaults.ts`) | 1.708 × 1.28 m | 0.32 m | 0.8 m |
| Parts catalogue's `vault-coffered` (`src/parts/catalogue-architecture.ts`) | 1.3963 × 1.5 m | 0.352 m | 0.8727 m |

The Grand Staircase's vault (`src/model/hunt/stair.ts`) and the parts catalogue's `vault-barrel` have no coffers.

## Acceptance criteria

- [x] `barrelVault` refuses a rib where 1.6 ribs reach a cell's width on the inner face or its length, before it builds, naming `coffers.rib`, the cell's width and length in metres and a rib that passes (`src/model/lib/dome.test.ts`).
- [x] The threshold is derived from the geometry: the test finds where the floors close from vaults that build. A rib 0.1 mm short of it builds floors facing the axis, and 0.1 mm past it is refused.
- [x] Every vault the model builds still builds with the same geometry. The unit suite builds the finished model, and `parts.html`'s smoke test builds every exhibit.
- [x] The test is red with the refusal removed (`docs/learning/gate-proofs.md`).
- [x] AGENTS.md's clause lists the new refusal.
- [ ] `npm run verify` passes on the merged tree, a review round by Codex and Claude is answered, and the work lands on origin's main.

## Implementation steps

- [x] Probe the built floors around the threshold.
- [x] The refusal, `FLOOR_INSET` and the test.
- [x] Red proofs, AGENTS.md, gate proofs, devlog.
- [ ] Review round, repairs, `npm run verify`, landing.

## Outcome

Pending. Record the verified revision, checks and limitations at closure.
