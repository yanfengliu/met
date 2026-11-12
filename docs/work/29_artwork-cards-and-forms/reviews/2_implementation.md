# Review 2: implementation

## Target

Landing A2 of work unit 29: repository met, commit `b88746c` on the worker's branch `worktree-agent-a419a2463f2a69209` (review 1's repairs F10 to F15, and the Temple of Dendur's date), read in a clean checkout at that commit. The reviewer was given `git diff 0f79be9 b88746c` (17 files, 335 lines added and 103 removed); `0f79be9` is origin's main with landing A.

## Reviewers and coverage

- One lane, as the fleet's runbook gives a round of repairs (`../fleet/docs/skills/multi-cli-review.md`, Running): Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, codex-cli 0.163.0. Its sandbox check kept the lane. It read `src/walk/walk-mode.ts` and `scripts/met-catalogue.ts` outside the diff.
- The tree's `git status` and `git diff HEAD` were empty before and after, at the same HEAD. The lane ran no tests, builds or network requests.

The prompt named the four repairs that change behaviour (F10, F11, F15 and the pick's date) and asked of each whether it holds in every case, whether its test fails without it and whether it changed anything outside its finding. The repairs of wording alone (F12, F13, F14) were left out unless one was wrong. New findings were numbered from F16.

## Reports

Absolute paths of the reviewed checkout in the lanes' links are shortened to repository paths, and a report's own headings are set two levels down. Nothing else is changed; each lane's own finding numbers are kept as it wrote them, and the table after the reports maps them.

### Codex (gpt-6-astra)

Reviewed `b88746c` by inspection only. No files changed; no tests, builds, or network requests run.

**F16 — Minor: the look-target check does not use the walker whose footing was verified.** [fit-out-labels.test.ts:115](src/model/collection/fit-out-labels.test.ts:115) accepts feet below the nominal height by `view.sunk`, but [line 149](src/model/collection/fit-out-labels.test.ts:149) still casts from the nominal eye:

```ts
const eye = eyeOf(view.feet);
const look = v(view.aim).sub(eye).normalize();
```

Outside the diff, [walk-mode.ts:329](src/walk/walk-mode.ts:329) uses:

```ts
return lookTarget(hit, this.walker.eye(this.targetEye), this.walker.look(this.targetLook));
```

The support check and label check therefore establish separate facts. At a surface boundary or reach limit, the nominal ray could find the artwork while the settled walker’s ray does not. The temple’s permitted 2 cm sink makes this distinction concrete. Use `setDown(view).walker.eye()` and `.look()` for the walking query. This is a verification gap, not evidence that a committed view currently fails; the temple also has browser coverage.

**F17 — Minor: the promised detection of a source-date correction on the next run is false with a populated cache.** [collection.md:86](docs/research/collection.md:86) says a correction at The Met “is noticed at the next run.” However, [met-catalogue-run.ts:160](scripts/met-catalogue-run.ts:160) returns every cached successful response without revalidation:

```ts
if (cached !== null && cached.status === 200) {
  this.hits += 1;
  return cached;
}
```

Outside the diff, [met-catalogue.ts:50](scripts/met-catalogue.ts:50) loads that response from disk without checking its age. A cached `"completed by 10 CE"` consequently keeps satisfying `date.replaces` after the upstream record changes. The new mismatch test supplies a record directly and cannot detect this limitation. Describe detection on the next fresh fetch and explain cache refresh, or implement revalidation if the next-run guarantee is intended.

| Repair | Generality | Would retained tests fail without it? | Effects beyond the finding |
|---|---|---|---|
| **F10** | The placement check applies the actual walker to every view, including settlement and half a second of physics. It rejects displacement, falling, movement and incorrect height within its stated tolerances. The nine-ray substitute is gone. F16 limits the subsequent label proof. | Yes: reverting to maximum-height support would accept the edge case and fail the negative assertion. The raised-view assertion independently checks height disagreement. | The temple’s declared floor also moves up 4 cm, affecting reach targets; browser height assertions tighten and spawn serialization becomes shared. These support the same repair. |
| **F11** | All stale-placeholder causes feed the same `stale` flag. Production `Fetcher` errors carry the fields needed to rewrite either a 403 or 429 message; earlier problems are preserved. | Yes: the exact-message assertion at [met-catalogue-fit-out.test.ts:336](scripts/met-catalogue-fit-out.test.ts:336) fails if the original block is rethrown. | Earlier problems are now appended for other blocked runs too, including full runs. Fetching and writing decisions remain unchanged. |
| **F15** | The fallback now matches the historical closure: the hit instance alone when its mesh belongs to no step. | **No.** Every click in this comparison uses a timeline-owned mesh. Reinstating `?? lower` would still pass. The separate stray-mesh test exercises `artworkPiecesIn`, not this old closure. | Test-only correction; no runtime effect. |
| **Date override** | Both entry builders use the same exact-text guard. It handles arbitrary matching and mismatching supplied records, rather than special-casing Dendur. F17 limits freshness. | The script tests fail if substitution, marking or mismatch rejection is removed. The committed-catalogue test alone could still pass with a broken generator because it reads the existing artifact. | Date overrides also work for placeholders, and kept-placeholder checks compare their value and provenance. The measurement and colour-loop rewrites preserve operation order and values. |

The spec’s Collection section and research document accurately describe the kept-run limits and retry selection. AGENTS.md’s placement claim matches the new support check, with F16 limiting the connection to look-target coverage. The research document’s next-run date guarantee needs F17’s qualification.

APPROVE WITH FINDINGS — F16: the walking-label test still casts from the nominal eye instead of the verified walker’s eye.

## Findings and decisions

| ID | Finding | Decision | What follows |
|---|---|---|---|
| F10 | Review 1: the floor check could certify an unsupported view. | Closed. The real walker stands every view, and the reviewer finds the test fails without the repair. | F16 is what it leaves. |
| F11 | Review 1: a blocked kept run named a retry that could only refuse. | Closed, and its test fails without it. Earlier problems are now appended for other blocked runs too, which changes no fetch and no write. | None. |
| F15 | Review 1: the old rule rebuilt in `art-pieces.test.ts` fell back to another piece. | Closed in the code. Its test would pass without it, since no click reaches the branch; noted, as it is a test's own stand-in and changes no result. | None. |
| The pick's date | The owner's decision of 2026-11-11: the temple's card reads 10 BCE. | Holds for any record given; the script's tests fail without the substitution, the mark or the refusal of a mismatch. | F17 limits how soon a change at The Met is noticed. |
| F16 | The look-target check casts from the view's nominal eye, not from the eye of the walker that was stood there (minor). | Accepted. A gap in the proof, not a view that fails; the temple also has browser coverage. | Repaired in landing B's round: the walking query uses the settled walker's eye and look. |
| F17 | `docs/research/collection.md` says a corrected date at The Met "is noticed at the next run", which a populated cache prevents (minor). | Accepted. | Repaired in landing B's round: the document says the next fresh fetch notices it, and how the cache is refreshed. |

Landing A2 lands as reviewed. F16 and F17 are minor, and the same worker repairs them on top of it with landing B's round.
