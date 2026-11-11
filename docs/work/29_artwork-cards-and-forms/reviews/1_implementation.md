# Review 1: implementation

## Target

The repairs after review 0 of landing A, work unit 29: repository met, commit `9392d83` on the coordinator's branch `worktree-improvement-list`, which holds the worker's branch at `41857a4` (four commits over the `9176e57` that review 0 read: `1de5342`, `39b4fac`, `5efb191`, `41857a4`). `9392d83` differs from `41857a4` only in the coordinator's `docs/work/27_improvement-list/plan.md` and review 0's record. The reviewers were given `git diff 9176e57 41857a4` (17 files, 727 lines added and 63 removed) and read the checkout at `9392d83`.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, codex-cli 0.163.0. Its sandbox check kept the lane. It read `src/walk/footing.ts` and `src/viewer/art-label.ts` outside the diff.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, limited to Read, Glob, Grep, Task and three read-only git commands, permission mode `dontAsk`, no MCP server. One result event on that model alone; 24 reads, 25 searches and 4 shell calls (git log, git diff, git ls-files), no subagent call.
- Neither lane's tool calls name the run folder. The tree's `git status` and `git diff HEAD` were empty before and after, at the same HEAD. Neither lane ran tests, builds or network requests. No lane abstained.

Each prompt asked whether each repair closes its finding in every case, whether each new test fails without its repair, and whether a repair changed anything outside its finding, with new findings numbered from F10. Both lanes used F10 for their first new finding; the table below gives each finding one ID, Codex's keeping F10.

## Reports

Absolute paths of the reviewed checkout in Codex's links are shortened to repository paths. Nothing else is changed; Claude's own finding numbers are kept as it wrote them, and the table maps them.

### Codex (gpt-6-astra)

Reviewed `9392d83` by inspection only. No files changed; no tests, builds, or network requests run.

**F10 — Major: the replacement floor test can certify an unsupported viewpoint.** `src/model/collection/fit-out-labels.test.ts:69`

```ts
if (met !== null) top = Math.max(top, eye.y - met.distance);
```

Taking the highest of nine hits means one side finding a floor is sufficient. Consider feet positioned 0.10 m beyond a straight floor edge, at that floor's height, with lower ground beyond the edge. The −0.15 m probes still hit the floor, so `floorUnder` returns the requested height and both assertions at lines 85–86 pass, although the centre is unsupported.

The actual walker deliberately rejects that support arrangement. Outside the diff, `src/walk/footing.ts:54` requires both opposite probes and takes their **lower** height:

```ts
if (!world.groundBelow(/* side A */) || !world.groundBelow(/* side B */)) continue;
const rim = sideA.y <= sideB.y ? sideA : sideB;
```

Consequently, the repaired test can still label an artwork from an eye position where the walker cannot remain. Reading geometry removes the original tautology, but does not establish the claimed standing position. Use the walker's support/placement path and add a negative case just beyond an edge. This is a defect in the verification; I have not established that a currently committed viewpoint is unsupported.

| Finding | Repair status |
|---|---|
| **F1** | **CLOSED.** `artworkPiecesIn` gathers matching artwork tags across all steps. Leaving walk mode uses that same callback in unchanged `src/viewer/art-label.ts:135`. Walking uses the picker directly; door meshes carry door tags; floor filtering remains covered by the existing cut/layer checks. For the timeline's unique meshes and actual callers, I found no foreign pieces, duplicates, or empty result. |
| **F2** | **CLOSED.** `modeOf` preserves `--fit-out`; `scripts/met-catalogue.ts:118` passes `mode.rerun` into the fetcher. The new tests assert literal retry commands through real `Fetcher` failures. |
| **F3** | **CLOSED.** `scripts/met-catalogue-run.ts:247` compares override values and provenance for kind, display and every dimension. Gallery acceptance matches unchanged `met-catalogue-rules.ts:420`. Recorded differences prevent the write. |
| **F4** | **CLOSED.** `collection.md:20` now correctly describes fetching fit-out records before reporting differences and refusing the write. |
| **F5** | **CLOSED.** `AGENTS.md:84` lists the browser coverage with e2e specs; line 96 lists unit coverage. |
| **F7** | **NOT CLOSED.** The floor check is no longer self-referential, but its maximum-hit rule admits unsupported feet positions: F10. |

The reconstructed old closure matches the original rule for the tested timeline meshes. F1's tests explicitly distinguish old and repaired behavior, including each clicked part being hidden while the other remains visible.

I confirmed the `main.ts` diff contains only the permitted import and closure changes, and `art-label.ts` is untouched. All changed source/test files remain below 500 lines; `AGENTS.md` is 23,134 bytes with CRLF normalization.

REJECT — F10: the repaired floor gate can pass an unsupported viewpoint.

### Claude (claude-opus-5-5[1m])

#### Round 1 review: the repairs of F1, F2, F3, F4, F5 and F7 (HEAD `9392d83`)

All six repairs close their findings. I found one minor defect where the F2 and F3 repairs interact, and four nits. I ran nothing, as instructed, and did not delegate. HEAD adds no code over `41857a4`: `git diff --stat 41857a4 9392d83` touches only the two coordinator docs.

#### The six repairs

**F1: CLOSED.**
- **The wiring.** `src/main.ts:98` is now `new ArtLabel(artworkPiecesIn(timeline.steps))`. main.ts changes only in that closure and its import, and `git diff 9176e57 HEAD -- src/viewer/art-label.ts` is empty.
- **The other paths.**
  - Both places the label gathers pieces go through `piecesOf`, so both get every step: the click (`art-label.ts:113`) and leaving walk mode with a card kept (`:135`, `this.piecesOf(kept.hit, kept.id)`). There, `kept.hit` is the look target's own hit, and `id` is that hit's tag's id (`look.ts:45`).
  - Walking needs no pieces: the card follows `looked`.
  - The door layer has no door that belongs to an artwork (`src/model/doors.ts` names no fit-out piece), and it skips artwork tags (`viewer/doors.ts:131`).
  - The floor view hides landscape by `mesh.layers.mask = 0` (`floor-view.ts:115-117`), which `drawnPiece` reads.
- **Another artwork's pieces, duplicates, or nothing.** None of the three can happen.
  - It filters on `tag.id === id` (`art-label.ts:48`).
  - `step.tags[m]` is the same array object `tagOf` reads (`timeline.ts:253`, `:258`, `:277`), so a met timeline piece is always found among the step pieces and never appended twice.
  - Each step builds its own meshes, so no piece appears twice.
  - The appended met piece means the list is never empty.
- **The tests.**
  - The old rule rebuilt in `fit-out-card.test.ts:87-90` is the old closure's rule (`find` in place of `Map.get`, same fallback).
  - Test 4 there fails on duplicates, foreign pieces, or a single-step gather.
  - The browser drag is safe. The slider runs 0 to `cutMax` in 0.1 m steps (`ui/menus.ts:95`) and is at least 120 px wide (`styles.ts:53`), so one pixel moves the cut well under the 0.65 m window between 5.31 m and 5.96 m.

**F2: CLOSED for the case named; F10 below is the gap left.**
- `main` hands `mode.rerun` to the fetcher (`met-catalogue.ts:118`).
- The npm script is `node scripts/met-catalogue.ts` (`package.json:22`), so `npm run met-catalogue -- --fit-out` is the right retry.
- The new test asserts the exact message for both modes through a real `Fetcher`, and it fails under both mutations the header names.

**F3: CLOSED.**
- `staleBy` mirrors what a whole run does:
  - A pick's size always wins and is not rounded (`met-catalogue-rules.ts:208-214`), so `===` is exact.
  - `kindFrom` and `displayFrom` follow whether the pick sets one (`:470`, `:472`).
  - The gallery test is `checkGallery`'s (`:420`), with the entry's gallery in place of the record's.
- The `Pick` type has exactly `id`, `kind`, `display`, `size` and `gallery` (`types.ts:30-37`), so every pick choice is compared.
- No false refusal today: `catalogue.test.ts:88`, `:101-102` and `:115-118` hold the same relations on the committed file. The two new lines check nothing yet, since no pick sets a kind or display; they guard landing B.

**F4: CLOSED.** `collection.md:20` now says a kept run with a difference fetches the fit-out records, lists the difference, writes nothing and exits 1, which matches `runCatalogue`.

**F5: CLOSED.** The browser block is listed with the e2e specs (`AGENTS.md:84`), and the unit-gate line (`:96`) no longer names it. AGENTS.md is 23,134 bytes.

**F7: CLOSED.** The check now reads the built model, and the red case (feet and level both raised 0.5 m) really fails.

On the footprint question: yes, it can pass feet that are not on a floor, in two ways.
- `picker.hit(ray)` with no query stops at the first surface of any kind, glass and water included (`pick.ts:37`).
- The raycast is `DoubleSide` (`pick.ts:185`, `:187`). So an eye inside a solid that stands on the floor reads that solid's bottom face, at floor level, as the floor.

Neither case holds for the six views. The look test (`fit-out-labels.test.ts:90-101`) would catch the second, unless the solid were the artwork itself, such as Diana's pedestal. The header defines the floor as "the highest surface straight down under a footprint", so this is a bound worth a line, not a defect.

#### New findings

**F10 (minor): a blocked kept run that already knows its placeholders are stale tells the user to retry a run that can only refuse.**
- `keptPlaceholders` records the difference before any fetch (`met-catalogue-run.ts:291`).
- A block on a fit-out record is rethrown (`:298`).
- `main` prints only the block's message (`met-catalogue.ts:140-143`): "Retry after … with npm run met-catalogue -- --fit-out".
- The difference is never shown, and the retry is certain to exit 1 with "rebuild the whole catalogue: npm run met-catalogue". The F2 test only covers a kept catalogue that matches its picks.
- It needs an uncached record. That is plausible if a fit-out piece is added while landing B's overrides leave the placeholders stale.
- Fix: print the problems already found with the block message, or name the whole run's command.

**F11 (nit): two comments in `art-label.ts` are now wrong.**
- `:43` says the instances of one step are "every piece of the artwork".
- `:95` says `piecesOf` is "`artworkInstances` over the hit mesh's step".
- Round 0 raised `:43` under F1, but the file had to stay untouched. The plan doesn't record it for unit 26 B.

**F12 (nit): `spec.md:232` promises more than the code does.**
- It says a kept run "writes nothing when a whole run would not write the same placeholders from today's picks".
- It drops the limit stated in `collection.md:20` ("as far as the picks alone can tell") and in the test header (`met-catalogue-fit-out.test.ts:15-17`). A rule changed since the build, such as a kind derived from the object's name or an estimated dimension, is still written as kept. That is the kind of change landing B may bring.
- Its "a gallery its pick now chooses otherwise" is also narrower than the check, which fires when the space's galleries change too.

**F13 (nit):** `fit-out-testing.ts:2` says it is "imported only by" two files, but `fit-out-card.test.ts:41` now imports it too.

**F14 (nit):** the "rule the page had" in `art-pieces.test.ts:130` falls back to `?? lower`, where the old closure fell back to the met piece alone. No click in the test reaches that branch, so no result changes.

#### Checked, nothing found
- Every file is under 500 lines; the largest touched is 341.
- The committed files are LF; CRLF appears only in the Windows working tree.
- No test is weakened. The `met-catalogue.test.ts` edits add `rerun` and tighten one assertion. The `clickForCard` refactor keeps every assertion. The removed F7 assertion compared constants with each other, and round 0 allowed deleting it.

Not verified here: the repair commits and the plan's repair paragraph record no `npm run verify` on `41857a4`, so the red proofs and the new browser test passing rest on the worker's word.

APPROVE WITH FINDINGS. The finding that matters most is F10: a blocked kept run whose placeholders are already known to be stale names a retry that can only refuse.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F1 | The card follows one step alone (review 0). | Closed, by both lanes. | None. |
| F2 | A blocked `--fit-out` run prints the full run's retry instruction (review 0). | Closed for the case named, by both lanes; F11 is what the repair left. | See F11. |
| F3 | The kept run matched placeholders by id and order only (review 0). | Closed, by both lanes. | None. |
| F4 | `collection.md`'s wording (review 0). | Closed, by both lanes. | None. |
| F5 | AGENTS.md's fit-out line (review 0). | Closed, by both lanes. | None. |
| F7 | A floor check that could not fail (review 0). | Codex: not closed, see F10. Claude: closed, with the same bound named. The coordinator takes Codex's reading: the check should stand a view as the walker would. | See F10. |
| F10 | The new floor check takes the highest of nine hits, so a view just beyond a floor's edge passes; the walker refuses that footing (Codex F10, major; Claude names the same bound under F7). | Accepted. For the gate, the loggia and the choir screen it is the only committed check that a test's view is a place a visitor can stand. No committed view was shown unsupported. | The worker stands each view with the walker's own placement and adds a case just beyond an edge that must fail. Checked by the coordinator before landing. |
| F11 | A blocked kept run that already knows its placeholders are stale names a retry that can only refuse, and never shows the difference (Claude's F10, minor). | Accepted. | The worker prints the problems already found with the block's message and names the command that can succeed, tested through the real fetcher. |
| F12 | Two comments in `src/viewer/art-label.ts` (lines 43 and 95) still describe the old closure (Claude's F11, nit). | Accepted. The file is held by work unit 26; leave for the two comment lines was asked on 2026-11-11. | Repaired with this landing if leave comes, else recorded in unit 27's plan for after that unit. |
| F13 | `docs/design/spec.md` line 232 drops the kept run's limit ("as far as the picks alone can tell") and narrows the gallery case (Claude's F12, nit). | Accepted. | The worker makes the spec say what the check does and where it stops. |
| F14 | `fit-out-testing.ts`'s header names two importers where there are three (Claude's F13, nit). | Accepted. | The worker corrects it. |
| F15 | The old rule rebuilt in `art-pieces.test.ts` falls back to another piece where the old closure fell back to the met piece (Claude's F14, nit). | Accepted, though no click in the test reaches the branch. | The worker makes the rebuilt rule the old closure's exactly. |

Claude's closing note, that the repair commits record no verify run, is answered under Verification.

## Verification

- Against `41857a4`, by the worker's report: `npm run verify` through the gate lock, exit 0 (791 unit tests in 86 files, typecheck, lint, build, 93 e2e tests with no retry), and a red proof for each new test, made and undone. The coordinator has not run it: before landing, the coordinator runs `npm run verify` on the merged tree and records it in the plan's Outcome.
- By the coordinator: the diff of `src/main.ts` read (the one closure and its import; `stepOfMesh` gone) and `src/viewer/art-pieces.ts` read whole.
- Not run in this round: any test; the reviewers ran nothing.

## Round outcome

Both lanes find F1, F2, F3, F4 and F5 closed. Codex rejects on F10, the floor check's remaining gap; Claude approves with one minor finding (F11) and four nits. Repairs requested for F10, F11, F13, F14 and F15, and F12 waits on leave from work unit 26. None of the open findings changes what the page does: F10 and F15 are about tests, F11 about a message of a script run by hand, F12 to F14 about comments and the spec's wording. The coordinator checks the repairs and gates the merged tree before landing; no third review round is planned for them.
