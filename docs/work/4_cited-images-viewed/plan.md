# Every image a model source cites is marked viewed

Status: active
Owner: Gate session (claude/nostalgic-noyce-f69e6b)
Created: 2026-10-28
Updated: 2026-10-28

## Problem and outcome

Work unit 3 found the 1888 Weston door modelled round-arched while its code cited photograph #33, which `docs/research/interior-images.md` still listed as "Not viewed"; read at full size, #33 shows the head square. The lesson it left in `docs/learning/lessons.md` queues a gate: a unit test that every reference image a file under `src/model/` cites from `interior-images.md` or `exterior-images.md` is an entry marked viewed. Outcome: the citations in one form the test parses, every cited entry viewed at full size and recorded with what it shows, the test in `npm test`, proved red and the lesson retired with its proof in `docs/learning/gate-proofs.md`.

## Scope

Included: every mention of the two indexes under `src/model/` (comments only, no geometry), the indexes' entries and marks, the test, the lesson files, the defect register's Weston entry, AGENTS.md's gate list and the devlog. Photographs cited by author, year or file name alone were mapped to their entries, and those whose entries were unviewed (#12, #13, #16, exterior `Original_Met.jpg`) were brought into the form, so the gate holds them.

Excluded: changing the model. A photograph that disagrees with the model it informs goes to the owner as a finding. The many citations of viewed entries by author and year (the P1 to P9 primaries, Schneider 2019 and others) stay as they are, outside the gate's bound.

## Approach

One citation form, `<index> #<ID>` with IDs joined by `, ` or ` and `, where an ID is an entry's number or label (`#33`, `#P6`, `#E43`). The interior index already numbered every entry; the exterior index's other candidates are numbered from 10 in file order, and its measured McKim, Mead & White photographs keep their labels (`[E39]`), with the Mapillary siblings `[P35]`, `[P47]` and `[P50]` given entries of their own. Each entry carries its own mark: the measured photographs' "Viewed" moved from their section's paragraph onto each entry. The test reads every mention of either index, fails a mention without IDs or with an ID left apart from its list, and fails a cited entry that is missing or not marked viewed. It reads the mark in a closed form (`Viewed`, optionally `at full size` or `at 1:1` and a date, then `.` or `:`, or a primary's `(primary, viewed)`), so a sentence like "Viewed from the north" is no mark. It checks the mark, not the reading. The visual audit still compares the model with the photographs.

## Acceptance criteria

- [x] Every citation of either index under `src/model/` in the one form, and the test's header naming the forms it reads and its blind spots.
- [x] Every cited entry viewed at full size and recorded with what it shows (interior #12, #13, #16, #29, #30 and the new #44; exterior #44, #49 and the new #60), each compared with the model that cites it, and every mismatch reported to the owner as a finding.
- [x] `src/cited-images.test.ts` green in `npm test`, red with #33 put back to "Not viewed", with a citation of an unviewed entry added, and on the base revision's sources and indexes; the proof in `docs/learning/gate-proofs.md` and the lesson and its evidence deleted in the same commit.
- [ ] `npm run verify` green on the final revision, an independent review with its findings resolved, merged to main and pushed.

## Implementation steps

- [x] Citations listed and mapped to entries, the indirect ones of unviewed entries included.
- [x] Photographs viewed at full size in the browser (the originals at 100%, measured on a canvas where a number was needed) and recorded.
- [x] Renders compared: the choir screen at `int-medieval-hall-east`, the 1880 building at `vaux-roof` from the park.
- [x] Test written, proved red three ways, lesson retired.
- [ ] Verify, review, merge.

## Findings for the owner

- F-owner-1, the choir screen's tiers and cresting. #29 (MM29152), level and square-on, scaled by the screen's 12.80 m width (its floor-to-cross height then reads 15.85 m within 1%), puts the friezes' tops at about 5.1, 8.5 and 11.2 m over the floor and the cresting at about 4.7 m; #44 (ES4661) also shows the cresting taller than the upper tier. The model (`src/model/core/choir-screen.ts`, `TIERS`) has them at 5.9, 9.9 and 13.0 m and 2.85 m. The model is unchanged.
- F-owner-2, the choir screen's photograph. The code named the Met's photograph ES4661 as #29, but #29 is MM29152, the object's other photograph; ES4661 is now #44, which the code cites with P8.
- F-owner-3, the 1880 west front's photograph. The code said Untapped New York's 2026 view of the west front was in `exterior-images.md`; it was not. It is now exterior #60. Its article's text says the 1888 wing moved the main entrance from Fifth Avenue (east) to the park (south), where `docs/research/history.md` has the 1880 entrance facing the park (west).
- Noted, no mismatch: `Original_Met.jpg` (#49) shows the 1880 building's end blocks under steep hipped roofs with chimneys, a hipped roof to a glazed clerestory and a porch, none of which the model builds, as the spec models only what exists today; #30 shows the gallery ring's ceiling sloping up toward the court as the model's does, but not that it is glass, which the orthophoto (exterior #9) shows.

## Outcome

Pending: verification, review and merge.
