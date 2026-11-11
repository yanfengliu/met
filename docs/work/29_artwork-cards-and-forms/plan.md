# Cards for the landmark pieces and more forms for the artworks

Status: planned
Owner: claude/worktree-improvement-list (coordinator)
Created: 2026-11-11
Updated: 2026-11-11

## Problem and outcome

Item 5 of the improvement list (`docs/work/27_improvement-list/plan.md`).

The landmarks have no card. On the live page at `2bfa83f`, a click on Saint-Gaudens's Diana in the Engelhard Court and a click on the Temple of Dendur's wall each left `window.__met.label` null, while a click on the Frog Fountain beside Diana showed its full card. The landmarks are built by fit-out steps, not by the collection's steps, so they carry no artwork tag.

The placeholders share too few forms. `src/model/collection/kinds.ts` has one turned standing figure, one group, one recumbent figure, one bust, a jar, a dish, a slab, a block and a canvas, so Ruth Gleaning, the Frog Fountain and Perseus are the same shape at different sizes, and the courts read as chess pieces (`preset-int-engelhard-north`, `preset-int-petrie-court`, `preset-int-greek-roman-court` at `75abdd3`).

Outcome, in three landings:
- A. Every fit-out piece that is itself an object of The Met's collection shows the artworks' card, looked at while walking and clicked in the orbit view.
- B. The placeholders say more about what each object is: more forms, chosen per object from its record and its public-domain image, each still at the object's real size.
- C. Each painting is a 16×16 grid of colour sampled from its public-domain image, up from 8×8, with the spec, `docs/research/collection.md` and the catalogue script saying so.

## Scope

In: `src/model/collection/**`; `scripts/met-catalogue.ts`, its fixtures and tests; artwork tags on fit-out pieces in the area modules (at least Diana and the Temple of Dendur with its gate in `src/model/roche-north/`, and the Valladolid choir screen in `src/model/core/`; the worker proposes the rest, such as the Laurelton Hall loggia, the Branch Bank facade and the mounted armours, each only where the piece is one collection object with a record); `docs/research/collection.md`; the spec's Collection section; the unit tests that hold the collection (`artwork-tags`, `labels`, `kinds`, `placement`, `catalogue`) and the reach gate; `tests/e2e/labels.spec.ts` and `labels-view.spec.ts` for the landmark cards.

Out, until work unit 26 is on origin's main: `src/ui/**` (so the card itself, `src/ui/art-card.ts`, is used as it is), `src/main.ts`, `src/build/**`, `src/viewer/facts.ts`, `src/viewer/query.ts`, `README.md`, and the e2e specs for the replay, controls, menus and layout.

The paintings' sampling: the owner chose 16×16 on 2026-11-11, up from 8×8 (a painting stays colour data, not a photo texture). It is landing C, after A and B; landings A and B leave the sampling as it is.

Limits:
- The catalogue script runs by hand at one request a second against The Met's Collection API, never in a test and never at runtime; `network.spec` stays green. Object data is CC0; an image is viewed or sampled only where the object is public domain, and no image is committed.
- The core area is at its mesh cap (130 of 130), so the choir screen's tags must not split a mesh. The spec says an artwork's pieces batch as untagged pieces do; the test of the core's budget holds it.
- The collection's budget is 110 meshes and 600,000 triangles; it stands at 38 and 40,290.
- Every form is a closed solid the closure gate passes.

## Approach

The worker records here how a fit-out piece gets a record without a placeholder being built for it, and which forms were added and how an object is given one.

## Acceptance criteria

Landing A:
- [ ] Each landmark's card shows from the walker's eye within the look target's reach and on an orbit click, by a unit test on the finished model for each, and in the browser for Diana and the Temple of Dendur.
- [ ] The reach gate walks to each landmark and looks at it.
- [ ] Mesh counts: the core stays at 130, every area within its budget, the model within 900.
- [ ] `docs/research/collection.md` and the spec say which fit-out pieces carry a record and where its data came from.

Landing B:
- [ ] A contact sheet of all the placeholders before and after, in an ignored folder, read by the worker and again by the coordinator against each object's image.
- [ ] Every object keeps its real size; `kinds.test.ts` holds each new form; the closure gate passes; the collection stays within its budget.

Landing C:
- [ ] Every painting is sampled at 16×16 by the catalogue script, run by hand, from public-domain images only; the catalogue's provenance says so; no image is committed and the page still fetches nothing.
- [ ] Pairs before and after of each painting at walking distance, in an ignored folder, read by the worker and again by the coordinator.
- [ ] The spec's Collection section and `docs/research/collection.md` say 16×16 and cite the owner's decision of 2026-11-11.

All three:
- [ ] `npm run verify` is green on the merged tree through `tmp/gate.sh`; no test is weakened.
- [ ] A devlog line is ready for each landing.
- [ ] An independent review of each landing's exact revision has no finding left that matters.

## Implementation steps

- [ ] Worker: landing A, handed back with its branch and revision.
- [ ] Coordinator: review, accept, land, gallery if a render changed, devlog.
- [ ] Worker: landing B on top of A.
- [ ] Coordinator: read the contact sheet, review, accept, land, gallery, devlog.
- [ ] Worker: landing C on top of B.
- [ ] Coordinator: read the pairs, review, accept, land, gallery, devlog.

## Outcome

Pending.
