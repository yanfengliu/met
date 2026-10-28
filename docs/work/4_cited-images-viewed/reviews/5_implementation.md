# Review 5: implementation (F-owner-1's repairs)

## Target

The met repository, branch `claude/exciting-lichterman-7927b8`, commit `d513c40` ("Answer review 4 of the choir screen: no lattice, pediments carried, stone base, iron gate arch"): the repairs of F25 to F35, `git diff 5ec7296..d513c40`, piped to both lanes, which also read the committed tree. `5ec7296` merged `origin/main` (`00eeee7`, a test-timeout change reviewed in its own session) into the branch. The renders of `d513c40` were in the ignored `.shots/choir-r5/`.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, codex-cli 0.163.0, read-only sandbox, the prompt as an argument and the diff on stdin, `--ephemeral`. It recomputed every repair, ran exact triangle tests on the new joints and `openAlong` over the screen's 546 pieces, counted its geometry and material pairs, ran the citation gate's checker, read `arches.ts` and `medieval-hall.ts` outside the diff and inspected 19 images. No DLL failure markers in its log.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, tools Read, Glob, Grep, Task and `git diff`, `git log` and `git show`; the report command printed `keep`. It built the screen step at `d513c40` and `a064995` in a scratchpad probe with exact mesh distances (three-mesh-bvh), `openAlong` and `Timeline.stats`, and read 19 images at native resolution.
- Neither lane ran `npm run verify` or changed a file (checked with `git status` after both ran).

## Reports

The reports as each lane wrote them; nothing was redacted.

### Codex

I found **no correctness defects in `5ec7296..d513c40`**. F25–F35 are repaired as recorded. One whitespace nit remains.

**S1 — nit — [plan.md:68](C:/Users/38909/Documents/github/met/.claude/worktrees/nice-leakey-9be7b0/docs/work/4_cited-images-viewed/plan.md:68).** An extra blank line at EOF makes `git diff --check 5ec7296 d513c40` exit nonzero. Remove that blank line, retaining the final newline.

Checks completed:

- **F25:** #29, #44 and P8 support identifying the lattice as the background window.
- **F26:** Pediments span **13.29277–13.68761 m**, at **41.8715°**. Exact triangle checks confirm both inner ends meet the gilt bar and all four supporting C-scrolls meet their pediments and oval rims.
- **F27:** The generated, faceted arch reaches **4.41446 m**, overlapping the frieze’s foot by **4.46 mm**. Its iron material and closed back agree with the disposition. I checked the construction outside the diff in [arches.ts:268](C:/Users/38909/Documents/github/met/.claude/worktrees/nice-leakey-9be7b0/src/model/core/arches.ts:268).
- **F28:** Limestone reaches **0.98 m**. The base clears both middle pier plinths by **20 mm**, confirmed against [medieval-hall.ts:68](C:/Users/38909/Documents/github/met/.claude/worktrees/nice-leakey-9be7b0/src/model/core/medieval-hall.ts:68) and the generated pier geometry.
- **F29–F30:** Outer ray centre tips span **0.63011 m**, leaning **36°**; the middle reaches **14.28 m**. Scroll feet remain within their plinths, with **7 mm** at the outer edges; finial supports remain supported.
- **F31–F32:** Constant scaling reads up to **9.058 cm higher**. The depth uncertainty is now stated; its magnitude remains an estimate.
- **F33:** Urn top **14.13 m**, spire top **14.40 m**, cross foot **14.36 m** and tip **15.85 m**. Their joints connect; the stated simplifications match the code.
- **F34–F35:** The owner finding and review record are present; the derived ring constants and explicit leg counts preserve their intended behavior.

All **546 pieces** pass `openAlong`. The screen retains **9 geometry/material pairs**; the core remains at **130 meshes**. The citation gate’s repository checker reports no problems.

I inspected **19 images**, including all eight revision renders, and checked the changed documentation against the code and photographs. Full `npm run verify` and interactive playback were **not rerun**. No files were changed or persistent processes launched.

Inspected-image manifest SHA-256: `8388373619273dc7ee574a763640d838c2ab3192e6bd251c226b679a373e3f62`.

### Claude

I found no blocker, major or minor issue in `d513c40`. All eleven repairs, F25 to F35, are correct and complete as their dispositions describe, and I recomputed each one from the code. I have three nits.

I did not run `npm run verify`. The author's `tmp/choir/logs/verify-5.log` passed on the committed code: 650 unit tests and 84 e2e. `choir-screen.ts` was last written at 13:47:28, before the `.shots/choir-r5/` renders (13:47:52–57), and committed at 14:02:47, so the renders show this revision. The working tree is clean.

### Findings

**S1 · nit · `docs/devlog/summary.md:5`, `docs/work/4_cited-images-viewed/reviews/4_implementation.md:134` and `:153` — the docs say P8 shows the same window that appears behind #29's medallion.**
- **What's wrong:** the devlog says "as P8 shows that window". F25's disposition says P8 shows "the same grey disc and lattice". The round outcome says P8 "confirms" it. But P8 looks east (`interior-images.md:43`, `src/viewer/presets.ts:67`), and #29 very likely looks west:
  - The centre row of #29 (y 2000) reads 8.16 m by the entry's own projection, if the frame is not shifted. That is eye height on the east balcony (the second floor, 6.86 m up), where the author's level views also stand.
  - From 14.9 m off and 7.94 m up, the model's own west oculus (`constants.ts:39`, 17.29 m up) lands at 12.15 m in the screen's plane. That is exactly the medallion's centre.
  - Through its gate, #29 shows a curtained arch lit from behind (`29-gate-foot`). P8 shows the east doorway opening onto a lit gallery (`P8-gate`).

  So the docs describe two different windows as one. Their bars also differ: P8's read as a square grid at its size, #29's as a diagonal lattice. F25's conclusion still stands: in #44 the disc sits below the top frieze, not behind the medallion.
- **Failure:** a reader takes P8 as proof of #29's lattice, and sizes or patterns the west window from the east one.
- **Repair:** word the three passages as `choir-screen.ts:51-52` and #29's entry already do ("a window like the one P8 shows in the east wall"). Name #44 as the evidence, and record in #29's entry which way it looks.

**S2 · nit · `src/model/core/choir-screen.ts:141` — the gate arch's rise is a number tuned by hand.**
- **What's wrong:** `rise: 0.575` meets the frieze only while the frieze's foot is at 4.41 m (`TIERS[0][1]`) and the springing at 3.7 m (`GATE_SPRING`). Codex R3 asked for the rise to be derived from the frieze. The new joints in the cresting are tuned the same way: the C-scrolls (12.875, 0.85 × 0.5), the pediments (13.33, 0.48 at 0.84 rad) and the bar (13.60–13.66). They all meet today, but nothing derives or checks them.
- **Failure:** re-measure the lower frieze within the entry's ±0.1 m, or move the springing, and the arch floats under the frieze or cuts into it. No gate would notice: `a064995`'s 3 cm gap and its four floating pediments passed every gate.
- **Repair:** `rise: (TIERS[0]?.[1] ?? 4.41) - GATE_SPRING - GATE_BAND + 0.005` with `GATE_BAND = 0.14`, which gives 0.575 today. The 5 mm covers the 0.5 mm the facets lose at the crown. Optionally, add a check to `core.test.ts` that the screen's pieces form one group touching the floor within 1 mm. My scratch version runs in about 1 s and fails on `a064995`, naming exactly the four pediments.

**S3 · nit · `src/model/core/choir-screen.ts:187-188` and `:50` — the new spire is a rod, and the comment doesn't say so.**
- **What's wrong:** the spire is a 0.1 m cylinder, the same width as the cross's gilt stem, which hides it above 14.36 m. It reads as a dark rod from 14.13 to 14.36 m (`elev-crest-2x.png`, `level-cresting.png`). #29 shows a dark bell-shaped cone about 0.20 m across on the urn's lip (`29-cross`, rows 955 to 905), tapering to 4 cm by about 14.4 m. The simplifications listed at `:50` name drums for urns but not the spire. They also don't name the gate's gilt spandrel scrollwork, which #29's entry now describes ("dark with gilt in its spandrels").
- **Failure:** the spire reads as a missing part against #29, and F33 says the comment names the simplifications.
- **Repair:** taper it with two drums of `round` in `iron`, a pair the step already has (about 0.2 m and 0.08 m across). Otherwise name both simplifications at `:50` and beside `GATE`.

### F25 to F35, recomputed

I built the screen step at `d513c40` and at `a064995` from `git show`, in a scratchpad probe using exact mesh distances (three-mesh-bvh), `openAlong` and `Timeline.stats`.

| ID | What the code does now |
|---|---|
| F25 | The lattice is gone: 580 pieces become 546 (40 bars and the sill removed, 7 pieces added). |
| F26 | The pediments span 13.293–13.688 m at 41.9°. Each one crosses its gilt bar and its C-scroll, and each C-scroll crosses both halves of the rim. The rays clear the pediments by about 0.11 m. The nearest other piece is a finial's flower, 4.95 cm away. At `a064995` these four pediments were the only floating pieces; at `d513c40` every piece links to the floor within 1 mm. |
| F27 | The ring has 35 facets, so its crown sits on a chord 0.5 mm under the true arc, at 4.41446 m: 4.5 mm into the moulding (it was 4.37944 m). It is iron and closed at the back. |
| F28 | The base spans x ±6.48 and z ±0.25, from 0 to 0.98 m. It stands 0.0200 m from the middle piers: their plinth face is at Z −99.67 (`medieval-hall.ts:68`, `constants.ts:51`). The piers' half-shafts reach Z −99.60, but only at \|X\| ≥ 6.80. |
| F29 | The ray tips span ±0.315 m (0.63 m across). The outer rays lean 36° and end at 14.06 m; the middle one reaches 14.28 m. |
| F30 | The side scrolls' outer feet are at 2.357 and 4.643 m, 7 mm inside the plinths. All finial stems and end legs stand on plinths. |
| F31, F32 | The wording is right. The ±0.1 m bound is consistent with the coping band in #29 (rows 3273–3289, about 0.09 m) for a camera about 8 m up. |
| F33 | The urn runs 13.54–14.13 m. The spire rises from inside the lip; the cross's arms are at 15.18 m. The branches' tips stand 11.4 cm off the lip (7.5 cm before). They end free, like #29's foliate sprays, so they don't count as floating. |
| F34, F35 | Correct. The round 4 record quotes both reports unchanged apart from heading levels. |

### New defects looked for

None found:
- **Closure:** all 546 pieces are closed along vertical lines.
- **Mesh budget:** the core area stays at 130 meshes at both revisions, against the budget of 130 (`core.test.ts:34`). The step keeps 9 geometry and material pairs, because the new arch in iron replaces the old arch in gilt. Triangles go from 206,200 to 207,280.
- **Cutting through:** among the changed pieces, the only crossings are the joints listed above.
- **Citation gate:** the new `interior-images.md #P8` citation is in the right form, and P8 is marked viewed.
- **Numbers in comments:** they match the code. The pediment's foot at 13.29 m against the comment's 13.31 m is the bar's thickness.
- **Renders:** pixel differences against `.shots/choir-final/` fall only in the cresting, the gate arch and the base.

### The renders against the photographs

**Now agreeing:**
- The base reads as light stone up to the balusters' feet (compare `29-base`).
- The arch is a dark band whose crown touches the frieze (`29-gate`).
- The side pediments rest on scrolls, slope as in #29, and carry narrow sheaves (`29-left-cresting`).
- The side plinths leave #29's gap, and the middle urn is dark.

**Still disagreeing:**
- The gate stands open in #29 and P8, with the base broken under it and ending in consoles. The model runs balusters and base across it (F-owner-5).
- The gate's gilt spandrels and the spire's cone are missing (S3).
- The base is panelled in #29 but a plain block in the model.
- The ornament is simplified as the comment states.
- The backgrounds cannot be compared: the level renders stand 11.2 and 13.5 m up, not at #29's height of about 8 m.

### Outside the diff (already there at `a064995`)

- **O1:** the end posts of the middle tier pass 2 cm into the arcade's string course: posts at x ±6.32..6.48 (`choir-screen.ts:120-121`), string course at x ±6.46..6.62 and 6.51–6.86 m (`medieval-hall.ts:116`). This is the screen's only crossing with another step.
- **O2:** the end windows don't match the photographs.
  - Seen from the preset that stands for P8's view, the model's east window appears just above the middle frieze. P8 shows it a third of the way down the middle tier, which would put the real window about 4 m lower.
  - If #29 was taken from the east balcony, as S1 argues, its window is about 3.3 m of glazing in a 5 m surround, against the model's 2.4 m (`constants.ts:39`, an estimate).

  This is for the owner, not this change.

### For round 5's record

- Record the passing run `verify-5`, and also the two runs before it that failed with Windows code 0xC0000142. In `verify-3`, 15 e2e tests failed and 51 did not run; in `verify-4`, the dev server did not start.
- After the merge, republish the render gallery, as `local-rules.md:7` requires.

I read 19 images at native resolution (the 8 renders in `.shots/choir-r5/` and 11 photograph captures), plus 4 enlargements I made from them. Their sha256 list is in `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nice-leakey-9be7b0\400254eb-e495-468d-82e1-bdbf2540f712\scratchpad\inspected-digests.txt`, and the list's own hash is `c03e975830819400a0b68a8a8d8c12e3d54a095511c1dd100e2d58a3c8542451`.

Files are in `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nice-leakey-9be7b0\400254eb-e495-468d-82e1-bdbf2540f712\scratchpad\probe\`:
- `screen.probe.ts`
- `out.txt`

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F36 | `plan.md` ended with a blank line, so `git diff --check 5ec7296 d513c40` failed (Codex S1, nit) | Accepted | The blank line is gone |
| F37 | The devlog and round 4's record said P8 shows the same window #29 shows behind the middle medallion; P8 looks east and #29 most likely west (Claude S1, nit) | Accepted | Each says "a window like the one P8 shows in the east wall", and names #44, where the disc sits below the top frieze; #29's entry records that it most likely looks west from the east balcony, its centre row at an eye there, about 8.2 m |
| F38 | The gate arch's rise was tuned by hand to the frieze's foot, and nothing derives or checks the cresting's new joints (Claude S2, nit) | Accepted for the arch: its rise is the frieze's foot less the springing and the band, plus 5 mm past the 0.5 mm its facets lose (0.575 m, the same arch). The cresting's joints stay placed by hand from measured heights. The optional connectivity check is declined in this change, whose scope is the heights. Floating pediments passed every gate, so the lesson waits for that check as its gate | `GATE_BAND` and the derived `rise`; `docs/learning/lessons.md` and `lessons-evidence.md` |
| F39 | The spire was a 0.1 m rod where #29 shows a dark cone about 0.2 m across tapering to about 4 cm, and the comment named neither it nor the gate's gilt spandrel scrollwork as simplified (Claude S3, nit) | Accepted | The spire is two dark drums, 0.2 m and then 0.08 m across, to 14.4 m. The cresting's comment names it, and the note beside `GATE` says the arch's spandrel scrollwork is left out |

Outside this change, both from Claude's report:
- O1: the middle tier's end posts pass 2 cm into the arcade's string course (posts to ±6.48 m, the course from ±6.46 m, 6.51 to 6.86 m up). That was so at `a064995` and before, at the old tier's heights too. It is noted here, not changed.
- O2: the hall's end windows against the photographs. This is recorded for the owner as F-owner-6 in `../plan.md`, not measured here.

## Verification

- `d513c40`: `npm run verify` (MET_PORT 5347) passed: 650 unit tests, typecheck, lint, build and 84 e2e (`verify-5`). Two runs on the tree before it, `verify-3` and `verify-4`, were stopped by hand to apply repairs (the base's depth, then the pediments' slope and the sunbursts' width). Their e2e errors are the stop's: workers and the dev server exiting with 0xC0000142 and a refused connection. The full runs before and after them passed.
- The repairs: `npm run verify` (MET_PORT 5347) passed on the repaired tree: 650 unit tests, typecheck, lint, build and 84 e2e (`verify-6`). `git diff --check 5ec7296` passes.
- The renders of the repaired tree (`.shots/choir-r6/`) were read at native resolution: the spire steps in from the urn's lip, and nothing else moved.
- No further round was run: the four repairs change a wording, a blank line, a derived constant that gives the same arch, and two drums of an existing pair.

## Round outcome

No blocker, major or minor finding. Codex found one nit, and Claude three, with two notes outside this change. All four nits, F36 to F39, are accepted and repaired, with this record, in the commit after `d513c40`. The follow-up's review closes here.
