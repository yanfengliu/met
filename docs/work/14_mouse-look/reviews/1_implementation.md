# Review 1: implementation

## Target

The repairs of round 0 on branch `mouselook`: the working tree at `bf3d186` plus the patch `round1.patch` (sha256 `608b59479e04847fe73541035546e0e52e721e5a015cbf2c40b3f325dce3ca7c`, 11 files: `src/walk/walk-mode.ts`, `src/walk/walk-lock.test.ts`, `src/ui/ui.ts`, `src/ui/keyboard.ts`, `src/main.ts`, `tests/e2e/mouse-look.spec.ts`, `tests/e2e/labels.spec.ts`, `tests/e2e/doors.spec.ts`, `docs/design/spec.md`, `AGENTS.md`, `docs/learning/gate-proofs.md`). Those bytes are commit `d9b92ed`, whose parent is `bf3d186`, made from the patch after the round so that the target stays recoverable: `git diff bf3d186 d9b92ed` hashes the same as the patch. A focused re-review (fleet canon R10): the repairs add new lock and drag logic, and one of them (a drag under the lock turning by its movement) came from a probe during the repair, not from round 0.

## Reviewers and coverage

- **Codex:** codex-cli 0.163.0, `gpt-6-astra` at `xhigh`, approval `never`, sandbox `read-only`, `--ephemeral`. It read the changed sources and `menus.ts`, `main.ts` and the arbiter, click-gate and cancel-relay paths, and ran in-memory probes of the repairs. The Codex check found no failed sandbox command: kept. 212 s.
- **Claude:** Claude Code 2.1.308, `claude-opus-5-5[1m]` at `--effort max`, with the same limits as round 0, as its `system/init` event showed; its `modelUsage` held the pin alone: kept. The lane's permissions refused its attempt to run the unit tests, so it ran none. 959 s.

Both lanes ran at once and changed nothing: the worktree's status and its diff from `bf3d186` hashed the same before and after.

## Reports

### Codex (`gpt-6-astra`)

One **should-fix** finding; no blocking findings.

- **F6 closes menus deliberately opened while locked** — [src/ui/ui.ts:140](/C:/Users/38909/Documents/github/met-worktrees/mouselook/src/ui/ui.ts:140). This closes both menus on **every** locked sync. Tab → Enter opens a menu, but the next frame hides it before the user can select an item. Outside the diff, [menus.ts:19](/C:/Users/38909/Documents/github/met-worktrees/mouselook/src/ui/menus.ts:19) toggles the disclosure on activation, and [main.ts:423](/C:/Users/38909/Documents/github/met-worktrees/mouselook/src/main.ts:423) calls `ui.sync` every frame. I reproduced this for both menus using the actual handlers on an in-memory DOM stand-in. **Repair:** close existing menus only on acquisition of pointer lock, allowing subsequent intentional openings. Add a browser test that opens each menu with the keyboard while locked, waits several frames, then activates an item.

No further findings in F0–F5, F7 or F9. Focused in-memory probes passed for a drag spanning lock acquisition, off-canvas release/cancel, keyboard entry after touch, deferred relock and its cancellation, fresh exit targets, and the door subscriber clearing. The pointer-arbiter, click-gate and cancel-relay paths showed no additional regression in the reviewed sequences.

Review was read-only. No files changed or browser processes launched. Full Vitest/Playwright gates and rendered layout checks were not rerun; browser-specific behavior and F7’s layout remain bounded by the supplied tests and evidence.
### Claude (`claude-opus-5-5[1m]`)

**Verdict:** one should-fix, six notes, nothing blocking. The repairs for F0–F4, F7 and the spec half of F9 hold. `relock` asks at the right time, and the null always told on leaving doesn't mislead the doors' listener. The F6 repair goes further than its finding asked, and it breaks the F5 sentence in the same diff.

I changed no file and didn't delegate, since the diff is small. This session's permission mode refused `npx vitest run`, so I ran no tests, unit or e2e. Everything below comes from reading the working tree against `bf3d186`.

#### Findings

1. **Should-fix: `src/ui/ui.ts:140` closes the menus on every frame while the pointer is locked, not once when the lock comes.**
   - **Reason:** with the pointer locked, a keyboard user can Tab to Build or View and press Enter. The focused button keeps Enter (`src/ui/keyboard.ts:43`) and opens its panel (`src/ui/menus.ts:19`, `:30-37`). The next frame's `sync` shuts it again, so the menu shows for at most one frame. A finger's tap fares the same.
   - **What it breaks:** the F5 sentence (`docs/design/spec.md:127`: "while it is locked the walking screen's buttons answer only the keyboard (Tab and Enter) and touch"). It also does more than the F6 wording there and at `src/ui/keyboard.ts:9` ("a menu open when the pointer locks closes"). While locked, the keyboard loses its only path to the Build replay item (the one way to open the timeline while walking) and to the spawns. `bf3d186` had no such close.
   - **Repair:** in `createUi`, keep the last `walkStatus` and close the menus only when it changes to `'locked'`.
   - **Gate:** in `mouse-look.spec`'s first test, once the menu has closed, focus `view-menu-button`, press Enter, wait two frames and expect `view-menu` visible. The current line fails it.

2. **Note: nothing tests where a finger lands while the mouse is locked (`spec.md:127`, `tests/e2e/mouse-look.spec.ts:196-202`).**
   - **Reason:** the repair's own probe found that Chrome reports a finger under a mouse lock at the lock's frozen place. The F0 e2e takes its lock with a click on the view at (300, 300), so that place is on the canvas, and the test can't show where a finger's press goes. Entering by the Walk toggle's click or a spawn freezes the place over that control instead.
   - **Risk:** if Chrome hit-tests the finger where it reports it, a finger's drag never reaches the canvas listener (`walk-mode.ts:410`). A tap could press the Walk toggle and leave walk mode, and the spec's "and touch" would be false. I couldn't run a probe, so this is open either way.
   - **Repair:** in the touch test, lock with the Walk toggle's mouse click and swipe. Under the lock, tap `view-menu-button` with a CDP touch and record what it reaches. Write the result into the spec, and add to the spec file's Bound that this result comes from CDP touch in headless Chrome.

3. **Note: a finger's drag jumps if the lock ends mid-drag while walking continues (`src/walk/walk-mode.ts:424-428`).**
   - **What's right:** a drag that began before the lock came is handled correctly. Its first move under the lock takes `movementX`, which Chrome fills from the finger's travel; the gate proof shows `clientX` frozen while `movementX` moves.
   - **What's wrong:** each move under the lock sets `drag.x`/`drag.y` to the lock's place. When the lock goes, the first free move turns by the distance from that place to the finger, up to about 95° across a 1280 px view.
   - **When it happens:** only in the F2 window, with walk mode left and re-entered before the page's release is told and a finger down.
   - **Repair:** keep the locked state on `drag`. On a move where it changes, move `drag.x`/`drag.y` to the event's place without turning.
   - **Unverified outside Chrome:** a browser that keeps a finger's real place under the lock but gives touch no `movementX` would turn nothing. Choosing per move works either way: the `clientX` travel when the place moved, else `movementX`.

4. **Note: `walk-mode.ts:395` counts a held key's auto-repeats.**
   - **Reason:** someone holding W and tapping the Walk toggle with a finger can have a repeat land between the tap's `pointerdown` and its `click`. The tap then counts as a key and asks for the lock, against the spec's "a tap by a finger … asks for none".
   - **Repair:** `if (!event.repeat) this.lastInput = 'keyboard';`
   - **Ordering is right:** this listener runs in the document's capture phase, before the window listener at `keyboard.ts:50`, so F is counted before it enters walk mode.

5. **Note, from `bf3d186`, not a repair: the click gate holds back locked moves (`src/viewer/click.ts:73-78`).**
   - **Reason:** in the orbit view, a left press held on the view through F leaves the gate in its pressing state. Once the lock comes, `clientX` is frozen, so `step()` (`click.ts:38`) is 0 and every move is held and stopped. The view doesn't turn until the button comes up, and then only by the one held move (`click.ts:42`).
   - **Repair:** once `active()` is false the press can't be a click, so `pass(press)` on the next move. Check this against `click.test.ts`'s walking cases.

6. **Note: F9's wording is half done.** `walk-mode.ts:11` and `:47` still say the hint ends when the visitor walks. They should say "walks or jumps", as the spec now does, since `jump()` also ends it (`:247`).

7. **Note: `tests/e2e/labels.spec.ts:287` claims more than it checks.** Its comment says the locked card is "at the bottom left or across the narrow screen". Lines 289-294 check only the strip and the band. Add the x and width checks that `quiet` makes (`:105-106`).

#### Your specific questions

- **Do the document-level listeners hear the wrong pointers?** No.
  - Outside walking they do nothing: `exit` clears `drag` (`walk-mode.ts:226`), and the move handler returns when walk mode is off.
  - The id check keeps other pointers out.
  - Nothing stops `pointerup` or `pointercancel`. The only stop on the page is `click.ts:78`, on held moves in the capture phase; OrbitControls has none.
  - The gate's re-sent move bubbles, so walk mode still hears it once.
  - The rig's relayed cancel (`camera-rig.ts:126`) doesn't bubble, so walk mode no longer hears it. It hears the original cancel instead, and the relay only serves orbit-view presses.
  - The arbiter is unchanged and still refuses every press while walking (`camera-rig.ts:83`, `pointer-arbiter.ts:43`).
  - The only possible miss is note 2's.
- **Is the movement-under-lock rule right for a drag that began before the lock?** Yes for walk mode's own drag (note 3 covers the reverse). No for an orbit press held into walk mode (note 5, which predates the repairs).
- **Can `relock` ask at a wrong time?** I found none. It is set only after `askLock`'s early return, so only by an entry that would have asked anyway. It is cleared on leaving (`:228`) and at every lock change (`:408`), and acted on only when the page's own release is told while walking (`:407`).
- **Can the forced null mislead the doors' listener?** No. On leaving, `main.ts:125` may hear the newly found door and then null before any frame reads it, so it ends at null. The card depends on that order (`art-label.ts:106`), and the new unit test pins it. `walk-mode.test.ts:95-96` still holds.
- **Does closing menus in `sync` fight a keyboard-opened menu?** Yes, as finding 1 explains.

Also checked and holding:
- F0's capture rule and its pen-lift case.
- F3's fresh find, which uses the same eye and look that `exit` gives the orbit camera.
- F4: `main.ts:122` ignores repeats, and the e2e's later `keyboard.down` calls arrive as repeats.

`AGENTS.md` is 29,394 bytes and `main.ts` is 498 lines, both just under their limits.
## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F12 | Codex and Claude 1, should-fix: `ui.ts` closes the menus on every frame while the pointer is locked, so a menu the keyboard opens then closes at once, and the keyboard loses its only way to the Build replay item and the spawns. | Accepted. | Menus close when the pointer locks, not after. `mouse-look.spec`'s first test opens the View menu by the keyboard while locked, finds it open five frames on, and chooses its first item by Enter. |
| F13 | Claude 2, note: nothing shows where a finger lands under a mouse's lock; if it lands at the lock's place the spec's "and touch" is false. | Accepted. A probe in Chrome 156: a finger under a mouse's lock is hit-tested at its real place, so its drag reaches the canvas, but reported at the lock's place, and its tap on a button clicks nothing. | The spec says a locked pointer leaves the controls to the keyboard alone, a finger's tap clicking nothing. The touch test taps the Walk toggle under the lock and walking goes on. |
| F14 | Claude 3, note: a finger's drag jumps when the lock goes mid-drag while walking goes on (F2's window). | Accepted. | The drag picks up from the finger's place when the lock goes, turning nothing on that move. A unit test, red without it (a turn of 0.195 rad for 0.065). |
| F15 | Claude 4, note: a held key's auto-repeats count as the keyboard, so a tap with a key held would ask for the lock. | Accepted. | Repeats are not counted. A unit test, red without it. |
| F16 | Claude 5, note: the click gate holds the moves of an orbit-view press held through F, now that the lock freezes their place, until the button comes up. | Rejected for this unit: a pointer held across the change of mode is work unit 10's known limit (its F3), which this unit does not rework; the view stood still for such a press before this unit too, as walk mode follows no orbit-view press. | Reported to the coordinator with work unit 10's F3. |
| F17 | Claude 6, note: F9 half done; `walk-mode.ts` still says the hint ends when the visitor walks. | Accepted. | "walks or jumps" in the header and on `HINT_SECONDS`. |
| F18 | Claude 7, note: `labels.spec`'s locked check says "at the bottom left or across the narrow screen" but checks neither. | Accepted. | The x and width checks added; red at both sizes with the locked card planted 40 px in. |

## Verification

- On the reviewed bytes (`d9b92ed`): `npm run verify` through the gate lock, green (708 unit tests, 125 e2e; 697 s).
- On the repairs (`b6a5e0d`): the unit red proofs of F14 and F15 and the e2e red proofs of F12 and F18 (`docs/learning/gate-proofs.md`), the probe behind F13 (headless Chrome 156: a finger under a lock taken at a button lands on the canvas when it swipes there, and its tap on the button gives pointerdown and pointerup but no click), and `npm run verify` through the gate lock, green (709 unit tests, 125 e2e; 644 s).
- Neither lane ran the suites; Codex ran in-memory probes of the repairs.

## Round outcome

One should-fix finding, the same from both lanes (F12), and six notes. F12, F13, F14, F15, F17 and F18 were accepted and repaired in `b6a5e0d`; F16 was rejected for this unit and reported with work unit 10's F3. No finding remains open. Another round was not run: the repairs are small, each has its red proof, and the merged tree's gates follow.
