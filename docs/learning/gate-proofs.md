# Gate proofs

The record that each gate which retired a lesson of [lessons.md](lessons.md) was made to go red by reintroducing the defect it claims to prevent. Each such entry names the gate, the mutation, the failure it produced, and the last commit before the lesson's deletion, from which `git show <sha>:docs/learning/lessons-evidence.md` reads the lesson's evidence back. Since 2026-10-29 the file also holds the red proofs of gates whose AGENTS.md line is kept to one short line, by the coordinator's direction of that day; those entries name the gate, the mutations and the failures, and retire no lesson.

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

## The walking screen is read after the frame that applies it

**Gate:** `tests/e2e/walk-screen.spec.ts` reads each state of the walking screen once the page's next frame has applied it, which the Timeline button's `aria-expanded` and the Walk toggle's `aria-pressed` report (and, since work unit 11, the Build replay item's `aria-checked`).

**Proved red (at `acc0e0a`; moved here from AGENTS.md by work unit 11):** with the page's animation frames held 60 ms by a timer, the fold read failed in 5 of 6 runs and the leave read in 1. With the waits, it was still red when the bar never folded again or the orbit view's bar stayed folded. These runs predate the Build replay item. Its `aria-checked` read goes red on a wrong state (work unit 11's entry below: the item checked before it is chosen, or the bar never showing), but no run with delayed frames covers its wait, and the `toBeVisible` wait on the Play button after it would likely hold such a run green.

## The timeline shows only in the build replay

**Gate:** `tests/e2e/replay.spec.ts` (work unit 11), with the replay's checks in `controls`, `layout`, `menus`, `walk-screen`, `walk-build`, `labels` and `camera`, and the unit tests `src/viewer/query.test.ts` (the replay at load and the `replay=0` warning) and `src/ui/timeline-bar.test.ts` (the bar's shape). It covers the default page with no timeline, the Build menu's Build replay item, the bar's close button, the timeline keys, the queries that open the replay, and the framing either way.

**Proved red (2026-10-29):** each mutation was made on the work after review 0's repairs and undone (`tmp/red-proofs.sh`, ignored). Each run took the tests named, at both sizes where they run at both.

- The old default put back, the replay open from load (`let replay = start.replay || true`): 24 of 28 tests red. `controls`' first load and autoplay tests, `layout`'s default page and Build menu tests, `menus`' Build menu test, all four `replay.spec` tests, both `walk-screen` tests, `walk-build`'s first test and `labels`' walking test all fail at the first check that reads the closed replay ("the build replay at load", or the Build replay item checked before it is chosen). Green, as they should be: `layout`'s two tests of the replay that `t=` opens, which open it under either default, the build budget and the follow camera during autoplay.
- Closing the replay leaves t where it was: 3 of 3 red, `replay.spec`'s first test at both sizes ("replay, t and mode once closed while playing") and `walk-build`'s first.
- Nothing fitted again when the view changes shape: 3 of 5 red, `replay.spec`'s preset and floor tests at 390×844 and `camera.spec`'s resize test (corners at 2.41 of the view). At 1280×720 the preset's and the floor's fits are limited by the view's height, so they stand where they stood, and those two tests stay green.
- A timeline key or a chapter that does not open the replay: 3 of 3 red, `replay.spec`'s key test at both sizes and `menus`' Build menu test ("the replay after choosing koch-plaza-2014").
- Opening the replay while walking leaves the bar folded: 2 of 2 red, `walk-screen`'s test with the replay closed at both sizes (the Play button never shows).
- The follow-camera toggle shown with the replay closed: 4 of 6 red, `layout`'s and `replay.spec`'s default-page tests at both sizes. The key tests, which do not read the toggle, stay green.
- The default page framed above a bar it does not show: 2 of 2 red ("the default page frames the whole canvas": aspect 1.92 for 1.78 at 1280×720).
- The close button keeping keyboard focus as the bar hides it (review 0, F0): 2 of 2 red ("focus after the close button, by the keyboard").
- The `replay=0` warning naming only the parameter that set the position, round 1's defect: `query.test.ts`'s warning test red, at `?replay=0&step=2&t=1`.
- The bar's shape ignoring a closed replay: `timeline-bar.test.ts`'s first test red ("walking false, unfolded false: expected 'whole' to be 'strip'").

With the work as committed, every one of these tests passes.
