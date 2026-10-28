# Lessons evidence

The war story and the anchor behind each line of [lessons.md](lessons.md). An entry is corrected in place, dated, when understanding improves, and deleted with its line once its gate has landed and been proved red.

## A rebuilt ornament's joints can float with every gate green

**Anchor:** 2026-10-28, commit `a064995`, the choir screen's cresting rebuilt to the heights `docs/research/interior-images.md` #29 shows. `npm run verify` passed (646 unit tests, 84 e2e), and review 4 of that follow-up (`docs/work/4_cited-images-viewed/reviews/4_implementation.md`, F26) found the four halves of the side pediments touching nothing. Review 5's exact-distance probe found them the only floating pieces of the 580.

**Gate:** a unit test over the choir screen step's pieces at t = N: their world meshes, joined wherever two lie within 1 mm (three-mesh-bvh `closestPointToGeometry`), form one group that touches the hall floor; red on `a064995`'s `src/model/core/choir-screen.ts`. It did not land with the repair because the follow-up's scope was the screen's heights; review 5's probe of the same check ran in about a second.

The closure gate reads each piece alone, and the placement and door gates read other steps, so nothing reads whether one piece rests on another. The renders showed the pediments as dark bars, which read as ornament until a reviewer looked for what carried them. Every joint of the new cresting is placed by hand from measured heights (the C-scrolls, the pediments, the bar under the sunburst), so a later re-measure or edit can open a gap that no check sees. The gate's arch stood 3 cm under the frieze the same way, until its rise was derived from the frieze (review 5, F38).
