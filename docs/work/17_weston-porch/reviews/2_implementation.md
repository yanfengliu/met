# Review 2: implementation

## Target

The met repository, branch `claude/optimistic-mayer-d1fe0b`, commit `69f9a84` ("Answer review 1 of work unit 17: the head band meets the porch's entablature; a red proof for the return walk; the records' last wording"): the diff `817b4ae..69f9a84`, the repairs of review 1's findings (`reviews/1_implementation.md`), in `src/model/core/weston-porch.ts`, `weston-facade.ts`, `core.test.ts`, `weston-door.test.ts`, `docs/research/interior.md`, the devlog, this unit's plan and review 1's record.

## Reviewers and coverage

Both reviewers ran read-only on 2026-11-04 with the same, narrower prompt, from `../fleet/tmp/review-runs/met-u17-r2/` (ignored, the raw captures): the head band's three parts against the parts library's cornice profile and everything near them; the side roundels, the red proof and the comments; the records against the code. The diff came on stdin. The worktree's `git status` and `git diff HEAD` were empty before both lanes and after.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. The runbook's check kept the lane: no command failed to start. It ran in-memory geometry probes (the band's reaches 2.768, 2.894 and 3.230 m and heights 0.41, 0.30 and 0.04 m; no intrusion; the modillions 0.347 m and roundels 0.340 m off the wall), reproduced the red proof's X −51.593, read the files it lists, and edited nothing.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show, permission mode `dontAsk`, no MCP servers. The lane rule passed: one result, one model key, the pin. It ran nothing, worked by hand from the code, did not delegate, and read nothing in the run folder; outside the tree it read the review runbook in fleet's docs.

## Reports

### Codex (`gpt-6-astra`)

Approve with minor findings.

1. **F2 — Partition endpoint ignores clipping — nit.**  
   [Review 1, line 59](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/docs/work/17_weston-porch/reviews/1_implementation.md:59) says the partition reaches 0.10 m into the lined opening at X −48.8. That is its raw endpoint: `galleries.ts:19–20` clips it to `INTERIOR.b`, whose boundary is X −48.7 (`layout.ts:17`). An in-memory geometry probe confirmed −48.7 for both original and shifted placements. It therefore meets the opening’s inner mouth without penetrating the wall. The conclusion that `clearOf` still moves it remains correct. **Fix:** preserve the quoted review, add this correction to its disposition, and clarify the endpoint wording in `interior.md:302` and `plan.md:26`.

2. **F9 — Corona reach remains mislabeled — nit.**  
   [interior.md:300](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/docs/research/interior.md:300) twice assigns ±3.35 m to the model’s corona. The corona reaches **±3.23 m**: `2.75 + 0.8 × 0.60`, matching `weston-porch.ts:79` and `profiles.ts:53–60`. **±3.35 m** belongs to the cornice’s outermost top moulding (`profiles.ts:63–64`). **Fix:** retain 3.35 m and name that moulding correctly in both occurrences.

The substantive repairs check out. F6’s reaches are 2.768, 2.894 and 3.230 m; the band segments have positive heights of 0.41, 0.30 and 0.04 m. Geometry probes found no intrusion into either side’s bands. Modillions begin 0.347 m from the wall and roundels 0.340 m, beyond the band’s 0.160 m projection; capitals end below it. F11’s side-roundel centres are evenly spaced at 0.45, 0.95, 1.45 and 1.95 m. F0’s recorded −51.593 result reproduces; six seconds reaches −55.593. No further finding on F3, F9’s base correction or F10.

No files changed or browsers launched. `git diff --check` passed. I ran in-memory probes, not `verify`, browser tests or captures; those final-revision checks remain open in `plan.md:46`.

Outside-diff files read included:

- `src/model/lib/profiles.ts:25–94`, `cornice.ts:206–281`, `along.ts:37–85`.
- `src/model/lib/pilaster.ts:113–139,235–274`, `column.ts:23–32`.
- `src/model/core/galleries.ts:14–29,50–80`, `layout.ts:12–37`, `plan-data.ts:15–21`.
- `src/model/frame.ts:44–46`, `src/viewer/cap-pass.ts:1–8`.
- `tests/e2e/route-holds.ts:115–134`, `route-keys.ts:49–93`, `routes.spec.ts:293–338`.

### Claude (`claude-opus-5-5[1m]`)

**Verdict: approve with minor findings.** All four findings are nits. No part of the head band runs into the porch, each part has positive height, and every repair of review 1 does what its finding asked.

I ran no tests or probes and edited nothing; every number below is worked by hand from the code. As `plan.md:46` and review 1's Verification section record, `npm run verify`, the shots and the 1× and 4× `routes.spec.ts` runs have not run on `69f9a84` yet. So this approval covers the code and the records, not the gates.

## Findings

### F12 (new). The records call the cornice's top moulding "the corona", which puts the band 12 cm further out than it is (nit)
- **Where:** `docs/research/interior.md:300`, in three places; `src/model/core/weston-porch.ts:8`.
- **What is wrong:**
  - `interior.md:300` says "its corona out to ±3.35 m" and "the corona reaches ±3.35 m, where the drawn one reaches ±3.46 m". The same paragraph then says the band stops 1 cm short of "its corona".
  - In the code, the corona is at ±3.23 m (`PORCH_REACH.corona`, `weston-porch.ts:79`). ±3.35 m is the cornice's top moulding (`PORCH_REACH.cornice`, `:80`), which the comment at `:71` calls "the furthest".
  - So the band's top part starts at ±3.24 m, while a reader of the record would put it at ±3.36 m.
  - The header's "the cornice's corona out to ±3.46 m" (`:8`) uses the same name for what `interior.md:298` reads as "the corona and its moulding".
  - The clause "then over the cornice's soffit of its corona" needs commas before it can be read.
- **Evidence:** in `profiles.ts:53-65` the corona is at 0.8p = 0.48 m, from 0.312h to 0.7h, and the top moulding reaches p = 0.6 m. With EDGE = 2.75, that gives 3.23 and 3.35.
- **Fix:**
  - In `interior.md:300`: "its cornice out to ±3.35 m"; "the cornice reaches ±3.35 m, where the drawn corona and its moulding reach ±3.46 m"; and "…1 cm short of the frieze, then of the face of the cornice's bed mouldings, and, over the soffit, of its corona (±3.24 m)".
  - In `weston-porch.ts:8`: "the cornice out to ±3.46 m".

### F6 (continues). Brick still shows in a small notch under the bed mouldings' face (nit, optional)
- **Where:** `src/model/core/weston-facade.ts:120`; `interior.md:300` ("1 cm short … of the cornice's bed mouldings").
- **What is wrong:**
  - The bed part starts 1 cm past the bed mouldings' furthest point, 0.144 m out (|u| 2.904). The mouldings only reach that from 6.90 m, at the foot of their quarter-round (the ovolo).
  - Lower down, the profile steps back:
    - 0.002 to 0.036 m out up to 6.752 m (the cyma);
    - 0.06 m up to 6.83 m;
    - 0.084 m up to 6.848 m.
  - So from 6.71 to 6.90 m, brick shows up to 15 cm wide at the cornice's foot, about 9 cm wide from 6.75 to 6.83 m, closing to 1 cm at 6.90 m. That is about 0.014 m² per side beyond the 1 cm gap. Review 1's pocket was 0.65 × 0.30 m, so this is much smaller.
- **Evidence:** `profiles.ts:49-53`, read with `profile.ts:129-168` (`quarter` and `cyma` are relative), placed 6.71 m up by the stack (`cornice.ts:275-279`, `profiles.ts:166-184`).
- **Fix:** either keep it and write "short of the bed mouldings' face" in the comment and in `interior.md`, or split the bed part at 6.83 m, running its lower piece to |u| 2.82. That adds two boxes and no mesh.

### F13 (new). The band's reaches copy the parts library's shares as literals, and no test keeps the band clear of the porch (nit)
- **Where:** `weston-porch.ts:77-82`.
- **What is wrong:**
  - Four values are copied by hand:
    - 0.012 (`cornice.ts:277`);
    - 0.24 (`CORNICE_BANDS.modillion.d`, `profiles.ts:29`);
    - 0.8 (`profiles.ts:53`, `:55`);
    - `CORNICE / 2` (`CORNICE_BANDS.modillion.y1`).
  - `CORNICE_BANDS` is exported, and `src/model/hunt/entablature.ts:12`, `:52` already reads its bands from it.
  - Review 1's band-against-porch probes ran only in memory (`1_implementation.md:11`). If the library's cornice changes, the band could silently run into it or leave the pocket again, and the "1 cm short" comment would go stale.
- **Fix:** read `.d` and `.y1` from `CORNICE_BANDS`. Better, take each reach from the profile's own points: the largest d of `corniceProfile({ height: CORNICE, projection: CORNICE, dentils: false })` below the soffit, and above it up to the band's top. Or add a `core.test.ts` check that the band's boxes miss the porch's triangles, shown to fail with the bed part run to `PORCH_REACH.sides`.

### F5 (continues). The record uses "owner" with two meanings (nit)
- **Where:** `1_implementation.md:9` ("the owner's own edits for this round") and `:157` ("the owner edited files the dev server serves during it").
- **What is wrong:** here "owner" seems to mean the unit's session, as in `plan.md:4`. The same file uses "the owner" for the human at `:50` and `:61`, and so does `interior.md:302`.
- **Fix:** name who made the edits (AGENTS.md R25).
- **For review 2's shots:** the side roundels stand where they did before, so the only render changes from `817b4ae` should be the head band beside the porch, at world Y 10.41 to 11.16.

## Checked and sound
**F6, the band's reaches.** The band has three parts per side. Heights are over the main floor; u runs along the front from the doorway's middle. Each part ends 1 cm short of the furthest point of the profile at its height:

| Part | Height | Starts at \|u\| | Furthest point of the profile there | Height |
|---|---|---|---|---|
| Lower | 6.30–6.71 m | 2.778 | the frieze, 2.768 (its bead, to 2.775, ends at 6.28; the architrave, 2.8175, at 6.26) | 0.41 m |
| Bed | 6.71–7.01 m | 2.904 | the bed face, 2.894 | 0.30 m |
| Corona | 7.01–7.05 m | 3.24 | the corona, 3.23 (the top moulding, to 3.35, starts above 7.13) | 0.04 m |

The band stands 0.16 m out from the wall (`wings-walls.ts:94-97`). Nothing else meets it:
- **Modillions** (6.90–7.01 m, |u| 2.894–3.194): the nearest on each side is centred 0.394 m off the wall, so its near edge is 0.347 m out (`cornice.ts:219-223`, `along.ts:56-63`). None stand at the wall ends (`along.ts:73`).
- **Side frieze roundels:** at least 0.34 m out.
- **Narrower pilasters' capitals:** they top out at 5.81 m, their scrolls at 5.76 m.
- **Top block:** it ends at |u| 2.75.

**F11.** The roundels stand at 0.45, 0.95, 1.45 and 1.95 m off the wall, 0.5 m apart. These are the same places the old loop gave, so nothing renders differently. A change of depth now moves them rather than adding or dropping one. The last roundel's edge is 0.21 m inside the front frieze.

**F0.**
- The old line really was `WESTON_DOOR.x - 2` with a 4 s walk back (`ff9fcbd`'s test, `:122-123`), and −49.4 − 2 = −51.40.
- X −51.593 is 1.89 m out from the wall, inside the doorway through the porch's body. It fails the new line (−52.9) and passes the old one.
- By hand (2 m/s, lag 0.07 s, from −43.89), 4 s ends near −51.61 and 6 s near −55.61, which matches.
- The `COURT_X` comment now matches `:124-125`.
- The reason given for the e2e line holds: `holdPast` fails a walker that makes no 5 cm of progress in 1.5 s (`route-holds.ts:121-131`, `route-keys.ts:49`, `:78`).

**F3.**
- The bases run from 0.96 to 1.32 m (`pilaster.ts:132-133`); the capitals from 5.55 to 5.81 m (`pilaster.ts:236-244`).
- The scrolls below 5.55 m miss the other pilaster: the front scroll stands 2.29–2.35 m out, while the side capital ends at 2.22 m.
- The cut caps each piece it crosses (`cap-pass.ts:2`).

**F2.** `clearOf` moves a wall whose end reaches X ≤ −48.7 (`layout.ts:17`) and whose line crosses the doorway. It reads neither the leaves' plane nor their swing (`galleries.ts:63-67`). The wall from the map ends at −48.8, inside the 1888 wall's opening, so it would still be moved.

**F9 and F10.** "The drawn base runs 0.47 m" is now right in both places. 13.2 − 4.11 = 9.09, so "9.1 m" is right, and the railing's top is 8.525 m over the main floor.

**Records.** `plan.md:44-46`, the devlog and the "cut off along the porch's front" wording in all four places match the code. Every row of review 1's findings table matches the code.

## Read outside the diff
- `AGENTS.md`; `docs/policies/local-rules.md`
- `src/model/lib/profiles.ts:1-185`, `profile.ts:100-178`, `cornice.ts:1-283`, `along.ts:1-89`, `pilaster.ts:95-276`, `index.ts:56-65`
- `src/model/core/wings-walls.ts:93-118`, `galleries.ts:40-89`, `layout.ts:15-19`, `constants.ts:10-30` and `:66-68`, `core.test.ts:14-15` and `:43`
- `src/model/hunt/entablature.ts:40-69`; `src/viewer/cap-pass.ts:1-20`
- `tests/e2e/route-holds.ts:105-136`; `route-keys.ts:16-20`, `:49`, `:78`
- `ff9fcbd`'s `weston-door.test.ts` (`:122-123`) and its `routes.spec.ts` change up to `817b4ae`
- `docs/research/interior.md:284-302`; `plan.md` (all of it); `reviews/0_implementation.md:105`, `:113`, `:150`, `:155`, `:161`
- `../fleet/docs/skills/multi-cli-review.md:114`; `eslint.config.js`; `package.json:16`

## Findings and disposition

Two corrections to review 1's record, which stays as written. Its F2 row says the 528/529 wall's end reaches into the 1888 wall's lined opening at X −48.8: that is the map's raw end, which `galleries.ts` clips to the interior's edge, X −48.7, the 1888 wall's inner face, so the wall meets the opening there, across the way in, and `clearOf` still moves it (Codex 1). And where its F5 row and coverage say "the owner", they mean this unit's integration owner, this session (the plan's Owner), not the repository's owner, as in the research record (Claude F5).

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F2 | The records put the 528/529 wall's end inside the 1888 wall's opening, where it is clipped at the wall's inner face (Codex 1) | Accepted | `interior.md` and the plan: on the map's line its end meets the 1888 wall's opening at the wall's inner face, across the way in; review 1's row corrected above |
| F5 | Review 1's record uses "the owner" for this session as well as for the repository's owner (Claude F5) | Accepted | Corrected above; this record names the session where it means it |
| F6 | The band's middle part stops 1 cm past the bed mouldings' furthest point, which they reach only from 6.90 m; lower down the profile steps back, so a little brick shows at the cornice's foot, about 0.014 m² a side (Claude F6) | Accepted in the wording; the notch left | `interior.md` and the band's comment say the band stops short of the face of the bed mouldings, which step back up to 0.14 m at their foot, so a little brick shows there |
| F12 | The records call ±3.35 m the model's corona, which is the cornice's top moulding; the corona reaches ±3.23 m (Codex 2; Claude F12) | Accepted for `interior.md`; not for `weston-porch.ts`'s header | `interior.md` gives the corona ±3.23 m and the top moulding ±3.35 m against the drawn corona and moulding's ±3.46 m. The header's "the cornice's corona out to ±3.46 m" reports the drawing, whose corona row (7.07 to 7.21 m) reaches ±3.46 m, so it stands |
| F13 | The band's reaches copy the parts library's cornice shares as literals, and no test keeps the band clear of the porch (Claude F13) | Declined: two of the four shares (the corona's 0.8 and the frieze's 0.012) have no exported name in the library, and `PORCH_REACH`'s comment names each share with its source in `profiles.ts`; a gate on the band against the porch's triangles would hold a 1 cm trim seam that the shots show, and both lanes' probes found it clear | None |

## Verification

On `69f9a84`: `npm run verify` through `tmp/gate.sh` (81 test files, 732 unit tests; typecheck; lint; build; 125 e2e tests in 9.0 min). `npm run shots` (64 images, the model 27,257 pieces, 746 meshes, 1,614,266 triangles at t = N; marked dirty only by this session's uncommitted edits to `interior.md` and the plan, which render nothing) against the gallery's set of `1002016`: the same 21 images as on `ff9fcbd` differ, only at the porch, and `doors-weston` and `preset-int-petrie-court` were read again at native size. `routes.spec.ts` three runs in a row at 1× (14 tests each, 1.5 to 1.6 min), and three runs in a row at 4× throttle (12 tests each and the 2 frame-budget tests skipped under throttle by design, 1.8 min each), with no edit to a served file during them.

This round's repairs are wording in `docs/research/interior.md`, the plan and the head band's comment in `weston-facade.ts`; the comment's commit is gated with the landing's merge.

## Round outcome

Both reviewers approve with minor findings, all nits: no blocker or major finding remains. F2, F5 and F12 are repaired in the records, F6 in their wording, and F13 is declined with its reason. No further round is needed for wording; the landing gates the final tree.
