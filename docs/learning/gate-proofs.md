# Gate proofs

The record that a gate was made to go red by reintroducing the defect it claims to prevent: each gate that retired a lesson of [lessons.md](lessons.md), and each gate for a review finding whose work unit records its proof here. Each entry names the gate, the mutation and the failure it produced; a lesson's entry also names the last commit before the lesson's deletion, from which `git show <sha>:docs/learning/lessons-evidence.md` reads the lesson's evidence back.

## A cited reference photograph must be recorded as viewed

**Lesson:** a model source may cite a reference photograph only once `docs/research/` records it as viewed and says what it shows, or a guessed form stands beside the photograph that contradicts it (the Weston door's head, modelled round in `20e9547` while `src/model/core/weston-facade.ts` cited #33, then marked "Not viewed"; `defect-register.md`).

**Gate:** `src/cited-images.test.ts`, "marks viewed every image a file under src/model/ cites from interior-images.md or exterior-images.md" (work unit 4). Every mention of `interior-images.md` or `exterior-images.md` under `src/model/` must cite entries by ID, `interior-images.md #33` or `#33 and #35`, with no ID left apart from its list or written without its `#` straight after it (a measurement after the list is set off with a colon), and every cited entry must be marked viewed. Its header names its bounds, a photograph cited without its index's name among them.

**Proved red (2026-10-28):** each mutation was made on the finished work, after review 3's repairs, and undone.

- #33's entry put back to "Not viewed", as it stood when the door's head was guessed: red, 7 problems, one for each citation of #33: `src/model/core/materials.ts:4`, `core/weston-facade.ts:3` and `:43`, `frame.ts:47` and `:48`, `roche-south/kravis.ts:4` and `:37`, each "cites interior-images.md #33, which interior-images.md:107 does not mark viewed ("Not viewed")".
- A citation of an unviewed entry added, `exterior-images.md #43` (a 1997 lawn photograph) in `src/model/site/park.ts:94`: red, that one problem.
- An ID left apart from its list behind initials, `#33, J.-C. Benoist 2012, and #14` in `core/weston-facade.ts:3`, which the gate of `1ce5977` passed (review 0, F0): red, "the same clause holds #14 apart from them".
- An ID written without its `#`, `interior-images.md #36 and 42` in `hunt/stair.ts:9`, which the gate of `1ce5977` read as #36 alone (review 0, F2): red, "then writes "and 42" after its list".
- The same at a line's end, `// interior-images.md #P6 and 6` before a line of code in `collection/spaces-a.ts:72`, which the gate of `4042ce4` passed (review 1, F10): red, "then writes "and 6" after its list"; with the test of `4042ce4` put back, green.
- An ID behind a parenthesis opened after the list, `(interior-images.md #33 (Benoist 2012) and #17 (Haklai 2012))` in `roche-south/kravis.ts:37`, which the gate of `586fcfc` passed (review 2, F16): red, "the same clause holds #17 apart from them"; with the test of `586fcfc` put back, green.
- The test run on the model sources and indexes of `53a981c`, the last commit before the gate: red, 24 problems. 22 are mentions with no ID after them ("item 30", "37 to 40", "primary 9" and prose), one is `kravis.ts:37`'s #35 written apart from its list, and one is the lesson's defect: `src/model/core/choir-screen.ts:4` cites #29, which `interior-images.md:95` marked "Not viewed".

With the work's indexes and citations, all 7 of the file's tests pass. Its detector tests also hold the forms on synthetic input, among them a "Viewed from the north" sentence and a `(primary, viewed)` outside a heading line, neither of which is a mark.

**Evidence:** `git show 53a981c:docs/learning/lessons-evidence.md` reads the lesson's evidence back, and `git show 53a981c:docs/learning/lessons.md` its line.

## A rebuilt ornament's joints can float with every gate green

**Lesson:** a rebuilt ornament's joints, each placed by hand from measured heights, can float apart with every gate green: before review, check that its pieces form one group standing on its support. The choir screen's side pediments of `a064995` touched nothing while `npm run verify` passed (work unit 4, review 4, F26).

**Gate:** `src/model/core/choir-connected.test.ts`, "is one group of pieces, each within 1 mm of another, standing on the hall floor" (work unit 4's F-owner-5, review 6). The choir screen step's pieces as the kit gives them, joined wherever two lie within 1 mm by the exact distance between their world meshes (three-mesh-bvh `closestPointToGeometry`), must form one group whose lowest point stands at the hall floor's level.

**Proved red (2026-10-28):** each mutation was made on the finished work and undone.

- `a064995`'s `src/model/core/choir-screen.ts`, the lesson's defect: red, 5 groups of the screen's 580 pieces, the four halves of the side pediments apart (#447, #448, #473 and #474, each 1.6 cm from its nearest piece).
- The gate's first version passed `a064995`: it took any answer of `closestPointToGeometry` with a `maxThreshold` of 1 mm as touching, but the threshold only prunes the search by bounds, and a nearest pair farther than it still comes back. Reading the distance made it red.
- On the work's own gate frame, the four jamb bars lifted 5 mm off their jambs and stopped 1 cm under their head pieces: red, 5 groups of 565, those four bars apart.

With the work's screen the gate is green: one group of 565 pieces, its lowest point on the floor.

**Evidence:** `git show db1e297:docs/learning/lessons-evidence.md` reads the lesson's evidence back, and `git show db1e297:docs/learning/lessons.md` its line.

## A barrel vault's coffers keep their floors

**Finding:** work unit 7's F39 (review 2, Claude N8): `barrelVault` built coffers whose ribs left no floor. A coffer's floor is its cell inset 0.8 ribs from each side, so where 1.6 ribs reach the cell's width on the inner face or its length, the floor's sides cross and it faces out, away from the vault's axis. On N8's vault (span 4 m, length 3 m, thickness 0.3 m, ten coffers across, one along, depth 0.05 m, rib 0.5 m), built at `8a6a0c2`, all 20 floor faces faced away from the axis, each floor 0.17 m wide the wrong way round, and nothing refused it.

**Gate:** `src/model/lib/dome.test.ts`, "refuses ribs that leave a coffer no floor, naming a rib that passes: just short of where the floors close, read off vaults that build, they face the axis" (work unit 9). On vaults of 2 m radius whose floors close across (ten cells, 0.6283 m wide on the inner face) or along (ten cells, 0.3 m long), it reads the floors' width or length off the built faces of two vaults that build, ribs 0.05 and 0.1 m, and finds the rib at which they close where that line meets zero (0.3926987 and 0.1875000 m). A rib 0.1 mm short of it must build every floor, each face toward the axis and under 0.2 mm across. A rib 0.1 mm past it must be refused, naming a rib that builds floors facing the axis within 0.2 mm of the closing. N8's vault must be refused with its whole message. The fixtures stand 0.1 mm either side of the closing, so the test does not tell `<` from `≤` at the closing itself, where a floor has no width and `MeshBuilder.polygon` leaves it out.

**Proved red (2026-10-29):** each mutation was made on the finished work's `src/model/lib/dome.ts` and undone, the file restored byte for byte.

- The refusal deleted: red, "width: expected '' to match /^barrelVault: coffers\.rib …/": the vault 0.1 mm past the closing builds.
- The refusal at 1.5 ribs: red, the same.
- The refusal at 1.7 ribs: red, the vault 0.1 mm short of the closing refused ("coffers.rib 0.39259872078346986 m leaves the coffers no floor …").
- The cell's chord taken for its width, 0.6257 m for 0.6283 m: red, the same, naming "at most 0.391 m".
- `buildVault`'s floors alone inset 1.7 half-ribs, the refusal left at 1.6: red, the vault 0.1 mm past the closing read off the geometry builds; the thickness refusal's test, whose floor corners stayed at 1.6, read 424 lines through pockets.

With the work's `dome.ts` the file's 9 tests pass.

**Evidence:** `docs/work/7_faces-out/reviews/2_implementation.md` (N8, F39) and `docs/work/9_barrel-rib-refusal/plan.md`.
