# Review 19: implementation

## Target

Repository `met`, branch `final`: `1f3d7c9..2600751`, the repair of review 18's F50 and F51.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-final-r2.md` (ignored).
- Coordinator: the worker's verify at `2600751` (599 unit tests, 88 e2e) and the coordinator's at the merged `0f5f8d1`.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

F50 is sound; F51 still has two **P2** findings:

- **Eye easing can outlast the stop check** — [reach.test.ts:159](/C:/Users/38909/Documents/github/met-worktrees/review-final/src/model/reach.test.ts:159). On a 0.3 m step immediately before a wall, velocity reaches zero while the eye remains **22.7 cm below its settled height**. The actual `artworkTarget` accepted a fixture artwork then rejected it after settling. Require eye convergence as well as low velocity, reject timeout, and add this regression.

- **Coasting can introduce a forbidden fall** — [reach.test.ts:157](/C:/Users/38909/Documents/github/met-worktrees/review-final/src/model/reach.test.ts:157). A runner released before a 0.6 m drop spent **42 physics steps airborne**, landed, and passed `artworkTarget`. This violates the gate’s “never off the ground” contract. Reject any airborne coast and require successful rest within the bound. Replay repeats the same helper, so it cannot detect either flaw.

For F50, the closed middle-door seam’s zoom distance matched the independent triangle oracle exactly (**16.286 m**), while the look target found the door at **1.30 m**. Repeated zoom steps stopped exactly 0.5 m before drawn geometry; an adjacent leaf also matched.

The in-memory reachability calculation met all **94 artworks / 123 targets**, including replay, in about **19 seconds**. TypeScript passed; all checked files remain below 500 lines. Vitest could not run because the sandbox denied its temporary SSR directory. Repository unchanged.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F50 | Verified: at the middle door's seam the zoom's distance matches the independent triangle cast (16.286 m), and the look target finds the door at 1.30 m | Closed | None |
| F52 | F51's helper took rest as speed alone, so after a stair snap the eye could still be easing, 22.7 cm under its settled height, when the artwork was looked for | Accepted | `670f8cc`: rest means speed under 1 mm a second and the eye within 1 mm of where it settles; a walker that does not rest within 2 s is refused. The regression is red at `2600751`. Checked by the coordinator from the diff, the worker's red run and verify, rather than a fourth Codex round on this test helper. |
| F53 | Letting the walker coast could carry it off a 0.6 m edge, and it passed after landing, a fall the gate forbids | Accepted | `670f8cc`: any step off the ground while coming to rest refuses the candidate; the regression is red at `2600751`; checked as F52 |

## Verification

Above.

## Round outcome

The final repairs are merged at `0f5f8d1`.
