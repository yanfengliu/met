# Review 5: implementation

## Target

Repository `met`, branch `doors`: `7f1946d..d4d716d` (24 files, +1,590/−39), milestone M2a, given to the reviewer as a diff on stdin with a detached snapshot worktree at `d4d716d` as working directory (main `7f1946d` merged in, so the diff is the milestone alone). The three doorways of the Hunt central arch get hinged leaves that open and close by E or a locked click, looked at within 2 m, with a prompt; the link doors and the Bank door are tagged, say "Locked" and stay solid; the Weston door waits for M2b. A viewer-side door layer (`src/viewer/doors.ts`) hides the timeline's leaf by three.js layers and draws stand-ins at the leaf's matrix times the hinge rotation, registered with the picker and the cap pass; `doors=open|closed`, the shot contract and `window.__met.doors` are new.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m2a.md` (ignored). By its own account it probed 24 real-model snapshot histories with the layer attached, picks through the opening and at the moved leaf, cap matrices at 45° and 90°, collision at all three locked doors, and triangle intersections of the leaves through the swing; it ran TypeScript and diff checks, but Vitest could not start in its sandbox (`EPERM` on a temporary directory), and it ran no browser, visual or timing check.
- Coordinator: the standard shot set at `d4d716d` against main's at `c2b6f44`, read at native resolution. Only the entrance changed: each doorway a pair of bronze-framed glazed leaves under a transom light; the four new door shots show the entrance closed, open (the leaves swung into the vestibule), the Weston door unchanged, and the open entrance under a cut with walls and columns capped and the leaves clear of the openings. The link doors, the Bank and the Weston door are pixel-identical. The model went to 743 meshes and 1,579,348 triangles. A cold first page read 5.3 s ready under load; an interleaved A/B of the dev server's ready time (`tmp/review-runs/ready-ab.mjs`, ignored) read main at 0.87–0.95 s and M2a at 0.9–1.2 s with Vite's transforms warm, the 5.3 s being a fresh worktree's first Vite start.
- Claude: not run. The milestone's worker was a Claude session.

## Reports

### Codex (`gpt-6-astra`, xhigh)

Reviewed `d4d716d` against `7f1946d`. Three findings:

1. **Medium — Hunt leaves intersect the fixed transom.** [window.ts:352](C:/Users/38909/Documents/github/met-worktrees/review-m2a/src/model/lib/window.ts:352) places the leaf top 4 mm below the transom’s **centre**, while its underside is 45 mm below that centre. Both leaves therefore penetrate the bar by **41 mm**. Triangle-intersection probes confirmed this closed, partly open and fully open, in both directions. Place the leaf top below the bar’s underside and add a clearance check through the swing; the current height assertion preserves the overlap.

2. **Medium — The performance gate misses the populated interior view.** [doors.spec.ts:265](C:/Users/38909/Documents/github/met-worktrees/review-m2a/tests/e2e/doors.spec.ts:265) stops at approximately Z −2.6, then faces outward toward the entrance at Z −1.2. The hall is behind the camera. A rendering regression with the populated hall in view could therefore pass this gate. Add a swing measured while facing into the hall, covering opening and closing. The existing `Math.max` correctly measures slowest callback work.

3. **Medium — The shot test does not verify first-frame or placement ordering.** [doors.spec.ts:213](C:/Users/38909/Documents/github/met-worktrees/review-m2a/tests/e2e/doors.spec.ts:213) uses `open()`, which waits for readiness after at least five rendered frames. Initializing doors after walker placement—or displaying incorrect early frames—could pass every assertion. Record the first render and initialization order with a read-only probe, and demonstrate failure when door initialization is delayed. Current boot ordering looks correct, but AGENTS/spec claims exceed this test’s coverage.

Otherwise sound within the inspected bounds: timeline isolation, lifecycle transitions, locks, input routing, shared look-target use, clipping, bounds, shadow invalidation and composite-role coverage. In-memory probes passed 24 real-model snapshot histories, opening/moved-leaf picks, cap matrices at 45°/90°, and collision checks for all three locked doors.

TypeScript, diff checks and the 500-line limit passed. Counts remain below budget: **747 meshes including stand-ins**, **13 tagged-door/stand-in meshes**, and **1,579,388 timeline triangles**. Vitest could not start because temporary-directory creation returned `EPERM`; no unit tests ran. Browser, visual, 4-second readiness and runtime performance checks were not run. No repository files changed.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F22 | The Hunt leaves pass 41 mm into the fixed transom, closed and through the swing | Accepted | `7b7fe94`: the leaves clear the transom and the sill by 4 mm and swing about their face edges; a whole-swing check that no leaf meets a fixed part of its unit, red at `d4d716d` with 146 poses |
| F23 | The swing's frame gate faces out of the building, the populated hall behind the camera | Accepted | `7b7fe94`: a swing measured facing into the Great Hall, opening and closing, slowest frame under 16.7 ms; the entrance leaves no longer cast shadows, so a swing does not redraw the shadow map (recorded in the spec) |
| F24 | The shot test cannot see the order of door set-up and walk placement or the first frame | Accepted | `7b7fe94`: a read-only probe records the first drawn frame's door state and the order; red with door set-up delayed |

## Verification

unused

## Round outcome

Three findings accepted and repaired in `7b7fe94`; review 8 is a focused check of the repair.
