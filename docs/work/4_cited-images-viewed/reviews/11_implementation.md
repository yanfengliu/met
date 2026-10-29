# Review 11: implementation (F-owner-5's repairs after review 10)

## Target

The met repository, branch `claude/determined-rosalind-b5bcfb`, commit `ed2aa8a` ("Answer review 10 of the choir gate: the frame #29 shows, rails to the posts, the joints gate"): the repairs of F70 to F79, `git diff db1e297 ed2aa8a`, piped to both lanes, which also read the committed tree and review 10's record. The renders of the repaired tree were in `.shots/gate-r1/`, beside review 10's and the base's, and the photograph captures as in review 10.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, codex-cli 0.163.0, read-only sandbox, the prompt as an argument and the diff on stdin, `--ephemeral`. Its log holds one `STATUS_DLL_INIT_FAILED`, in text it echoed from another branch's review record (`No STATUS_DLL_INIT_FAILED in its log.`), not a failure of its sandbox; its four failed commands exited 1. It inspected 21 renders and the five captures, ran the connectivity gate's body in memory on the repaired screen and both recorded mutations, walked the three lanes both ways, counted the core area's pieces and meshes and read `src/model/core/shapes.ts` outside the diff.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, tools Read, Glob, Grep, Task and `git diff`, `git log` and `git show`; the report command printed `keep`. It read the captures by columns of luminance and the renders against review 10's by pixel difference and 3 to 6× crops, reran the connectivity gate's algorithm on `ed2aa8a` and `a064995` and with planted pieces, ran the fleet's work-docs structure check on this branch, reran the unit tests, typecheck and lint on `ed2aa8a`, and read `src/model/core/medieval-hall.ts`, `src/walk/walker.ts`, `tests/e2e/walk.spec.ts` and three-mesh-bvh's sources outside the diff.
- Neither lane ran `npm run verify` or changed a file (checked with `git status` after both ran).

## Reports

The reports as each lane wrote them; nothing was redacted. They keep the finding IDs they were written with, F40 to F56; in this unit those are F70 to F86, the voussoir follow-up holding F40 to F69 here.

### Codex

**No findings in `db1e297..ed2aa8a`.** F40–F49 match their dispositions. F50’s deferral is reasonable: the stale closure inventory predates this work.

Checked:

- **Geometry and photographs:** inspected all 21 renders and five photograph captures at native resolution, with pixel comparisons. The jambs remain supported despite their 6 cm overhang. Both repaired rails touch their posts; the nearest jamb bars clear the posts by 7.5 mm. No new floating parts or unintended penetrations found. I checked the underlying geometry in unchanged [shapes.ts:27](C:/Users/38909/Documents/github/met/.claude/worktrees/determined-rosalind-b5bcfb/src/model/core/shapes.ts:27).
- **Connectivity:** executed the test body in memory. The current screen passes with 565 pieces in one group, taking about 0.9 seconds. Both recorded mutations reproduce five groups with exactly the named floating pieces. Union-find, candidate boxes, world transforms, distance comparison and floor assertion support the stated bound.
- **Walking and budgets:** independently reproduced all three lanes in both directions, with no airborne frames or material lateral deviation. Confirmed 4,937 core pieces, 130 meshes, and no screen piece failing `openAlong`. Reviewed the collection zone and closure contract.
- **Documentation and scope:** checked source claims against #29/#P8, numerical consistency, citation forms, file lengths and whitespace. No additional issue found.

The author’s `verify-2.log` records **654 unit tests and 84 e2e tests passing**, plus typecheck, lint and build, on port **5371**. I did not rerun full verification.

Reference caveat: `6_implementation.md` is absent at the reviewed revision. The retained writer formerly called the gate report “review 6”; its committed record is review 10. The review 6 available elsewhere in Git concerns voussoirs.

Inspected-image manifest SHA-256: `dc759bc6ef60c4a153443506a309ce2294e6bd9ca42544ddcdbb3b74936dc67d`.

No files changed; no browser or server launched.

### Claude

**Review 11 of `ed2aa8a` (base `db1e297`): no blocker and no major.** The new gate frame, the rail repair and the connectivity gate are sound. I found two minor problems, a wrong claim in #29's entry and finding IDs that collide with another branch's, plus four nits.

There is no review 6 record on this branch (the folder holds rounds 0–5 and 10), so I read review 10's. The author's own `tmp/gate/write_review6.py` first titled that record "Review 6". Rounds 6–9 of this unit are on another branch (S2).

### Findings

**S1, minor: #29's entry puts the rail's 3.88 m "at the post's corner", which the photograph doesn't show.**
- Where: `docs/research/interior-images.md:97` (#29's entry) and `src/model/core/choir-screen.ts:55–61`.
- What #29 shows: I read luminance down columns of `29-gate-x1200-y2620-s1.png`, taking the frieze's foot at y ≈ 2661 and 176 px/m.
  - **Left post:** the rail's dark band centres at y 2729, 2736 and 2741 at x 1344, 1347 and 1350. That puts it about 3.96 m high where it meets the post's outer edge. It then passes behind the post's 8–10 px shaft (x 1353–1363), where it would be about 3.89 m at the post's axis; that is the entry's 3.88. On the gate side it runs on down to y 2760–2778 at x 1364–1368, about 3.80 m.
  - **Right post:** the same in mirror image, y 2740, 2761 and 2769 at x 1828, 1814 and 1810.
  - The author's own `evidence.md` reads the north rail "from the post at about 3.8 m".
- So the model's 3.97 m at the corner matches #29, and the entry is what's wrong. The rail's run on behind the post is recorded nowhere. The code says the `LEAF_TOP` values are "both read on #29", but the entry contradicts the first point, [0.08, 3.97]. Codex R2's request to "reconcile the documented heights" (F41) is still open.
- **Failure scenario:** a later session follows the entry and lowers `LEAF_TOP[0]` to 3.88. Every gate stays green: my probe puts that segment 36 mm off the west arch ring, against 106.5 mm as built. The model then moves away from the photograph.
- **Repair:**
  1. Reword the entry: the rail meets the post's outer edge at about 3.96 m, passes behind it (about 3.88 m at its axis) and runs down to about 3.8 m by the springing bracket.
  2. Add to the leaves' "Simplified" note that the rail stops at the post's corner. Building the rest would cut through the west arch ring.

**S2, minor: finding IDs F40–F50 collide with another branch's, and the merge order is recorded nowhere.**
- Where: `docs/work/4_cited-images-viewed/reviews/10_implementation.md:134–146`, and the plan's F-owner-5 section.
- **The collision:** the F-owner-4 follow-up on `claude/adoring-lamarr-f5704f` says in its plan that its findings "here … are F40 to F69", and names F43 and F51 as its two majors. The fleet rule is one ID per finding per work unit (`../fleet/docs/work-docs.md:128`).
- **The dependency:** this record already places itself after that branch. Its round 10 follows that branch's rounds 6–9, and F-owner-8 follows its F-owner-7. Nothing on this branch says so.
- **On its own, this branch fails the fleet's structure check.** Running `validateTree` (`../fleet/scripts/lib/work-docs-format.mjs:147`) on this branch's `docs/work` gives "review rounds must be contiguous from 0; expected round 6, found 10". The full `check` stops earlier here, on the allocation record, because main has since allocated unit 6. `git merge-tree` also shows conflicts with that branch in `plan.md` and `docs/devlog/summary.md`.
- **Failure scenario:** whichever order the two land in, unit 4 ends up with two different F43s. If this branch lands first, main's work-docs check goes red.
- **Repair:** renumber this record's findings to F70–F80. In the plan's F-owner-5 section, state that `claude/adoring-lamarr-f5704f` must merge first.

**S3, nit: the walk test can only agree with itself on the opening's width.**
- Where: `src/model/core/choir-gate.test.ts:37–41` (header at :5–7) and `AGENTS.md:110`.
- The side lanes are computed from `GATE_CLEAR`, a constant of the module under test, and so is the collection's zone. Nothing pins the roughly 2.06 m opening the owner chose.
- **Failure scenario:** someone sets `GATE_CLEAR` to 0.80 (say, to model the scrolls' projection). The lanes move to ±0.40 and every gate stays green, while the header, `AGENTS.md` and the plan still say 0.63 m and "±0.98 m of the opening's ±1.03 m".
- **Repair:** write the lanes as literals (±0.63), or add `expect(GATE_CLEAR).toBeGreaterThanOrEqual(1.03)`.

**S4, nit: F46 is only partly repaired.**
- Where: `src/model/core/choir-screen.ts:57`, `:58`, `:42` and `:43`.
- "both read on #29" (:57) is one of the bare IDs Claude R7 named, and "which #29 shows" (:58) is the same kind. Both sit after the citation clause ends at "face." (:56).
- The new gate comment adds three more bare #29s at :42 and :43, after its clause ends at "through." (:41).
- None of these are read by the citation gate (`src/cited-images.test.ts:22`). That's harmless because #29 is marked viewed, but F46's disposition claims more than was done.
- **Repair:** write "interior-images.md #29" in those sentences.

**S5, nit: small number and wording mismatches.**
- `JAMB_BARS[0]` is 1.08 (`choir-screen.ts:50`), but #29's entry and F40's disposition say 1.07. My reads of #29 put the inner bar between 1.06 and 1.08, so either value fits; the code and the docs should simply agree.
- The devlog (`docs/devlog/summary.md:5`) says "Read on #29 … the plinth runs on to 1.09 m". 1.09 m is the model's value; #29 reads 1.07 and 1.10.
- The devlog also says `place` and `settle` "set" the feet in the joint. Per F-owner-8, `settle` only keeps a walker that is already there.

**S6, nit: F50's refusal is sound, but its hand-off reaches no one.**
- The figure (`AGENTS.md:107`) is inherited, and no test pins it: I grepped `src/model/closure.test.ts`. So declining it here is sound.
- But "left to the closure gate's owner" points at work unit 6, which main records as complete (`5fcfbf1`). In practice no one holds it, and this change shifts the counts again by 12 walked pieces.
- **Repair:** record it as an owner follow-up in the plan, or correct the two numbers on `AGENTS.md:107`, two lines from the one this commit edits.

### Acceptance criteria

1. **Repairs:** F40–F49 are repaired as their dispositions say, apart from F41's reconciliation (S1) and F46's leftover bare IDs (S4). F50's refusal stands (S6).
2. **The frame against #29:** my 4× crops agree with the entry:

   | Feature | Read on #29 |
   |---|---|
   | Plinth ends | x 1401 / 1785 |
   | Die ends | x 1375 / 1809 |
   | Jamb inner faces | about 1.04 / 1.02 m |
   | Bars | about 1.07 and 1.20 m |
   | Head piece | about 3.62 m |

   The jamb also overhangs the plinth's end in #29 (about 3 cm on the south side, 7–8 cm on the north), so the model's 6 cm overhang follows the photograph. The exception is S1.
3. **The connectivity gate:** it holds, and its recorded red proofs reproduce.
   - Rerunning its algorithm gives one group of 565 pieces on `ed2aa8a`. On `a064995` it gives 5 groups, with pieces #447, #448, #473 and #474 apart, exactly as `gate-proofs.md` records.
   - With the jamb bars lifted 5 mm and stopped 1 cm short, it gives 5 groups, those four bars apart.
   - A box planted 2 mm above each head piece turns it red. At 0.5 mm it stays green, inside the stated bound.
   - In three-mesh-bvh 0.9.15, the 1 mm threshold only prunes by bounding boxes (`closestPointToGeometry.generated.js:74`, `:110`), and the call returns null only when nothing was compared (`:222`). The triangle tests use a 1e-15 epsilon (`ExtendedTriangle.js:7`), so they can't join pieces that are apart. Reading the returned distance is therefore both necessary and enough.
   - It runs in 0.86 s, well under the 10 s headroom.
4. **Walk, zone, closure, mesh budget:** all hold.
   - The walk test passes, and the unit suite passes 654/654, including closure, the core area's mesh budget, placement and reach.
   - The new pieces touch what carries them at 0 mm, and no vertex of the frame lies inside another piece.
   - Clearances: the outer jamb bar is 7.5 mm off the post, the rail's first segment touches the post's west face and is 106.5 mm from the west ring, and the ring is 28.9 mm from the leaves' first bars.
5. **`npm run verify`:** I re-ran the unit tests, typecheck and lint on `ed2aa8a`, and they pass. Build and e2e rest on the author's log, which records no revision. It ended at 17:20:12, and `choir-gate.test.ts`, `AGENTS.md`, `plan.md` and `gate-proofs.md` were rewritten at 17:22:02 (comment and doc changes only).

### Images

I viewed the three photograph captures at native 800×600 and the seven repaired renders against review 10's, by pixel difference and 3–6× crops. The jambs, bars and head pieces show correctly and the rail reaches each post; I found no visual faults. The SHA-256 of the manifest of the 17 images inspected is `fb93cb0a0e28cde0dc07f5ba87d195d0ecdb8bd57b427fb19221c62b321d4abe`.

I made no changes to the repository, and `git status` is clean. The probes are in `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-determined-rosalind-b5bcfb\c781d3e8-a52b-40e5-b87a-54229f103fb8\scratchpad\probe\`. One stray temp file went to `/tmp`; I deleted it.

Files and lines read outside the diff, besides those above:
- `src/model/core/medieval-hall.ts:54`: the floor tiles' tops at `L1`.
- `src/walk/walker.ts:52`: the body's 0.35 m radius and 1.75 m height.
- `tests/e2e/walk.spec.ts:207`: F-owner-8's "within 5 cm" holds.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F81 | #29's entry put the rail's 3.88 m "at the post's corner", where #29 shows it meeting the post's outer edge at about 3.96 m, passing behind the post (about 3.88 m at its axis) and running down to about 3.8 m by the springing bracket; the model's 3.97 m at the corner follows the photograph, and the run behind the post was recorded nowhere (Claude S1, minor) | Accepted | #29's entry describes the rail as Claude read it; the leaves' comment says the rail stops at the post's corner, where the photograph runs it on behind the post through what in the model is the gate arch's ring |
| F82 | Finding IDs F40 to F50, as this follow-up first numbered them, collided with the voussoir follow-up's F40 to F69 in work unit 4's plan, and the order of the two branches' landing was recorded nowhere (Claude S2, minor) | Accepted, and settled at the landing: merged after the voussoir follow-up, which holds this unit's rounds 6 to 9 and F40 to F69, this follow-up's rounds are 10 and 11 and its findings F70 to F86 | The rounds and IDs as they stand on main after the merge |
| F83 | The walk test's side lanes were reckoned from `GATE_CLEAR`, the module's own constant, so a narrower opening would move the lanes with it and pass (Claude S3, nit) | Accepted | The lanes are numbers, ±0.63 m, 5 cm inside the jambs at 1.03 m; the header says why |
| F84 | Bare IDs remained in the gate's and the leaves' comments after their citations' clauses (Claude S4, nit) | Accepted | Each sentence that names a photograph cites it with its index's name, or names it as "the first" or "the photograph" after the citation |
| F85 | `JAMB_BARS` put the inner bar at 1.08 m, where #29's entry and F70 say 1.07; the devlog called the model's 1.09 m a reading of #29, and said `settle` sets the feet in the joint (Claude S5, nit) | Accepted | The inner bar at 1.07 m; the devlog gives #29's 1.07 and 1.10 m and the model's 1.09 m, and says `settle` keeps a walker the floor is built round there |
| F86 | F80's hand-off to "the closure gate's owner" reaches no one, work unit 6 being complete, and this change moves the counts again (Claude S6, nit) | Accepted | AGENTS.md labels the closure inventory's figures with the revisions they were counted at (`dc1a7dc`, `3165aa5`), so they stay true as the model grows |

## Verification

- `ed2aa8a`'s tree: `npm run verify` (MET_PORT 5371) passed: 654 unit tests, typecheck, lint, build and 84 e2e (`tmp/gate/verify-2.log`). It ran outside the gate lock (`tmp/gate.sh`) while another session's throttled run held it; stopped by hand to free the machine, its Playwright run had gone on in the background and finished green.
- The repairs of F81 to F86 move two bars 1 cm and change comments, a test's lines and docs: the unit tests, typecheck, lint and build passed under the gate lock before they were committed, and `npm run verify` on the tree merged with `origin/main` before the landing.
- The connectivity gate, the walk test and the collection's zone pass on the repairs; the walk test's lines, now numbers, are the same 0.02 and ±0.63 m.

## Round outcome

Codex found nothing; Claude found two minor findings and four nits, F81 to F86, all accepted and repaired. None changes the gate's frame beyond a bar moved 1 cm, so the follow-up's review closes here.
