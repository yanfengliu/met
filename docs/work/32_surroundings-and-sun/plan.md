# The museum's surroundings and the sun

Status: active
Owner: claude/worktree-improvement-list (coordinator)
Created: 2026-11-11
Updated: 2026-11-11

## Problem and outcome

Item 8 of the improvement list (`docs/work/27_improvement-list/plan.md`). The model's world ends at the site's edge (415 by 320 m): nothing stands across Fifth Avenue, the roof garden looks out on no skyline, Central Park is a flat plate beyond the site, and the sun is fixed at azimuth 140 degrees, elevation 46 degrees.

The owner decided on 2026-11-11 that the surroundings are environment: drawn like the sky and the workspace ground, outside the model, its mesh and triangle budgets, the section cut and the floor views.

Outcome: from the steps the avenue has its other side; from the air the museum sits in its blocks and its park; from the roof garden the canopy runs to the skyline; and the sun stands where a date and a time put it. The research is `docs/research/surroundings.md` (2026-11-11), whose numbered findings this plan cites.

## Scope

In: a generator script and its tests under `scripts/`; a generated data module and its decoder under `src/viewer/surroundings/`; the environment's drawing (`src/viewer/environment.ts` and new files beside it); `src/viewer/sun.ts`; a control for the sun in the page's menu; the query contract for the sun; the standard shots; the README's credits; the spec; `docs/research/surroundings.md` where a run adds to it.

Out: the model's steps, pieces, budgets and collision (the surroundings are never walked on, picked, cut or counted); the Obelisk, which stands inside the site and is the site chapter's ([V13]); New Jersey; night.

Limits:
- The page fetches nothing at runtime from any other host. The generator runs by hand, never in a test and never in CI, at about one request a second a host, under a generic client name, with no token and no personal details; `network.spec` stays green.
- No OpenStreetMap data goes into the generated file, so that it carries no share-alike terms ([P4]). The city's open data, the Forest Service's canopy and the Geological Survey's ground are enough ([D3], [K1], [G5]).
- The generated module stays under 400 KiB of binary (about 534 KiB as text), and under the repository's 1 MiB limit for any file.
- The walking frame budgets hold with the surroundings drawn (`npm run budgets`).

## Approach

The design is the coordinator's, from the research, and open to the owner's veto.

Landing A, the data (starts now; it touches nothing another worker holds):
1. `npm run surroundings` regenerates `src/viewer/surroundings/data.ts`, all or nothing, as `npm run met-catalogue` does the catalogue: the buildings from NYC Open Data's Building Footprints by the queries of [D4], counted by centroid; the transform of section 2, [T1]; within 1 km each footprint as its outline simplified at 0.25 m, from 1 to 3.5 km each as its smallest enclosing rectangle, from 3.5 to 5 km only those over 100 m ([N9], "B with the skyline"); feature codes 1003, 1005, 1006 and 2110 and the museum's own footprint left out; the canopy as the 30 m cells with 20% cover or more ([K3]); the ground as a 100 m grid ([G4]); the park's water as outlines with their levels ([G3]). Integers as [N7] gives them, in one little-endian binary held as base64, with the sources, their versions and the day of the run in clear.
2. A decoder beside it gives the page typed arrays and plain records, and is tested on the committed data: counts by ring, every building's ground and roof finite and in range, the Fifth Avenue row of [V2] found by place with each roof within 0.1 m of the table, nothing inside the site's bounds but what the site lacks.
3. A hand-written table of massing for the landmarks whose single prism would read wrong ([D5], [N9]): the twin-towered buildings of Central Park West and the slim towers of 57th Street, each as a few boxes, from photographs #68 to #71 of `exterior-images.md` and published heights, each number sourced or marked an estimate.
4. The script's rules are tested with recorders in place of the network and the disk, on small committed fixtures of real records.

Landing B, the drawing (after work unit 28, which is in `environment.ts`):
5. The data loads after the model is ready, as a chunk of the page's own, so the first frame does not wait for it; under `shot=1` the page is ready only once it is drawn.
6. Two draws for the buildings (the near outlines merged, the boxes instanced), one for the canopy's clumps, one for the ground, one for the water, in the existing haze.
7. The surroundings never stand between the camera and the site: a fragment nearer than the place its ray enters the site's box is not drawn. So the `front` view, whose camera stands among the blocks east of the avenue ([V8]), still sees the front, and a walker inside the site loses nothing.
8. Hidden in a floor's view as the landscape is; untouched by the section cut; no part of `window.__met.stats`, the walk's collision or the click's pick.
9. Shadows: the surroundings cast none into the model's map, which is fitted to the model. What the row across the avenue would really throw on the plaza under the chosen sun is looked at in renders before this is settled ([N9], Shadows).

Landing C, the sun:
10. `sun.ts` gives the sun's direction for a date and a time at the museum by NOAA's equations ([S2]), tested against [S5]'s two worked examples to 0.5 degrees.
11. A control in the menu sets the time of day and one of a few dates; `sun=` in the query sets both for links and shots; the default is chosen from renders, and today's fixed sun stays reachable ([S6]: 30 March, about 11:14).
12. The sky, the haze and the lights follow the sun's height; the shadows are drawn again only when it moves.

## Acceptance criteria

Landing A:
- [ ] `npm run surroundings` writes the module from the services, all or nothing, at its pace, and a second run from its cache makes no request; its rules pass their tests on committed fixtures.
- [ ] The committed module: under 400 KiB of binary; its header names each source, its version and the run's day; the decoder's tests pass on it.
- [ ] The README credits each source used, with the version and the changes made, as [D3] and "What the README would credit" set out.
- [ ] No request to The Met's Collection API or to OpenStreetMap is made by the script.

Landing B:
- [ ] The standard shots, read at native size by the worker and again by the coordinator: the front from the steps with the row across the avenue, the aerial views with the blocks and the park, the roof garden's view against photographs #68 to #70.
- [ ] By a test on the real camera: from each exterior preset no surroundings fragment covers the site's box; in a floor's view none is drawn; the model's stats are what they were.
- [ ] `npm run budgets` passes with the surroundings drawn, and the cost of a frame with and without them is recorded here.

Landing C:
- [ ] The sun's direction matches [S5] to 0.5 degrees, and `sun=` and the control each move the light, the shadows and the sky, through real input.
- [ ] A capture at four times of one day, read at native size.

Every landing:
- [ ] `npm run verify` is green on the merged tree through `tmp/gate.sh`; no test is weakened.
- [ ] The spec and `docs/research/surroundings.md` say what was built and from what.
- [ ] An independent review of the landing's exact revision has no finding left that matters.
- [ ] A devlog line; the gallery republished where a render changed.

## Implementation steps

- [ ] Worker: landing A, handed back.
- [ ] Coordinator: review, accept, land, devlog.
- [ ] Landings B and C, after work unit 28.

## Outcome

Pending.
