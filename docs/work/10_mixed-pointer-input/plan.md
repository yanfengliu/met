# Mixed mouse and touch input never crashes the orbit view

Status: complete
Owner: orbit, a worker of the met coordinator
Created: 2026-10-29
Updated: 2026-10-29

## Problem and outcome

Work unit 2's review 11 (F39, `docs/work/2_doors-and-collection/reviews/11_implementation.md`) reproduced a crash on the real camera rig: a mouse down and then a finger down threw `Cannot read properties of undefined (reading 'x')` inside three's OrbitControls (r186, `OrbitControls.js:1323`), and so did a finger down, a mouse down and the finger up (`:1639`), with the orbit view's click gate and without it. The owner gave the go on 2026-10-29. Outcome: mixed pointer input is arbitrated in met's code before OrbitControls and the zoom's input hear it, so no mix of mouse, pen and touch throws or moves the camera by a pointer that does not hold it, and every pointer passed on keeps its whole life, each press with its release or cancel.

Cause: OrbitControls keeps a finger's position (`_pointerPositions`, for its two-finger pan) but not a mouse's or a pen's, and takes every pointer it hears for one of its own. With a mouse and a finger in its list, the finger's press, or the finger's release leaving the mouse alone in it, reads the mouse's missing position. The same holds for any two pointers of which one is a mouse or pen. While a pointer is down it also hears every pointer's moves and releases on the document, pressed on the canvas or not, so a pen's hover turned the view and a finger lifted elsewhere on the page threw.

## Scope

Included: the arbitration (`src/viewer/pointer-arbiter.ts`) and its wiring in the rig (`src/viewer/camera-rig.ts`) and the zoom's input (`src/viewer/zoom.ts`); the click gate's release while walking (`src/viewer/click.ts`), which the extended random sequences found; tests on the real rig for both orders of F39 and the rest of the class, the arbiter on its own, the seeded random sequences mixed (`src/viewer/click-random.test.ts`), and a Playwright check through the browser's own input; the spec's Camera and Labels sections and the Gates text in AGENTS.md.

Excluded: walk mode's own input (`src/walk/walk-mode.ts`), which another session changes for mouse-look and Esc; three.js itself (node_modules is never patched); the wheel, which is no pointer.

## Approach

One kind of pointer holds the camera at a time: the fingers on the screen, any number, or one mouse or pen; the wheel is no pointer. A press on the canvas in the orbit view is passed on when nothing holds the camera, or when it is a finger and fingers hold it; every other press is refused, a pointer of another type, a second pen, and every press while walking. Each consumer, OrbitControls and the zoom's input, hears a passed pointer from its press to its end wherever its events land, and nothing of any other pointer, a refused one, one pressed elsewhere, or a hover. A passed pointer keeps its life through a change of mode, and a refused one stays refused to its end, even once the camera is free. The camera is free once every consumer has heard each holder's end, so no consumer ever holds two kinds of pointer, even one that missed an end.

Mechanism: `PointerArbiter.consumer()` gives each consumer a filter its pointer listeners go through, with that consumer's own open pointers; a press is decided once, by the first consumer that hears it, so the listeners' order does not matter. The zoom's listeners go through its filter as `bindZoomInput` adds them. OrbitControls is built without an element, its three bound pointer listeners (`_onPointerDown`, `_onPointerMove`, `_onPointerUp`, which `connect` and its first press add, each read from the instance as it is added) are put through the filter, and then it connects to the canvas. These are private by convention, so the rig throws, naming what it found and what to change, where the controls are already connected or a release of three.js has none of them, rather than leave the controls hearing every pointer; the random sequences and the rig's table would turn red if a release kept the names but stopped using them.

Tradeoffs: a pointer whose end a consumer never hears holds the camera until the same pointer presses again, as a mouse does; a finger's or a pen's id may never come back, as with Chrome's touches, so a lost end of one would hold it until the page reloads (review 0, F1). Pointer Events 3 gives every press an end, and on this page every end reaches the document, a cancel landing off the canvas being relayed to the controls (review 11, F37). A pointer that holds the camera from before walk mode and is still down when the orbit view comes back turns or pans the view at its next move by all it travelled meanwhile, since the controls follow no move while disabled; this predates the work, and the spec names it as a known limit (review 0, F3). Rejected: stopping refused events in the document's capture phase, which would also hide them from the timeline bar's and the menus' listeners on the window; a proxy element for OrbitControls, more surface than three bound listeners.

The click gate holds a sub-slop press's moves and dropped them at its release; released while walking, the press was no click, yet its held move was dropped all the same, so the consumers heard the release without the latest move (harmless while walking, since neither acts then, but a broken stream). It now sends the held move on there, as for any press that is no click.

Why the random sequences missed F39: they were written around it. When review 11 deferred F39, the generator was built so that nothing pressed while a mouse or pen was down, no finger ended while one was, and no middle button pressed while a finger was down (its Bound said so), so that the rest of the class could be checked without the known crash. The throw check was there all along: with only those three rules lifted, 284 of its 400 seeds threw at `8a6a0c2`. It also never pressed on another element, never hovered and never changed mode, so the finger lifted elsewhere, the pen's hover and the walk-mode cases were out of its reach.

## Acceptance criteria

- [x] No mix of mouse, pen and touch throws on the real rig or moves the camera by a pointer that does not hold it, with the click gate and without: `src/viewer/mixed-pointers.test.ts`, red at `8a6a0c2` (eight of ten rows threw, the pen's hover left the camera 6.07 m off, the pinch a mouse joined ended 6 cm off).
- [x] The arbiter's rules on their own, each consumer hearing a passed pointer's whole life and nothing else: `src/viewer/pointer-arbiter.test.ts`, its freeing rule red with the camera freed at the first end heard.
- [x] The seeded random sequences mix pointer types, press elsewhere, hover and change mode, with the click and without, and no listener throws: `src/viewer/click-random.test.ts`, red at `8a6a0c2` (every run; with the test's controls mock adapted to that rig, 237 of 400 seeds threw).
- [x] A release while walking sends its held move on: `src/viewer/click.test.ts`, red at `8a6a0c2`.
- [x] Through the browser's own mouse and touch, both orders of F39 log no uncaught exception and turn the view as the holder alone does: `tests/e2e/mixed-pointers.spec.ts`, red at `8a6a0c2` (three uncaught exceptions).
- [x] The behaviour recorded in `docs/design/spec.md` (Page: Camera; Collection: Labels), the Gates text in AGENTS.md (a clause and two short lines, as the coordinator asked while review 0 ran), and the red proofs in `docs/learning/gate-proofs.md`.
- [x] `npm run verify` green through the gate lock; independent review in both lanes, its blocking and should-fix findings fixed; landed through the slot.

## Implementation steps

- [x] Reproduced both orders and five more of the class on the real rig (a mouse and a pen, two pens, a middle press during a finger's turn, a finger lifted elsewhere during a mouse drag, a walk-mode finger lifted after a mouse press; a pen's hover turned the view).
- [x] The arbiter, the rig's and the zoom's wiring, the gate's release while walking.
- [x] The tests, each proved red against `8a6a0c2`'s files; the random sequences measured against review 11's gate, zoom and rig.
- [x] The spec and the Gates text.
- [x] `npm run verify` through the gate lock on `7c59f42`'s code (887 s) and on review 1's target (13.5 minutes of e2e); committed as `7c59f42` and `02db823`.
- [x] Review 0, both lanes (`reviews/0_implementation.md`): F0 to F10, one should-fix, all accepted and repaired. Review 1, both lanes (`reviews/1_implementation.md`): F11 to F16, nits, all repaired in wording.
- [x] Landed through the slot, after work unit 12 at the coordinator's word: origin/main merged in (five conflicts, each fitted to work unit 12's shape), the merge verified through the gate lock and pushed as `6426f08`; Pages run 40962143355 passed. A verify of `02db823` was stopped in its e2e to free the lock, its tree replaced by the merge.
- [x] The records landed after unit 9's.

## Outcome

Complete. Landed on origin/main as `6426f08`, the merge of `02db823` with work unit 12's `05bdfee`: the code in `7c59f42`, the review repairs in `02db823`. Mixed mouse, pen and touch input no longer crashes the orbit view: one kind of pointer holds the camera at a time (`src/viewer/pointer-arbiter.ts`), OrbitControls and the zoom each hear only its pointers from press to end, and the camera is free once both have heard each holder's end. The click gate sends a press's held move on when it is released while walking.

Verified: `npm run verify` through the gate lock with `MET_PORT=5362` on `7c59f42`'s code (684 unit tests in 77 files, typecheck, lint, build, 85 e2e; 887 s), on review 1's target (685 unit tests, 85 e2e in 13.5 minutes) and on the merge `6426f08` (687 unit tests, 85 e2e in 13.1 minutes; 1,830 s with the queue). Pages run 40962143355 passed its build and deploy. Each new gate was proved red against `8a6a0c2`, as `docs/learning/gate-proofs.md` records under each test's name. Reviews 0 and 1 (`reviews/0_implementation.md`, `reviews/1_implementation.md`), both lanes each time: one should-fix (F0) and fifteen nits (F1 to F16), all accepted and repaired; F3, which predates the work, is documented as a known limit, and F1's suggested self-healing was declined. No render changed, so the owner's gallery needed no refresh.

Limitations: a pointer whose end a consumer never hears holds the camera until the same pointer presses again, and a lost end of a finger or a pen may hold it until the page reloads (no path on this page loses one). A pointer held across a change of mode turns or pans the view at its next orbit-view move by all it travelled while walking (as before; the spec names it). The wheel is not arbitrated. The rig depends on three private-by-convention listener fields of three's OrbitControls (r186), guarded by a throw and by the tests. The coordinator changed where gate text goes twice while the unit ran; AGENTS.md now carries two lines for it, in work unit 12's shape.
