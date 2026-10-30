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
- The Build replay item's `aria-checked` read (work unit 11), which `acc0e0a`'s runs predate: red on a wrong state, with the replay open from load or the bar left folded (`tests/e2e/replay.spec.ts` below). No run with delayed frames covers its wait, and the `toBeVisible` wait on the Play button after it would likely hold such a run green.

### `tests/e2e/stairs.spec.ts`

- The rendered eye on a flight, never dropping climbing nor rising descending, and drawn from the walker's eye: red with the eye of `db4cc47`: drops of 6.5 to 14.4 cm climbing, rises of 5.9 to 13.3 cm descending; red with a dip added in `setWalkView`, which left `walk.eye` alone: frames drawn 3.1 cm from the eye.
- The eye at rest on the plaza, 1.6 m over the surface under it: red with the published eye 3 cm high on the plaza, which the spawn-height check it replaced passed; with the key held 0.4 s past its stop that old check read 3.15 cm out and this one stayed green.

### `src/model/hunt/routes.test.ts`

- R5 through the cross hall's doorway into gallery 600: red with the doorway walled up: stalled at the back wall, 6.06 m short.
- R7 from gallery 153 through its south wall's door: red with R7 led through gallery 153's south wall: stalled at it, 44.48 m short.

### `tests/e2e/routes.spec.ts`

Work unit 2's follow-up (reviews 23 to 27) replaced the route walks of `3860384` with one short real-key walk and fixed places set by `spawn=x,y,z,tx,ty,tz` (review 22, F66). Each proof the walks held was planted again on 2026-10-29 in the work's tree and undone, the tests named running unthrottled:

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

With the work as committed, all pass: 14 tests unthrottled in 94 s, inside `npm run verify`, and 12 at 4× in 109, 111 and 106 s in three runs in a row, its two frame budgets skipped there.

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
- The locked click now the browser's own lock, taken by a click of the view (work unit 14): with the click while locked using no door (`src/main.ts`), the entrance test red, the wait for the closing swing timing out.

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
- `barrelVault` refusing ribs that leave a coffer less than 1 mm of floor across or along, naming a rib that passes and, where the shell is too thin, a thickness enough for any rib up to it (work unit 9, answering work unit 7's F39; `docs/work/9_barrel-rib-refusal/`). A floor is its cell inset 0.8 ribs from each side, so where 1.6 ribs reach the cell's width on the inner face or its length, its sides cross: F39's vault, span 4 m, ten coffers across and ribs of 0.5 m, built at `8a6a0c2` with all 20 floor faces facing away from the axis. A floor short of crossing can still be lost, since `MeshBuilder.polygon` leaves out a face under 5e-13 m² and Float32 positions can close one under a micrometre, so 1 mm is asked (work unit 9's F0).
  - The gate, two tests. The first reads the floors' width or length off the built faces of two vaults that build, ribs 0.05 and 0.1 m, on semicircles of 2 m radius whose floors close across (ten cells, 0.6283 m wide on the inner face) or along (ten cells, 0.3 m long), and on a segmental vault of rise 1 m, 2.5 m in radius about an axis 1.5 m below its springing. It finds the rib at which that line gives 1 mm of floor: 0.3920737, 0.1868750 and 0.2891548 m. With a rib 0.1 mm short of it every floor must build facing the axis, 1 to 1.2 mm across or along; 0.1 mm past it the vault must be refused, naming a rib whose floors build so. The second pins, as worked by hand, the rib and thickness named for three shells that some rib up to the one named would leave too thin: 0.1868 and 0.0594 m, 0.1957 and 0.0564 m, and 1.874 and 0.06 m. It builds every rib up to each, 5 mm apart, in the shell named. It holds the rib refusal before the thickness refusal, N8's whole message, Codex's floor 1.6e-14 m long, a defaulted rib, cells under 1 mm one way or both, a need and a room of 2097152 m for the rounding's arithmetic only, and a rise whose radius overflows, with coffers and without.
  - Bounds. The fixtures stand 0.1 mm of rib either side of the least floor, so `<` and `≤` are not told apart there; the sweep reads ribs 5 mm apart, and review 1's F9 argument covers those between. Review 3 left four bounds unrepaired, far from any vault the model builds (F24 to F27). The radius check lets a radius of 0 through, as for a span and rise of 5e-324 m. It calls an overflow on the way to a radius that is a number, at spans over about 1.34e154 m, a radius too large. It stops float64 overflow, not positions past Float32's 3.4e38 m. The depth named can be refused again at radii over about 1e5 m, where numbers lie farther apart than its margin. Fewer coffers can be offered where even the least count leaves the cells 1 mm or less.
  - Red (2026-10-29), each mutation made on the work's `dome.ts` after review 2's repairs and undone, the file restored byte for byte. Both tests go red with the refusal deleted ("width, rise 2: expected '' to match /^barrelVault: coffers\.rib …/"); with floors allowed down to none (`FLOOR_LEAST` 0), F39's own bound; at 1.5 ribs, Codex's sliver building; at 1.7 ribs, the named 0.1868 m refused in turn; with the cell's chord for its width ("at most 0.3904 m"); with half the span for the radius in the cell's width (0.3709 m for 0.4636 m); and with only `buildVault`'s floors inset 1.7 half-ribs, all 40 floor faces of a named vault facing away, the thickness test reading 424 lines through pockets. One test goes red with π for the arc in the cell's width, the segmental vault 0.1 mm past building; with the radius left unchecked, the overflowing vault refused for its thickness; with no thickness named with the rib; with the shell read at the rib named alone, review 0's repair, the third shell told "at most 1.874 m." alone; with the thickness's rounding unstepped ("2097152.0000"); with the depth's unstepped, its own depth named; with fewer coffers along offered at one, and across at two; with the two sides joined by " and "; and with the shell read before the rib ("barrelVault: thickness first"). With the work's `dome.ts` the file's 10 tests pass.

### `tests/e2e/replay.spec.ts`

The build replay (work unit 11, 2026-10-29), with its checks in `controls`, `layout`, `menus`, `walk-screen`, `walk-build`, `labels` and `camera`: each mutation made on the work after review 0's repairs and undone (`tmp/red-proofs.sh`, ignored), each run over the tests named, at both sizes where they run at both.

- The old default put back, the replay open from load (`let replay = start.replay || true`): 24 of 28 tests red. `controls`' first load and autoplay tests, `layout`'s default page and Build menu tests, `menus`' Build menu test, all four `replay.spec` tests, both `walk-screen` tests, `walk-build`'s first test and `labels`' walking test fail at the first check that reads the closed replay ("the build replay at load", or the Build replay item checked before it is chosen). Green, as they should be: `layout`'s two tests of the replay that `t=` opens, which open it under either default, the build budget and the follow camera during autoplay.
- Closing the replay leaves t where it was: 3 of 3 red, `replay.spec`'s first test at both sizes ("replay, t and mode once closed while playing") and `walk-build`'s first.
- Nothing fitted again when the view changes shape: 3 of 5 red, `replay.spec`'s preset and floor tests at 390×844 and `camera.spec`'s resize test (corners at 2.41 of the view). At 1280×720 the preset's and the floor's fits are limited by the view's height, so they stand where they stood, and those two tests stay green.
- A timeline key or a chapter that does not open the replay: 3 of 3 red, `replay.spec`'s key test at both sizes and `menus`' Build menu test ("the replay after choosing koch-plaza-2014").
- Opening the replay while walking leaves the bar folded: 2 of 2 red, `walk-screen`'s test with the replay closed at both sizes (the Play button never shows).
- The follow-camera toggle shown with the replay closed: 4 of 6 red, `layout`'s and `replay.spec`'s default-page tests at both sizes. The key tests, which do not read the toggle, stay green.
- The default page framed above a bar it does not show: 2 of 2 red ("the default page frames the whole canvas": aspect 1.92 for 1.78 at 1280×720).
- The close button keeping keyboard focus as the bar hides it (review 0, F0): 2 of 2 red ("focus after the close button, by the keyboard").

### `src/viewer/query.test.ts` and `src/ui/timeline-bar.test.ts`

- The `replay=0` warning naming only the parameter that set the position, round 1's defect of work unit 11: the warning test red, at `?replay=0&step=2&t=1`.
- The bar's shape ignoring a closed replay: `timeline-bar.test.ts`'s first test red ("walking false, unfolded false: expected 'whole' to be 'strip'").

### `tests/e2e/mouse-look.spec.ts` and `src/walk/walk-lock.test.ts`

Mouse-look and Esc (work unit 14, 2026-10-29): each mutation made on the work and undone, the file restored byte for byte (`mutate.py` in the session's scratchpad, not kept).

- Entering no longer asks for the lock (`askLock` left out of `enter`): `walk-lock.test.ts`'s first test red ("entered in a gesture, the last press a mouse's (none yet: the keyboard): expected +0 to be 1"); `mouse-look.spec`'s first and third tests red, the waits for the lock after the Walk toggle (line 81) and after F (line 124) timing out.
- The lock asked for after a finger's or a pen's press (`lastPress` unread): the first unit test red ("entered after a touch press: expected 2 to be 1"); the touch test red ("requests for the lock after a tap": 1).
- The lock asked for with no gesture (the activation flag unread): the first unit test red ("entered with no gesture, as at load with walk=1: expected 2 to be 1").
- Esc no longer read while walking (the old keyboard): `mouse-look.spec`'s first and third tests red, the wait for the orbit view after Esc timing out with the pointer locked (lines 94 and 126; headless Chrome hands Esc to the page and keeps the lock).
- The lock lost while walking leaving nothing (the old `pointerlockchange` handler's exit gone): the third unit test red ("walk mode after the lock was lost: expected true to be false"); `mouse-look.spec`'s third test red after `document.exitPointerLock()` (line 139), its first test green.
- The page's own release taken for a loss (`releasing` unread): the fourth unit test red ("entered again before the browser told the release: still walking: expected false to be true").
- A lock that comes once walk mode was left kept: the fourth unit test red ("a late lock freed: expected +0 to be 1").
- The old drag rule, no drag while the pointer is locked: the second unit test red, a finger's 60 px drag taken as the locked mouse's 999 px movement ("expected -1.2987 to be close to -0.078").
- The old hint rules, a look and the lock ending the hint: the fifth unit test red ("the hint once walking, the pointer locked: expected false to be true").
- An open menu not taking Esc (`menus.ts` without its `preventDefault`): `mouse-look.spec`'s third test red ("the menu closed, still walking": "orbit").
- A free move with no button held turning the view (planted): `mouse-look.spec`'s second test red ("a free move with no button held").
- Review 0's repairs (work unit 14), each made on the repaired work and undone:
  - A finger's press under the mouse's lock asking for pointer capture (F0): `walk-lock.test.ts`'s second test red ("captures asked for under the lock…: expected 1 to be +0"); the touch test red in Chrome itself ("uncaught exception: Failed to execute 'setPointerCapture' on 'Element': InvalidStateError").
  - A drag under the lock turned by its clientX travel, which Chrome freezes at the lock's place for every pointer: the second unit test red ("a finger dragged 60 px…: expected +0 to be close to -0.078"); the touch test red ("a finger dragged 80 px to the right with the mouse locked": 0).
  - A drag's end heard on the canvas alone: the second unit test red ("the next pen drag, 20 px: expected +0").
  - A key not counted as the entering input (F1): the first unit test red ("entered by a key after a finger's press: expected 2 to be 3").
  - No lock asked again when walk mode is entered before the page's own release is told (F2): the fourth unit test red ("and the lock asked for again (F2): expected 1 to be 2").
  - Leaving with the last frame's target, no fresh find, or the fresh find with no null told after it (F3): the fifth unit test red either way ("turned to nothing, then left: no card kept (F3): expected '11013' to be null").
  - A held Esc's repeats dismissing the card (F4): `labels.spec`'s locked test red at both sizes ("the card kept in the orbit view": null).
  - A menu left open when F locks the pointer (F6): `mouse-look.spec`'s first test red ("the menu once the pointer locks": visible).
  - The locked card's place (F7), with a 400 px tall hint planted: `labels.spec`'s locked test red at 390×844 ("art-card clips its content"); at 1280×720, where the card grows instead of scrolling and stays clear, green.

### `tests/e2e/labels.spec.ts` and `src/viewer/art-label.test.ts`

- The card left behind on leaving walk mode, the old `frame` (work unit 14): `art-label.test.ts`'s keep test red ("left looking at it: the orbit view keeps its card: expected null to be '11013'"); `labels.spec`'s locked test red at both sizes ("the card kept in the orbit view": null).
- A preset's dismissal not dropping the card leaving would keep: the keep test red ("a preset chosen while walking: none: expected '11013' to be null").
