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

**Finding:** work unit 7's F39 (review 2, Claude N8): `barrelVault` built coffers whose ribs left no floor. A coffer's floor is its cell inset 0.8 ribs from each side, so where 1.6 ribs reach the cell's width on the inner face or its length, the floor's sides meet, and past it they cross; where only one of the two is passed, the floor faces away from the vault's axis. On N8's vault (span 4 m, length 3 m, thickness 0.3 m, ten coffers across, one along, depth 0.05 m, rib 0.5 m), built at `8a6a0c2`, all 20 floor faces faced away from the axis, each floor 0.17 m wide the wrong way round, and nothing refused it. Work unit 9's review 0 added that a floor short of crossing can still be lost: `MeshBuilder.polygon` leaves out a face under 5e-13 m², and Float32 positions could close a floor under a micrometre (F0). So the refusal asks each floor to keep 1 mm across and along, a wide margin over both.

**Gate:** `src/model/lib/dome.test.ts`, work unit 9, two tests.

- "refuses ribs that leave a coffer less than 1 mm of floor: just short of that, read off vaults that build, the floors face the axis". On three vaults it reads the floors' width or length off the built faces of two vaults that build, ribs 0.05 and 0.1 m. Two are semicircles of 2 m radius, whose floors close across (ten cells, 0.6283 m wide on the inner face) or along (ten cells, 0.3 m long). The third is segmental, rise 1 m, with its inner face 2.5 m in radius about an axis 1.5 m below its springing (review 0, F6). It finds the rib at which that line gives 1 mm of floor: 0.3920737, 0.1868750 and 0.2891548 m. A rib 0.1 mm short of it must build every floor, each face toward the axis, 1 to 1.2 mm across or along. A rib 0.1 mm past it must be refused, naming a rib that builds every floor facing the axis, 1 to 1.2 mm across or along.
- "names a rib that builds, with the thickness enough for any rib up to it, before the shell is read, and none where no rib can". Three shells that some rib up to the one named would leave too thin must name the rib and the thickness enough for all of them, pinned as worked by hand (review 0, F1; review 1, F9 and F13): 0.1868 and 0.0594 m, 0.1957 and 0.0564 m, and 1.874 and 0.06 m. In the shell named, every rib up to the one named, 5 mm apart, must build with its floors facing the axis. The third shell fits the rib named but not 0.25 m, whose floors' corners stand under a facet's middle. The second is too thin at its own rib as well, so it pins the rib refusal's place before the thickness refusal. A need of 2097152 m, too large for rounding up to keep its 1e-6, must get a thickness above it that builds (F10), and a room as large must get a depth below it that builds (review 2, F20); these check the advice's arithmetic, since Float32 positions that far out lie 0.25 m apart. N8's vault must be refused with its whole message, and Codex's floor 1.6e-14 m long must be refused for its floor (F0). A rib left at its default must say so (F7). Cells under 1 mm, long or wide or both, must be told that no rib passes and which way to grow, offered fewer coffers only where there are more than the least (F3, F16, F21). A rise so small for its span that the radius overflows must be refused, with coffers or without, naming span and rise (F18).

The fixtures stand 0.1 mm of rib either side of the least floor, so the test does not tell `<` from `≤` there. The sweep reads ribs 5 mm apart; between them, the review 1 record's argument holds (a corner's need for shell grows as it nears a facet's middle).

**Proved red (2026-10-29):** each mutation was made on the repaired `src/model/lib/dome.ts`, after review 2's repairs, and undone, the file restored byte for byte.

- The refusal deleted: red, both tests: "width, rise 2: expected '' to match /^barrelVault: coffers\.rib …/", the vault 0.1 mm past the least floor building, and no rib or thickness named.
- Floors allowed down to none (`FLOOR_LEAST` 0), F39's own bound: red, both: the vault 0.1 mm past builds, and the first shell is told 0.1874 m.
- The refusal at 1.5 ribs: red, both: the vault 0.1 mm past builds, and so does Codex's sliver ("expected '' to match /less than 1 mm of floor/").
- The refusal at 1.7 ribs: red, both: the vault 0.1 mm short refused, and the named rib, 0.1868 m, refused in turn.
- The cell's chord taken for its width, 0.6257 m for 0.6283 m: red, both: the vault 0.1 mm short refused, naming "at most 0.3904 m".
- Half the span taken for the radius: red, both: the segmental vault 0.1 mm short refused, its cells read as 0.3709 m wide for 0.4636 m.
- π taken for the arc: red, the segmental vault 0.1 mm past builds.
- The radius left unchecked: red, the vault whose radius overflows refused for its thickness, not its rise.
- `buildVault`'s floors alone inset 1.7 half-ribs, the refusal left at 1.6: red, both: the vault 0.1 mm past the least floor read off the geometry builds, and all 40 floor faces of a named vault face away from the axis. The thickness refusal's test, whose floor corners stayed at 1.6, read 424 lines through pockets.
- No thickness named with the rib: red, the advice "make coffers.rib at most 0.1868 m." alone.
- The shell read at the rib named alone, review 0's repair: red, the third shell told "at most 1.874 m." with no thickness.
- The thickness rounded up without its step past the need: red, "expected '2097152.0000' to be '2097152.0001'".
- The depth rounded down without its step below the room: red, the vault told "coffers.depth at most 2097152.0000 m", the depth it has.
- Fewer coffers along offered where there is one: red, the cells 0.8 mm long in a vault of one coffer along.
- Fewer coffers across offered where there are two: red, the cells 0.79 mm wide in a vault of two coffers across.
- The two sides of the no-rib advice joined by " and ", as at `3e0b2c5`: red, the cells too small both ways.
- The shell read before the rib (a copy of the thickness refusal put in front): red, the second shell refused for its thickness ("barrelVault: thickness first"), not its rib.

With the repaired `dome.ts` the file's 10 tests pass.

**Evidence:** `docs/work/7_faces-out/reviews/2_implementation.md` (N8, F39) and `docs/work/9_barrel-rib-refusal/plan.md`.
