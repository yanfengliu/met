# Review 10: implementation (F-owner-5, the choir screen's open gate)

## Target

The met repository, branch `claude/determined-rosalind-b5bcfb`, commit `db1e297` ("Open the Valladolid choir screen's gate, as its photographs show it"): `git diff 44ea7b7 db1e297`, piped to both lanes, which also read the committed tree. `44ea7b7` is main with F-owner-1's follow-up merged. The prompt gave the task, its five acceptance criteria and the author's readings, checks and render paths in an ignored `tmp/review-runs/gate-r0/evidence.md`, with five photograph captures the choir-screen session made for review 4 (#29's gate and its foot, P8's gate and whole view, and #29 whole with the measured heights).

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, codex-cli 0.163.0, read-only sandbox, the prompt as an argument and the diff on stdin, `--ephemeral`; no sandbox failure in its log. It reproduced the three walks and their red result, recomputed the rail and base geometry with exact distances, counted the core area's pieces, meshes and pairs, read `src/model/core/shapes.ts` and `src/walk/walker.ts` outside the diff, reproduced F-owner-7 (now F-owner-8) through `settle`, and compared the seven final renders with the captures.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, tools Read, Glob, Grep, Task and `git diff`, `git log` and `git show`; the report command printed `keep`. It read the captures and three renders at native size and 3 to 4×, recomputed the leaves' clearances and joints by hand, and read `src/model/core/arches.ts`, `later.ts`, `medieval-hall.ts`, `src/walk/walker.ts`, `tests/e2e/walk.spec.ts` and `src/cited-images.test.ts` outside the diff.
- Neither lane ran `npm run verify` or changed a file (checked with `git status` after both ran).

## Reports

The reports as each lane wrote them; nothing was redacted.

### Codex

Four findings in the change, plus one inherited documentation mismatch:

- **R1 — major: the base does not satisfy criterion 1 literally.** [choir-screen.ts:136](C:/Users/38909/Documents/github/met/.claude/worktrees/determined-rosalind-b5bcfb/src/model/core/choir-screen.ts:136) leaves a **2.20 m opening**, while the posts’ inner faces are 2.44 m apart. Each base projects 12 cm into that space. A walker approaching at X = 0.85 m clears the posts but hits the base; my probe moved it sideways to X ≈ 0.732 m. The ±0.7 m tests miss this discrepancy. **Repair:** explicitly reconcile criterion 1 with the photograph-supported narrower opening and test that agreed width. If full clearance between the posts remains required, trim the base to their inner faces. The photograph supports the author’s measurement; the unresolved issue is the acceptance contract.

- **R2 — minor: the folded leaves’ top rails never reach their posts.** [choir-screen.ts:54](C:/Users/38909/Documents/github/met/.claude/worktrees/determined-rosalind-b5bcfb/src/model/core/choir-screen.ts:54) begins each rail at `[0.1, 3.99]`, omitting the documented connection at 3.88 m. Using the actual geometry, each inner rail ends **7.626 mm short of its post**; its lowest corner is 3.978 m above the floor. The leaves stand on the base, but their ironwork is disconnected from the posts. This contradicts the newest devlog’s claimed rail shape and #29’s visible connection. **Repair:** model the missing connection, preserving four balusters, and reconcile the documented heights with the resulting geometry. I checked the box’s actual origin and extent in unchanged [shapes.ts:27](C:/Users/38909/Documents/github/met/.claude/worktrees/determined-rosalind-b5bcfb/src/model/core/shapes.ts:27).

- **R3 — minor: F-owner-7 incorrectly limits the joint problem to `place`.** [plan.md:49](C:/Users/38909/Documents/github/met/.claude/worktrees/determined-rosalind-b5bcfb/docs/work/4_cited-images-viewed/plan.md:49) says “Only `place` meets it.” I reproduced another trigger: stand on the unfinished hall’s slab at `(0, 4.05, −103.4)`, complete `medieval-hall-floor`, and call `settle`. It returns `kept`; walking along the axis remains 6 cm low. Unchanged [walker.ts:433](C:/Users/38909/Documents/github/met/.claude/worktrees/determined-rosalind-b5bcfb/src/walk/walker.ts:433) explains why subsequent support checks preserve that height. **Repair:** broaden the recorded finding to include construction around the walker. Leaving the walker implementation unchanged remains reasonable for this task.

- **R4 — nit: the walk-test header overstates its coverage.** [choir-gate.test.ts:5](C:/Users/38909/Documents/github/met/.claude/worktrees/determined-rosalind-b5bcfb/src/model/core/choir-gate.test.ts:5) promises the axis and 4 m beyond the screen. The central lane is X = 0.02, the assertions require only 3 m, and the actual east endpoint is 3.868 m beyond it. An obstruction farther out can therefore satisfy the assertions despite the header. **Repair:** describe “2 cm off-axis, more than 3 m past,” matching `AGENTS.md`, or strengthen the endpoint checks.

- **R5 — nit, inherited: the closure inventory is stale.** [AGENTS.md:107](C:/Users/38909/Documents/github/met/.claude/worktrees/determined-rosalind-b5bcfb/AGENTS.md:107) says 870 shapes / 16,766 pieces. Applying the closure gate’s grouping gives **901 / 16,934** here; the base already gives **893 / 16,928**. This is not a regression introduced here. **Repair:** update the inventory or label those figures with their historical revision.

I independently reproduced the three successful walks and their red result against the base screen at Z −100.00. The 2 cm offset correctly avoids the existing placement defect. Counts are correct: **4,925 core pieces, 130 meshes**, with no new geometry/material pair. The rail segments meet; the leaves clear the fixed bars, arch and frieze and pass `openAlong`. The collection zone uses the correct floor and bounds. Citation forms, file lengths, and scope are sound.

I compared all seven final renders with the supplied native-resolution gate crops. They support the open gate, west-face leaves, and north-only rail/lock box. I reviewed the author’s successful verification log: 653 unit tests, subsequent gates, and 84 e2e tests on port 5371. I did not rerun full verification or modify files.

Inspected-image manifest SHA-256: `8fb3bcd883c21cfef92642c4e9a776e7ce5d5bcb7ce31fda4fad86d3d209392e` (sorted `sha256␠␠path\n` records for the seven final renders, five supplied captures, and before/level-gate-east).

### Claude

### Review of `db1e297` (the choir screen's open gate)

**Verdict:** there are no blockers. The code is sound: the geometry, the walk test, the mesh budget, batching, closure and the placement zone all check out. The problem is the reading of #29 that the change rests on.

At native resolution and 4×, #29 shows iron inside each gate post. Neither the model nor the docs carry it, and it narrows the real opening below what the model and its walk test assume. That is R1 (major), and it needs the owner's call.

I viewed the captures at native size and at 3–4× nearest-neighbour zoom:
- `29-gate` (sha256 `2432673a…`), `29-gate-foot` (`da757b34…`), `P8-gate` (`1759688e…`), `P8-overview` (`8b66cda2…`)
- the renders `gate-final/level-gate-east` (`23e3e16e…`), `leaf-north-from-west` (`1509cf79…`), `leaf-south-from-east` (`c11d7397…`)

The original photographs are not on disk, only these captures. I edited no file; my zoom crops are in the scratchpad.

### Findings

**R1 — major.** `docs/research/interior-images.md:97` (#29's new reading); `src/model/core/choir-screen.ts:37-44` and `:136`; acceptance criteria 1 and 5.
- **What #29 shows:**
  - **The base steps.** Its plinth (floor to y ≈ 3372, about 0.46 m) ends at x ≈ 1401 and 1785, about ±1.1 m from the gate's centre (x 1590). Its die and coping (about 0.46 to 1.0 m) end further out, at x ≈ 1375 and 1809, which is the posts' inner faces (about ±1.23 m).
  - **The "iron jamb" stands rather than hangs.** It stands on the plinth's step in that notch (x 1374–1409 and 1770–1810; foot at y 3362–3371), so its inner edge is at about ±1.02 m.
  - **Two iron bars per side rise from the jamb's top.** They stand at x ≈ 1377/1400 and 1775/1800 (about ±1.08 and ±1.20 m) and reach a top piece at y ≈ 2800 (about 3.6 m), just under the arch's springing bracket.
  - So the photograph's clear opening is about ±1.02 m from 0.46 m up to the springing, and about ±1.1 m below that. The posts are not its edges.
- **What the docs and model say instead:** the entry and the code's "Simplified" note say only that the base ends at "1.13 and 1.06 m" and that a jamb "hangs … to about 0.5 m". The two bars are recorded nowhere.
- **Result:** the model meets neither criterion 1 nor #29. The full-height base runs to ±1.1, inside "between the posts" and 0.13 m further in than #29's die. None of #29's iron inside the posts is built. No doc tells the owner that "clear between the posts (±1.3 m)" is not what #29 shows.
- **Failure scenario:** the test's side lanes at x = ±0.70 put the body's edge at ±1.05, beyond #29's jambs at ±1.02. With the photograph's iron built, both side lanes would stop. The test certifies a passage about 2.2 m wide where #29's is about 2.04 m.
- **Repair:**
  1. Rewrite the entry's open-gate sentence: the stepped base, the standing jamb and the two bars, measured from x 1590.
  2. Put the conflict with criterion 1 to the owner and record the answer in the plan.
  3. Either build the two bars per side and the jamb from the screen's own bar and box (no new geometry/material pair, so still 130 meshes), with the die to ±1.23 and the plinth to ±1.1, and move the side lanes to ±0.62; or name all of it in the "Simplified" note.
- **A possible reading:** the top rail seems to continue behind the post toward the bars' top piece, so the bars may be the leaves' hinge stiles. The entry could mention that as a possibility, not a fact.

**R2 — minor.** `choir-screen.ts:48-51`; also `plan.md:76` ("among the bars before it").
- **What's wrong:** the comment says #P8, looking east, shows the leaves in front of the fixed balusters, and that the lock box shows "as both photographs show". The author's `evidence.md` says "P8 alone does not show which face", and records only a mid-height rail in P8, with no lock box. #P8's own entry agrees ("among the fixed balusters").
- **Failure scenario:** the west face rests only on #29 looking west, which is an inference from its centre row and the window behind the medallion. The comment presents it as two independent confirmations, so if that inference were wrong, nothing would flag it.
- **Repair:** "#P8 shows them among the fixed balusters but not which face; the north leaf has a rail at 1.6 m with a lock box (#29; #P8 shows the rail)."

**R3 — minor.** `src/model/core/choir-gate.test.ts:5-7`.
- **What's wrong:** the header says the walker walks "on the hall's axis" and "to 4 m past it". The code walks at x = 0.02 (line 36) and asserts 3 m past (lines 73 and 79), as AGENTS.md says. The `Bound:` line omits the three-lane, walking-only, 60 fps limits, and that nothing above the body's 1.75 m is tested.
- **Failure scenario:** a reader trusts the header and believes the axis itself is walked. The joint that forces the 2 cm offset is a bound the header must name under the fleet rule on gate bounds (R19), but it appears only in a constant's comment.
- **Repair:** state the 2 cm offset and why (work unit 4's F-owner-7), "3 m past", and a bound along the lines of: "three lines whose bodies together span ±1.05 m; walking at 60 fps; nothing above 1.75 m".

**R4 — minor.** `docs/work/4_cited-images-viewed/plan.md:49` (F-owner-7); `docs/devlog/summary.md:5`.
- **What's wrong:** the plan says "Only `place` meets it … and the walk's e2e reads the eye at every spawn." Neither part holds:
  - `Walker.settle` also reads only the centre's line (`src/walk/walker.ts:165`). A walker standing on the slab when the hall's tiles are built round a centre on a joint is kept there. `follow` then holds it, because `support` returns early when the centre finds ground at the feet's level (`walker.ts:433`).
  - `tests/e2e/walk.spec.ts:207` reads the eye only at the Great Hall and second-floor spawns, within 5 cm, so a 6 cm drop fails it by only 1 cm. The plaza spawn is checked in plan only (`:183`).
- **Failure scenario:** the owner decides whether to leave F-owner-7 open on an understated reach.
- **Repair:** say "`place` and `settle` meet it", and state the e2e's real coverage. Leaving the walker itself unchanged is right for this task.

**R5 — nit.** `choir-screen.ts:40`; the #29 entry; `docs/research/interior.md:227`; the devlog.
- **What's wrong:** "(#29: 1.13 and 1.06 m)" is measured from x 1599, the cross's axis. The evidence centres the posts on x 1590. From the gate's own centre the base ends are at 1.08 m (south) and 1.11 m (north), so the recorded 7 cm asymmetry is an artefact and its sign is reversed.
- **Also:** the entry says its open-gate heights are taken "from the frieze's foot", but the rail's 1.6 m and the jamb's 0.5 m are read from the floor. From the frieze's foot the rail reads 1.51 m.
- **Repair:** quote the ends from x 1590, and name each low height's reference.

**R6 — nit.** `choir-screen.ts:54` and `:180`; the devlog.
- **What's wrong:** the model's top rail starts 0.1 m out from the post's axis at 3.99 m, 2 cm clear of the post, and stops about 1 cm past the last bar. #29 shows the rail meeting the post at 3.88 m and running to a stub at u ≈ 0.60 m. The devlog's "curving from 3.88 m at the post" describes the photograph, not the model.
- **Repair:** reword the devlog, or start `LEAF_TOP` at [0.08, 3.97]. The rail stands west of the post's face plane, so it cannot enter the post.

**R7 — nit.** `choir-screen.ts:48-50`.
- **What's wrong:** the IDs in "#29, looking west…", "#P8, looking east…" and "both read on #29" carry no index name. The citation gate does not read such bare IDs (`src/cited-images.test.ts:23-25`). Every other citation in the file names its index.
- **Repair:** write "interior-images.md #29 … and #P8".

**R8 — nit.** `choir-screen.ts:53-59` against `:142-143`; the baluster grid is pre-existing.
- **What's wrong:** the model's fixed balusters stand at |x| = 1.44, 1.60 and 1.76 m. The leaf bars at x 1.45 and 1.59 therefore sit 1 cm behind fixed balusters and vanish in `level-gate-east`. #29 shows the leaf's 0.29 and 0.42 m bars clearly between fixed balusters (x 1266, 1299, 1329). The plan's render comparison doesn't note this.
- **Repair:** record it as a consequence of the existing baluster grid. No code change is needed for this task.

**R9 — nit.** `plan.md:60`.
- **What's wrong:** the Outcome section still lists F-owner-5 as open and "noted beside its code"; that note is gone. F-owner-6 and F-owner-7 are not listed.
- **Repair:** mark F-owner-5 "since acted on", and add F-owner-6 and F-owner-7.

**R10 — nit (process).** `docs/learning/lessons.md:13`.
- **What's wrong:** the queued lesson asks that, before review, a hand-placed ornament's pieces be checked to form one group standing on its support. `evidence.md` records no such check for the 20 hand-placed leaf pieces.
- **My hand check:**
  - The bars and the bottom rail sit on the base's top at 0 mm.
  - Each rail segment's axis passes through the next bar's top.
  - The lock box's top meets the 1.6 m rail.
  - So the group holds; only the top rail's inner end is free, about 8 mm off the post in plan.
- **Repair:** run the lesson's probe and record the result, or land its gate here.

### Checked, no finding
- **Piece counts:** −15 balusters, +1 base box, +9 pieces per leaf, +2 on the north leaf. That is +6, giving 4,925, as claimed.
- **Rail joints:** the segments lean 45°, 49.4°, 61.7° and 74.7°. The 1 cm overlap covers each bend's gap (about 2 mm or less) and leaves no visible spur.
- **Clearances:**
  - The fixed balusters are 4.25 cm east of the leaves.
  - The posts are about 8 mm away in plan, touching the leaves' plane only at the face where they don't meet.
  - The west arch ring (`src/model/core/arches.ts:270-294` projects it 0.06 m) ends at |x| ≈ 1.403 and y ≤ 3.81 m, 0.17 m below the rail.
  - The frieze starts at 4.41 m; the rails top out at about 4.28 m.
  - The lock box clears the baluster at x 1.76 by 4.25 cm.
- **Solids:** no mirrored matrices. Only the unit box and the six-sided cylinder are used, so there is no new sheet and the closure gate is unaffected.
- **Batching:** no new geometry/material pair, so the core area stays at 130 meshes. The step's `stagger: 'y'` (`src/model/core/later.ts:69`) brings the leaves in bottom-up, after the base.
- **Walk test:** the three lanes' bodies together span ±1.05 m, so any obstruction below 1.75 m stops at least one lane. The red proof checks out: −99.65 − 0.35 = −100.00. At 2 m/s the walker reaches about 3.86 m past the screen.
- **F-owner-7's mechanism:** it matches `walker.ts:142` and `:430-445`. The hall's tiles are 6 cm deep with 8 mm joints laid from the centre (`src/model/core/medieval-hall.ts:54`), so the axis does lie on a joint.
- **Rest of the walk:** routes, spawns, the door world and the look target are unchanged.
- **Placement zone:** its [x, z] bounds, floor level and 1.35 m margin read like the other passages' zones.
- **Citation:** the GATE comment's "(#29: …)" falls within the clause of "interior-images.md #29 and #P8", so the gate reads it and passes it.
- **Sizes:** every touched file is under 500 lines, and the docs keep one line per paragraph.
- **Verify log:** `tmp/gate/verify-1.log` shows 653 unit and 84 e2e tests passing, exit 0, finished just before the commit, though it doesn't record the revision.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F70 | The base's ends stood 0.12 m inside the posts, against criterion 1's "clear between the posts" (Codex R1, major); and #29 shows the gate's own iron frame inside the posts, the base stepped, a jamb on each plinth step and two bars over it, none of it built or recorded, so the real opening is about 2.04 m (Claude R1, major) | Put to the owner, who chose to build the gate as #29 shows it rather than clear between the posts (2026-10-28) | Read again on #29 by rows of luminance: the plinth, 0.45 m high, runs on to 1.07 and 1.10 m from the gate's centre (x 1590) and the die stops at 1.22 m; a jamb on each plinth step, its inner face about 1.03 m out; two bars, 1.07 and 1.19 m out, to a head piece at 3.62 m. Built from the screen's own pairs (`GATE_PLINTH`, `BASE_PLINTH`, `GATE_CLEAR`, `JAMB_BARS`, `JAMB_HEAD`), the jamb a plate where #29 shows scrolls; the walk test's side lanes at ±0.63 m, 5 cm inside the jambs, and the collection's zone between the jambs; #29's entry and the plan record it |
| F71 | Each leaf's top rail began 0.1 m out, about 8 mm short of its post, where #29 shows it meeting the post's corner and running on to a stub past the last bar; the devlog described the photograph's rail, not the model's (Codex R2, minor; Claude R6, nit) | Accepted | `LEAF_TOP` starts at [0.08, 3.97], at the post's corner, west of its face; a level stub runs on to 0.6 m; the devlog describes the model |
| F72 | F-owner-7 (now F-owner-8, the 1880 fronts' finding having taken 7) said only `place` meets the floor joint and that the e2e reads the eye at every spawn: `settle` keeps a walker the tiles are built round in the joint, and `walk.spec.ts` reads the eye's height at two spawns within 5 cm and the plaza's place in plan only (Codex R3, minor; Claude R4, minor) | Accepted; the walker stays unchanged here, as both reviewers agree | F-owner-8 in `../plan.md` names `place` and `settle` and the e2e's real reach; the devlog names both |
| F73 | The walk test's header said "on the hall's axis" and "4 m past", where it walks 2 cm off the axis and asserts 3 m, and named none of its bounds (Codex R4, nit; Claude R3, minor) | Accepted | The header says 2 cm off the axis and why (F-owner-8), "more than 3 m past", and the bound: three lines whose bodies span ±0.98 m of the opening, walking at 60 frames a second, nothing over 1.75 m read |
| F74 | The leaves' comment and the plan said #P8 shows the leaves before the fixed balusters and the lock box, where the evidence says P8 shows neither the face nor the box (Claude R2, minor) | Accepted | "#P8 among them, though not which face"; the rail "which both show", the lock box "which #29 shows" |
| F75 | The base's ends were measured from the cross's axis, x 1599, not the gate's centre, x 1590, so the recorded asymmetry was an artefact; the open gate's low heights were said to be read from the frieze's foot (Claude R5, nit) | Accepted | Every x of the gate's frame is from x 1590; the entry names each height's reference |
| F76 | Bare IDs (#29, #P8) in the leaves' comment, which the citation gate does not read (Claude R7, nit) | Accepted | The comment cites `interior-images.md #29 and #P8`; the citation gate caught the first rewording, which held #P8 apart from the list |
| F77 | The leaves' bars 0.15 and 0.29 m out stand 1 cm behind fixed balusters at 1.44 and 1.60 m, where #29 shows them between (Claude R8, nit) | Accepted as a record: it follows from the screen's baluster grid, about 4 cm off #29's there, which this change leaves alone | Recorded in the plan's follow-up |
| F78 | The plan's Outcome still listed F-owner-5 as open and noted beside its code, and listed neither F-owner-6 nor F-owner-7 (Claude R9, nit) | Accepted | The Outcome's follow-ups name F-owner-1 and F-owner-5 as acted on, F-owner-4 as noted, and F-owner-6 and F-owner-8 |
| F79 | The lesson the choir-screen session queued asks that a hand-placed ornament's pieces be checked to form one group before review; none was run for the leaves (Claude R10, nit) | Accepted: the gate lands here | `src/model/core/choir-connected.test.ts`: the screen's pieces, joined within 1 mm by exact mesh distances, form one group on the hall floor; red with `a064995`'s floating pediments and with the jamb bars planted afloat. Its first version passed `a064995`, since `closestPointToGeometry`'s threshold prunes by bounds only; it now reads the distance. Recorded in `docs/learning/gate-proofs.md`; the lesson and its evidence are deleted |
| F80 | AGENTS.md's closure inventory (870 shapes of 16,766 pieces) is stale: 893 and 16,928 at the base, 901 and 16,934 here (Codex R5, nit, inherited) | Declined here: it predates this work and belongs with the closure gate's figures | Left for that gate's owner |

## Verification

- `db1e297`: `npm run verify` (MET_PORT 5371) passed: 653 unit tests, typecheck, lint, build and 84 e2e.
- The repairs: review 11 reviews them, and records their verification.

## Round outcome

Two major findings, one from each lane, about the same thing: the gate's opening against #29. The owner chose to follow #29, and the frame is built. Every other finding is accepted and repaired but F80, which predates this work. The repairs add geometry and a gate, so review 11 reviews them.
