# met's AGENTS.md discloses progressively, under Codex's 32 KiB

Status: complete
Owner: agentsmd, a worker of the met coordinator
Created: 2026-10-29
Updated: 2026-10-29

## Problem and outcome

At `8a6a0c2`, met's AGENTS.md was 69,223 bytes and 11,507 words: the preamble 1,126 bytes, the generated canon 14,419, Gates 52,793 (76%), Invariants 801 and Conventions 84. Codex reads only the first 32 KiB of a project doc, so its reviews of met saw less than half of the file. The Gates section had grown because every work unit and review round wrote its gates' whole evidence into it: bounds, red proofs with commit hashes, measurements and finding numbers, most of which already lived elsewhere. The owner asked why so much is kept there and directed: "There are other documents that can be used. You should also follow progressive disclosure." The fleet's "Repo file shape" says so since fleet `717e977`.

Outcome: AGENTS.md comes in under 30,000 bytes, leaving the canon room to grow to its 15,000-byte ceiling, and discloses progressively. It keeps what every session needs: What this is, the generated canon, Gates (every command, and each gate or gate group as one line saying what it checks and naming the tests where its detail lives), Invariants and boundaries, and Conventions. A gate's bounds and reproducing inputs live in its test's header, its red proofs there or in `docs/learning/gate-proofs.md`, its history in the work unit's reviews and its design in `docs/design/spec.md`. A gate keeps AGENTS.md under the bound.

## Scope

Included: AGENTS.md's Gates section; the headers of the tests that took facts from it; `docs/learning/gate-proofs.md`; a size gate in `src/repo-conventions.test.ts`; a devlog line; this unit's records.

Excluded: the canon block and AGENTS.md's other sections, which stay byte for byte; any test's code, which stays as it was (only comments change, but for the new gate); fleet rules. No new doc was needed: every fact found a home among the tests, gate-proofs.md, the spec and the other docs.

Dependencies: other workers were editing some of the same bullets at the time (walkgate: routes.spec, the Load rule, a `spawn=` query; replay: controls, menus, layout, walk-screen, walk-build, camera, floors, labels and smoke; orbit: the click tests; barrel: the closed solids gate's `barrelVault` clause). This unit landed first; they merge after it and fit their edits to its shape. The records land after units 9, 10 and 11's, so the registry stays consecutive.

## Approach

Each sentence of the old Gates section was found a home by its facts, and the facts with no home were moved. A check outside the repo (the scenes trim's scripts showed the way) splits the old section into 80 sentences and those into 327 clauses: each sentence at its top-level semicolons, and a parenthetical with a red proof, a review ID or facts of its own taken apart, so a red proof can live apart from the clause it qualifies. A clause's hard facts are its code spans, numbers with their units, quoted strings, dates, review and finding IDs and route names, each number and ID a whole token; its soft facts are its words, polarity and bound words among them, and its bare digits. It is found in a block of a home file (a markdown paragraph or bullet under its heading, a comment block, or a test's title, each holding its file's path) that holds, in one window of four times its length in words (at least 60), all its hard facts and three quarters of its words (80% with no hard fact, all of a short one). Each clause is tied to the tests its bullet names: it counts in a test file or a gate-proofs.md entry only of one of them. A red proof counts only in AGENTS.md, gate-proofs.md or a test file; review history may count in a work unit's records; nothing counts in the devlog or a snapshot. The check reports each clause kept in AGENTS.md, a duplicate of the file that held it at `8a6a0c2`, or moved, fails on any it cannot find, and requires the canon and the other sections byte-identical. It compares words, not meanings: its bounds are in its header, and the review read samples of the homes against the old text.

Where each kind of detail went:
- A gate's bounds, fixtures and measurements: its test's header. Most headers already held them; those that lacked some took them (47 files, comments only, each edited paragraph reflowed from its first change).
- Red proofs: a test header that already listed its red proofs took the ones it lacked; the rest went to `docs/learning/gate-proofs.md` under "Red proofs by gate", filed by test.
- Review history (rounds, finding IDs): already in `docs/work/<id>/reviews/`, kept beside a red proof where one cites it.
- Design facts: already in `docs/design/spec.md`, whose Verification section mirrors many gates, and `docs/learning/defect-register.md`.
- Commands (verify and its five, the e2e specs as a group, capture, catalogue, deploy, audit, load, ports): kept in AGENTS.md; the catalogue's exit codes moved to `scripts/met-catalogue.ts`'s header.

## Acceptance criteria

- [x] AGENTS.md under 30,000 bytes, its canon block and other sections byte-identical to `8a6a0c2`'s: 26,972 bytes with LF endings, 27,108 with CRLF; checked by the check and by the size gate.
- [x] Every gate a line that says what it checks and names where its detail lives: both reviewers read the new file in full first; their wording findings are fixed.
- [x] No fact lost: the check finds all 80 sentences, and goes red on planted, dropped and misfiled facts (review 0, Verification).
- [x] `src/repo-conventions.test.ts` fails an AGENTS.md over 30,000 bytes with CRLF endings: red with `8a6a0c2`'s, recorded in gate-proofs.md.
- [x] Only comments change in the other TypeScript files: their code printed with comments removed matches `8a6a0c2`'s.
- [x] `npm run verify` green on the landed tree.
- [x] One review round per the runbook, Codex reading the new AGENTS.md in full; blocking and should-fix findings fixed.

## Implementation steps

- [x] Measure the sections; build the check; find what already had a home.
- [x] Write the Gates section; move the facts with no home into headers and gate-proofs.md; reflow the edited comment paragraphs.
- [x] Tighten the check until it reads facts in context, and prove it red.
- [x] Add the size gate and prove it red.
- [x] Review round 0 (`reviews/0_implementation.md`); fix its findings.
- [x] Land through the slot: `05bdfee` on origin's main.
- [x] Land these records after units 9 to 11's, merging origin's main.

## Outcome

Landed on origin's main at `05bdfee`, 2026-10-29, a fast-forward of `8a6a0c2`: `67da660` the work, `05bdfee` its repairs after review 0. At `05bdfee`, AGENTS.md was 26,972 bytes with LF endings and 27,108 with CRLF (Gates 10,542 bytes and 1,453 words, from 52,793 and 9,211); its canon and its other sections are byte for byte `8a6a0c2`'s. Only comments changed in 47 TypeScript files; `src/repo-conventions.test.ts` gained the size gate, red with `8a6a0c2`'s AGENTS.md (69,357 bytes with CRLF endings) and recorded in `docs/learning/gate-proofs.md`. `npm run verify` passed on `67da660` and on `05bdfee` through the gate lock (`MET_PORT=5365`): 681 unit tests and 84 e2e tests. The check found all 80 sentences (327 clauses: 40 kept, 156 already held, 128 moved, 3 across two tests) and went red on eleven planted, dropped and misfiled facts and on a changed canon; it stays green on a reversed polarity in a long clause, one of its stated bounds. Review 0 ([reviews/0_implementation.md](reviews/0_implementation.md)), Codex and Claude: no blocking finding, eighteen findings, seventeen repaired or stated at `05bdfee`, one not adopted; the repairs were not reviewed again. Limits: the check compares words, not meanings, and lives outside the repo, in the session's scratchpad; the gate bounds the whole file, so a canon sync can trip it, and then met's own sections must shrink. These records landed after units 9 to 11's, merged with origin's main at `6ac45a9`, so the registry stays consecutive; by then the canon sync and units 9 to 11 had brought AGENTS.md to 28,573 bytes (28,713 with CRLF endings), under the gate.
