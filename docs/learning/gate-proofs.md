# Gate proofs

The record that each gate which retired a lesson of [lessons.md](lessons.md) was made to go red by reintroducing the defect it claims to prevent. Each entry names the gate, the mutation, the failure it produced, and the last commit before the lesson's deletion, from which `git show <sha>:docs/learning/lessons-evidence.md` reads the lesson's evidence back. It also holds the red proofs of gates that retired no lesson, whose AGENTS.md line points here; those entries name the findings they answer instead.

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

## The walk through real input

**Findings:** work unit 2's review 22, F66: the route walks of `3860384` took about 10 min a run at 4× CPU throttle and still failed under load, the corner settle unable to rest after the step into the Dendur pool. The owner chose fixed-position checks, pictures and one short real-key walk (2026-10-28). The proofs below carry over those AGENTS.md gave the walks (F30, F46, F54, F55 and the rest), each made red again on the new checks.

**Gate:** `tests/e2e/routes.spec.ts`. One short real-key walk, at 1× and 4×: from the plaza spawn through the closed middle door and shut behind, down a Grand Staircase flight, up through R5's doorway until the Triumph of Marius's card shows, and by the view menu back to the door. Then fixed places set by `spawn=x,y,z,tx,ty,tz`, each with a picture of its view. Its bounds are in its header.

**Proved red (2026-10-29):** each defect was planted in the work's tree before its first commit and undone, and the tests named ran unthrottled.

- F30, the door prompt left showing once a door has shown it (`src/main.ts`, the look target's hook keeping the last door): the short walk, no frame with the card and no prompt.
- F46, the closed doors' doorways out of the hit query (`src/viewer/doors.ts` `registerWith`), as at `0defda0`: the short walk, 89 of 186 frames walking straight at the closed door within 1.9 m with no "E Open"; the middle door from the Great Hall, 144 of 257.
- F54, the door planted to swing open by itself toward the plaza 3 s after E shuts it (`src/viewer/doors.ts` `use`): the short walk, the door found open at −90° as the walker came back to it from the plaza.
- F55, a hop planted on the way to Ruth Gleaning (`src/walk/walker.ts` `update`, once, 1.5 m from R6's end): its approach, 98 frames off the ground.
- The door's hold, the middle door's leaves out of the door world (`src/walk/door-world.ts`): the short walk, held at Z −14.20 by the information desk, 12.86 m past the leaves; the middle door from the Great Hall, no stop before the plaza, at Z 25.57.
- Walked through, the leaves' collision left closed while they swing (`door-world.ts` `pose`): the short walk, the middle door from the Great Hall, and Weston's door from the Petrie Court and from gallery 529, each stuck in its doorway.
- Weston's door, its leaves out of the door world: from the Petrie Court, held at X −37.10 in wing B, 12.6 m past the leaves.
- R5's doorway walled up (`src/model/hunt/stair.ts`, the cross hall's back wall with no opening): the short walk, stuck at Z −66.44 before the wall; the place in the doorway, the walker lifted 7 m onto the wall's top.
- The Dendur pool 0.6 m deep (`POOL_FLOOR_Y`, `src/model/roche-north/plan.ts`): stuck in its north arm, no 5 cm of progress walking out.
- The gate's rail taken away (`src/model/roche-north/sackler.ts`): the walker went on to the gate's riser, held at Z −64.68 instead of before the rail.
- The gate's passage left unfilled: the walker from the forecourt dropped into it and could not walk back out onto the forecourt.
- The walking eye 3 cm high (`src/walk/walker.ts` `eye`): the short walk on the landing, and the places in R5's doorway, on the landing, on the forecourt and at the head of the south flight, 2.5 to 3.0 cm off.
- An artwork's card reach 8 m (`src/walk/look.ts`): the short walk's Triumph of Marius, and Ruth Gleaning, cards shown farther than 6 m; the Sphinx's from where its approach set off, 7.7 m out.
- Each key let go 0.7 s late (`tests/e2e/route-keys.ts` `Keys`), past the release the door's stretch allows: the short walk, "at rest 2.43 m out from the leaves … where it can shut the door from 0.95 to 2.28 m out; it went on 1.62 m past where W was let go, 0.74 s of walking after its coast".

With the work as committed, all pass: 14 tests unthrottled in 94 s, inside `npm run verify`, and 12 at 4× in __4X__, its two frame budgets skipped there.
