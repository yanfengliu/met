# Every image a model source cites is marked viewed

Status: complete
Owner: Gate session (claude/nostalgic-noyce-f69e6b)
Created: 2026-10-28
Updated: 2026-10-28

## Problem and outcome

Work unit 3 found the 1888 Weston door modelled round-arched while its code cited photograph #33, which `docs/research/interior-images.md` still listed as "Not viewed"; read at full size, #33 shows the head square. The lesson it left in `docs/learning/lessons.md` queues a gate: a unit test that every reference image a file under `src/model/` cites from `interior-images.md` or `exterior-images.md` is an entry marked viewed. Outcome: the citations in one form the test parses, every cited entry viewed at full size and recorded with what it shows, the test in `npm test`, proved red and the lesson retired with its proof in `docs/learning/gate-proofs.md`.

## Scope

Included: every mention of the two indexes under `src/model/` (comments only, no geometry), the indexes' entries and marks, the test, the lesson files, the defect register's Weston entry, AGENTS.md's gate list and the devlog. Photographs cited by author, year or file name alone were mapped to their entries, and those whose entries were unviewed (#12, #13, #16, exterior `Original_Met.jpg`) were brought into the form, so the gate holds them.

Excluded: changing the model. A photograph that disagrees with the model it informs goes to the owner as a finding. The many citations of viewed entries by author and year (the P1 to P9 primaries, Schneider 2019 and others) stay as they are, outside the gate's bound.

## Approach

One citation form, `<index> #<ID>` with IDs joined by `, `, ` and ` or ` or `, where an ID is an entry's number or label (`#33`, `#P6`, `#E43`). The interior index already numbered every entry; the exterior index's other candidates are numbered from 10 in file order, and its measured McKim, Mead & White photographs keep their labels (`[E39]`), with the Mapillary siblings `[P35]`, `[P47]` and `[P50]` given entries of their own. An ID is never reused or renumbered. Each entry carries its own mark: the measured photographs' "Viewed" moved from their section's paragraph onto each entry. The test reads every mention of either index. It fails a mention without IDs, and any number straight after the list's joiner (`and 42`, `, 7`, `to 17`, `–40`), so an ID without its `#` there or a range fails, and a measurement after a list takes a colon (`#16: 3 m`). It also fails an ID the list lacks anywhere in the citation's clause. The clause runs to the first `)` that closes no parenthesis opened inside it (an inner one such as `(Benoist 2012)` ends nothing), a `;`, the next mention, a line that does not go on as a comment, or a sentence's end (a full stop after two letters, a digit or a `)`, then a capital, so initials and `fig. 110` end nothing). And it fails a cited entry that is missing or not marked viewed. It reads the mark in a closed form (`Viewed`, optionally `at full size` or `at 1:1` and a date, then `.` or `:`, or `(primary, viewed)` on a primary's heading line), so a sentence like "Viewed from the north" is no mark. It checks the mark, not the reading. The visual audit still compares the model with the photographs.

## Acceptance criteria

- [x] Every citation of either index under `src/model/` in the one form, and the test's header naming the forms it reads and its blind spots.
- [x] Every cited entry viewed at full size and recorded with what it shows (interior #12, #13, #16, #29, #30 and the new #44; exterior #44, #49 and the new #60), each compared with the model that cites it, and every mismatch reported to the owner as a finding. Also #14, which `interior.md` relied on.
- [x] `src/cited-images.test.ts` green in `npm test`, red with #33 put back to "Not viewed", with a citation of an unviewed entry added, with an ID behind initials or without its `#`, and on the base revision's sources and indexes; the proof in `docs/learning/gate-proofs.md` and the lesson and its evidence deleted in the same commit (`1ce5977`).
- [x] `npm run verify` green on the final revision, an independent review with its findings resolved, merged to main and pushed.

## Implementation steps

- [x] Citations listed and mapped to entries, the indirect ones of unviewed entries included.
- [x] Photographs viewed at full size in the browser (the originals at 100%, measured on a canvas where a number was needed) and recorded.
- [x] Renders compared: the choir screen at `int-medieval-hall-east`, the 1880 building at `vaux-roof` from the park, the 1880 west front from the Lehman court at t = N.
- [x] Test written, proved red, lesson retired (`1ce5977`).
- [x] Review 0 (Codex and Claude, `reviews/0_implementation.md`) of `1ce5977`: two major and eight lesser findings, all accepted and repaired in `4042ce4`.
- [x] Review 1 (Codex and Claude, `reviews/1_implementation.md`) of `4042ce4`: one major and five lesser findings, all accepted and repaired in `586fcfc`.
- [x] Review 2 (Codex and Claude, `reviews/2_implementation.md`) of `586fcfc`: Codex none; Claude one major, older than that diff, and four lesser findings, all accepted and repaired in `91c63c8`.
- [x] Review 3 (Codex and Claude, `reviews/3_implementation.md`) of `91c63c8`: Codex none; Claude one minor and three nits, all accepted and repaired as Claude's own scratch copy had checked them.
- [x] Verify the repairs, review them, merge.

## Findings for the owner

- F-owner-1, the choir screen's tiers and cresting. #29 (MM29152), level and square-on, scaled by the screen's 12.80 m width (its floor-to-cross height then reads 15.85 m within 1%), puts the friezes' tops at about 5.1, 8.5 and 11.2 m over the floor and the cresting at about 4.7 m; #44 (ES4661) also shows the cresting taller than the upper tier. The model (`src/model/core/choir-screen.ts`, `TIERS`) has them at 5.9, 9.9 and 13.0 m and 2.85 m. The model is unchanged; a note beside `TIERS` names the conflict.
- F-owner-2, the choir screen's photograph. The code named the Met's photograph ES4661 as #29, but #29 is MM29152, the object's other photograph; ES4661 is now #44, which the code cites with P8.
- F-owner-3, the 1880 west front's photograph. The code said Untapped New York's 2026 view of the west front was in `exterior-images.md`; it was not. It is now exterior #60. Its article's text says the 1888 wing moved the main entrance from Fifth Avenue (east) to the park (south), where `docs/research/history.md` has the 1880 entrance facing the park (west).
- F-owner-4, the 1880 west front's voussoirs. #60 shows the arches' voussoirs alternating light grey and dark grey stone: sampled along one row through the middle arch, the dark ones read neutral grey (about 85 to 110 on all three channels) and the brick round them red-brown (red 15 to 35 over blue). The model (`src/model/core/vaux-front.ts`) alternates granite with `palette.brick` (#9a4b3a), and its render from the Lehman court at t = N shows red and light grey voussoirs. The striped tympana and the brick wall agree. The model is unchanged; a note beside the brick ring in `vaux-front.ts` names the conflict.
- Noted, no mismatch: `Original_Met.jpg` (#49) shows the 1880 building's end blocks under steep hipped roofs with chimneys, a hipped roof to a glazed clerestory and a porch, none of which the model builds, as the spec models only what exists today; #30 shows the gallery ring's ceiling sloping up toward the court as the model's does, but not that it is glass, which the orthophoto (exterior #9) shows, and the code now cites both.

## Outcome

Complete. `src/cited-images.test.ts` runs in `npm test` and is green: every citation of `interior-images.md` and `exterior-images.md` under `src/model/` (42) takes one form, `interior-images.md #33`, and names entries marked viewed. It went red with #33 put back to "Not viewed", with a citation of an unviewed entry added, with an ID behind initials, without its `#`, at a line's end or behind an inner parenthesis, and on the base revision's sources and indexes (24 problems), as `docs/learning/gate-proofs.md` records. The lesson and its evidence are deleted. Every cited photograph the indexes left unviewed was viewed at full size and recorded with what it shows (interior #12, #13, #16, #29 and #30, and #14 and #38's rope for `interior.md`; exterior #44 and #49), and two cited but missing ones were added (interior #44, the Met's ES4661; exterior #60, Untapped New York's 2026 view of the 1880 west front).

The code was last verified at `aaf5c29`: there `npm test` passed 608 tests, and typecheck, lint and build passed. `npm run verify`'s e2e passed all 88 on `91c63c8`, whose app code `aaf5c29` leaves unchanged (it changes the gate's test file and docs only). The model changes comments only, so no render changed and the owner's render gallery needs no rebuild. Reviews 0 to 3 (Codex and Claude) found no blocker; their 25 findings, F0 to F24, are all accepted and repaired. Fast-forwarded onto `origin/main` from `53a981c` at the owner's choice (2026-10-28): the shared local `main` holds work unit 2's unpushed integration walk (`795956f`, its plan still active), which its owner lands, merging `origin/main` in and resolving one AGENTS.md gate-list conflict with this unit.

Limitations: the gate reads only citations that name an index; author-and-year and file-name citations of viewed entries (the primaries, Schneider 2019 and others) stay outside it, as its header says. One e2e test, `doors.spec.ts:379`, failed under machine load during this work, and on the unchanged base too (3 of 3), before passing on every later full run.

Follow-ups for the owner: F-owner-1 (the choir screen's tiers and cresting against #29) and F-owner-4 (the west front's voussoirs against #60), each noted beside its code.
