# Review 1: implementation

## Target

Repository `met`, branch `orbit`: everything changed since review 0's target (`c5a0c92`), as the patch `tmp/review-runs/u10-r1/target.patch` (ignored; SHA-256 `4b71594c14311ccc77e32df5474f751719e1ce38b2a885a9186bcb61536faa11`; 12 files, 83 lines in and 42 out), rebuilt afterwards as the commit object `0b8f6ec` (tree `4dc085f`): the repairs of review 0's F0 to F10, and the documentation moves the coordinator asked for while review 0 ran (each gate in AGENTS.md as a clause or one short line, the red proofs in `docs/learning/gate-proofs.md`, test headers keeping their bounds and pointing there). Its code was committed in `02db823`, with this round's wording repairs on top: 8 files, 14 lines in and 13 out, comments and docs only.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-29 with the same prompt (`tmp/review-runs/u10-r1/prompt.md`, ignored), the patch on standard input and review 0's two reports to read: whether each of F0 to F10 is resolved, whether a repair broke anything (the guard before `connect`, the counter split, the guard's test), whether the new documents are exact, and anything material review 0 missed in the parts touched. Both were told to run no tests, builds or browsers.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker. It cited `OrbitControls.js:499` and `:1561` outside the patch, each checked. It ran nothing and changed no file.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, the same tools and limits as in review 0; its result's one model key is the pin (`keep`). It made 24 reads, 29 searches, 4 globs, git calls and `grep` and `sed` reads of `node_modules` and the spec, and changed no file.

## Reports

### Codex (`gpt-6-astra`)

No blocking or should-fix findings. F1–F10 are resolved. F0’s measurement-provenance issue is resolved, with one wording nit remaining.

**R1 — nit — [gate-proofs.md:50](C:/Users/38909/Documents/github/met-worktrees/orbit/docs/learning/gate-proofs.md:50).** The sentence attributes wrapping after connection to `8a6a0c2`’s rig. That rig never wraps the listeners: it constructs connected controls; the **test’s mock** wraps their fields after `super()`. This distinction matters because the paragraph explains an instrumentation failure. Replace that attribution with “the test’s mock wraps after the old rig has connected them.”

I checked:

- `hearThrough` runs before `connect`; r186 installs the wrapped instance fields in [OrbitControls.js:499](C:/Users/38909/Documents/github/met-worktrees/orbit/node_modules/three/examples/jsm/controls/OrbitControls.js:499) and on first press at line 1561, both outside the patch.
- The guard test requires the specific diagnostic; an unrelated constructor exception cannot satisfy it.
- The counter split correctly separates another pointer type from a second pen. Existing evidence records **1,276** and **60** respectively. All counters are initialized, accumulated over fixed seeds, and explicitly required to exceed 20.
- Historical mock adaptations, failure totals, mode-change and lost-end limits, wheel wording, test bounds, and searches for superseded wording. I found no further material defect.

Review was read-only against `c5a0c92`. I inspected existing measurement artifacts but ran no tests, builds, scripts or browsers, and changed no files.

### Claude (`claude-opus-5-5[1m]`)

No blocking or should-fix findings. Every one of F0 to F10 is resolved in substance, and none of the code repairs broke anything. Six nits remain, all about exact wording in the new documents. R1 to R3 sit inside the F0 and F8 repairs. I worked read-only and ran no tests, builds or browsers, so the recorded red counts and "With the work's files every gate is green" (`gate-proofs.md:59`) are unconfirmed by me.

#### Findings

**R1 — nit — `docs/learning/gate-proofs.md:56`.** The entry says the sequences of `4e16588` "mixed no pointer types". That is false.
- **Why:** that generator pressed a mouse or a pen while fingers were down, and the old header counts 357 such presses (`git show 8a6a0c2:src/viewer/click-random.test.ts`, lines 18 and 222–227). It only avoided the patterns that threw.
- The same entry's line 52, the plan and the devlog ("now mix every pointer type") describe it correctly.
- **Fix:** write "on the sequences of `4e16588`, written around F39 (above)".

**R2 — nit — `docs/learning/gate-proofs.md:50`.** The F0 repair explains every run going red by listener fields "that `8a6a0c2`'s rig wraps only after connecting them". That rig wraps nothing.
- **Why:** it builds `new OrbitControls(this.camera, element)` (`8a6a0c2:src/viewer/camera-rig.ts:50`), so the constructor connects the original listeners (`OrbitControls.js:457-459`, `:499-500`). It is the test's mock (`click-random.test.ts:60-72`) that wraps them afterwards. The way the adapted run was made ("disconnect, wrap and connect again") is described correctly.
- **Fix:** "…through listener fields the test's mock wraps only after the constructor, given the canvas by `8a6a0c2`'s rig, has connected them."

**R3 — nit — `src/viewer/click-random.test.ts:19-21`, and gate-proofs Evidence at `:61`.** The header says the counts of each case are "in work unit 10's reviews".
- **Why:**
  - `docs/work/10_mixed-pointer-input/` holds only `plan.md`.
  - The draft record `tmp/records/0_implementation.md:111` gives only `refused` (1,276) and `second` (60).
  - The other 13 counts, which `c5a0c92`'s header carried, now exist only in the ignored `tmp/measure-seen.json:4-18`. Under R23 that file gets deleted.
- **Fix:** copy all 15 counts into the review record when it lands, or keep one line of counts in the header.

**R4 — nit — pointers and the plan left uneven.**
- The coordinator asked for test headers to point to gate-proofs. Two do not:
  - `click.test.ts:7-9` lost its red note for the release while walking.
  - The header of `pointer-arbiter.test.ts:1-12` has never pointed there.
- `AGENTS.md:95` has no "red proofs in gate-proofs.md", while lines 96–97 do.
- `plan.md:24` (Mechanism) still says only that the rig throws "naming the listener". It omits F2's refusal of an already-connected controls.
- `gate-proofs.md:3` defines the file as proofs of gates that retired a lesson, each entry naming a lessons-evidence commit. The new entry has neither ("Lesson: none in lessons.md").
- **Fix:** add the pointers, add one clause to the plan, and widen the opening sentence of gate-proofs.

**R5 — nit — `src/viewer/pointer-arbiter.ts:15-16`, `plan.md:26`.** "A finger's id never comes back" is stated as a fact, but it is browser behaviour.
- **Why:** the Pointer Events spec lets a browser reuse a retired id; in practice only the mouse's id is fixed. Pens are not covered either, though nothing promises a pen's id comes back.
- **Fix:** "a finger's or a pen's id may never come back, as with Chrome's touches".

**R6 — nit — small wording.**
- `spec.md:103`, Known limit: "turns the view by all it travelled" should be "moves the view". A right-button drag or two fingers make the controls pan, not turn.
- `AGENTS.md:96`: "while walk mode comes and goes" overstates what runs. The test's Bound (`click-random.test.ts:23-25`) says only `setWalking` changes the mode.
- `gate-proofs.md:43`: the list of what threw leaves out two pens. That table row (`mixed-pointers.test.ts:83-86`) throws at `OrbitControls.js:1635-1639` and is one of the eight in line 49.
- Optional at landing: work unit 2's plan (`docs/work/2_doors-and-collection/plan.md:154-159`) still lists F39 as left open. Line 159 shows the habit of noting a resolution there.

#### What I checked and found sound

**Each finding:**
- **F0:** resolved, apart from R1–R2.
- **F1:** resolved, apart from R5.
- **F2:** resolved, apart from the plan in R4.
- **F8:** resolved, apart from R3.
- **F3–F7, F9, F10:** resolved.
- A search finds no leftover "one kind of input", "two kinds of input", "second mouse", "until it presses again", "turned the view 6.07" or "refused while another kind".

**The guard (`camera-rig.ts:46-51`, `:84-86`):**
- It runs before `connect`, and `connect` reads the wrapped fields when it is called (`OrbitControls.js:495-500`).
- The first press adds the wrapped document listeners (`:1561-1562`), and they are removed by the same references (`:516-519`, `:1618-1619`).
- Nothing inside OrbitControls calls these three fields directly.
- `domElement` is typed `HTMLElement | SVGElement | null` (`@types/three/src/extras/Controls.d.ts:22`), so lint's `no-unnecessary-condition` won't flag the check. `no-dynamic-delete` accepts the test's string-literal key (rule source lines 35–41).
- One harmless quirk: `disconnect()` never clears `domElement` (`OrbitControls.js:512-536`), so a disconnected controls would also be refused, with the "already connected" message.

**The guard's test (`mixed-pointers.test.ts:222-234`):**
- It cannot pass vacuously. Its two expectations pin the two branches, and each would fail on the other's message.
- Without the connected check it fails with "expected [Function] to throw an error".
- The stand-in canvas supports `connect` (`getRootNode`, `style`).

**The counter split (`click-random.test.ts:274`):**
- `second` counts only a pen pressed while the other pen holds the camera; the mouse can never reach it.
- 1,276 + 60 = 1,336, the old total.
- Every counter is asserted above 20 (`:440`). Over fixed seeds, `second` and `middles` have the thinnest margin, 60 each.

**Claims in the spec and headers:**
- **Wheel:** no arbiter filter, so it zooms whatever holds the camera.
- **Moves while disabled:** the controls ignore them (`OrbitControls.js:1594`).
- **Walk-mode capture:** walk mode takes capture on a press while walking (`walk-mode.ts:365-368`).
- **Ends reaching the document:** nothing under `src/` stops a pointer end from propagating; only held moves are stopped (`click.ts:78`).

**The red-proof descriptions:**
- The zoom of `8a6a0c2` and `42722e9` takes three parameters, and the click's signature is unchanged, so "as it was" is possible.
- The e2e spec's three throws trace to `:1323` once and `:1639` twice.
- Eight of the ten table rows throw.

A search of `tmp/` also matched one line of this round's Codex report. I did not read it further.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F11 | gate-proofs.md said `8a6a0c2`'s rig wraps the listener fields after connecting them; that rig wraps nothing, the test's mock does, after the constructor given the canvas has connected them (Codex R1, Claude R2, nit) | Accepted | Reworded so |
| F12 | gate-proofs.md said the sequences of `4e16588` mixed no pointer types; they pressed a mouse or a pen while fingers were down, and avoided only the patterns that threw (Claude R1, nit) | Accepted | "written around F39 (above)" |
| F13 | The random test's header put the counts of each case in this unit's reviews, which did not hold them; they lived only in an ignored file (Claude R3, nit) | Accepted | All 15 counts are below, under Verification; the header points to this review |
| F14 | Pointers to gate-proofs.md uneven (`click.test.ts`, `pointer-arbiter.test.ts`, the e2e line in AGENTS.md); the plan's Mechanism omitted the refusal of a connected OrbitControls; gate-proofs.md's opening sentence spoke of lessons only (Claude R4, nit) | Accepted | Each pointer added, the plan's clause added, the opening sentence widened to gates a work unit added for a defect |
| F15 | "A finger's id never comes back" is browser behaviour, and a pen's may not either (Claude R5, nit) | Accepted | "a finger's or a pen's id may never come back, as with Chrome's touches", in the arbiter's bound and the plan |
| F16 | Small wording: the known limit "turns" the view where a pan moves it; "while walk mode comes and goes" overstates what the test runs; the list of what threw leaves out two pens; work unit 2's plan still lists F39 as open (Claude R6, nit) | Accepted | "turns or pans"; "while the rig's walking is switched on and off"; two pens added; work unit 2's plan notes the resolution with this unit's records |

## Verification

- `npm run verify` on review 1's target code, through the gate lock with `MET_PORT=5362`: 685 unit tests in 77 files, typecheck, lint, build and 85 e2e (13.5 minutes), 1,928 s with the queue (`tmp/verify-2.log`, ignored).
- After this round's wording repairs, the six viewer test files of the pointer input (28 tests); `npm run verify` on `02db823` through the gate lock passed its 685 unit tests, typecheck, lint and build, and was stopped in its e2e to free the lock ahead of work unit 12, whose merge replaced that tree (`tmp/verify-3.log`, ignored); and `npm run verify` on the merge with origin/main `05bdfee`, landed as `6426f08`: 687 unit tests in 77 files, typecheck, lint, build and 85 e2e (13.1 minutes), 1,830 s with the queue (`tmp/verify-4.log`, ignored). The Pages run of `6426f08` (40962143355) passed its build and deploy.
- The guard's test red without the check of a connected OrbitControls ("expected [Function] to throw an error").
- What the random sequences make over their 800 runs, at `02db823`: 146 clicks, 1,876 button changes, 1,156 capture losses, 1,436 ends over another element, 1,844 cancels, 208 pinch steps, 60 middle-drag steps, 4,050 presses while another pointer was down, 1,276 presses refused while a pointer of another type held the camera, 60 presses of a second pen refused, 452 presses that held the camera while a refused pointer was down, 862 presses elsewhere, 1,538 hovers, 1,596 changes of mode and 2,000 presses while walking (`tmp/measure-seen.json`, ignored).

## Round outcome

No blocking or should-fix finding. Six nits (F11 to F16), all accepted and repaired in comments and docs, so no further round: review 0's findings are resolved, and the code reviewed here is the code that lands.
