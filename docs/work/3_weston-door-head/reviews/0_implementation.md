# Review 0: implementation

## Target

The met repository, branch `claude/nice-leakey-9be7b0`, commit `644b313` ("Give the Weston door its square head (work unit 3)"): the diff `0defda0..644b313`, 13 files. In code, `src/model/core/weston-facade.ts`, `src/model/core/arches.ts` and `src/model/core/galleries.ts`; in docs, AGENTS.md, `docs/design/spec.md`, `docs/research/` (interior, interior-images, exterior-images, history), `docs/learning/defect-register.md`, `docs/devlog/summary.md`, `docs/work/registry.json` and this unit's `plan.md`.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-28 with the same prompt: the change and its reasons, six lenses (the geometry and placement of the architrave, frieze, dado and porch; the door unit, door layer, walk collision and the tests that might assume a fanlight or the old size; the removal of the hole option `facets`; the docs' numbers and any description of the old head; the plausibility of AGENTS.md's controls; the repo's rules), the evidence crops and before/after renders, and a findings format with file and line. The diff came on stdin. Raw captures stay under the ignored `tmp/review-runs/w3-r0/`.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker. It cited a file and line outside the diff for its finding, which the owner checked (`src/model/lib/door.test.ts:37`). It read the supplied crops and renders, ran a typecheck, `git diff --check` and an in-memory geometry probe, and edited nothing.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. The lane rule passed: one model key, the pin. It ran Vitest, tsc, ESLint on the changed files and `git diff --check`, and left the worktree clean.

## Reports

### Codex (`gpt-6-astra`)

Approve with one nit at `644b313`; no production defects found.

1. **Nit — [src/model/lib/door.test.ts:37](C:/Users/38909/Documents/github/met/.claude/worktrees/nice-leakey-9be7b0/src/model/lib/door.test.ts:37): obsolete Weston fixture.** The fixture still creates a 2.6 × 5.0 m arched door with a fanlight. Running its Weston-labelled checks therefore exercises the former geometry rather than the new rectangular, fanlight-free pair. Update it to `{ width: 2.83, height: 4.23, fanlight: false, swing: 'back' }`; retain the old case under a generic name if desired. This is nonblocking because the real-model fit and walk tests obtain the current door.

Files read outside the diff:

- Geometry: `src/model/lib/surround.ts:1–125`, `window.ts:1–403`, `sweep.ts:1–206`; `src/model/core/wings-walls.ts:1–190`, `shapes.ts:1–83`, `constants.ts:1–77`, `plan-data.ts:21,29–32`.
- Doors and collision: `src/model/doors.ts:1–44`, `src/viewer/doors.ts:1–452`, `src/walk/door-world.ts:1–210`.
- Tests: `src/model/door-fit.test.ts:1–351`, `src/model/lib/door.test.ts:1–160`, `src/model/core/weston-door.test.ts:1–111`, `src/model/doors.test.ts:1–158`, `src/build/window-parts.test.ts:1–167`, `src/model/collection/placement.test.ts:1–110`.
- Tooling and rules: `scripts/capture.ts:1–45,210–232`, `vitest.config.ts:1–9`, `vite.config.ts:1–28`, `tsconfig.json:1–19`, `package.json:1–41`, `docs/policies/local-rules.md:1–6`.
- Prior review: `docs/work/2_doors-and-collection/reviews/15_implementation.md:9,23,39,44,55`.

Inspected all five supplied crops and both before/after renders at native resolution. Typechecking and `git diff --check` passed. An in-memory geometry probe confirmed the trim orientation, leaf bounds, scaling, and detection of both 2 cm hole reductions using the fit gate’s inset method. Full `verify` was not rerun. No files were edited.

### Claude (`claude-opus-5-5[1m]`)

**Verdict:** I found no blocker or major defect at `644b313`. The geometry is sound, the gates are green, and `facets` is safely gone. There are three minor findings and three nits, all fixable without touching the model's behaviour.

**What holds:**
- **Surround placement.** I traced it through `sweepInto` (`sweep.ts:119-121`): the trim lies outside the opening and projects 0.08 m toward −X.
- **Frieze.** It spans X −0.06..0 from the architrave's top to `L1 + PORCH_TOP`. Where it meets the architrave and the entablature, the shared faces are back to back and hidden by solid on both sides, so nothing z-fights.
- **Dado.** It now meets the architrave's outer edge at Z ±1.605 with no gap.
- **Columns.** The inner plinths (1.5 D, half 0.4125 m) start at Z ±1.6375 and X −0.2375. That clears the architrave by 3.25 cm across and 15.75 cm in depth.
- **Leaves.** They run from 0.084 to 4.146 m, 4 mm under the 4.15 m frame head, with no glass. Opened, the west leaf stands 6.6 cm off the moved 528/529 wall, whose face lies at −105.065.
- **`clearOf`.** The wider doorway catches no new wall.
- **`arches.ts`.** It is byte-identical to `7b054d7^`. No other hole ever set `facets`, and the cache key is in-process only.
- **AGENTS.md controls.** They are plausible against the 1 mm inset. A hole 2 cm narrower leaves the inset frame 9 mm inside the brick on each side. A hole 2 cm lower puts the frame head 19 mm into the brick. The un-moved 528/529 wall is cut by the west leaf from about 50° to 90° open.
- **Numbers.** 2.83, 0.57 (exactly 0.565), 3.29 × 4.91 and 5.81 agree across code and docs. I re-measured the drawing on `fig29-porch-ruler.png` and got about 3.29 × 4.92 m and about 5.83 m.
- **Stale wording.** No doc outside work unit 2's historical records still describes the round head.

**Findings:**

1. **minor** — `src/model/lib/door.test.ts:35-37` (header line 6). The fixture labelled "(Weston)", and the comment "the model's units: Weston's (as the first)", still use the old arched unit `{ width: 2.6, height: 5, shape: 'arch', swing: 'back' }`.
   - **Problem:** Weston's real unit is `{ width: 2.83, height: 4.23, fanlight: false, swing: 'back' }`, a panelled pair with no transom. No fixture uses that combination, yet the header and spec.md:141 (Hinges) say this file checks the model's units through the whole swing.
   - **Failure scenario:** a change to `window.ts:357` (the leaves' top when there is no transom bar) that pushes a panelled pair into the frame head passes `door.test.ts`. Only `door-fit.test.ts` would catch it at t = N, and only for this one model door.
   - **Fix:** change line 37 to Weston's current parameters. If an arched back-swing case is still wanted, keep it under a neutral name.

2. **minor** — `src/model/core/weston-facade.ts:66` and `:137`. Inside the new stone architrave, the 0.3 m reveal in front of the frame is the pavilion's brick: both jambs, the head soffit and the threshold.
   - **Problem:** `.shots/after/doors-weston.png` shows this clearly; I cropped it at 3×. The sources this change cites show stone there: #33 shows a light soffit and jamb (`p33-head-2x.png`, and interior.md:284 notes "the head's soffit"), and fig. 110 shows a light jamb beside the leaves.
   - **Scope:** the arched door had brick reveals too, so this is pre-existing in kind. It is now the most visible mismatch left in the change's own view.
   - **Fix:** line the hole in `core.westonStone` as `vaux-shell.ts:109-119` lines its doorway, with `holeLining(outer, inner, OUTER_WALL)`. Cut the hole to the lining's outer outline and let the frame fill the 2.83 × 4.23 inner one. Then rerun door-fit and its controls.

3. **minor** — `docs/learning/defect-register.md:15` and `:17`, against AGENTS.md:53-54 (R17, R18).
   - **Problem:** the entry says the class check ("every image a model source cites marked viewed") "does not exist yet". Its own lesson then says a discrepancy left out of scope "needs a follow-up task with an owner". The change records no such lesson or task: `docs/learning/lessons.md` has never existed, and the plan's Outcome is "Pending" with no follow-up.
   - **Failure scenario:** #29, cited at `choir-screen.ts:4`, and #30 stay cited but "Not viewed", with no owner. That is the same pattern that caused this defect.
   - **Fix:** record the lesson with its retiring gate in `docs/learning/lessons.md`, or add an owned follow-up item in the plan.

4. **nit** — `weston-facade.ts:46-47`, `interior.md:293` and `:295`. The stated arithmetic doesn't reproduce the code's numbers.
   - 4.91 × 0.86 = 4.22, not 4.23. The 4.23 comes from 5.0 / 5.81 = 0.8606, which gives 4.2255.
   - The 0.19 m architrave is not the drawing's "about 0.2 m" scaled by 0.86 (that gives 0.17), and nothing says where 0.19 comes from.
   - interior.md:293's "0.89 m" from head to capitals' top disagrees with its own 5.81 − 4.91 = 0.90.
   - **Fix:** say "scaled by 5.0/5.81 (0.861)", and state how the 0.19 m trim was derived.

5. **nit** — `defect-register.md:9`, `plan.md:20` and `history.md:18` say figs. 26 to 29 were read, including "Weston's 1883 study, his 1888 plan", as sources that show the door. interior.md:282-291 records readings only for figs. 28, 29, 35 and 110, and a plan cannot show a head.
   - **Fix:** record what figs. 26 and 27 show, or drop them from "every source that shows the door".

6. **nit** — `docs/design/spec.md:139`. The first sentence now carries three ideas: what the door is, that every source shows a square head, and that #33 shows the east leaf open.
   - **Fix:** split it into three sentences, per R25.

**Checks run, all read-only (worktree clean before and after):**
- `npx vitest run`: 68 files, 597 tests passed.
- `tsc --noEmit`: exit 0.
- ESLint `--max-warnings 0` on the three changed `.ts` files: clean.
- `git diff --check`: clean.
- `git diff 7b054d7^ HEAD -- src/model/core/arches.ts`: empty.
- Not run: e2e (it needs a dev server and port) and the full `npm run verify`.

**Images:** I read the after and before `doors-weston.png` at native size, plus my own crops of the after render's head and foot. Of the author's crops I read `p33-head-2x.png`, `p33-door-1x.png`, `fig28-door-3x.png`, `fig29-porch-ruler.png` and `fig110-porch-2x.png`. All show a square head.

**Read outside the diff:**
- AGENTS.md (whole, in context); `docs/policies/local-rules.md`
- `docs/design/spec.md:137-150, 197-202`
- `src/model/lib/surround.ts:1-125`, `window.ts:1-403`, `door.test.ts:1-160`
- `src/model/lib/sweep.ts:97-137`, `wall.ts:66-91`, `column.ts` (plinth and abacus, by grep)
- `src/model/core/shapes.ts:1-83`, `wings-walls.ts:1-190`, `constants.ts:1-77`, `galleries.ts:1-123`
- `src/model/core/arches.ts:1-60, 140-199`, `layout.ts:1-30`, `plan-data.ts:15-38`
- `src/model/core/vaux-shell.ts:7, 109-119`, `weston-door.test.ts:1-111`
- `src/model/door-fit.test.ts:1-351`, `doors.test.ts:1-158`, `doors.ts:1-44`
- `src/build/window-parts.test.ts:1-167`
- `src/model/collection/placement.test.ts:73-74`
- `scripts/capture.ts:30-45, 223`
- `docs/research/collection.md:47`, `interior.md:274-276`
- `git show 20e9547:src/model/core/weston-facade.ts` (confirms the original 2.6 × 5.0 round head)

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The parts library's door test keeps a fixture labelled Weston's at the old arched 2.6 × 5.0 m size, so it no longer checks the model's unit (Codex 1; Claude 1) | Accepted: the file says it checks the model's units | The fixture is Weston's unit now: 2.83 × 4.23 m, no fanlight, opening to the back |
| F1 | Inside the new stone architrave the reveals, the head's soffit and the threshold are the pavilion's brick, where #33 and fig. 110 show stone (Claude 2) | Accepted: brick there is older than this change, but now the most visible mismatch in the door's own view | The reveals and soffit are lined in Weston's stone through the wall (`holeLining`, as the gallery 600 doorway is), over a stone threshold; the hole is cut to the lining's outline |
| F2 | The defect register queues a class gate and a follow-up with no lesson or owner (Claude 3) | Accepted: R18 wants the lesson recorded with its retiring gate | `docs/learning/lessons.md` and `lessons-evidence.md` hold the lesson and its gate; the plan's outcome names the follow-up |
| F3 | The stated arithmetic does not give the code's numbers: 4.91 × 0.86 = 4.22, the 0.19 m architrave's source unstated, and 0.89 m against 5.81 − 4.91 = 0.90 (Claude 4) | Accepted | The code comment and `interior.md` say 5.0 / 5.81 (0.861), the drawing's 0.22 m architrave scaled to 0.19 m, and 0.9 m |
| F4 | Figs. 26 and 27 are counted among the sources read, but `interior.md` records no reading of them (Claude 5) | Accepted | `interior.md` records them: fig. 27 a square-headed door under the arched window, fig. 26 a plan that cannot show the head |
| F5 | The spec's paragraph on Weston's door opens with a sentence of three ideas (Claude 6) | Accepted: R25 | Split into one idea a sentence |

## Verification

- On `644b313`, before the round: `npm run verify` passed on its second run (597 unit tests, 86 e2e). The first run failed one e2e check once: the slowest walking frame through two entrance-door cycles took 22.1 ms against 16.7 ms. Run alone it passed 3 of 3 on the change (10.6 to 11.1 ms) and 3 of 3 on the unchanged code (10.8 to 11.4 ms), so the change costs nothing there.
- On the repairs, with main merged in (`3679a3a`): the door, reach and placement gates and the parts library's door test pass. `src/model/door-fit.test.ts` goes red with the stone lining's opening 2 cm narrower or 2 cm lower ("its fixed … frame passes through … (core.westonStone)"), and with the 528/529 wall left in the doorway ("leaf 0 … meets … (plaster) at 16 poses, 52.5° to 90°").
- The standard shot set against `0defda0`, with the lining: only the Weston door's images change (`doors-weston` 114,829 px by more than 8 of 255, `preset-int-petrie-court` 784, the main floor's three views up to 48, three top views 2 or 3), each read at native resolution; the reveals, soffit and threshold now read as stone. Model: 27,043 pieces, 746 meshes, 1,579,337 triangles (27,041, 746 and 1,579,536 before).
- `npm run verify` on the repairs with main merged in: 597 unit tests and 86 e2e pass; the door cycles' slowest walking frame 9.4 ms.

## Round outcome

No blocker or major finding. Both reviewers approved the change; all six findings were accepted and repaired in the commit after `3679a3a`. F1 adds code (the stone lining), so round 1 re-reviews the repairs.
