# Review 3: implementation

## Target

Landing B of work unit 29, more forms for the artworks' placeholders: repository met, commit `4d4c6e3` on the worker's branch `worktree-agent-a419a2463f2a69209`, read in a clean checkout at that commit. Landing B is five commits of that branch (`2804bb8`, then `d63a3c4`, `54d5df8`, `d0eb9ab`, `4d4c6e3`); between them the branch merged origin's main twice (`419a189`, `a3b5704`), and those merges and landing A2 under them were not under review. The reviewers were given `git diff 419a189 2804bb8` (2 files) and `git diff a3b5704 4d4c6e3` (17 files, 1,143 lines added and 137 removed).

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, codex-cli 0.163.0. Its sandbox check kept the lane. It read `src/model/lib/check.ts` and `scripts/met-catalogue.ts` outside the diff.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, limited to Read, Glob, Grep, Task and three read-only git commands, permission mode `dontAsk`, no MCP server. One result event on that model alone; 27 reads, 22 searches, 1 glob and 6 shell calls, no subagent call.
- The tree's `git status` and `git diff HEAD` were empty before and after, at the same HEAD. Neither lane ran tests, builds or network requests. No lane abstained.

The prompt said that the McKim, Mead and White area's mesh cap going from 160 to 170 is the coordinator's decision of 2026-11-11 and not a finding, and asked whether the record of it is accurate and whether any other budget number moved.

## Reports

Absolute paths of the reviewed checkout in the lanes' links are shortened to repository paths, and a report's own headings are set two levels down. Nothing else is changed; each lane's own finding numbers are kept as it wrote them, and the table after the reports maps them.

### Codex (gpt-6-astra)

Found two minor issues and one documentation nit. Review was static: no files changed, tests/builds run, or network requests made.

1. **Minor — Dionysos’s supporting arm cannot reach the smaller figure.** [figures.ts:125](src/model/collection/figures.ts:125)

   ```ts
   poseArm(b, frame, 1, [[0.22, 0.31, 0.03], [0.26, 0.38, 0.07]]);
   draped(b, [0.13, 0, 0.07], 0.66);
   ```

   The trunk starts at Y `0.46`, putting that elbow at `0.77`. Including the arm’s thickness, its lowest point remains above approximately `0.724`. The smaller figure ends at `(0.905 + 0.066) × 0.66 = 0.64086`, using [body.ts:98](src/model/collection/body.ts:98). That leaves at least approximately 17 cm of vertical separation at this object’s recorded height.

   `CHOSEN` describes this as “leaning on a smaller draped one”; the defining supporting gesture is absent. Lower the arm or adjust the smaller figure.

2. **Minor — The new solid checks do not reject zero-area triangles.** [kinds.test.ts:73](src/model/collection/kinds.test.ts:73)

   The test calls `attributeProblems(geometry, name)`, but the unchanged [check.ts:18](src/model/lib/check.ts:18) checks finite positions, normal lengths and index validity—not triangle area. Its triangle check is only:

   ```ts
   if (triangles(geometry) === 0) problems.push(`${name} has no triangles`);
   ```

   Appending a triangle indexed `[i, i, i]` to an otherwise valid form leaves its bounds, volume and ray readings unchanged and can remain below the triangle cap. This is an additional unguarded defect class beyond the documented thick handles. I did not identify a particular current triangle as degenerate; this finding concerns the gate’s coverage.

3. **Nit — The recorded triangle baseline is four triangles low.** [plan.md:128](docs/work/29_artwork-cards-and-forms/plan.md:128)

   The paragraph says `"from 40,290 triangles to 73,686"`, while the stated model totals increase by 33,392. Those collection totals increase by 33,396. Counting the previous forms and their placement accessories from the code gives **40,294**, which reconciles the deltas. Correct the baseline so the budget record is reproducible.

Other areas checked:

- **Geometry and consumers:** Positive `fitUnit` scaling preserves winding. Mirrored arm coordinates construct fresh limbs; the handles negate both X and Z, preserving orientation. The unchanged mesh builder also reverses triangle winding for negative determinants. I found no concrete new route intrusion, label failure or walker trap from reading the placement and collision code; runtime behaviour remains unverified.
- **Tests:** The old unit-box assertion survives at the same precision. The eleven described mutations plausibly exercise the assertions named, but their reported executions were not independently verified. The thick-handle bound leaves self-intersection and loss of the handle opening unchecked. Sampling also leaves between-grid defects unchecked, and same-kind assignment mistakes can pass when both forms remain used.
- **Table and documents:** There are 76 unique nonpainting assignments, with no missing or extraneous rows or kind mismatch; all 18 paintings resolve to `canvas`. No evidence of image use for the five non-public-domain placeholders appeared in the reviewed code.
- **Catalogue:** The first range changes 94 fetch dates, seven metadata dates and 19 response hashes, plus the sampler’s Chrome version. Derived values and all four fit-out records—including Dendur’s date override—survive. Later changes are limited to the two size overrides and generation date. The unchanged [met-catalogue.ts:124](scripts/met-catalogue.ts:124) uses `new Date().toISOString().slice(0, 10)`, explaining November 12 UTC; I found no runtime dependency on that date.
- **Budgets and rules:** The per-space recount gives 66 collection meshes and twelve additional MMW meshes. The header accurately records the earlier decision at eleven additional meshes. Collection caps remain 110/600,000 and model caps 900/3,000,000. No other budget relaxation, oversized changed source file, committed image or new network path was found. Coordinator contact-sheet acceptance remains unchecked in the plan.

APPROVE WITH FINDINGS — Dionysos’s supporting arm does not reach the smaller figure.

### Claude (claude-opus-5-5)

Nothing in landing B breaks a gate's contract. The table is complete and kind-correct, the catalogue changes are what the claims say, and the budgets recount. What I found is mostly visual defects that no reading can catch, plus some inaccurate records. I couldn't run anything (read-only), so the stretch numbers below are worked out from the parts' coordinates and are good to about ±5%.

#### Findings

**F1 — minor. Three supports stand off their base and float above the plinth.**
- `support()` starts every stump at `y = 0`, the top of the base disc (`body.ts:102-103`: `limb(b, [x, 0, z], [x, height, z], …)`). The nude's disc is `disc(b, 0.2, 0.15, 0.035, [0, -0.035, 0])` (`figures.ts:31`). After `fitUnit`, anything at `y = 0` that isn't over the disc hangs 0.035 of the drawn height above the plinth.
- **Paris (`leaning`).** `prop: [0.3, -0.01, 0.68, 0.07]` (`figures.ts:69`) puts the stump at x 0.23–0.37, wholly outside the disc's rim at x ≤ 0.2. At 2.032 m its foot is about 7 cm over the plinth.
- **Wounded Amazon (`handOnHead`).** `b.box([0.19, 0, -0.06], [0.31, 0.57, 0.06])` (`figures.ts:62`). The disc reaches x 0.2 only on its centre line (0.183 at z ±0.06), so about 5% of the pillar's footprint rests on it and the rest floats about 7 cm up.
- **Nydia (`striding`).** The staff (`poses.ts:85`) ends at x −0.15, z 0.248–0.272, just past the disc's rim at z 0.248 (`poses.ts:79`), about 5 cm over the plinth.
- **Ugolino's kneeling son.** `ball(b, [-0.28, 0.21, 0.1], [0.08, 0.2, 0.075])` (`poses.ts:42`) has its bottom 1 cm above the base, about 2.5 cm at full size.
- Why it matters: no reading asks that a part rests on anything. The placement test reads the piece's bottom, which is the disc's. The plan's account of the contact sheet doesn't mention these.

**F2 — minor. The stretch onto the recorded box distorts several figures well beyond what the account says was tuned.**
- **The two torsos (254608, 255210).** `torso` (`figures.ts:111-115`) is drawn about 0.80 as wide as it is high (stumps ±0.207, y 0.306–0.826). Their widths are the whole-figure estimate of 0.38 h, so they show at about 0.48 of their drawn width: a trunk about 8 cm across on a 28 cm statuette. This is the same case as the bowl and jar that the landing fixed with picks (`plan.md:126`), but it isn't fixed here.
- **Squeezed by estimated widths:** Paris to about 0.58 (trunk about 0.35 m across and 0.43 m deep). The Diadoumenos and the Amazon go to about 0.64 (elbows at ±0.306 against a 0.38 h estimate).
- **Stretched by measured depths that include a base:**
  - Perseus: drawn depth 0.29 h against a recorded 0.42 h, so ×1.47. His chest is about 0.58 m across and 0.73 m deep. The comment at `figures.ts:75-76` claims slenderness only across.
  - Bacchante: about ×1.5.
  - Bather (`poses.ts:51-63`): drawn 1.27 times as long as high, recorded 0.91, so she shows about 1.4 times taller relative to her length.
- The Limits mention estimates showing in the stretch; they say nothing about the measured cases.

**F3 — minor. The five non-public-domain forms rest on more than their records, and the documents say otherwise.**
- `forms.ts:94-96` says those forms follow "the record's title and proportions and what is commonly told of the work".
- `figures.ts:4-5`, `plan.md:69`, the plan table's "record:" reasons (`plan.md:98-101`) and `collection.md:40` and `:105` all say title and proportions only.
- The record `scripts/fixtures/met-api/object-10105.json:1` holds the title, one tag ("Male Nudes") and the dimensions. Yet `struggle` draws "one fallen along the ground, its head lifted, the other standing over it with a foot on it" (`poses.ts:91`). Bacchante's right-hand grapes, three frogs and the angel's reaching arm are likewise not in the titles.
- There is no sign an image was used: those entries carry no `image` and are coloured from `medium`, and `catalogue.test.ts:153-155` guards sampling. But the stated provenance is narrower than the code's own.

**F4 — minor. The `mmw.test.ts` header misstates the count.**
- `mmw.test.ts:8-10` says the forms "added 11 meshes". They add 12: the Greek and Roman court goes from 4 to 10 and the Greek galleries from 6 to 12, so 156 → 168.
- `d63a3c4`'s commit message records 167 when the header was written; `handOnHip` (`54d5df8`) came later.
- The decision itself (cap 170) is recorded correctly.

**Nits**
- **F5.** `plan.md:128`: 1,610,563 + (73,686 − 40,290) = 1,643,959, not 1,643,955. The worker's own commit counts put the model less the collection at 1,570,269 at every revision, so the base was 1,610,559. The 1,610,563 figure is work unit 26 review 0's count.
- **F6.** `collection.md:46` still says the pieces "take 38 meshes and 40,290 triangles"; it is now 66 and 73,686.
- **F7.** `poses.ts:114` says "their backs just in it", but the backs reach z −0.021 and −0.012 against the slab face at −0.03 (`poses.ts:113`). That leaves 2–4.5 cm gaps.
- **F8.** `body.ts:28` has a `turn = 0` parameter that none of the nine calls passes, though the plan describes it (`plan.md:67`).
- **F9.** `kinds.test.ts:133` (`formOf(entry)` vs `FORMS[formNameOf(entry)]()`) is a tautology given `forms.ts:207-209`.

#### The rewritten test
- **Nothing was dropped.** The old file's one assertion (every `kinds.ts` export fills the unit box, at least 10 forms) survives at `:71-77` over FORMS plus the unit box, and `:66` raises the floor to more than 40. I checked that every export of the four new form modules is in `forms.ts:12-17`.
- **The red proofs are believable.** For example, the open-limb proof's "28 problems" equals the 27 figure forms (all of which reach `limb`) plus the censer's legs. Eleven are listed, which matches the header.
- **The overlap measure is right.** It reads the parity/winding disagreement (`closure-readings.ts:140`), and a triple overlap reads as inside both ways, as the walk would.
- **What the stated bound leaves open.** A tube too thick for its bend folds its inner side into a void with winding 0, which parity and winding both read as outside, so no reading differs. `tube` is used only for handles. Left open in the same way:
  - parts that don't touch (F1);
  - proportions after the stretch (F2);
  - profile folds narrower than a 1/64 cell (`facing.ts:159-161`);
  - the overlap grid's own stated bound.
- **Unused forms.** `recumbent`, `jar` and `block` are now taken by no object, so `closure.test.ts`'s crossing-query and upright-face readings no longer reach them. They are unchanged and passed before.

#### Checked, nothing wrong
- **Geometry.**
  - No mirroring matrix anywhere: every mirror is of points (`body.ts:79`, `:116-125`; `vessels.ts:34`), and `builder.ts:273-281` would flip winding anyway.
  - `fitUnit` scales positively and carries normals through the normal matrix.
  - All profiles run foot to top. The bowl, sleeve vase, covered jar and both kraters don't self-cross.
  - Handles and legs stay within the body's radius (0.40–0.50).
  - No zero-length limbs, and no randomness.
- **The table.** 76 rows (TypeScript rejects duplicate keys), every kind matches, and the plan's table agrees with `CHOSEN` row for row.
- **The catalogue in `2804bb8`.**
  - All 94 placeholder fetch dates changed, and the sampler line's Chrome version went from 155 to 157.
  - 7 `metadataDate` changes: 459082, 459090, 459088, 459052, 459055, 459016, 247967.
  - 19 body hashes: those 7 plus 254925, 22907, 467594, 463706, 464593, 12004, 204619, 459106, 52798, 50263, 64484, 247964.
  - The fit-out records and the temple's `"dateFrom":"pick"` survive as context lines.
- **The catalogue later.** Only the header's date and the `size`/`sizeFrom` of 44745 and 42449 changed. Nothing depends on the 2026-11-12 date: `catalogue.test.ts:80` checks only its format, and `scripts/met-catalogue.ts:124` writes it in UTC.
- **Budgets.**
  - The recount gives 66 meshes (4+10+4+3+9+11+2+9+2+12) against 38 before.
  - `placement.test.ts:69-70` and the spec's Budgets are untouched.
  - The hunt, core and Roche area caps are unchanged; the balcony, Dendur, Engelhard and Petrie steps grew and their gates hold them.
- **On the page.** The bowl's vitrine grows from 0.43 to 0.72 m (`place.ts:109-110`) but stays 0.24 m off the wall (`spaces-b.ts:114`, `:124`). I found no enclosure that could trap a walker. One untested opening: by the coordinates, a walker could stand on Perseus's 0.25 m plinth behind his right side, where the old group form filled the box.
- **Rules.** No file over 500 lines, no image committed, no network request.

#### Not verified
By `4d4c6e3`'s own commit message, neither the build nor the e2e suite ran on that revision, and the final hips change wasn't captured again on the sheet. `routes.spec` walks up to two changed forms, the Sphinx and Ruth Gleaning.

APPROVE WITH FINDINGS — the finding that matters most is F1: Paris's stump and the wounded Amazon's pillar stand off their base discs and float about 7 cm above their plinths, and no gate checks it.

## Findings and disposition

Both lanes approved with findings. The numbers continue review 2's; the lanes' own numbers are in brackets.

| ID | Finding | Decision | Repair asked |
|---|---|---|---|
| F18 | The Hope Dionysos's supporting arm does not reach the smaller figure, about 17 cm apart at the object's size (minor; Codex 1). | Accepted. | The arm rests on it. |
| F19 | The solid checks do not reject a zero-area triangle (minor; Codex 2). | Accepted. | The check for every form, with its red proof. |
| F20 | The plan's triangle baseline is 40,290 where the old forms count 40,294 (nit; Codex 3, Claude 5). | Accepted. | Corrected, with F25. |
| F21 | Parts that stand off their base float over the plinth after the stretch: Paris's stump and the wounded Amazon's pillar about 7 cm up, Nydia's staff about 5 cm, Ugolino's kneeling son 1 cm (minor; Claude 1). | Accepted. | Every part that should rest on the ground or the base rests on it, and a reading that catches a part over nothing, for every form, with its red proof. |
| F22 | The stretch onto the recorded box distorts several figures: the two torsos shown at about 0.48 of their drawn width, Paris 0.58, the Diadoumenos and the Amazon 0.64, Perseus's depth by 1.47, the Bacchante's by about 1.5, the Bather about 1.4 taller for her length (minor; Claude 2). | Accepted. | The torsos treated as the bowl and the jar were; a form drawn with its base or support where the record's measure includes it; a bound in the form test on the stretch each object applies. |
| F23 | The five forms of the objects that are not public domain take more than their records' titles and proportions, as `forms.ts` says and the other documents do not (minor; Claude 3). No image was used. | Accepted. | Every document says what `forms.ts` says, and names for each of the five what it took from common knowledge of the work. |
| F24 | `mmw.test.ts`'s header says the forms added 11 meshes; they add 12 (minor; Claude 4). | Accepted. | The header made true, for the triangle share too. |
| F25 to F29 | The plan's model total; `docs/research/collection.md`'s 38 meshes and 40,290 triangles; the Milmore figures 2 to 4.5 cm off their slab against a comment that says they are in it; `body.ts`'s unused `turn` parameter; an assertion in `kinds.test.ts` that cannot fail (nits; Claude 5 to 9). | Accepted. | Each corrected. |
| noted | A walker may now be able to stand on Perseus's 0.25 m plinth behind him, where the old form filled its box (Claude, untested). | Not a change for this round. | The worker says whether the walker can step onto a plinth; if so it goes to the owner. |

The coordinator's own reading, and the owner's remarks. The coordinator read all 94 rows of the contact sheet at native size against the objects' images, and the page shots, and accepts the forms: every sculpture's pose and every vessel's profile says what it is, the weakest rows being the ones the worker named. On 2026-11-11 the owner, looking at the live page with the nine old forms, wrote "Statues are also way too low poly". So this round also takes every round part of a figure from 8 sides to 16, the McKim, Mead and White area's triangle share going from 500,000 to 560,000 for it by the coordinator's re-assignment inside the spec's totals, and a landing B2 follows that gives each figure one continuous skin.

## Verification

- The worker's `npm run verify` on `4d4c6e3` with a clean tree, through the gate lock: 732 unit tests in 84 files, typecheck, lint, build and 93 e2e tests in 7.0 minutes, one run. Claude's note that neither the build nor the e2e suite ran on that revision reads the commit's message, which was written before that run.
- The contact sheet and page shots, ignored, in the worker's worktree under `.shots/sheet-b/`.
- Not checked in this round: the repairs, which a second round reads with one lane.

## Round outcome

Approved with findings by both lanes; twelve findings accepted and returned to the worker on 2026-11-11 with F16 and F17 of review 2. Landing B lands after its repairs are gated and the repairs that change behaviour are read by one lane.
