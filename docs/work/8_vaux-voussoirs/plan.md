# The 1880 fronts' dark voussoirs are grey granite, not brick

Status: complete
Owner: Voussoir session (claude/adoring-lamarr-f5704f)
Created: 2026-10-28
Updated: 2026-10-28

## Problem and outcome

Work unit 4 (F-owner-4, `docs/work/4_cited-images-viewed/plan.md`) found photograph `exterior-images.md #60`, Untapped New York's 2026 view of the 1880 west front from the Lehman court, showing the arches' voussoirs alternating light grey with dark grey stone, where the model (`src/model/core/vaux-front.ts`) built the dark ones in `palette.brick`. Outcome: settle what the dark voussoirs are from further evidence, recorded in `docs/research/` with every image viewed at full size and given an entry, and make the model follow it.

The work began as unit 4's follow-up while met's work-unit allocator refused new IDs, and its records stood in unit 4's folder (reviews 6 to 9) until the allocator accepted met's reserved ID gap (fleet `162da10`); they moved here the same day.

## Scope

Included: photographs of the west front in the Lehman Wing and the 1880 sources `docs/research/history.md` lists (L67, L77, NHL, W5, MC, BL, Heckscher 1995); the dark voussoir ring's material wherever the model builds it (the west front in `vaux-front.ts`, the side and east walls in `vaux-shell.ts`, whose ring is the same design); the note at the ring, the file headers and the two step details (`vaux.ts`) that said "granite and brick voussoirs".

Excluded, recorded for the owner as unit 4's F-owner-7, in `docs/research/exterior.md` section 9 and in notes beside the code: the light hood ring the model puts round the voussoirs, which #60, #63 and #64 do not show (the surviving east-front arch #67 has a ring of dark granite blocks there); the light inner ring the photographs show inside the voussoirs; the west front's five arches with the porch at the centre (#49, #60, #64, #65), where the model has seven, and its arches open to the floor as doorways today; the brick's colour, duller in #60 and #64 than the model renders it; the east front's two large arches either side of its middle, each with a roundel (#66, #67), where the model has seven and none; and the side walls, where only the hall's six bays a side had banded pointed arches, the end blocks round-headed openings and the south arcade a ground storey of light rusticated stone (#49, #65), where the model bands all eleven bays over brick.

## Approach

Gather every photograph that shows single voussoirs at a usable size, read the 1880 sources' text for the material, and sample colours as means of patches inside single stones, comparing the dark voussoirs with the light ones and with the brick in the same photograph, so the camera's white balance cancels. Calibrate the model's colour to the rendered ratio, as the palette's limestone and granite were calibrated to renders (`exterior.md` section 8, note of 2026-10-13).

Evidence (all viewed at full size, 2026-10-28): exterior #60 (Untapped 2026), #61 (Untapped Cities 2012), #62 (Forgotten New York 2023), #63 and #64 (Heckscher figs. 105 and 107, 1995), #65 and #66 (the Met's 1880 stereographs, Heckscher figs. 8 and 19), #67 (Untapped 2026, the surviving east-front arch), and #49 read again (six arches on its long north side, not seven). Text: MC and Heckscher p. 18 call the surviving east-front arch banded granite; Heckscher p. 75 gives the west front's arches "red bricks and gray granite"; the Met's 2012 page (TM) says brick replaced the pink granite first planned for the walls; L67, L77, NHL, W5 and BL say nothing of the voussoirs. The dark voussoirs are grey stone, never brick, rock-faced where a photograph is sharp enough; the east-front arch is granite at close range, and the west front's are taken to be granite with it.

Measurements (`exterior.md` [C7]; the patch boxes are listed in `exterior-images.md` before #61): in the five photographs that show single stones clearly (#60, #61, #63, #64, #67) each dark patch reads 0.41 to 0.82 of the mean of the same photograph's light patches a channel; a photograph's mean is 0.53 to 0.74, and their mean 0.63. In each the dark stones' red over blue lies within 0.21 of the light ones' and 0.10 or more under the brick's. In the 1880 stereograph the dark voussoirs read 1.3 to 1.7 times the brick's values while the tympana's dark stripes read as dark as the brick.

Colour: `core.graniteDark` #85827A, the light granite #B9B4AA times 0.72, roughness 0.85 (rock-faced). At 0.61 times (#716E68) the court render read the dark stones at 0.48 of the light, the renderer's ACES tone mapping darkening the darker stone; at 0.72 the renders from the court (`cam=0,-0.84,-158,0,13,-138.3`) and from the main floor (`cam=-6,5.7,-146,0,9,-138.3`) read about 0.62 (0.61 to 0.63 a channel), within 0.01 of the photographs' mean.

## Acceptance criteria

- [x] Further evidence gathered and recorded in `docs/research/`: exterior #61 to #67, each viewed at full size; #60 sampled and #49 read again; `exterior.md` [C7] and section 9; `history.md` (TM, the Heckscher pages read, the 1880 row); `interior.md`'s Lehman note.
- [x] The ring's material follows the evidence: `core.graniteDark` in `vaux-front.ts` and `vaux-shell.ts`; the ring's note and the headers cite the photographs; the step details say light and dark granite; the conflicts left open carry notes beside their code.
- [x] The model compared with #60 from the Lehman court and with `int-lehman-pyramid-up`, renders and photographs read at native resolution: in the preset only the lower right corner, the front, changes (1,234 pixels).
- [x] `npm run verify` green with `MET_PORT=5363` through the shared gate lock.
- [x] Independent review (Codex and Claude), rounds 0 to 3, every finding resolved.
- [x] Merged to main and pushed; the owner's render gallery republished.

## Implementation steps

- [x] Evidence gathered and viewed: the Untapped and Forgotten New York pages, Heckscher's Bulletin from the copy the Met's publication page links, Commons #49.
- [x] Model and records changed; renders compared (`5adc4ab`).
- [x] Review 0 (`reviews/0_implementation.md`) of the working-tree patch (`snapshots/0_target.patch.txt`): F0 to F8, one major (F3), all repaired; its Claude lane abstained under the runbook (a Haiku subagent).
- [x] Merged main `00eeee7` (`2308ed8`); review 1 (F9 to F18, one major, F11), repaired in `425cacf` and `8880074`.
- [x] Review 2 (F19 to F25), repaired in `064a843` and `b80dac8`; review 3 (F26 to F29), repaired in `e1042fd`.
- [x] Merged main twice (the choir screen's work, `c450396`; work unit 6's records, `55ae39d`) and pushed; the gallery republished; the records moved from unit 4 into this unit.

## Outcome

Complete. The dark voussoirs of every 1880 arch, on the west front and on the shell's side and east walls, are `core.graniteDark` (#85827A), not brick. The evidence is exterior #60 to #67 and Heckscher 1995, the method and numbers `exterior.md` [C7]; the 1880 fronts' other conflicts with the same photographs are unit 4's F-owner-7, open with the owner.

Verified: `npm run verify` passed through the gate lock with `MET_PORT=5363` on `2308ed8`, `b80dac8`, `e1042fd` and `2b8eff8` (the merge with the choir screen's work): 650 unit tests, typecheck, lint, build and 84 e2e each; the merge of work unit 6's records (docs only, `55ae39d`) passed `npm test`, and the Pages workflow passed on it. Main reached `55ae39d` and then `871fb90` (docs only). Reviews 0 to 3 (Codex and Claude) found two majors (F3, F11) and 28 lesser findings: all repaired but the release check of the shared gate lock's script (F13), which the coordinator took over. The owner's render gallery was republished from main's shots at `55ae39d` (its version 6): 12 of the 64 frames changed beyond capture noise, all where 1880 arches show, each read at native size against the frame it replaces.

Limitations: granite on the west front is an inference from the surviving east-front arch; the colour is calibrated to the Lehman court's light, so other lighting reads the ratio somewhat differently; the side walls' and east wall's dark rings changed with the west front's but are seen only in aerial views and the cut, and those frames were read in the gallery's comparison. This session's first verify runs went outside the shared gate lock, then documented only in work unit 2's plan, and one failed when a file it served was edited mid-run; `docs/policies/local-rules.md` now names the lock and that hazard. Its pushes to main at 17:41 and 18:05 went out before it knew of the coordinator's landing slot (`tmp/land.sh`).
