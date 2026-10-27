# Review 16: implementation

## Target

Repository `met`, branch `doors2`: `7b054d7..43887b2`, the repair of review 15's F43: a closing door turns back on the side it stands on, and only a closed door opens away from the walker. It also removes two trailing blank lines.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m2b-r.md` (ignored).
- Coordinator: `npm run verify` at `43887b2`: 597 unit tests in 68 files, typecheck, lint, build and 86 e2e green.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

No findings in `7b054d7..43887b2`. F43 is fixed: closing reversals retain the current side; at exactly 0°, opening chooses the walker’s side correctly. Open/opening toggles still close, including blocked swings. E and locked clicks share this logic.

Seven existing test bodies and 26 additional probes passed in memory, covering both sides, rapid toggles, blocked swings, leaning, scrubs and load defaults. Restoring the old rule reproduced the 66.4° “opening” stall. Tests use the real door layer, entrance geometry and collision; probes also checked drawn angles.

Browser/e2e tests were not rerun. Repository unchanged.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F43 | Verified: a closing door turns back on its own side; at exactly 0° opening picks the side away from the walker; E and the locked click share the rule | Closed | None |

## Verification

Above. Main was fast-forwarded to `43887b2`.

## Round outcome

No findings: F43 is verified. The old rule reproduces the 66.4° stall, and 26 probes covered both sides, rapid toggles, blocked swings, scrubs and load defaults. M2b is merged.
