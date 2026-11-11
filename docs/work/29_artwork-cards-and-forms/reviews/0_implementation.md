# Review 0: implementation

## Target

Landing A of work unit 29 (cards for the landmark pieces): repository met, commit `47217c5` on the coordinator's branch `worktree-improvement-list`, which is origin's main at `4f0e630` plus the worker's branch at `9176e57` and the coordinator's notes in `docs/work/27_improvement-list/plan.md`. The reviewers were given `git diff 4f0e630 9176e57` (29 files, 1,415 lines added and 116 removed) and read the checkout at `47217c5`.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, codex-cli 0.163.0. Its sandbox check kept the lane (no command failed to start). It read code outside the diff: `src/main.ts` and `src/viewer/art-label.ts`, which the coordinator opened and confirmed.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, limited to Read, Glob, Grep, Task and three read-only git commands, permission mode `dontAsk`, no MCP server. Its log holds one result event on that model alone; it made 40 reads, 43 searches, 2 globs and 2 shell calls (git log, git diff --stat and a grep of imports) and no subagent call.
- Neither lane's tool calls name the run folder, so neither read the other's report. The tree's `git status` and `git diff HEAD` were empty before the lanes and after them, at the same HEAD.
- Neither lane ran tests, builds or network requests, as instructed. No lane abstained.

Each prompt asked for a review against landing A's scope, limits and acceptance criteria in `docs/work/29_artwork-cards-and-forms/plan.md`, and told the reviewer of the temple's date (the record's `objectDate` reads "completed by 10 CE" beside begin and end dates of −10) as a known oddity to check only for how the code and docs handle it.

## Reports

Absolute paths of the reviewed checkout in Codex's links are shortened to repository paths. Nothing else is changed.

### Codex (gpt-6-astra)

Reviewed `47217c5` against `4f0e630` by inspection only. No files changed, tests/builds run, or network requests made.

1. **Major — F1: Dendur's card incorrectly disappears when the cut removes only the temple.** `src/model/collection/fit-out.ts:76` assigns the same artwork to two steps: `'dendur-gate'` and `'dendur-temple'`. However, unchanged code outside the diff, `src/main.ts:97`, gathers only `artworkInstances(step, id)` from the clicked mesh's step. `src/viewer/art-label.ts:136` then clears the card when `!this.clicked.pieces.some((piece) => drawnPiece(piece, view))`.

   Concrete case: click the temple, then lower the section cut to **5.5 m**. The temple's tagged stones start at 6.01 m; the gate's start at 5.26 m (`src/model/roche-north/sackler.ts:173`, lines 173–196). The card disappears although part of the same artwork remains drawable, contrary to the Collection contract. The existing cut test uses a single-step artwork, and the new landmark browser tests exercise clicks and Esc without changing the cut. Gather instances across all steps by artwork ID and add this regression case.

2. **Minor — F2: Block recovery tells a fit-out-only run to rebuild the placeholders.** `scripts/met-catalogue-run.ts:141` says: `"Retry after … with npm run met-catalogue"`. `scripts/met-catalogue.ts:140` prints that message unchanged for `--fit-out` failures. Following it selects the full regeneration branch, fetching and re-deriving placeholders, the operation this mode exists to avoid. Preserve `--fit-out` in the retry instruction. The new blocked-run test injects `new BlockedError('blocked')`, so it misses this recovery message.

No additional findings from static inspection of tag ownership, batching/order, catalogue consumers and narrowing, separate 94/4 count assertions, placeholder preservation, committed-fixture normalization, image exclusion, request throttling, or reach/look checks. The temple's date is copied and displayed as documented.

REJECT — F1: Dendur's shared artwork record is tracked only within the clicked build step.

### Claude (claude-opus-5-5[1m])

**Verdict: APPROVE WITH FINDINGS.** The change works as it claims in every area I checked. There are two minor findings and seven nits. The one that matters most is finding 1: the page can hide the temple's card while its gate, which shares the same record, is still drawn, against what the spec promises. I ran no tests or builds, as instructed; everything below comes from reading the code.

#### Findings

**1. Minor: the temple's card hides while its gate is still drawn.** `src/main.ts:97-100`, `src/viewer/art-label.ts:43-52` and `:136`.

The temple's record (547802) now covers pieces in two steps, `dendur-gate` and `dendur-temple`. When you click an artwork, the page collects its pieces from the clicked mesh's step only:

```ts
const step = stepOfMesh.get(hit.mesh);
return step === undefined ? [{ mesh: hit.mesh, instance: hit.instance }] : artworkInstances(step, id);
```

`ArtLabel.frame` then hides the card once none of those pieces is drawn (`art-label.ts:136`).
- The gate's stones start at 5.26 m (`sackler.ts:173`, `PLATFORM_Y + 0.15`). The temple's start at 6.01 m (`sackler.ts:189`, `DAIS_Y + 0.15`).
- So: click the temple, then move the cut slider (0.1 m steps, `src/ui/menus.ts:95`) to anywhere from 5.3 to 6.0 m. The card hides, although the cut still passes through the gate, which is the same artwork.
- Leaving walk mode with the temple in view and then lowering the cut does the same (`art-label.ts:135`).
- The spec says the opposite: "A cut through any piece of it keeps the card" (`docs/design/spec.md:240`), and "From there on the piece is an artwork like any other" (`:232`).
- No test covers it: `fit-out-labels.test.ts` and `labels-landmarks.ts` only click with the cut off. The comment at `art-label.ts:43` ("every piece of the artwork") is no longer true for this object.

`main.ts` and `art-label.ts` are out of this landing's scope. The in-scope fix is one sentence in the spec's Fit-out pieces bullet saying a click keeps to the part it met. The pieces could be gathered across steps later, when unit 26 B rewrites both files.

**2. Minor: a blocked `--fit-out` run tells the user to run the full rebuild.** `scripts/met-catalogue-run.ts:141`, printed unchanged by `scripts/met-catalogue.ts:140-143`.

The block message is the same in both modes: "Retry after … with npm run met-catalogue; the cache lets the rerun start where this one stopped." On a machine without the cache, following it does what the flag exists to prevent. The plan (`docs/work/29_artwork-cards-and-forms/plan.md:45`) says a full run "would have fetched all 94 records and 89 images again and derived every placeholder afresh … which this landing … must not do." The blocked-run test only checks that nothing is written. Fix: have `main()` name the command it was run with.

#### Nits

3. **The kept run matches placeholders by id and order only** (`met-catalogue-run.ts:215-217`). If an existing `kind` or `display` override changes value, the old entry is kept. `catalogue.test.ts:115` lets it through, because it only checks that `kindFrom`/`displayFrom` say `pick` when the pick sets one. So `--fit-out` can write what a full run would not, with every gate green. `collection.md:20` claims the run refuses when the committed placeholders "are not the picks' own". Today no pick has a kind or display override, and added, removed, size and gallery changes are all caught (`catalogue.test.ts:88`, `:101-102`). It starts to matter if landing B adds kind overrides. The fix is cheap: compare each kept entry's `kind` and `display` with its pick's overrides.

4. **`collection.md:20` says "It refuses to run, writing nothing".** It actually fetches every fit-out record first (`met-catalogue-run.ts:234`, then `:259-265`), and the test expects those requests (`met-catalogue-fit-out.test.ts:193`). "It writes nothing" is the accurate wording.

5. **`AGENTS.md:96` sits under "The unit gates, in `npm test`" (`:89`)**, but its last clause names the e2e block of `labels.spec.ts`.

6. **The size of the exception disagrees between plans.** `docs/work/27_improvement-list/plan.md:40` grants "three lines" of `art-card.test.ts`. The change edits four (lines 2, 20, 39, 40), and the work-29 plan (`:53`) says four. The record should be made to agree.

7. **One floor check can't fail on its own** (`fit-out-labels.test.ts:60-63`). Both sides are built from the same constants (`DAIS_Y + 0.04` against `DAIS_Y`, and so on). The floors are really tested by `labels-landmarks.ts:104` and by `reach.test.ts`, so don't count this one as evidence.

8. **The gate's card shows the temple proper's size.** Looking at the 8.08 m gate, the card reads "H 640.1 × W 640.1 × D 1249.7 cm" (`catalogue.ts:106`), and nothing on it says that's the temple's measurement, not the gate's. It is documented (`collection.md:77`); worth a word to the owner, not a code change.

9. **Heads-up for unit 26 B.** Its codemod removes the `order` argument from `kit.add`/`addTagged` calls. `fit-out.ts:40-44` is a `Kit` implementation with `order` parameters, in production code, so a codemod that only rewrites call sites will miss it. Worth telling that session.

#### Checked, nothing found

- **Which pieces are tagged.** Every sandstone piece of the gate (its wall stub included) and of the temple, Diana's four pieces, and every piece of the loggia and the screen. The flagstones, the temple's base course, the rail and the lamps stay untagged, and no landmark piece is built in another step. The material table in `fit-out.test.ts` fully separates tagged from untagged pieces in each step. No transparent material is tagged, so clicks still pass through glass and water as before (`pick.ts:62`).
- **Order, stagger and batching.** `artworkKit.add` passes `order` straight through (`undefined` still becomes the call's index, `kit.ts:69`), and `batch.ts:35` only separates door tags. The builder diffs swap the kit object and nothing else. The "splits no mesh" test compares tagged and untagged builds of the new code, so it only proves the engine side, as its header says; reading the diffs covers the builders. Collision and the door layer (`doors.ts:132`) never read artwork tags.
- **Code that reads `CATALOGUE`.** Only `main.ts:94`, `place.ts:157` (`entryOf` refuses a fit-out entry) and `fit-out.ts:23` read it at runtime, and `cardContent` uses only fields both entry types have. The type union narrows correctly on `display`.
- **The 94 stay pinned apart from the 4.** `catalogue.test.ts` pins 94 and 4 separately, `labels.test.ts` pins 94, and `reach.test.ts` pins 94 plus the five named parts. In `catalogue.ts` the 94 placeholder lines are byte-identical; only the header, the date and four new lines changed.
- **The catalogue script.** A kept run asks for no placeholder record or image, starts no browser, and goes through the same one-request-a-second fetcher. Its output format matches a full run's. The rules are tested against the raw fixtures, and the expected values check by hand. I could not check that the fixtures' hashes match the catalogue's `source.sha256`; no test ties them, the same as for the eleven older fixtures.
- **Reach.** `reach.test.ts:155` matches the look target by id alone, but the gate and the temple can't be confused. Their floors are 0.75 m apart against a 0.6 m tolerance, and the temple is more than 11 m behind the gate. The test views stand on real floors, and the browser test checks the walker settles there.
- **Existing browser tests near the landmarks.** The Sphinx's turn-away (`routes.spec.ts:410-418`) leaves the gate 6.8 m off, past reach. Ruth's approach from R6's end at (72, −110) never faces Diana.
- **The temple's date.** It is copied verbatim (`met-catalogue-rules.ts:440`), shown as given (`art-card.ts:71`), and pinned by three tests, exactly as `collection.md:84` says.
- **Repository rules.** AGENTS.md is about 25 KB, under the 30,000-byte limit. All files are under 500 lines, though `reach.test.ts` is at 498 and `met-catalogue-rules.ts` at 499. The change has no devlog line, which the plan gives to the coordinator at landing.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Unit 27's plan grants "three lines" of `src/ui/art-card.test.ts`; the change edits four (Claude 6). | Accepted. The coordinator allowed the fourth line, a comment, after the plan's note was written. | Unit 27's plan corrected by the coordinator. |
| F1 | A click's card follows only the clicked mesh's own step, so the temple's card hides while its gate, the same artwork, is still drawn, against the spec's "A cut through any piece of it keeps the card" (Codex 1, major; Claude 1, minor). | Accepted as a defect of this landing: the landing made the first artwork that spans two steps. Claude's suggested narrowing of the spec is rejected: the spec's rule is the right one. The repair is one closure in `src/main.ts`, which was outside the landing's scope; the session that holds that file (work unit 26) gave leave on 2026-11-11 and said its own edits there are elsewhere. | The worker gathers an artwork's instances across every step, with tests from the temple's side and the gate's that fail on the old closure, and checks the other landmarks for the class. Checked in round 1. |
| F2 | A blocked `--fit-out` run prints the full run's retry instruction (Codex 2; Claude 2). | Accepted. | The worker keeps `--fit-out` in the instruction and tests the real message. Checked in round 1. |
| F3 | The kept run matches the committed placeholders by id and order only, so a changed `kind` or `display` override would be kept unseen (Claude 3). | Accepted and repaired now, since landing B adds kind overrides. | The worker compares each kept entry's kind and display with its pick's overrides, with a test. Checked in round 1. |
| F4 | `docs/research/collection.md` says a mismatched kept run "refuses to run, writing nothing"; it fetches the fit-out records first (Claude 4). | Accepted. | The worker corrects the wording. |
| F5 | AGENTS.md's fit-out line sits under the unit gates but names the e2e block (Claude 5). | Accepted. | The worker moves the browser block's mention to the e2e specs' list. |
| F6 | No test ties the committed raw fixtures to the catalogue's `source.sha256` (Claude, "Checked, nothing found": the catalogue script). | Noted, not repaired here: it is the same for the eleven fixtures that were there before, and the rules are tested against the fixtures themselves. | A follow-up for landing C, which runs the script over every record. |
| F7 | A floor check in `fit-out-labels.test.ts` compares constants with themselves and cannot fail (Claude 7). | Accepted. | The worker makes it read the built model or deletes it. Checked in round 1. |
| F8 | Looked at from the gate, the card shows the temple proper's size (Claude 8). | Noted for the owner. The record's own element is the temple proper, the card's size line has no place for a part's name, and the card's file is outside this landing. | Reported to the owner with the landing. |
| F9 | Work unit 26's codemod will not see `artworkKit`'s `order` parameters (Claude 9). | Accepted as a note for that session. | Sent to that session on 2026-11-11 with the tests' line numbers. |

Also raised with the owner, outside the findings: the temple's card reads "completed by 10 CE", as the record's `objectDate` does, beside begin and end dates of −10. Both reviewers confirmed the code copies and shows the record's string as the docs say. Whether to override it is the owner's decision, asked on 2026-11-11.

## Verification

- Against `9176e57`, by the worker: `npm run verify` through the gate lock, exit 0 (781 unit tests in 84 files, typecheck, lint, build, 92 e2e tests with no retry). `47217c5` differs from `9176e57` only in `docs/work/27_improvement-list/plan.md`, which the coordinator checked with `git diff --stat 9176e57 47217c5`.
- By the coordinator: the builders' diff read (the `artworkKit` wrapping and nothing else), the four lines of `src/ui/art-card.test.ts` read, the temple's raw record read from the committed fixture, and three of the worker's real-page screenshots read at native size (the temple clicked, Diana looked at while walking, the choir screen clicked).
- The claim behind F1 confirmed by the coordinator in `src/main.ts` lines 96 to 100.
- Not run in this round: any test of the findings themselves; the reviewers ran nothing.

## Round outcome

Codex rejects on F1; Claude approves with findings and counts F1 minor. The coordinator takes F1 as a defect to repair before landing. Repairs requested for F1, F2, F3, F4, F5 and F7; F0 repaired by the coordinator; F6 and F8 noted; F9 passed on. The repairs are checked in round 1.
