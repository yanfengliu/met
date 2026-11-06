# Review 0: implementation

## Target

The met repository, branch `claude/optimistic-mayer-d1fe0b`, commit `ff95d73` ("Move the core's east face to the floor map's line, Z -66.79, so the 1888 fin shrinks to 1.85 m (work unit 23)"), against main at `9550597`: in code `src/model/frame.ts`, the core's `constants.ts`, `plan-data.ts`, `vaux-east.ts`, `vaux-shell.ts`, `vaux.ts`, `weston-ends.ts`, `wings-walls.ts`, the Hunt wing's `dims.ts`, `stair.ts`, `galleries.ts`, `walls.ts`, `shapes.ts` and `routes.ts`, `src/model/collection/spaces-b.ts` and `src/model/site/footprint.ts`; in tests `src/model/core/core.test.ts`, `src/model/hunt/hunt.test.ts` and `src/model/closure.test.ts` (a comment); in docs `docs/design/spec.md`, `docs/research/interior.md`, `docs/research/exterior.md`, this unit's plan and the work registry.

## Reviewers and coverage

Both reviewers ran read-only on 2026-11-05 with the same prompt, as `../fleet/docs/skills/multi-cli-review.md` gives the commands, from `../fleet/tmp/review-runs/met-u23-r0/` (ignored, where the raw captures stay): the owner's request and the map's evidence, the change file by file, what was left alone on purpose and the stale comment already known, the worker's checks, six lenses (the line and its users; the geometry at the new line; the map data; the walk; the tests' honesty; budgets, determinism and records), the findings format, and a request to run no test, browser or build. The diff came in the prompt, taken three-dot against `origin/main`. The worktree's `git status`, saved before both lanes ran and read again after, shows no change by either; nothing in the worktree was edited while they ran.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. The runbook's check of its log kept the lane: no command failed to start; it ran 22 reads, two of which exited 1, and read the ignored map cache in the main checkout (`research/cache/lm_features.json`) to check the map data. Its citations outside the diff, checked: `src/model/core/galleries.ts:15` (runs clipped to the block's interior, pieces under 0.6 m dropped) and `src/model/core/vaux-east.ts:45` and `:78–82` (the second-floor doors at X ±10.3, 2.6 m wide). It edited nothing and ran nothing.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and Bash (git diff, log and show), permission mode `dontAsk`, no MCP servers. The runbook's lane rule passed: one result, one model key, the pin. 105 tool calls (51 Grep, 35 Read, 18 Bash, one of which the permissions refused, 1 Glob), no subagents, none naming the run folder or fleet's tree; it read the same cache with Grep. Its citations outside the diff, checked: `src/model/core/vaux-sides.ts:88` (the side walls' plain stretch to the inner face), `docs/research/collection.md:61` (the doorway's zone) and the cache's door lines on Z −68.84 at X ±10.32. It edited nothing and ran nothing.

## Reports

Each report as its reviewer wrote it, but for file links made relative to the repository and the reports' own headings set under this record's.

### Codex (`gpt-6-astra`)

Request changes — two defects found in revision `ff95d73`.

**1. Five wall runs are missing from the expanded strip — major**

Locations: [core/plan-data.ts:34](src/model/core/plan-data.ts:34), lines 36–39 and 55–57.

The regeneration extends existing runs but misses runs that were mostly or wholly beyond the old cutoff. The [cached map](research/cache/lm_features.json:1) contains these wall segments, absent from the arrays:

| Floor | Existing model X | Map Z interval | Cache feature prefix |
|---|---:|---:|---|
| Main | −32.8 | −70.12…−66.79 | `971f0dac` |
| Main | −23.05 | −70.11…−66.78 | `beb77223` |
| Main | +30.1 | −69.99…−66.79 | `7dff0e5f` |
| Second | −43.1 | −69.95…−66.79 | `22957010` |
| Second | −23.65 | −69.70…−66.79 | `002d4e68` |

Each leaves 1.91–2.33 m of wall inside the new inner face at −67.79. Those lengths survive [runRects’ clipping and 0.6 m minimum](src/model/core/galleries.ts:15).

For example, the main-floor partition at X −32.8 currently ends at −71.9, leaving a 4.11 m opening to the east wall. The map instead has a doorway approximately −71.88…−70.09, followed by wall. The missing segment therefore enlarges the doorway and merges room boundaries.

**Repair:** restore these runs on the existing snapped axes, preserving the map’s door gaps. Check all newly admitted segments, including ones absent from the old arrays, and add coverage that distinguishes each doorway from its solid continuation.

**2. The cross hall’s side junctions expose coincident faces — minor**

Locations: [hunt/stair.ts:170](src/model/hunt/stair.ts:170) and [hunt/galleries.ts:91](src/model/hunt/galleries.ts:91).

The moved stone back wall occupies Z −66.79…−65.99 and X −9.8…9.8. The second-floor plaster partitions remain centred at X ±9.75, 0.4 m thick, and extend to Z −66.79. Consequently, their rear caps coincide with the stone wall’s rear face over X 9.55…9.8 and −9.8…−9.55, all facing −Z.

These faces are exposed through the core’s second-floor side doorways: [vaux-east.ts:45](src/model/core/vaux-east.ts:45) and lines 78–82 place openings at X ±10.3, width 2.6 m, height 3.2 m. Looking east through either opening presents two differently coloured surfaces at the same depth, creating a z-fighting seam. Before this change, the partitions met the stone wall’s front face instead of overlapping its thickness.

**Repair:** terminate the second-floor partitions at the moved wall’s front face, `CROSS_HALL_BACK_Z`, or otherwise partition the junction into adjoining solids. Keep the main-floor termination separate. Check both exposed side openings for overlapping same-facing surfaces.

**Checked and sound**

- The core, Hunt and site polygons share the new boundary constant. Wing C’s bay calculation retains twelve bays and shifts their centres east by 1.105 m.
- The central R5 doorway’s widths, arch profiles, granite lining, threshold and adjoining floor levels remain consistent. Its route, clearance zone and e2e passage bounds follow the moved dimensions.
- Weston’s coping and the Petrie gutter divide at the new face, leaving the intended 1.85 m fin.
- The containment checks still reject a 1 m overrun outside their narrow exceptions. Removing the unused passage helper and its dedicated test is reasonable; the surviving lining and wall closure checks remain.

These are source-level conclusions. I ran no tests, build or browser and changed no files.

**Read outside the diff**

- [core/galleries.ts:14–56](src/model/core/galleries.ts:14): clipping and wall construction.
- [core/layout.ts:12–68](src/model/core/layout.ts:12): interiors, rooms and skylight bounds.
- [lib/wall.ts:293–340](src/model/lib/wall.ts:293): face directions and closure.
- [core/arches.ts:199–220](src/model/core/arches.ts:199): granite lining geometry.
- [roche-south/kravis.ts:178–181](src/model/roche-south/kravis.ts:178): gutter division.
- [collection/placement.test.ts:83–105](src/model/collection/placement.test.ts:83): doorway and corridor clearances.
- [tests/e2e/routes.spec.ts:230–240](tests/e2e/routes.spec.ts:230) and [labels.spec.ts:69–95](tests/e2e/labels.spec.ts:69): real-input approach to gallery 600.

### Claude (`claude-opus-5-5[1m]`)

**Verdict: request changes.** There is one major defect, at the second-floor doors beside the cross hall. There are also two minor findings (map walls missing in the new strip, and the cross hall's depth and its records) and a set of stale records.

I checked everything by reading code and grepping. I ran no tests, builds or browser. Partway through, Bash permission was denied, so the later reads used Read and Grep only. I checked the map data against the ignored cache `research/cache/lm_features.json`, read-only with Grep, converting with world X = x + 3.82 and Z = z − 85.97 (`research/cache/README.txt:3`).

#### Findings

##### F1. The cross hall's back wall and the X ±9.75 partitions now fill the outer mouth of the core's second-floor doors, with same-facing faces sharing the plane Z −66.79
**Severity:** major. **Where:** `src/model/hunt/stair.ts:170-171`, `src/model/hunt/galleries.ts:29,45-46,91`, `src/model/core/vaux-east.ts:45,82`.

**What is wrong**
- The core's east wall keeps today's second-floor door holes at X ±10.3. They are 2.6 m wide, so they run X ±9.0 to ±11.6 and Y 10.97 to 14.17, through the whole wall.
- The cross hall's back wall now stands from Z −66.79 to −65.99 across X ±9.8 (`wall()` builds from its origin toward −Z, `lib/wall.ts:308,327`).
- The partitions at X ±9.75 are 0.4 m thick (X 9.55 to 9.95) and run to BACK_Z on both floors.
- So over X ±9.55 to ±9.8, two faces lie on Z −66.79 and both face −Z: the back wall's back face (`hunt.stairStone`) and the partition's end face (`palette.plaster`). They will z-fight.
- Seen through the door hole, a strip 0.25 m wide and 3.2 m tall flickers. The door's inner 0.95 m (X ±9.0 to ±9.95) becomes a 1 m blind pocket ending on those faces.
- The clear mouth is 1.65 m. On the north it opens into the 0.94 m slot before Hunt's −65.65 partition (`galleries.ts:96`).
- Before this change, the 1.41 m cavity kept the two faces apart: the partition's end sat back-to-back with the back wall's east face.

**Failure scenario:** walk the second-floor corridor between the X 8.8 and 11.8 partitions (`plan-data.ts:58`) east to the wall. The door ahead shows the stone/plaster flicker in its left third. It is symmetric on the south.

**The doors have also lost their basis in the map.**
- The holes match the map's floor-2 door lines on world Z −68.84, centred at X ±10.32 (cache uid 197661994322 and 563361207057). The old wall (−70.0 to −69.0) stood within 0.16 m of those lines.
- Those door lines now sit 1.05 m inside the core, at the ends of those corridors.
- The map draws nothing on −66.79 at X ±9.8 to ±14.8. Its gallery 600 runs on to −65.61 there (uid 434473909617).

**Repair**
- End the back wall at the partitions' inner faces (width 2 × 9.55), or end the partitions at CROSS_HALL_BACK_Z on the second floor.
- Re-site the second-floor holes for the new line, clear of the partitions (for example X ±9.95 to ±12.55; `secondCut` follows `SECOND_DOOR`).
- Add a check that no Hunt face on BACK_Z shows inside a hole of the core's east wall.

##### F2. Five map walls in the new strip are missing, so the plan's outcome "with the floor map's walls in that strip" is not met
**Severity:** minor. **Where:** `src/model/core/plan-data.ts:4-9`, with the runs at lines 30-42 and 54-61.

**Why they are missing:** the worker only carried runs that ended on the old cut at −69.9. Runs the old generator had dropped (cut at −69.9, they lay wholly within 1.45 m of −69.0) are now 3.0 to 3.3 m inside the face and would clip to 1.9 to 2.3 m. They were never added.

| Floor | Map wall (world) | Cache uid | Model run now ends at |
|---|---|---|---|
| Main | X −32.79, Z −70.12 to −66.79 | 178900438546 | −71.9 (line 34) |
| Main | X −23.05, Z −70.11 to −66.78 | 930778969692 | −71.9 (line 36) |
| Main | X 30.07, Z −69.99 to −66.79 | 1020481763508 | −71.75 (line 39) |
| Second | X −23.64, Z −69.70 to −66.79, between 603 and 604 | 152523167294 | −71.95 (line 57) |
| Second | X −43.08, Z −69.95 to −66.79, between 607 and 608 | 272586587729 | −71.7 (line 55) |

**Effect**
- The map's 1.8 to 2.3 m doors now read as 3.9 to 4.2 m gaps.
- The added run `[0, -69.5, 30.1, 33.45]` (line 30) ends free at X 30.1. The map's back-of-house room it bounds (uid 328284722061) is open to gallery 502.

**Related gaps**
- The map's floor-2 doors through block A's side walls at X ±14.79, Z −68.85 to −66.78 (uids 660602749453, 691853982675) now fall inside the core. The wall stretch there stays solid (`vaux-sides.ts:88`), so the new −68.85 runs leave dead-end nooks of about 0.86 m at X ±12.0 to ±13.6.
- The added `[1, -36.55, -68, -66.8]` (line 56) lies wholly within 1.45 m of the face, so the stated rule leaves it out. It also builds nothing: clipped to 0.21 m, it falls under `runsBetween`'s 0.6 m minimum (`core/galleries.ts:29`).

**Repair:** add the five runs to −66.8 (`runRects` clips them), drop or explain the −36.55 stub, and either open or record the side-wall nooks. Extend the plan-data header to say so.

##### F3. The cross hall is now 0.8 m shallower than the map's room, and "centred on the line" is off by 0.1 m
**Severity:** minor. **Where:** `src/model/hunt/dims.ts:163-167`, `docs/research/exterior.md:45` ([B2]), `docs/work/23_core-east-face/plan.md:23`, `src/model/hunt/stair.ts:6`.

**What is wrong**
- The core's wall runs −67.79 to −66.79 (`OUTER_WALL` 1.0, `constants.ts:30`) and the back wall −66.79 to −65.99. Together they are 1.8 m thick with their middle at −66.89, not on −66.79.
- The hall's back face moved from the map's −66.79 to −65.99. The hall is now 6.25 m deep (5.45 m clear of the end wall's back at −60.54), against the map's 7.05 m (`interior.md:105`).
- No record states this. `stair.ts:6` still gives the hall as −59.74 to −66.79.

**Repair:** reword the claim (for example "astride the line, 1.0 m west and 0.8 m east") and record the lost depth as a deliberate deviation. Alternatively, thin the back wall to a facing — that would be the owner's call.

##### F4. Stale records
**Severity:** nit.
- `src/model/core/vaux-east.ts:84-85` still says the Hunt wing lines "the passage on through the cavity".
- `src/model/frame.ts:101`: the `GALLERY_600_DOOR_LINING` comment still mentions "the cavity behind the cross hall (hunt/stair.ts)".
- `docs/research/collection.md:61` gives the doorway zone as "Z −70.0 to … −66.79". It is now −67.79 to −65.99.
- `docs/research/exterior.md:160` says "(the Hunt Wing's cross hall already ends on −66.79, `CROSS_HALL_BACK_Z`)". `CROSS_HALL_BACK_Z` is now −65.99.
- [B2] (`exterior.md:45`) lists the rooms that end on the line but not the map's two that run past it to about −65.6: gallery 600 (−65.61) and main-floor gallery 537 (−65.62, uid 55600443069).
- `interior.md:355` says "the map's court 1.9 m"; it is 1.96. `plan.md:18` says 1.15 m; it is 1.14.
- `closure.test.ts:38` keeps a red proof against the removed `archedPassage`, so it can no longer be re-run.
- The known R9 comment at `routes.ts:163` is already on the worker's list.

#### Checked and sound
- **The constant chain.** `EAST_FACE_Z_CORE` feeds `EAST_Z` (`constants.ts:11`), `INNER_EAST_Z` (`layout.ts:14`) and `BACK_Z` (`dims.ts:40`). No literal −69.0 or −70.0 for this line remains in src or tests. The −69.0 values in `kravis.ts:66-74` are X coordinates.
- **Hunt pieces that read BACK_Z all moved with it.** These are the podium lines and slabs (`podium.ts:47-59,131,157`), the second-floor plates (`galleries.ts:70-75`), the partitions (line 91; the same −66.79 as the old literal, so their door gaps don't move), the seam walls (`walls.ts:184`; passages stay at their world Z) and the roofs (`roof.ts:138-140`).
- **The doorway joint is flush.** The lib wall's round arch (`wall.ts:80-96`, 12 facets at medium) matches `holeLining`'s (`arches.ts:64-72`, 12 facets). The lining ring and the threshold sit back-to-back with the back wall and the Hunt plate. The floor under the 0.8 m opening is the Hunt plate (`galleries.ts:75`), flush with the granite threshold (`vaux-east.ts:95`), since L2 = SECOND = 10.97.
- **The fin.** The coping split (`weston-ends.ts:103-106`), the gutter split (`kravis.ts:180-181`) and its test (`core.test.ts:147`) all read the line. The fin is 1.85 m.
- **Containment tests** compare pieces against the constants and go red past the 0.3 m slack (`core.test.ts:55,98`; `hunt.test.ts:35,62`).
- **The map data the worker did carry checks out.** The eleven Z-run ends and the five X-runs match the cache, including the X segment 43.37 to 44.53 of polyline uid 469131374059 and the gallery 600 polylines (uids 916013267040, 374295795527).
- **Gallery 600 and R5.** The paintings centre on the partitions from −74.85 to −68.85. R5 ends at −71.42 inside gallery 600. The R5 window in `routes.test.ts` covers the passage. The `r5-doorway` spawn sits at the back wall's middle (−66.39).
- **One e2e window narrowed.** In `routes.spec.ts:240` it shrank from 2.2 m to 0.8 m. That still allows at least 4 samples at walking pace with frames capped at 0.1 s.
- **R9.** It ends at −57.79, inside galleries 300 and 301; its crossing at −70.29 is clear of the iron posts.
- **Spawns and presets.** The second-floor spawn and `stairs.test.ts` stand in the hall. The `int-european-paintings-600` preset is still inside gallery 600; the labels tests derive its pixels from the placements.
- **Wing C's north front.** It keeps 12 bays, shifted 1.105 m east, and no other area reads `ELEVATIONS`.
- **Blocks.** The table moves 219.0 m² between hunt-d and the three core blocks with the sum unchanged, and the pad still tiles (`grid.ts:228-244`).

#### Read outside the diff
- **Core:** `src/model/core/vaux-east.ts` (all), `layout.ts`, `galleries.ts`, `shapes.ts:90-104`, `vaux-shell.ts`, `vaux-sides.ts`, `wings-walls.ts`, `weston-ends.ts:25-130`, `weston-facade.ts:40-75`, `arches.ts:40-97`, `constants.ts` (levels and walls).
- **Hunt:** `src/model/hunt/galleries.ts`, `stair.ts`, `dims.ts:1-60,140-200`, `podium.ts`, `walls.ts:160-227`, `roof.ts:20-30`, `routes.ts`, `routes.test.ts:1-60,170-255`, `hunt.test.ts:36-115`; `src/model/core/core.test.ts:1-200`.
- **Library and other areas:** `src/model/lib/wall.ts:66-96,288-330`, `src/model/frame.ts:96-103`, `src/model/collection/placement.test.ts:1-130`, `src/model/collection/spaces-b.ts:125-160`, `src/model/site/grid.ts:215-245`, `src/model/roche-south/kravis.ts:160-190`, `src/model/roche-north/engelhard.ts:205-234`, `src/model/roche-north/plan.ts:18-37`.
- **E2e:** `tests/e2e/routes.spec.ts:1-60,180-260,330-370`, `labels.spec.ts:1-150`, `labels-helpers.ts:100-139`.
- **Grepped:** `src/viewer/presets.ts`, `src/walk/spawns.ts`, `src/walk/stairs.test.ts`.
- **Records:** `docs/research/exterior-images.md` #66 and #67, `docs/research/collection.md:61`, `docs/research/interior.md:17-48,97-117,303-308,334`.
- **Cache:** `research/cache/README.txt` and `lm_features.json` (Grep only).

## Findings and disposition

Codex's two findings are F1 and F2; Claude's four are F3 to F6.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F1 | Five of the floor map's walls in the new strip are missing from the core's map data, runs that lay wholly past the old cut; the doors they end read 4 m wide (major; Codex) | Accepted | The five runs added after their door gaps from the cache (main floor X −32.8, −23.05, 30.1; second floor −43.1, −23.65), the data's header saying so; no test reads the map, whose cache is never committed, so the regeneration from it and this review are the check |
| F2 | The moved back wall overlaps the cross hall's side partitions over their last 0.8 m, their faces on the core's face together, facing −Z, seen through the core's second-floor doors (minor; Codex) | Accepted | The back wall spans between the side walls' inner faces (X ±9.55), so no face of it lies on the core's with theirs |
| F3 | The core's second-floor doors at X ±10.3 now meet the back wall and the side partitions at their mouths: those faces flicker there and the doors' inner 0.95 m end blind; the doors took their place from the map's doors at the corridors' ends, Z −68.84, which now stand inside the core (major; Claude) | Accepted | As F2, and the doors moved to the 1880 front's outer arches' axes, X ±11.95, 1.76 m wide: the map's door through the old wall's east face on the north (X 11.07..12.83, Z −65.61), the south one mirrored (`frame.ts` `EAST_FRONT_SECOND_DOOR_*`); the Hunt wing's partition on −65.65 opened there on the second floor; a test in `hunt.test.ts` that no face of the Hunt wing on the core's east face stands in any of the east front's eight openings, red with the doors back at X ±10.3 (it finds the back wall and both side partitions in them) |
| F4 | As F1, and: the map's second-floor doors through block A's side walls at X ±14.79 now stand inside the core but the walls stay solid, leaving nooks; the added run `[1, −36.55, −68, −66.8]` lies within 1.45 m of the face and builds nothing (minor; Claude) | Accepted | As F1; the side walls' doors opened from Z −68.85 to the east wall, as high as their other second-floor doors (`vaux-sides.ts`), so the strip's corners lead into galleries 603 and 633; the stub dropped |
| F5 | The cross hall is now 0.8 m shallower than the map's room, unrecorded, and the two walls stand astride the line, not centred on it (minor; Claude) | Accepted in part | The records say so (`hunt/dims.ts`, `stair.ts`, `interior.md`, `exterior.md` [B2], the plan); thinning the back wall to a facing, which would lose its doorway's 0.8 m reveal, is left for the owner to ask for |
| F6 | Stale records: two comments on the cavity, the doorway's zone in `collection.md`, `exterior.md` section 9 on `CROSS_HALL_BACK_Z`, [B2] silent on the map's two rooms past the line, 1.9 for 1.96 and 1.15 for 1.14, a red proof against the removed passage, and R9's comment (nit; Claude) | Accepted | Each corrected; [B2] also records the map's second line on −65.6, read as the old wall's east face, which would put the face 1.2 m further east, flush with the real front's end, as an open reading |

The repairs move doors, open walls and add a test, so a second round of review (review 1) checks them.

## Verification

On `ff95d73`'s content, through `tmp/gate.sh`: `npm run verify` (754 unit tests; typecheck; lint; build; 127 e2e in 11.7 min); `npm run shots`: 26 of 64 within 9 of 255 of the owner's gallery set (`c75b0e9`), the other 38 changed where the core's east end, the cross hall, gallery 600, gallery 304, wing C's north front and the 1888 fin show; the model 27,276 pieces, 745 meshes and 1,594,995 triangles at t = N; `routes.spec.ts` with `walk.spec.ts`: a first series failed its third run at 1× on the plaza's frame budget, the GPU-synced render 19.5 ms against 16.7, with the machine's CPU at 96% from other work and the gate queue empty; rerun as a series, three runs at 1× (23 passed each) and three at 4× (21 passed, the two frame budgets skipped), with the CPU at 27 to 75%, the plaza at 8.0 ms. The containment tests red with a core footing carried 1 m past the face and with a Hunt plate carried 1 m over the back line.

On the repairs: the new openings test red with the second-floor doors back at X ±10.3 and 2.6 m wide, naming the cross hall's back wall (`grand-stair-vault`) and both side partitions (`hunt-galleries`), and green as built; the whole unit suite (755); renders at native size of both second-floor doors, the north one from the Hunt side through its partition's new door, the side wall's door into gallery 633 and the cross hall's back corner. The rest, the full gate, the shots and the load runs on the commit that carries them, is in review 1's record.

## Round outcome

Request changes by both reviewers: Codex one major and one minor, Claude one major, two minor and a set of nits, two of them Codex's again. All accepted and repaired in the next commit, F5 in part, which review 1 checks.
