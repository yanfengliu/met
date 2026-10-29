# Gate proofs

The record that each gate was made to go red by reintroducing the defect it claims to prevent, or by planting a fault it must catch. A gate whose test header lists its red proofs keeps them there; this file holds the rest.

The first entries are the gates that retired a lesson of [lessons.md](lessons.md). Each names the gate, the mutation, the failure it produced, and the last commit before the lesson's deletion, from which `git show <sha>:docs/learning/lessons-evidence.md` reads the lesson's evidence back.

Under [Red proofs by gate](#red-proofs-by-gate), each gate's other red proofs are filed under its test. Most came from AGENTS.md's Gates section, where each work unit wrote them until work unit 12 moved them here; a gate's new red proofs go there too, or in its test's header. Each names the mutation, and the failure and the commit it was red at where the record gives them. Their review rounds and finding IDs (review 17, F46) are work unit 2's, in `docs/work/2_doors-and-collection/reviews/`.

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

## Red proofs by gate

### `src/repo-conventions.test.ts`

- AGENTS.md within 30,000 bytes (work unit 12, 2026-10-29): with `8a6a0c2`'s AGENTS.md put back, the last before work unit 12, red: "AGENTS.md holds 69357 bytes with CRLF line endings, 39357 over the 30000-byte bound, and Codex reads only its first 32 KiB: …" (69,223 bytes with LF endings, 134 lines); with work unit 12's, green. Its detector test passes 30,000 bytes of synthetic text and fails 30,001, read with LF endings or CRLF.

### `tests/e2e/walk-screen.spec.ts`

- Each state read once the page's next frame has applied it: red at `acc0e0a` with the page's animation frames held 60 ms by a timer: the fold read failed in 5 of 6 runs, the leave read in 1; with the waits, still red when the bar never folds again or the orbit view's bar stays folded.

### `tests/e2e/stairs.spec.ts`

- The rendered eye on a flight, never dropping climbing nor rising descending, and drawn from the walker's eye: red with the eye of `db4cc47`: drops of 6.5 to 14.4 cm climbing, rises of 5.9 to 13.3 cm descending; red with a dip added in `setWalkView`, which left `walk.eye` alone: frames drawn 3.1 cm from the eye.
- The eye at rest on the plaza, 1.6 m over the surface under it: red with the published eye 3 cm high on the plaza, which the spawn-height check it replaced passed; with the key held 0.4 s past its stop that old check read 3.15 cm out and this one stayed green.

### `src/model/hunt/routes.test.ts`

- R5 through the cross hall's doorway into gallery 600: red with the doorway walled up: stalled at the back wall, 6.06 m short.
- R7 from gallery 153 through its south wall's door: red with R7 led through gallery 153's south wall: stalled at it, 44.48 m short.

### `tests/e2e/routes.spec.ts`

- Every corner rested on within 0.25 m along its stopping axis: red with the walk of `795956f` under a 300 ms delay planted before each key goes up: it rested 0.62 m past its corner in the entrance bay, the open leaf 2.13 m off, out of reach.
- R1 at the closed central door, its prompt "E Open" at every frame from 1.9 m out: red at `0defda0`, final review F46: in 69 of 150 frames none, the eye's ray passing between the pair's leaves.
- The walker held a body's radius before the closed central door's leaves: red when the leaves never stop it: it walked on to Z −14.2.
- The central door opened by E and walked through: red when the collision stays closed while the leaves swing: stuck in the doorway.
- The central door still shut when R1 comes back to it: review 20, F54: red with it planted to swing open by itself toward the plaza, found open at −90°.
- The card and the door prompt never both shown at a frame drawn, the check `labels-doors.spec` held until this walk took it over (review 7, F30): red with the prompt left showing once a door has shown it: 243 frames with both.
- R3 back through the pool's north arm, resting on its floor: red with the 0.6 m pool: stuck in it, 1.71 m short.
- Weston's door, closed and solid, holding the walker before its leaves: red with its leaves out of the door world: it ran 12.6 m on into wing B.
- An approached artwork's card never shown with the eye more than the spec's 6 m from it: red with the page's reach at 8 m: first shown 7.99 m off.
- The walk toward an artwork and the turn away keeping the walker on the ground: review 20, F55: red with a hop planted on the way to Ruth Gleaning, 81 frames off the ground, which the next walk used to drop unread.

### `src/model/roche-north/walk.test.ts`

- No trap at Dendur, from every start 2 m apart over the pool's water: red with the 0.6 m pool: 89 starts trapped.
- On the gate's axis from the terrace the walker stops at the rail, and from the forecourt it walks into the passage on the forecourt's level and back: red with the passage unfilled and no rail: it walks into the passage from the terrace and drops off the forecourt's level.

### `tests/e2e/zoom.spec.ts`

- Every wheel notch within 1 cm of the ray under the pointer, until it stops 0.5 m before the first surface there or at the camera floor: a picker returning the camera-to-target distance, a ray biased 1.5 mrad, or a zoom without the camera floor as a bound turns it red.
- On the camera floor, looking down from the far bound a notch out still moves, and looking up a notch out stays on the floor while a notch in moves: both red with the zoom of `8a5f651`.
- Under a footing on the floor, a right-drag that pans the camera under the floor and a wheel notch sent at once leave the view as it was: red at `29c93d3`: turned 7.0°.

### `tests/e2e/network.spec.ts`

- No request but to the page's own host: red with a planted fetch of a Collection API record.

### `tests/e2e/labels-view.spec.ts`

- A 2 px click on the painting shows its card and moves nothing, the preset staying in view and the follow camera on: red at `86bdf0c`, where the camera moved 0.514 m (review 6, F25).

### `tests/e2e/doors.spec.ts`

- `doors=open` and `doors=closed` under `shot=1`, the doors set before the walker is placed and both before the first frame drawn: red with the set-up moved after the placement, after the first frame, marked at load but done after the first frame, or done after the first render in the same callback, which the probe of `7b7fe94`, reading the doors' state at the callback's end, passed.
- The slowest frame of each swing under 16.7 ms of work: the walked cycles red at 147.8 ms with 12 ms planted in each swing check while walking; red with 40 µs of work planted for each object drawn on a swing's frames: 30.3 ms facing in, which the gate of `d4d716d`, facing out only, passed at 11.5 ms.

### `src/build/window-parts.test.ts`

- Every role of a door, each leaf apart among them, placed with the rest: red with a leaf left out of the closed leaves.

### `src/walk/door-world.test.ts`

- A closing door held by a walker between its leaves, turned back open on the side it stands: review 15, F43, red at `7b054d7`: held at ±66.4°, "opening", into the walker.
- The leaves against the walker, through stalled frames of 0.25 s and 2 s: red with only each step's end pose tried, with no hold, with the leaves out of the walls, and with the swing moved once a frame: held at 90° after the stalls against 66.4°.

### `src/walk/door-settle.test.ts`

- A door's step completing with the walker in its doorway opens the door away at once, the walker's feet on the floor and no leaf in it: red with no release after the check: shut on it; and with the leaves in the static world: moved 25 cm by `settle`.

### `src/viewer/doors.test.ts`

- The timeline's state byte for byte a timeline's without the door layer, the layer hiding by layer masks only: red when it hides by `visible`.
- A door's piece that the step's resting pieces leave out, a locked door's included, refused naming the door and the piece: red with the silent skip of `0defda0` (review 17, F47).

### `src/viewer/pick.test.ts` and `src/walk/look.test.ts`

- A tagged glass piece found when accepted and stopping the ray when not, as a glazed door out of reach does: red at `a9f6f5a`, which passed a glass door out of reach; in the look target, the glass door red at `a9f6f5a` too.

### `src/viewer/mixed-pointers.test.ts`

Mixed pointer input before the orbit view's camera input is arbitrated (work unit 10, for work unit 2's F39: OrbitControls keeps a finger's position but not a mouse's or a pen's, and takes every pointer it hears for its own).

- Mixed sequences on the real rig, with the click and without: red with the rig, the zoom and the click of `8a6a0c2` as they were, in all ten rows: eight threw inside OrbitControls (`Cannot read properties of undefined (reading 'x')`), the pen's hover left the camera 6.07 m off, and the pinch a mouse joined ended 6 cm off.
- The rig refusing an OrbitControls already connected: red with that check left out ("expected [Function] to throw an error").

### `src/viewer/pointer-arbiter.test.ts`

- The camera freed only once every consumer has heard each holder's end: red with it freed at the first consumer that hears an end.

### `src/viewer/click-random.test.ts`

- Mixed pointer types (work unit 10): with the rig, the zoom and the click of `8a6a0c2`, every run red, since the test hears the zoom through the filter that `8a6a0c2`'s zoom does not take, and the controls through listener fields that the test's mock wraps only after the constructor, given the canvas by `8a6a0c2`'s rig, has connected them. With that mock made to disconnect, wrap and connect again (the zoom left unheard), 237 of the 400 seeds threw inside OrbitControls, with the click and without.
- Why these sequences passed at `8a6a0c2`: their generator was written around F39 when review 11 deferred it, so that nothing pressed while a mouse or a pen was down, no finger ended while one was, and no middle button pressed while a finger was. That test, with only those rules lifted, threw in 284 of its 400 seeds at `8a6a0c2`.
- A sub-slop press released while walking: red with the click of `8a6a0c2` alone in 3 seeds (32, 130 and 139), each dropping its held move as a click's.
- With the arbiter freeing the camera at the first consumer that hears an end, and the rig's relay of cancels left out: 110 of the 800 runs red, 12 of them throwing inside OrbitControls; with the work's freeing rule, the same 110 red and none throwing.
- Review 11's files of `42722e9` on the mixed sequences: its click as it was, red in 19 seeds (a click from a press another pointer was down during, a finger whose capture was lost among them, F37, or whose buttons changed, F38, and held moves dropped at a release); its zoom, its listeners put through the arbiter's filter, red in 268 of the 800 runs (ends heard on the canvas only, F37); the rig's relay of cancels left out, red in 110 (F37).
- Before work unit 10, on the sequences of `4e16588`, written around F39: red with the gate, zoom and rig of `42722e9` in 308 of the 400 seeds; with each alone, its gate 44 (seed 29, a click from a press whose buttons changed, F38; seed 76, a mouse click while a finger whose capture was lost was down, F37), its zoom 250 (seed 34, a zoom on one finger's move, a finger released over another element left behind; seed 45, a zoom on a left drag, a cancelled middle drag left behind), its rig 145 (seed 1, the controls never hearing a finger's cancel over another element; 61 seeds then threw in the controls).

### `tests/e2e/mixed-pointers.spec.ts`

- In a worktree at `8a6a0c2` with only the spec added: three uncaught exceptions from OrbitControls, as the finger landed during the mouse drag and as it lifted, and as the finger lifted while the mouse was down.

### `src/model/lib/dome.test.ts`

- The Great Hall pendentives' seams, read at every detail: red with the spandrels on their old points, apart from the curved faces', with 48, 96 and 160 edges borne by an odd number of faces.
- `barrelVault` refusing coffers whose openings' or floors' corners would stand out of the chords of its outer face's facets above them: red with the refusal off, with one share for every corner, or with the openings unread.
