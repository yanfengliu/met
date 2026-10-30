# Review 0: implementation

## Target

The met repository's branch `mouselook`: commit `bf3d186`, the diff `7f724e9..bf3d186` (24 files: walk mode's pointer lock and Esc in `src/walk/walk-mode.ts`, `src/ui/keyboard.ts`, `src/ui/menus.ts`, `src/ui/ui.ts`, `src/ui/art-card.ts`, `src/viewer/art-label.ts` and `src/main.ts`; the unit tests `src/walk/walk-lock.test.ts`, `src/viewer/art-label.test.ts` and `src/ui/art-card.test.ts`; the e2e specs `mouse-look`, `walk`, `walk-screen`, `labels`, `doors`, `door-look`, `camera` and `routes` with `helpers.ts` and `labels-helpers.ts`; `docs/design/spec.md`, `AGENTS.md`, `docs/learning/gate-proofs.md` and a devlog line). Both lanes read the prompt with the diff appended (`tmp/review-runs/met-14-mouse-look-r0/prompt.md` in the fleet checkout, ignored).

## Reviewers and coverage

- **Codex:** codex-cli 0.163.0, `gpt-6-astra` at `xhigh`, approval `never`, sandbox `read-only`, `--ephemeral`, the prompt on stdin and the worktree as its working directory. It read AGENTS.md, the local rules and lessons, the configs, the changed sources and tests and `camera-rig.ts`, `pointer-arbiter.ts` and `click.ts` outside the diff, ran the typecheck and probes in memory, and reported that its delegation failed to start. The Codex check found no failed sandbox command: kept. 416 s.
- **Claude:** Claude Code 2.1.308, `claude-opus-5-5[1m]` at `--effort max`, tools Read, Glob, Grep, Task and Bash limited to `git diff`, `git log` and `git show`, permission mode `dontAsk`, no settings sources and no MCP servers, as its `system/init` event showed; its `modelUsage` held the pin alone and its log one `result`: kept. It read 20 files and ran read-only shell reads; its one attempt to run the unit tests was refused by the lane's permissions, so it ran nothing. 1134 s.

Both lanes ran at once against the same commit and changed nothing: the worktree's `git status --porcelain` and `git diff HEAD` were empty before and after.

## Reports

### Codex (`gpt-6-astra`)

Reviewed `bf3d186` against `7f724e9`. **Four should-fix findings:**

1. **Should-fix — touch/pen while locked throws.** [walk-mode.ts:389](C:/Users/38909/Documents/github/met-worktrees/mouselook/src/walk/walk-mode.ts:389) now admits touch and pen presses, then unconditionally calls `setPointerCapture`. That call must throw `InvalidStateError` while the document holds pointer lock. ([Pointer Events specification](https://www.w3.org/TR/pointerevents3/#setting-pointer-capture)) The test hides this with its [no-op capture method](C:/Users/38909/Documents/github/met-worktrees/mouselook/src/walk/walk-lock.test.ts:30). **Repair:** avoid capture while locked and follow the admitted pointer’s moves/end on the document, preserving event propagation. Test touch and pen against real pointer lock and require no page errors.

2. **Should-fix — touching the page disables subsequent keyboard lock requests.** At [walk-mode.ts:426](C:/Users/38909/Documents/github/met-worktrees/mouselook/src/walk/walk-mode.ts:426), `lastPress` remains touch/pen until another mouse press. Consequently, touching anywhere, then pressing F, enters walk mode without requesting lock—even with active user activation. The in-memory probe recorded zero requests. **Repair:** distinguish the current entry gesture from historical pointer input; keyboard entry should qualify independently. Add touch→F and pen→F cases.

3. **Should-fix — rapid F exit/re-entry silently loses mouse-look.** The same [guard at walk-mode.ts:426](C:/Users/38909/Documents/github/met-worktrees/mouselook/src/walk/walk-mode.ts:426) sees the old lock during its pending release and skips requesting the new entry’s lock. The release subsequently leaves walking active but unlocked. My probe recorded only the original request; the [existing test explicitly accepts that unlocked outcome](C:/Users/38909/Documents/github/met-worktrees/mouselook/src/walk/walk-lock.test.ts:170). **Repair:** retain the new entry’s lock intent and request it after the page-owned release, subject to activation and the entry still being current. Assert a renewed request, while retaining the late-lock cleanup checks.

4. **Should-fix — leaving can retain a stale artwork card.** [art-label.ts:106](C:/Users/38909/Documents/github/met-worktrees/mouselook/src/viewer/art-label.ts:106) retains the last frame’s target, whereas [walk-mode.ts:223](C:/Users/38909/Documents/github/met-worktrees/mouselook/src/walk/walk-mode.ts:223) exits using the walker’s current look. A locked mouse move followed by Esc before the next frame therefore changes the orbit view but keeps the old card. With the real picker on a fixture, a 160 px move made the current target null, yet Esc retained artwork `11013`. **Repair:** explicitly supply the freshly sampled exit target, including null, as the retention candidate. Test movement and exit between frames.

Additional notes:

- **Note — menu-first Esc is only established while unlocked.** [menus.ts:225](C:/Users/38909/Documents/github/met-worktrees/mouselook/src/ui/menus.ts:225) cannot consume an Esc the browser never delivers. Open View, then press F: the menu remains open while lock is requested. Browser-driven unlock exits walking without closing that menu. The [test uses only `walk=1` with a free pointer](C:/Users/38909/Documents/github/met-worktrees/mouselook/tests/e2e/mouse-look.spec.ts:141). Close menus when entering locked walking, or explicitly limit the documented priority rule to free-pointer operation.

- **Note — two claimed input bounds are not proved.** [mouse-look.spec.ts:42](C:/Users/38909/Documents/github/met-worktrees/mouselook/tests/e2e/mouse-look.spec.ts:42) waits two animation frames, so it does not establish completion by the *next* frame. Separately, the supplied “under CLICK_SLOP turns nothing” constraint already fails in the base: [walk-mode.ts:406](C:/Users/38909/Documents/github/met-worktrees/mouselook/src/walk/walk-mode.ts:406) turns immediately; my 2 px click changed yaw by −0.0026 radians. Add first-frame assertions and a below-slop yaw assertion; meeting the latter requires buffering motion until the threshold is crossed.

The two design choices are sound: leaving on lock loss accommodates browser-owned Esc, and retaining the correct artwork card preserves access to its link. `noPointerLock` is appropriate for testing free-pointer controls, but does not cover the mixed locked-input and locked-menu cases above.

Outside the diff, I inspected [camera-rig.ts:83](C:/Users/38909/Documents/github/met-worktrees/mouselook/src/viewer/camera-rig.ts:83), [pointer-arbiter.ts:63](C:/Users/38909/Documents/github/met-worktrees/mouselook/src/viewer/pointer-arbiter.ts:63), and `click.ts`; I found no introduced violation of the stated orbit-pointer lifetime constraints.

TypeScript, diff checks, and changed-file size limits passed. Probes ran in memory; browser suites and recorded mutation proofs were not rerun. Delegation failed to start. No files changed or browser/server processes launched.

Desktop checks should include native Esc followed by the artwork link, Alt-Tab/tab hiding, rapid F toggles, View→F→Esc, and touch/pen input while the mouse is locked.
### Claude (`claude-opus-5-5[1m]`)

#### Review of work unit 14 (`bf3d186`, mouse-look and Esc in walk mode)

**Verdict:** nothing blocks the merge. The pointer lock's lifecycle holds for every race you listed. The first Esc keeps the card. The arbiter constraints are untouched. I found two should-fix items (a small defect and a misleading spec sentence) and five notes.

**Not run:** the session's permissions refused my one attempt to run the changed unit tests (`npx vitest run …`), so I ran nothing. My judgements that tests go red without the change come from reading the code and `gate-proofs.md`.

#### Findings

1. **should-fix — holding Esc throws away the card that leaving just kept.**
   - **Where:** `src/main.ts:121-123`, outside the diff, hides the card on every Escape keydown, auto-repeats included.
   - **Pointer free (and in headless Chrome):** the first keydown leaves walk mode (`src/ui/keyboard.ts:55-58`). The next frame keeps the card (`art-label.ts:131-135`). The first auto-repeat, about 0.5 s later, reaches the orbit view's dismissal and hides it.
   - **Pointer locked, desktop Chrome:** as I understand Chromium, the browser swallows only the keydown that frees the lock. The repeats reach the page once the lock is gone, with the same result.
   - **Repair:** `if (event.key === 'Escape' && !event.repeat) artLabel.dismiss();`.
   - **Gate:** in labels.spec's locked test, call `keyboard.down('Escape')` twice (Playwright sends the second with `repeat: true`), then `up`, and expect the card still there.

2. **should-fix (spec) — the spec says the walking screen's controls can be used with the mouse; with the lock they can't.**
   - **The sentence:** `docs/design/spec.md:127` says "the walking screen's controls are used with the mouse once Esc has left walk mode". Once Esc has left, there is no walking screen.
   - **What actually happens:** a desktop browser grants the lock on every entry by F, the toggle or a spawn. The mouse then cannot reach the Build and View buttons, the Timeline button or the Walk toggle that The screen (`spec.md:131`) lists. Only Tab and Enter, or touch, reach them.
   - **Work unit 11:** its code is intact, but its Timeline button and "opening it while walking shows the whole bar" have no mouse path while walking.
   - **Repair:** say this plainly in Looking and The screen, and put the trade-off to the owner (Design, below).

3. **note (docs) — "an open menu takes Esc first" holds only when the page receives the key.** This appears at `spec.md:127`, `keyboard.ts:7-9` and `menus.ts:211-213`.
   - With the pointer locked, desktop Chrome and Firefox keep Esc for themselves. The lock goes, walk mode leaves, and the menu stays open.
   - A menu can be open while locked: pressing F with a menu open leaves it open (`closeOnOutside`, `menus.ts:215-227`), and Tab+Enter opens one.
   - `mouse-look.spec.ts:141-149` tests the menu case with the pointer free (`walk=1`), so it can't catch this.
   - **Repair:** qualify the sentence, or close open menus in `enterWalk` so the case can't arise.

4. **note (test gap) — nothing checks where the walking card sits once it shows the locked hint, now the desktop default.**
   - labels.spec's placement checks (`quiet`, lines 99-124) run under `noPointerLock` (line 71), so the hint is hidden.
   - The locked test checks only the hint's text (line 285) and the orbit view's layout (line 293).
   - Below 1000 px, the CSS caps the card's height (`src/ui/styles.ts:174-183`). The likely failure is a clipped card that scrolls, not one overlapping the crosshair. My estimate says it fits at 390×844, but nothing measures it.
   - **Repair:** before the Esc at line 287, run `expectLaidOut(boxes(page, WALK_CONTROLS))` and the band check at both sizes.

5. **note — entering walk mode again while the page's own release is still in flight leaves the pointer free.**
   - `askLock` returns early on `this.locked` (`walk-mode.ts:426`). The `pointerlockchange` handler (378-387) asks for nothing when the release lands with walk mode on. `walk-lock.test.ts:170-173` pins this as intended.
   - The window is one browser round trip, and the visitor then sees the free-pointer hint.
   - **Optional repair:** while `releasing`, remember that a lock is wanted, and ask again when the release lands with walk mode on. The F keypress still counts as a user gesture at that point.

6. **note (wording).**
   - `walk-lock.test.ts:12-13` says `walk.spec.ts` drives the real lock. It is `mouse-look.spec.ts`.
   - `spec.md:131` says the hint lasts "until the visitor first walks". A jump ends it too (`walk-mode.ts:235`).

7. **note (process).** AGENTS.md (Load) requires three passing runs in a row of `walk.spec` and `routes.spec` at 4× CPU throttle. Both specs changed, and nothing in the commit, devlog or gate-proofs records those runs. Confirm them before landing.

#### Your specific questions

**Lock lifecycle** (`walk-mode.ts`):
- **F pressed twice fast:** a lock that arrives after leaving is freed (line 384), and the unit test covers it.
- **Three presses within one release:** see finding 5.
- **A spawn chosen while walking:** it asks for the lock again when the pointer is free and skips when locked.
- **Lock granted while preparing:** moves are ignored until the walk is ready (line 394).
- **Lock lost while preparing:** walk mode leaves. If the walker was placed before, the orbit camera goes to its old eye, as F pressed twice already did.
- **Esc and the lock loss both arriving:**
  - If the keydown comes first (headless; Safari, as I understand WebKit), the keyboard leaves walk mode and `releasing` marks the page's own release. The loss that follows does nothing.
  - Chrome and Firefox send no keydown, so only the loss path runs.
  - I know of no browser that sends the loss and then the keydown. If one did, `main.ts:122` would drop the kept card.
- **Refused request:** the rejection is caught, and the status line shows the free-pointer text.
- **Page hidden or window blurred:** the lock goes, so walk mode leaves, and `keyboard.ts:114-120` releases held keys.
- **`releasing`** can't get stuck: every `pointerlockchange` resets it.

**Esc's three listeners** run in this order: `main.ts:121`, then the menus (`ui.ts:112`), then the keyboard (`ui.ts:117`). The card dismissal runs before the keyboard's exit marks the card to keep, so the first Esc keeps it. Only the repeats in finding 1 harm it.

**The kept card** cannot show a wrong or undrawn artwork beyond one frame.
- It is the last artwork the look-target hook reported, and its pieces are checked as drawn on the frame the view leaves walk mode.
- Looking away, a door in view, or a preset drops it (`main.ts:278-280`).
- The only staleness is a locked mouse move between the last frame and Esc.

**Touch and pen:**
- Finger and pen drags still turn the view while the mouse is locked (`lockedMouse`), and the unit test covers the finger.
- Using a door on a click is restricted to the mouse (`main.ts:189`), which no test covers. That's a minor gap.

**Arbiter constraints are kept.**
- The only new listener is a passive document-capture `pointerdown` that records the pointer type (`walk-mode.ts:377`).
- Nothing new stops `pointerup` or `pointercancel`, and `camera-rig.ts:83` is unchanged.
- `click.ts:78` still stops only held moves during an orbit-view press.
- The drag helpers `face`, `aimAt` and the route keys run on the unchanged free-pointer path.
- Every file is under 500 lines, and AGENTS.md is 29,295 bytes (at most 29,437 with CRLF).

**Tests:**
- Each new test does what its header says, and the red proofs fit the code. I checked the cited line numbers (81, 94, 124, 126, 139).
- `noPointerLock` hides no regression the suite used to cover. Before this change the pointer was free on entering walk mode, and `noPointerLock` reproduces exactly that.
- The new locked path is covered by:
  - `mouse-look.spec`: the locked look, Esc, the lock loss and touch;
  - `walk.spec`: the lock taken on entering;
  - `doors.spec`: the real locked click;
  - `door-look.spec`'s first test: E under the lock;
  - the locked labels test: hint, kept card and link.
- The gap is finding 4. The canvas click at `walk-build.spec.ts:151` now locks the pointer, but only keys follow it, so it's harmless.

**Docs vs code** match apart from findings 2, 3 and 6.

#### Design

- **Leaving walk mode on any lock loss:** sound, and in practice forced. The owner wants one Esc to end first person, and Chrome and Firefox tell the page only that the lock went. The walker's place is kept. Alt+Tab, a tab switch or DevTools will also leave walk mode.
- **Keeping the card across leaving:** sound. It keeps the earlier "press a key, then click the link" design.
- **The real cost is finding 2.** The owner should choose one of:
  - accept that walking-screen controls are keyboard-only on desktop;
  - hide those controls while the pointer is locked;
  - add a key that frees the cursor without leaving walk mode (e.g. holding Alt).

#### Worth trying by hand in a desktop browser

1. Click the Walk toggle (bottom right), then nudge the mouse. The view should turn by the nudge, with no jump.
2. Walk until an artwork's card shows, press Esc once, then click the link. Repeat while holding Esc for about a second (finding 1).
3. Press Esc, then F at once. I believe Chrome refuses to lock again for about a second after the user's own Esc. Expect "Click the view…", then a click that locks.
4. While walking, Alt+Tab away and back, and open DevTools.
5. In Firefox (Esc may only take effect when the key is released) and in Safari, open a menu with Tab+Enter while locked, then press Esc.
6. On a Windows display scaled to 125–150%, compare a locked turn with a drag of the same distance. Chrome has at times reported locked movement in device pixels.
7. Fast mouse flicks: watch for sudden jumps.
8. A pen while the mouse is locked. On a touchscreen laptop, tap the screen and then press F: no lock comes until a mouse press.
9. Try to reach the Build or View menu or the Timeline button while locked (finding 2).
## Findings and disposition

Finding IDs are this work unit's. Repairs are commit `d9b92ed` on `mouselook`, whose parent is `bf3d186`, re-reviewed in round 1.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Codex 1, should-fix: a finger's or a pen's press while the mouse is locked calls `setPointerCapture`, which the browser refuses under a document's lock (`walk-mode.ts:389`); the stand-in canvas hid it. | Accepted. Chrome 156 throws `InvalidStateError` there, as the red proof showed. While repairing, a probe found that Chrome reports every pointer under a page's lock at the lock's frozen place, its travel only in `movementX`/`movementY`, so the finger's drag also turned nothing in Chrome. | No capture under a lock; the drag's moves and end heard on the document; a drag under the lock turns by its movement. `walk-lock.test.ts`'s second test (its canvas refuses capture under a lock and its locked pointers are frozen) and `mouse-look.spec`'s touch test (a finger's drag under the mouse's real lock, no page error). |
| F1 | Codex 2, should-fix: after any finger press, entering by F asks for no lock (`lastPress`). | Accepted. | The last input is tracked, a `keydown` counting as the keyboard. The first unit test. |
| F2 | Codex 3 should-fix, Claude 5 note: walk mode entered again while the page's own release is pending ends unlocked; the test pinned it. | Accepted. | `relock`: asked once the release is told, if walk mode is still on. The fourth unit test. |
| F3 | Codex 4, should-fix: the card kept on leaving is the last frame's artwork, though a locked move may turn the view before Esc. | Accepted. | `exit()` tells the target as the view stands then, if it changed, then null always; the hook's contract in the spec. The fifth unit test. |
| F4 | Claude 1, should-fix: a held Esc's auto-repeats reach the orbit view's dismissal and hide the card leaving kept (`main.ts:121`). | Accepted. | The dismissal ignores repeats. `labels.spec`'s locked test holds Esc so that it repeats. |
| F5 | Claude 2, should-fix (spec): "the walking screen's controls are used with the mouse once Esc has left walk mode" is wrong; with the lock they are not reachable by the mouse; put the trade-off to the owner. | Accepted. | The spec says plainly that a locked pointer reaches no control (the keyboard and touch do; the mouse only while the pointer is free) and why no key was added. The trade-off goes to the owner in the work unit's report. |
| F6 | Codex note, Claude 3 note: "an open menu takes Esc first" holds only when the page hears Esc; F with a menu open leaves it open while locked. | Accepted. | Menus close while the pointer is locked (`ui.ts`); the spec qualifies the rule to a free pointer. `mouse-look.spec`'s first test opens the View menu before F. |
| F7 | Claude 4 note: nothing checks the locked card's place with its hint. | Accepted. | `labels.spec`'s locked test lays the card out against the walking controls and the band at both sizes. |
| F8 | Codex note: (a) "taken whole by the next frame" is not what the test reads; (b) a press under CLICK_SLOP turns the view as it moves, already in the base. | (a) Accepted. (b) Rejected for this unit: the base did so before, and holding the turn until the slop is crossed would change the drag the route helpers rely on (a turn in proportion to the pixels, whole by the next frame). | (a) The header says the turn is read two frames after the move. (b) Reported to the coordinator. |
| F9 | Claude 6 note: `walk-lock.test.ts` names `walk.spec` for the real lock; the hint also ends at a jump. | Accepted. | Fixed in the test header and the spec. |
| F10 | Claude 7 note: the Load rule's three runs at 4× must be shown before landing. | Accepted. | An early run at `bf3d186` passed; the three counted runs are taken on the merged tree before the push. |
| F11 | Claude note (Touch and pen): the locked click's restriction to the mouse (`main.ts:189`) has no test. | Rejected: one clause, low risk; the locked click itself is covered for the mouse on the real lock (`doors.spec`). | None. |

Claude's design question, reported to the owner: with a locked mouse, the walking screen's controls are reachable only by the keyboard or touch; the options it named are to accept that, to hide those controls while locked, or to add a key that frees the cursor without leaving walk mode.

## Verification

- On the reviewed tree before review: `npm run verify` through the gate lock, green (80 test files, 707 unit tests, typecheck, lint, build, 125 e2e in 10.1 min; 639 s), and one early run of the Load rule at 4× CPU throttle (`routes.spec` and `walk.spec`: 21 passed, 2 skipped, 133 s).
- On the repairs (`d9b92ed`): `npm run verify` through the gate lock, green (708 unit tests, 125 e2e; 697 s); the unit red proofs and the e2e red proofs of each repair, listed in `docs/learning/gate-proofs.md` under `tests/e2e/mouse-look.spec.ts`.
- Neither lane ran the test suites: Codex ran the typecheck and probes in memory, and the Claude lane's permissions refused its one attempt to run tests.

## Round outcome

Six should-fix findings (F0 to F5) and six notes. Nothing blocked the merge. F0 to F7, F9 and F8's first half were accepted and repaired in `d9b92ed`; F10 is met by the Load rule's runs on the merged tree before the push; F8's second half and F11 were rejected with their reasons; F5's design question went to the owner. A probe during F0's repair found that Chrome reports every pointer under a page's lock at the lock's place, which round 0 had not seen; that and the size of the repairs called for the focused round 1.
