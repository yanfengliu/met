# Defect register

Defects the owner reported, each with the symptom as they saw it, what the investigation found, the cause, and the check that covers the defect's class from now on. An entry stays after its gate lands: this is the list of what the gates could not see, which is where the next defect comes from.

## The wheel stops zooming (2026-10-15)

**Reported symptom:** "scroll wheel doesn't always work so well. Sometimes it stops zooming at all, like it's hard capped on something."

**Investigation:** Real wheel notches (deltaY −100) driven by Playwright from four presets at t = N, with the camera-to-target distance logged after each notch (probe on `a3d077d`; controls `minDistance` 0.3 m, `maxDistance` 6000 m, `zoomToCursor` on, `zoomSpeed` 1; the rig's only clamp, the camera floor 0.4 m above the workspace ground, never fired):

- `aerial-ne`: 596 m to the target; each notch moved the camera 5.0 % of that distance (29.8 m, then 28.3 m, ...); by notch 100 a notch moved 0.19 m, by notch 140 it moved 2.4 cm, and at notch 150 it stopped dead at 0.300 m from the target. The camera stood at (−7.5, 15.0, −105.0), inside the building, below the core's roof: it had zoomed straight through the roof.
- `front`: the same decay, dead at notch 141, 0.300 m from the target, at (−7.5, 14.8, −104.7), again inside the building.
- `int-great-hall-floor-north`: 25 m to the target; dead at notch 88.
- `int-grand-stair-west`: 35 m to the target; dead at notch 94 at Z −64.8, 2 m short of the cross hall's back wall, which was still in plain view.
- From each stall, zooming out moved 1.6 cm per notch (5 % of 0.3 m), so the camera seemed stuck both ways.

**Cause:** OrbitControls' dolly scales the camera-to-target distance by 0.95 per notch and, with `zoomToCursor`, puts the target back in front of the camera at the new distance. The step is therefore 5 % of the distance to an invisible point that the camera carries along, not to anything under the pointer: it shrinks geometrically whatever is in view, ends at `minDistance` (0.3 m) wherever that point happens to be, passes through walls and roofs on the way, and starts the zoom out from 0.3 m. Neither the presets, the damping, the fit framing nor the camera floor was involved.

**Correction:** The controls' own zoom is off (`src/viewer/camera-rig.ts`). The wheel, a pinch and a middle-button drag step through `dollyStep` (`src/viewer/zoom.ts`) toward the surface under the pointer, found by `src/viewer/pick.ts` (the first drawn piece through per-geometry BVHs, or the workspace ground). Zooming in moves a tenth of the distance to that surface, at least 0.25 m, and stops 0.5 m before it; over open sky it flies on as if a surface stood 10 m ahead. Zooming out moves a tenth of the distance to the target, at least 0.25 m, until the target is 6 km away. Each step puts the target on the view axis at the depth it heads for.

**Check:** `tests/e2e/zoom.spec.ts` covers the class "camera input stops responding at a limit". From `aerial-ne`, `front`, `int-grand-stair-west` and after a move by the W key, it drives up to 120 real wheel notches in at the middle of the view. Every notch must move the camera at least min(0.25 m, what is left to the bound) − 1 mm until the camera is 0.5 m from the surface. There a notch in must move nothing, and each of 8 notches out must move at least 0.25 m. From `aerial-ne` it also drives the wheel out to the 6 km bound, where a notch in must move again. `src/viewer/zoom.test.ts` checks the same step rules on numbers.

**Gate proof:** With OrbitControls' zoom put back (`enableZoom`, `zoomToCursor`, `minDistance` 0.3, the new zoom input off), `zoom.spec.ts` went red on 5 of its 6 tests. For example, `aerial-ne`: "notch 95 in moved 0.2402 m with 4.303 m left to the bound". The far-bound test failed too. The sixth test, a preset chosen after zooming, passes either way. With the fix, all 6 pass.

**What it says about other checks:** Before this, no e2e test drove the wheel more than a few notches, and none checked that an input keeps working near a limit. A camera input with a clamp or a multiplicative step can reach that limit after enough use, so any new input (keys, touch) needs a gate that drives it to its bound and back.
