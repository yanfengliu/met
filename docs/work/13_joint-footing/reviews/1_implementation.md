# Review 1: implementation

## Target

The met repository's branch `joint`: commit `e6bc4eb`, the diff `36ca301..e6bc4eb`, the repairs of review 0's findings (8 files: `src/walk/walker.ts`, `src/walk/footing.ts`, `src/walk/settle.test.ts`, the doc comments of `src/walk/reach.ts` and `src/walk/spawns.ts`, the spec's walk section, an AGENTS.md gate line and the devlog line).

## Reviewers and coverage

- **Codex:** a focused re-review of review 0's repairs by the lane that found its three major findings, since the repairs replaced the logic review 0 had read (fleet canon R10). codex-cli 0.163.0, `gpt-6-astra` at `xhigh`, approval `never`, sandbox `read-only`, `--ephemeral`, the prompt and the diff on stdin, the worktree as its working directory. It ran 658 s; no command of its log exited `STATUS_DLL_INIT_FAILED`. Vitest itself ran no tests, as the sandbox denied its temporary folder, so it ran 54 of the tests' bodies through a harness of its own in memory. It read code outside the diff (`src/model/closure.test.ts:19`) and changed nothing.
- **Claude:** not run in this round. The assignment set one round with both lanes, review 0.

The worktree's `git status`, `git diff HEAD` and HEAD were the same before and after. Local file paths in the report are shortened to repository paths; nothing else is changed.

## Reports

### Codex (`gpt-6-astra`)

Two findings remain at `e6bc4eb`:

1. **Major — overlapping parts still allow underside support.** `src/walk/footing.ts:72` uses even–odd parity, which treats overlapping parts of one geometry as empty. Reproduction: floor at 0; an 8 mm joint; each side contains one geometry combining boxes at Y **0.1–0.4** and **0.2–0.5**. Both `place` and `settle` lift the feet to **0.2**, an internal bottom face. The outside-diff `src/model/closure.test.ts:19` explicitly permits overlaps shorter than the 1.749 m settling span; that bound cannot protect this 2 mm query. **Repair:** use oriented crossings/nonzero winding to detect occupancy for this support check, preserving the walking path, and add the overlapping-parts regression.

2. **Minor — the bridge window excludes valid support near its lower boundary.** `src/walk/walker.ts:177` requires `rim.y > low + STANDING`, but the bridge call’s `low` is an artificial search boundary. On the existing deck fixture, `place(0, 1.3495, 0, 0)` lands at **−1**, although the deck at **1** is only **0.3495 m** below the requested height. The fallback window cannot reach it. **Repair:** separate the search boundary from the minimum rise above the actual feet. Using the actual feet for that threshold fixed this reproduction in memory and preserved all 19 settling cases. Add tests around requested heights 1.349–1.350.

The three original regression fixtures now pass. I executed **54 existing test bodies** through an in-memory TypeScript/Node assertion harness; all passed. Loading the `36ca301` walker and footing failed exactly the three new regressions. Removing each refusal check also failed its corresponding test.

The moved and kept settling paths passed. Separate probes accepted a clear sheet and rejected a sheet hit inside a wall. A **3,000-frame** walking comparison produced identical saved states and zero crossing queries in both revisions. Across **1,620 sampled model placements**, mean placement time was approximately **0.025 ms** versus **0.0246 ms** previously; this establishes no browser frame-budget guarantee.

Standard Vitest ran **no tests** because the read-only sandbox denied its temporary directory. I could not verify full gates, browser behavior, or the author’s 486,052-place scan. OS process inspection was also denied; no browser or server was launched. No files were changed.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F6 | `Footing.under` read occupancy by the parity of a piece's crossings, which reads the overlap of two of its parts as outside, so a probe that met the upper part's bottom inside the lower stood on it; the closure gate allows such overlaps shorter than settle's span (Codex 1, major) | Accepted: reproduced | `LineCrossings` gives each crossing's facing (`src/walk/collision.ts`, which makes room by writing a piece's box in one helper); `Footing.under` counts a closed piece as holding the line where more of its faces below look down than up, its winding. The walking step reads neither. Test: pieces of two overlapping parts either side of a joint, settled and set down; red with parity in place of the winding ("moved", onto the upper part's bottom) |
| F7 | The reach about the height asked counted the rise from that window's foot, an artificial bound, so a deck 0.3495 m under the height asked was missed (Codex 2, minor) | Accepted | The rise is counted from the feet. Tests: asked 0.3495 m over the deck, on it; asked 0.36 m over it, more than a step, through the seam (the bound); red with the rise counted from the window's foot (through it at 0.3495) |

## Verification

The repairs are commit `c2a9bcc` (`e6bc4eb..c2a9bcc`), which landed on origin/main.

- Pieces of two overlapping parts either side of a joint fail with parity in place of the winding (settled "moved", onto the upper part's bottom). The deck asked from 0.3495 m over it fails with the rise counted from the window's foot (through the seam to −1 m). Both pass with the repairs, and so do the other 17 cases of `src/walk/settle.test.ts`.
- The scan of the finished model, run again, differs from `e6bc4eb` in 4 places. Each is a lift onto the Grand Staircase's balustrade tops at the second floor, 11.92 to 12.28 m, now refused. None is new. The spawns, the route ends and `tests/e2e/routes.spec.ts`'s fixed places stand where they stood.
- `npm run verify` passed on `c2a9bcc`'s tree: 710 unit tests in 79 files, typecheck, lint, build and 119 e2e tests, 626 s. So did the Load rule's three runs of `routes.spec` and `walk.spec` at 4×: 21 passed each, with the 2 unthrottled budget walks skipped, 132 to 165 s each, plus the wait for the lock.
- No further round: the assignment set one round with both lanes, and this one checked review 0's repairs.

## Round outcome

Two findings remained, F6 (major) and F7 (minor). Both were accepted and repaired in `c2a9bcc`, each with a test red without its repair. These repairs were not reviewed again: the assignment set one round with both lanes, and they follow the fixes the reviewer proposed (the winding, the rise counted from the feet). Their red proofs, the scan and the gates verify them. No material finding remains open.
