# Review 14: implementation

## Target

Repository `met`, branch `reach`: `69cfa11..db5c079` (8 files, +411/−68), the repair of review 12.
- F40: each move of the reachability fill continues from the walker's exact state saved at the place before (`Walker.save` and `restore`), and every target's path is walked again from the spawn as one continuous walk.
- F41: `src/walk/sight.ts` catches lines that cross a surface and keeps 2 cm clearance.

After the review, main `cd8a934` (M3b) was merged into the branch at `61b5c80` without conflicts.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m4-r.md` (ignored). By its own account it replayed all 123 paths without intermediate restores, continued from 240 snapshots, probed 4,000 sight lines, and ran 70 focused test bodies in memory, typecheck, lint and the line limits. Vitest itself was blocked in its sandbox.
- Coordinator: `npm run verify` at the merged `61b5c80`: 582 unit tests in 65 files, typecheck, lint, build and 86 e2e green. The worker's shots on the merged branch: 56 of 64 identical to main's, the other 8 the cut and floor views, changed only at the two openings.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

No findings in `69cfa11..db5c079`. The repair is sound within its documented bounds. Saved state is complete, normal walking never calls save/restore, and sight crossings and clearance use world space correctly.

Verified: all 123 paths replayed without intermediate restores, with zero drift or falls; 240 snapshot continuations; 4,000 sight probes; typecheck, lint and line limits.

All 70 focused test bodies passed through an in-memory assertion adapter. Vitest itself was blocked by sandbox temporary-directory permissions; build/e2e were not run. Repository unchanged.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F40 | Verified: zero drift and no falls on replay; the saved state is complete, and normal walking never saves or restores | Closed | None |
| F41 | Verified: crossings and clearance in world space | Closed | None |

## Verification

Above. Main was fast-forwarded to `61b5c80`.

## Round outcome

No findings. M4 is merged.
