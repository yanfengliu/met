# In first person the camera follows the mouse, and Esc leaves

Status: complete
Owner: mouselook, a worker of the met coordinator
Created: 2026-10-29
Updated: 2026-10-29

## Problem and outcome

The owner, 2026-10-28: "in first person the camera moves as the mouse moves. Pressing ESC cancels first person mode." Walk mode turned the view only by a drag, or by the mouse after a click of the view had locked the pointer, and Esc freed the pointer but stayed in walk mode.

Outcome: while walking with a mouse, plain mouse movement turns the view, no button held, at the drag's rate (`LOOK_PER_PIXEL`) and the drag's way. Esc leaves walk mode to the orbit view at the eye, as F does, whether the browser drops pointer lock on Esc or Esc reaches the page.

## Scope

Included: walk mode's pointer lock (`src/walk/walk-mode.ts`), Esc in walk mode (`src/ui/keyboard.ts`, `src/ui/menus.ts`), the status line and the card's hint (`src/ui/ui.ts`, `src/ui/art-card.ts`), the card across leaving walk mode (`src/viewer/art-label.ts`), the locked click's pointer type (`src/main.ts`), the specs that drag or click while walking, the spec's walk, keyboard and labels sections, AGENTS.md's gate lines.

Kept: touch and pen drag-to-look with no lock; the click while locked on a door; the door prompt and the cards; Esc hiding a clicked card in the orbit view; the timeline keys; the walking screen's controls at 1280×720 and 390×844; the replay's rules for walk mode (work unit 11); the arbiter's refusal of every press while walking (work unit 10).

Excluded: the walker's physics (`src/walk/walker.ts`, work unit 13's); work unit 10's F3 (a pointer held across a mode change), as the mode change itself is not reworked; the optional move of `doors.spec` and `door-look.spec` onto `spawn=` places, as their approaches were not rewritten; the older bug of F folding the bar under a focused bar control.

## Approach

Entering walk mode in a user's gesture by a mouse or the keyboard (F, a click of the Walk toggle or a spawn) asks for pointer lock; the User Activation API says whether there is a gesture, and the last press on the page whether it was a finger's or a pen's, which ask for none. Without a gesture (`walk=1` at load) the pointer stays free and a click of the view asks, as before. The locked mouse turns the view by its movement; a finger or a pen still drags while the mouse is locked.

Esc while walking leaves as F does (`toggleWalk`). A desktop Chrome frees the lock on Esc without handing the key to the page, so losing the lock while walking leaves walk mode too; the page's own release on leaving is marked so that its `pointerlockchange` leaves nothing, and a lock that arrives after walk mode was left is freed. An open menu takes Esc first (`preventDefault`), so the next one leaves.

A locked pointer reaches no control, and the card's link was reached by Esc freeing the pointer (M3b). So leaving walk mode keeps the look target's card as the orbit view's card, the one a click on the artwork shows: Esc, then a click on the link, the same two actions. A preset's dismissal drops it. The hint says "Press Esc, then click the link."

The status line's hint no longer ends on a look, since the locked mouse's first twitch would end it; it ends at the first step or after 6 s.

Tests: headless Chrome grants pointer lock to a request in a gesture, so entering by F, the toggle or a spawn locks the pointer there. Tests whose purpose needs a free pointer while walking (clicking the bar or the menus, dragging to turn) run with the lock refused by `noPointerLock` (tests/e2e/helpers.ts), as a browser without it does, or enter at load. The locked path has its own tests: `tests/e2e/mouse-look.spec.ts`, `src/walk/walk-lock.test.ts`, a locked-card test in `labels.spec`, and `doors.spec`'s locked clicks on the real lock.

## Acceptance criteria

- Entered by the Walk toggle, F or a view-menu spawn, the pointer locks and plain mouse movement turns the view LOOK_PER_PIXEL a pixel, right for right and down for down (`mouse-look.spec`, `walk-lock.test.ts`).
- Esc leaves walk mode to the orbit view at the eye, locked or free; the lock lost while walking leaves; an open menu takes Esc first (`mouse-look.spec`, `walk-lock.test.ts`).
- Touch: a tap entry asks for no lock and a finger's drag turns the view (`mouse-look.spec`).
- The locked click on a door, the prompt, the cards, Esc on a clicked card, the timeline keys, the walking screen and the replay's walk rules keep working (`doors.spec`, `labels.spec`, `walk-screen.spec`, `replay.spec`, `walk.spec`, `routes.spec`).
- Each new check red with the old behaviour put back (docs/learning/gate-proofs.md).
- `npm run verify` green and the Load rule's three runs at 4× CPU throttle green, through the gate lock.
- One review round with both lanes; blocking and should-fix findings fixed.

## Implementation steps

- [x] Walk mode's lock on entry, lock loss and late lock; Esc in walk mode; the menus taking Esc; the hint; the kept card.
- [x] Unit tests (`walk-lock.test.ts`, `art-label.test.ts`) and e2e (`mouse-look.spec.ts`, the specs that drag or click while walking).
- [x] Red proofs; spec, AGENTS.md, gate-proofs and devlog.
- [x] Review round 0 (both lanes), its repairs (`d9b92ed`), the focused round 1 (both lanes), its repairs (`b6a5e0d`); verify and the 4× runs on the merged tree; landed.

## Outcome

Landed on origin's main at `050d793`, the merge of origin/main `a44b3f7` (work unit 13's walker footing and the canon sync) into `mouselook`: `bf3d186` (the change), `d9b92ed` (review 0's repairs), `b6a5e0d` (review 1's repairs).

- Mouse-look: entering by F, the Walk toggle or a view-menu spawn asks for pointer lock; the locked mouse turns the view with no button held, `LOOK_PER_PIXEL` a pixel the drag's way. Entered at load (`walk=1`) the pointer stays free until a click. A finger or a pen drags to look, even under a mouse's lock (by its movement, as Chrome reports a locked page's pointers), and a tap that enters asks for no lock.
- Esc leaves walk mode to the orbit view at the eye, locked or free; losing the lock while walking leaves too; with the pointer free an open menu takes Esc first, and a menu open when the pointer locks closes.
- Leaving keeps the card of the artwork in view in the orbit view ("Press Esc, then click the link."), even through a held Esc's repeats.
- Checks: `npm run verify` on the merged tree through the gate lock, green (80 test files, 718 unit tests, typecheck, lint, build, 125 e2e; 637 s); the Load rule's three runs at 4× CPU throttle in a row on it, green (`routes.spec` and `walk.spec`: 21 passed and 2 skipped each, 132, 131 and 132 s). Each new check was red with the old behaviour put back or a fault planted (`docs/learning/gate-proofs.md`).
- Review: [round 0](reviews/0_implementation.md) (Codex and Claude) and the focused [round 1](reviews/1_implementation.md) (Codex and Claude); every blocking and should-fix finding repaired, none open.
- Limits: with the pointer locked the walking screen's controls answer only the keyboard; a finger's tap under a mouse's lock clicks nothing (Chrome 156), and the mouse reaches them only while the pointer is free, so the build replay's bar is driven while walking only so. The design question (accept, hide those controls while locked, or add a key that frees the cursor) is the owner's. Losing the lock for any reason (Alt+Tab, DevTools) leaves walk mode. Not changed: a drag under CLICK_SLOP turns the view as it moves (F8, pre-existing); an orbit-view press held through F has its moves held by the click gate (F16, with work unit 10's F3); the older bug of F folding the bar under a focused bar control; the optional move of `doors.spec` and `door-look.spec` onto `spawn=` places.
