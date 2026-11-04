# The Medieval Sculpture Hall's end windows measured

Status: active
Owner: hall-windows session (claude/hall-windows-1d984d)
Created: 2026-11-04
Updated: 2026-11-04

## Problem and outcome

Work unit 4's F-owner-6 (`docs/work/4_cited-images-viewed/plan.md`, from its review 5) says the hall's round end windows may be too high and too small. From the preset that stands for P8's view (`int-medieval-hall-east`), the model's east window shows above the choir screen's middle frieze, where P8 shows it a third of the way down the middle tier. And if #29 (the Met's MM29152) was taken from the east balcony, its west window is about 3.3 m of glazing in a 5 m surround, against the model's 2.4 m. The model builds both windows 2.4 m across, centred at `VAUX_OCULUS_Y` (21.4 m, 17.29 m over the hall floor, an estimate). Nobody had measured them.

Outcome: where #29 was taken from settled, each window's height and size measured on P8 and #29 at native resolution with its uncertainty, the method and numbers in `docs/research/interior.md`, and the model's windows moved and resized to match, or the reason they are not recorded.

## Scope

Included: P8 and #29 read at native resolution in the browser and measured on a canvas; the Met's floor map (`interior-images.md` #34) for the plan positions the photographs need; `docs/research/interior.md` and the two photographs' entries in `interior-images.md`; the oculi in the model: `VAUX_OCULUS_Y` and the windows' size (`src/model/core/constants.ts`), the gable wall's hole (`vauxHall`, `vaux-shell.ts`), the glass discs (`westFrontWindows`, `vaux-front.ts`) and the plaster lining's hole (`endWallLinings`, `medieval-hall.ts`).

Excluded: the rest of those files, which other sessions are changing (the 1880 fronts, the Weston porch). Also excluded, and reported to the owner as findings, are the choir screen's place along the hall (`SCREEN_Z`) and the preset that stands for P8. Both are needed to read the photographs, and both disagree with the evidence (see Findings).

## Approach

The screen gives each photograph's scale at the screen's plane (12.80 × 15.85 m, the friezes' heights measured on #29 in work unit 4). A window stands on an end wall behind the screen, so its size and height also need the camera's distances to the screen and to that wall. Each photograph's camera is placed from what it shows, with the Met's floor map giving where the screen and the end walls stand:

- P8 (Nikon Coolpix P5000 at 7.5 mm, so f ≈ 2,700 px). The pitch comes from the balusters' vanishing point. The camera's distance to the screen and its eye height come from the friezes. The arcade bays beyond the screen show where the camera stands.
- #29 (a level view camera). The hall's east doorway (2.28 m on the map) frames it. With the screen's scale, that places the camera. The west doorway checks it, and the floor lines give the eye height.

Each window's surround and glazing edges are then measured as circles and converted at its wall's distance. The two windows are compared, and the model takes their result within the core area's mesh budget (130 of 130 meshes used).

## Acceptance criteria

- [x] Where #29 was taken from is settled, with its evidence.
- [x] Each window's centre height, glazing and surround measured on P8 and #29 with their uncertainty; method and numbers in `docs/research/interior.md`; the two photographs' entries in `interior-images.md` corrected where they no longer hold.
- [x] The model's oculi match the measurement, or the reason they do not is recorded; one constant per window if the two differ (they agree, so one height serves both).
- [x] Renders of the hall compared with P8 and #29 at native resolution.
- [ ] `npm run verify` green through the shared gate lock; independent review (Codex and Claude) with its findings resolved.
- [ ] Merged to origin's main through the landing slot; the owner's render gallery republished if a render changed.

## Implementation steps

- [x] Rules, records and the photographs' entries read; work unit 16 allocated.
- [x] #29's camera placed, and both windows measured (see Outcome and `interior.md`).
- [x] Records written; model changed; renders compared. The renders came from P8's and #29's measured cameras, the preset, near each window, and the gables from outside, before and after, in `.shots/hall-windows/` (ignored).
- [ ] Gates; review; repairs.
- [ ] Landing; gallery.

## Findings for the owner

- F-owner-1, the choir screen's place along the hall. The Met's floor map draws a partition across the nave at Z −106.12 (world frame), from the piers' centres to 1.15 m either side of the axis. Its 2.3 m gap is the gate, so this is the screen, standing on the third pier pair from the west. The model has `SCREEN_Z` −99.4, 6.7 m further east, near the middle pair, an estimate made from P8's perspective. P8 agrees with the map. Its camera stands 12.66 m from the screen, which puts it in the hall's west doorway. Three arches of the north arcade show beyond the screen, the furthest about 30 m away, its bay ending about 33 m away, so four bays lie east of the screen, not the model's three. #29 agrees too: framed by the east doorway, its camera stands 26.7 m from a screen at the map's place, and the west doorway then reads as wide as the map draws it (273 to 281 px predicted, 265 to 281 measured). At the model's place it would read 198 to 204 px. Moving the screen changes the walk tests at the gate (`choir-gate.test.ts`), the collection's clearance round it (`placement.test.ts`) and the hall's views, so it is the owner's call. Until then the model's screen stands 6.7 m east of the photographs'.
- F-owner-2, the preset that stands for P8. `int-medieval-hall-east` puts the camera at Z −112.9 with a 62° field. P8 was taken from about Z −118.8 (the west doorway), 1.6 m up, pitched 21.9° up, with a 51.3° vertical field (the camera's 36 mm equivalent). From the preset the screen and the windows can never sit where P8 shows them while the screen stands at −99.4. With the screen at the map's place, the window measured here falls a third of the way down the middle tier from P8's camera, as in P8.

## Outcome

Pending.
