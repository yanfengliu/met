# The Weston door's square head

Status: complete
Owner: Claude Code desktop session nice-leakey-9be7b0 (2026-10-27)
Created: 2026-10-28
Updated: 2026-10-28

## Problem and outcome

The owner asked (2026-10-28) whether the 1888 Weston entrance door into the Petrie Court has the wrong head shape: the model builds it arched (`doorUnit({ shape: 'arch' })` with a voussoir ring in `src/model/core/weston-facade.ts`), and work unit 2's doors worker noted that photograph #33 shows it square-headed (review 15's follow-up, `docs/work/2_doors-and-collection/reviews/15_implementation.md`). Outcome: the head's real shape decided from every source in `docs/research/` that shows the door, the evidence recorded there, and, if square, the facade and the door unit changed to match, the door still opening, closing and blocking the walker as before.

## Scope

Included: the door's opening, its hole in the pavilion's wall, the stone round it (the voussoir ring, or a lintel and architrave), the fanlight and the door unit; the 528/529 wall that `clearOf` keeps out of the doorway; the hole option that only the arched frame used; the spec, AGENTS.md's gate notes, the research files and the defect register.

Excluded: the porch, which is smaller than the real one and of another form (four free-standing round columns where the real porch is a pilastered aedicule with its balcony 1.5 m higher), recorded as open in `docs/research/interior.md`; the door's position, 2.68 m west of the floor map's.

## Approach

Read each source at its native size: the court photographs #33 and #35 (`interior-images.md`), Heckscher's 1995 photograph (fig. 110) and Weston's drawings (figs. 26 to 29), the King's Handbook engraving and the Detroit Publishing photograph (`exterior-images.md`), Heckscher fig. 35, and the floor map's door. All that show the head show it square, in a moulded architrave, with no fanlight, so the door becomes square-headed. Its size comes from the one scaled source, the April 1888 porch drawing (fig. 29: the opening 3.29 × 4.91 m under capitals 5.81 m up), scaled with the model's porch (columns 5.0 m to their capitals' top) so the head keeps its place under the capitals: 2.83 × 4.23 m. A drawing-size opening (3.29 × 4.91 m) would push its architrave into the model's porch entablature; rebuilding the porch is outside this task. The reveals and the head's soffit are lined in stone over a stone threshold, as #33 and fig. 110 show them (review 0, F1).

## Acceptance criteria

- [x] Every source in `docs/research/` that shows the Weston door checked at its native size and its reading recorded there (`interior.md`, Weston's 1888 door; `interior-images.md` #33 and #43; `exterior-images.md`; `history.md`).
- [x] The opening, its hole, the stone round it, the fanlight and the door unit square-headed, the leaves rising to the head, the door opening into wing B only.
- [x] The door-fit test, the window-parts gate, the collection's clearances and the reachability gate green, and `src/model/core/weston-door.test.ts`; the door-fit test red with the stone lining's opening 2 cm narrower or lower than the frame and with the 528/529 wall left in the doorway.
- [x] The standard shot set before (`0defda0`) and after compared, and every changed image read at native resolution.
- [x] `npm run verify` green on the final revision, an independent review with its findings resolved, merged to main and pushed, and the owner's render gallery rebuilt from main's shots (`docs/policies/local-rules.md`).

## Implementation steps

- [x] Research: the sources read, the head decided square, the opening measured on the 1888 drawing (`docs/research/interior.md`).
- [x] Model: `src/model/core/weston-facade.ts` (rect hole, `surround` architrave and a stone frieze in place of the voussoir ring, the reveals lined in stone over a threshold, `doorUnit` rect without fanlight, `PORCH_TOP` named), `src/model/core/arches.ts` (the hole option `facets` removed, as before M2b), the 528/529 comment in `src/model/core/galleries.ts`.
- [x] Checks: the named gates and the controls; the shots compared.
- [x] Review 0 (Codex and Claude, `reviews/0_implementation.md`): no blocker or major finding; six accepted and repaired, the stone lining of the reveals (F1) among them.
- [x] Review 1 (Codex and Claude, `reviews/1_implementation.md`) of the repairs: no blocker or major finding; seven accepted and repaired (F6 to F12), the lining's open feet closed in `holeLining` (F12) among them.
- [x] Review 2 (Codex and Claude, `reviews/2_implementation.md`) of those repairs: no blocker or major finding; Codex approves; F13 and F14, older than this change, deferred to one follow-up; F15 and F16, wording, repaired.
- [x] Verify, merge, gallery.

## Outcome

Complete. Every source here that shows the Weston door's head shows it square: the Petrie Court photographs (#33 at full size, Heckscher fig. 110), Weston's 1885 elevation and the April 1888 porch drawing (Heckscher figs. 28 and 29), and the 1891 engraving (`docs/research/interior.md`, Weston's 1888 door). The model's door is square-headed now. Its opening, 2.83 × 4.23 m, is the 1888 drawing's 3.29 × 4.91 m scaled with the model's porch. It stands in a stone architrave under a plain frieze, its reveals and soffit lined in stone over a threshold. Its two leaves rise to the head with no fanlight, open into wing B only, stop the walker closed and let it through open.

Merged to main at `8067270`, with work unit 2's final repairs (`3b405f7`) merged in. That merge conflicted only in AGENTS.md's line on the doors' gates, resolved by applying this unit's wording to main's line, and it was not reviewed on its own. `npm run verify` passed there: 601 unit tests and 88 e2e. The Pages workflow built and deployed `8067270`. The owner's render gallery shows main's shots at `8067270`. Reviews 0 to 2 (Codex and Claude) found no blocker or major defect; F0 to F12, F15 and F16 are repaired.

Limitations: the opening is 14% smaller than drawn, because the model's porch is a smaller colonnade, where the real one is a pilastered aedicule with its balcony 1.5 m higher. The door stands 2.68 m west of the floor map's. Both are recorded as open in `docs/research/interior.md`.

Follow-ups, not started. First, the gate queued in `docs/learning/lessons.md`: a unit test that every reference image a model source cites is marked viewed in `docs/research/`, once the citations take one form and #29 and #30 are viewed. Second, from review 2 (F13, F14): close every piece the walk and the section cut read along vertical lines, `openWall`'s bottom and `archedPassage`'s feet, under one gate.
