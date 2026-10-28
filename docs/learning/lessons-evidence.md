# Lessons evidence

The war story and the anchor behind each line of [lessons.md](lessons.md). An entry is corrected in place, dated, when understanding improves, and deleted with its line once its gate has landed and been proved red.

## A cited reference photograph must be recorded as viewed

**Anchor:** 2026-10-28, work unit 3 (`docs/learning/defect-register.md`, "The Weston door's head is round"). The 1888 Weston door was modelled round-arched in `20e9547` (2026-10-11) while `src/model/core/weston-facade.ts` cited photograph #33, which `docs/research/interior-images.md` still listed as "Not viewed". Read at full size, #33 shows the head square, as Heckscher's figs. 28, 29 and 110 do.

**Gate:** a unit test that reads every citation of `interior-images.md` and `exterior-images.md` under `src/model/` and fails on any cited entry not marked viewed. It checks that a reading was recorded, not how closely: the entry's own text says what the photograph shows, and the visual audit still compares the model with it. It has not landed because the sources cite images in several forms (#33, item 30, 37 to 40, primary 9), so the citations need one form first. At the time of writing, #29 (`src/model/core/choir-screen.ts`) and #30 (`src/model/roche-south/lehman-plan.ts`) are cited but still marked "Not viewed", so the test would start red until they are viewed and recorded.

What was believed: the facade had been modelled from #33, which its code names as the source. What happened: nothing recorded what #33 shows of the door, and the head, plain in the photograph at full size, was guessed. Work unit 2's doors worker read #33 at full size in M2b, saw the square head and left it as a note in the spec and the code, outside that milestone; it stayed in the model until the owner asked (review 15's follow-up).

Tried and set aside: a test of the door's head shape itself, which would only check the code against its own constant. The fidelity check stays the visual audit against the cited photographs; the gate above only makes sure each cited photograph has been read and its reading recorded.
