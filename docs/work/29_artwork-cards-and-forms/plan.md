# Cards for the landmark pieces and more forms for the artworks

Status: active
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

### Landing A: how a fit-out piece gets a record (worker, 2026-11-11)

The page builds its cards from `CATALOGUE` alone (`src/main.ts`), and neither it nor the card could be edited in this landing, so a fit-out piece's record lives in the catalogue itself, as an entry of another kind.

- Picks. A space of `src/model/collection/picks.ts` lists its fit-out pieces under `fitOut`, apart from its five to twelve placeholder picks, which alone are counted.
- Catalogue. `CatalogueEntry` is now one of two types, told apart by `display`: a `PlaceholderEntry`, as before, or a `FitOutEntry` (`display: "fit-out"`), which holds the record's metadata, size and provenance and nothing of a placeholder. The type system then names every place that read a placeholder's field off a raw catalogue entry: only `catalogue.test.ts` did. Everything that builds, places or measures placeholders goes through `entryOf` (`place.ts`), which now returns a `PlaceholderEntry` and refuses a fit-out piece by name.
- Script. `fitOutEntry` (`scripts/met-catalogue-rules.ts`) builds the record: no kind, no colour, no image fetched or sampled, and no dimension estimated by a kind (the pick gives what the record lacks, with its reason, and the card names it as estimated). `npm run met-catalogue -- --fit-out` rebuilds the fit-out records alone and writes the 94 placeholders' entries again exactly as the committed file has them. This was needed, not a convenience: the script's cache was gone from this machine, so a full run would have fetched all 94 records and 89 images again and derived every placeholder afresh from whatever The Met holds today, which this landing, labels only, must not do. The committed diff of `catalogue.ts` is the header, the provenance line's date and four added lines.
- Tags. `artworkKit(kit, id)` (`src/model/collection/fit-out.ts`) wraps a step's kit so that everything added through it carries the artwork's tag; a builder hands it to the part of its step that is the object. Artwork tags split no mesh (`src/build/batch.ts` keeps only doors apart), so the steps build what they built.
- The card. Unchanged: the page finds a tag's card in the catalogue, whichever kind of entry it is.

The pieces: the Temple of Dendur with its gate (547802), Diana (11998), the loggia from Laurelton Hall (133) and the choir screen from Valladolid (201926). Left out, each with its reason in `docs/research/collection.md` (Fit-out pieces): the Branch Bank's facade (the API answers 404 for its object), the five mounted armours, the organ case, the Astor Court, the Great Hall, the Vélez Blanco patio and Sullivan's staircase.

What the plan had wrong: the core area stands at 128 meshes of its 130, not at 130 (`src/model/core/core.test.ts` prints it; the same before and after). Were artworks batched apart as doors are, it would stand at 159 and that test would fail, but the choir screen's own step would still make its nine meshes: every piece of it is the one artwork.

One exception to the scope, by the coordinator's leave (2026-11-11): four lines of `src/ui/art-card.test.ts`, which pinned the catalogue at 94 entries and the records with no maker at the Dendur hall's five. They now pin 98 and six, the temple's own among them; the 94 placeholders stay pinned on their own in `catalogue.test.ts`, `labels.test.ts` and `reach.test.ts`.

After review 0 (2026-11-11), the repairs. F1: the page gave a clicked card the pieces of the clicked piece's own step alone, so the temple's card, clicked, went under a cut between the gate's foot (5.26 m) and the temple's (6.01 m) though the gate, the same artwork built by another step, was still drawn. The page's label now takes every instance that carries the artwork's ID, in every step (`artworkPiecesIn`, `src/viewer/art-pieces.ts`; in `src/main.ts` the one closure and its import, by leave of unit 26's session). Only the temple spans steps (dendur-gate 105 stones, dendur-temple 320); each of the other 97 artworks is built by one step, and 96 of the 98 have pieces in more than one mesh, which within one step were always gathered. From the gate's side no cut makes the failing state, since a cut draws what lies under it and the gate stands lower, so that side is held by taking the gate's meshes away in the test. F2: a blocked run's message names the command of the run that was blocked, a fit-out run's with its flag (`modeOf`, `FetcherOptions.rerun`). F3: a kept run refuses a placeholder that its pick's choices no longer give (kind, display, each dimension, gallery), and `catalogue.test.ts` holds a pick's kind and display as the entry's values, not only as its marks. F7, and after review 1 F10: the labels test stands each view by the walker's own rule, not one of its own. It sets walk mode's walker down at the view's feet as `spawn=x,y,z,tx,ty,tz` does (`placeOf`, `Walker.place`, `Walker.settle`) and holds that it rests there, at the view's height and the level its part names, to a millimetre, or under it by what the view says its floor is sunk (the forecourt's flagstones, up to 2 cm). The first repair took the highest of nine lines down round the feet, which passed a view 0.10 m past the dais's edge; the walker there falls to the terrace, and the test now refuses it. The walker also showed that the temple part's level was the dais's, 4 cm under the flagstones a visitor stands on: `fit-out.ts` now names the forecourt's. F4 and F5 are wording: `collection.md` says what a kept run does on a difference (it fetches the fit-out records, lists it and writes nothing), and AGENTS.md lists the browser block with the e2e specs.

After review 1 (2026-11-11), landing A2. F10 is told above with F7: the six views are stood by the walker's own placement, and a view just past the dais's edge is refused. F11: a block met after the run had found problems lists them, and where a run with `--fit-out` had found its kept placeholders are not what the picks give, the block names the whole run as the one to retry, since the fit-out run could only refuse again (`blockedWith`, `scripts/met-catalogue-run.ts`; the fetcher's block now carries what was refused and when to retry, so the run can say them again with another command). F12: two comments of `src/viewer/art-label.ts`, by leave of unit 26's session. F13: the spec says what a kept run checks and where it stops (a rule changed since the entries were built is not seen). F14 and F15: a header's list of importers, and the old rule rebuilt in `art-pieces.test.ts` made the old closure's exactly.

The temple's date, by the owner's decision of 2026-11-11 ("Correct to 10 BCE"). The record gives `objectDate` "completed by 10 CE" beside begin and end dates of −10. A pick may now give a date in place of the record's (`Pick.date`: the text, the record's text it replaces and the reason); the script writes the pick's text as the entry's date with `dateFrom: "pick"` beside it, and refuses the pick once the record's `objectDate` is no longer the text it replaces, so The Met correcting its record is noticed and the override then removed. The mark is a key only an overridden entry has, so `npm run met-catalogue -- --fit-out` could regenerate the temple's record from the cache with no placeholder's line touched: the catalogue's whole change is that one entry's `"date":"completed by 10 BCE","dateFrom":"pick"`. A kept run compares an entry's date with its pick's as it compares a kind, and `catalogue.test.ts` holds that the temple's is the one date so marked. `scripts/met-catalogue-rules.ts` stood at 499 lines of its 500: two loops written shorter made the room.

Checks made once, not gates: the standard shots before and after the tags, two captures of each at `06b3124` and on the changed tree, compared pixel by pixel. Each of the 64 images has a capture from before the change that is byte for byte a capture from after it; between any two captures, of one tree or across the change, 8 to 14 images differ, on at most 28 pixels of an image by at most 1 of 255, the capture's own noise (docs/policies/local-rules.md). And the real page opened headless at each piece, walking and clicked, its card read against the record.

## Acceptance criteria

Landing A:
- [x] Each landmark's card shows from the walker's eye within the look target's reach and on an orbit click, by a unit test on the finished model for each, and in the browser for Diana and the Temple of Dendur.
- [x] The reach gate walks to each landmark and looks at it.
- [x] Mesh counts: the core stays where it stood (128 of its 130; the "130" this criterion first named was wrong), every area within its budget, the model within 900 (744).
- [x] `docs/research/collection.md` and the spec say which fit-out pieces carry a record and where its data came from.

Landing A2, what landing A left open (2026-11-11):
- [ ] Review 1's findings repaired and gated: F10 (the six views stood by the walker's own placement, with a case beyond a floor's edge that fails), F11 (a blocked kept run that knows its placeholders are stale shows the difference and names a command that can succeed), F12 (two comments in `src/viewer/art-label.ts`, by leave of work unit 26's session), F13, F14 and F15. The worker's half-made repairs are the snapshot `90a3afc` on `worktree-agent-a419a2463f2a69209`.
- [ ] The Temple of Dendur's card reads 10 BCE, as the owner decided on 2026-11-11: an override of the record's `objectDate` ("completed by 10 CE") that the catalogue marks as the pick's, with its reason (the record's begin and end dates are −10), and `docs/research/collection.md` and the spec saying so.

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

- [x] Worker: landing A, handed back at `9176e57`, and review 0's repairs at `41857a4`.
- [x] Coordinator: reviews 0 and 1 (Codex and Claude), `npm run verify` on the merged tree at `d9323d8` (791 unit tests, 93 e2e), landed 2026-11-11; no render changed, so the gallery stays at version 21; devlog line added.
- [ ] Worker: landing A2 (above), from the snapshot `90a3afc`. Blocked on 2026-11-11 by the account's usage limit (`docs/work/27_improvement-list/plan.md`, Blocked).
- [ ] Coordinator: check A2's repairs, gate, land, devlog.
- [ ] Worker: landing B on top of A.
- [ ] Coordinator: read the contact sheet, review, accept, land, gallery, devlog.
- [ ] Worker: landing C on top of B.
- [ ] Coordinator: read the pairs, review, accept, land, gallery, devlog.

## Outcome

Pending for the unit. Landing A is on origin's main (2026-11-11): the four landmarks' cards, reviewed in two rounds (`reviews/0_implementation.md`, `reviews/1_implementation.md`) and gated by the coordinator at `d9323d8`. Round 1's verdicts were Codex's reject on F10 and Claude's approve with findings; the coordinator landed with F10 to F15 open because none changes what the page does and the worker that was repairing them stopped at the account's usage limit. They and the temple's date are landing A2.
