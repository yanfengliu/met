# Gate proofs

The record that each gate which retired a lesson of [lessons.md](lessons.md), or which a work unit added for a defect, was made to go red by reintroducing the defect it claims to prevent. Each entry names the gate, the mutation, the failure it produced, and the last commit before the lesson's deletion, from which `git show <sha>:docs/learning/lessons-evidence.md` reads the lesson's evidence back.

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

## Mixed pointer input reaches the orbit view's camera input

**Lesson:** none in lessons.md; the defect is work unit 2's review 11, F39, fixed as work unit 10. OrbitControls keeps a finger's position but not a mouse's or a pen's, and takes every pointer it hears for its own: a mouse and a finger down together threw `Cannot read properties of undefined (reading 'x')` inside it (three r186, `OrbitControls.js:1323` and `:1639`), with the orbit view's click and without, and so did a mouse and a pen, two pens, a middle press during a finger's turn, a finger lifted elsewhere on the page during a mouse drag, and a finger pressed while walking and lifted after a mouse press; a pen hovering during a mouse drag turned the view.

**Gates:** `src/viewer/mixed-pointers.test.ts` (a table of mixed sequences on the real rig, with the click and without), `src/viewer/pointer-arbiter.test.ts` (the arbiter alone), `src/viewer/click-random.test.ts` (the seeded random sequences, now mixing every pointer type), `src/viewer/click.test.ts` (a press released while walking) and `tests/e2e/mixed-pointers.spec.ts` (the browser's own mouse and touch). Each header names its bounds.

**Proved red (2026-10-29):** each with work unit 10's tests, the named files put back and then restored; as run, where a test needed its mocks adapted to hear older files.

- The rig, the zoom and the click of `8a6a0c2`, before the work, as they were: the table red in all ten rows, with the click and without, eight throwing inside OrbitControls, the pen's hover leaving the camera 6.07 m off and the pinch a mouse joined 6 cm off; `click.test.ts` red (the held move, sent on at a release while walking: none).
- The random sequences on the same files: every run red, since the test hears the zoom through the filter that `8a6a0c2`'s zoom does not take, and the controls through listener fields that the test's mock wraps only after the constructor, given the canvas by `8a6a0c2`'s rig, has connected them. With the test's OrbitControls mock made to disconnect, wrap and connect again (the zoom left unheard), 237 of the 400 seeds threw inside OrbitControls, with the click and without.
- The e2e spec, in a worktree at `8a6a0c2` with only the spec added: three uncaught exceptions, as the finger landed during the mouse drag and as it lifted, and as the finger lifted while the mouse was down.
- Why the random sequences of `8a6a0c2` passed there: their generator was written around F39 when review 11 deferred it, so that nothing pressed while a mouse or a pen was down, no finger ended while one was, and no middle button pressed while a finger was. That test, with only those rules lifted, threw in 284 of its 400 seeds at `8a6a0c2`.
- The click of `8a6a0c2` alone, as it was: the random sequences red in 3 seeds (32, 130 and 139), each a sub-slop press released while walking whose held move was dropped as a click's.
- The arbiter freeing the camera at the first consumer that hears an end, not the last: its freeing test red; with the rig's relay of cancels also left out, 110 of the random sequences' 800 runs red, 12 of them throwing inside OrbitControls (with the work's freeing rule, the same 110 red and none throwing).
- Review 11's files of `42722e9`, on the mixed sequences: its click as it was, red in 19 seeds (a click from a press another pointer was down during, a finger whose capture was lost among them, F37, or whose buttons changed, F38, and held moves dropped at a release); its zoom, its listeners put through the arbiter's filter, red in 268 of the 800 runs (ends heard on the canvas only, F37); the rig's relay of cancels left out, red in 110 (F37).
- Before work unit 10, on the sequences of `4e16588`, written around F39 (above): red with the gate, zoom and rig of `42722e9` in 308 of the 400 seeds, the gate alone 44, the zoom 250 and the rig 145 (review 11's repair, moved here from AGENTS.md).
- The rig's guard: with its check of a connected OrbitControls left out, the table file's refusal test red ("expected [Function] to throw an error").

With the work's files every gate is green.

**Evidence:** `docs/work/10_mixed-pointer-input/plan.md` and its reviews; `docs/work/2_doors-and-collection/reviews/11_implementation.md` for F39 as found.
