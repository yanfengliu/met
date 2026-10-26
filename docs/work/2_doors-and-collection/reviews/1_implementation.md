# Review 1: implementation

## Target

Repository `met`, branch `collection`: `db4cc47..37013e0` (43 files, +2,961/−121), milestone M3a, given to the reviewer as a diff on stdin with a detached snapshot worktree at `37013e0` as working directory. A hand-run script fetches real objects from The Met's Collection API (`scripts/met-catalogue*.ts`); a committed catalogue of CC0 records (`src/model/collection/`); procedural placeholders of 94 objects in ten spaces, built by steps in those spaces' chapters.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m3a.md` (ignored). By its own account it ran 86 existing test bodies in an in-memory Node harness, checked all 94 record hashes against the cache and probed mutations of the placements; it did not run `verify`, the browser, image decoding or the 4 s budget.
- Coordinator: the standard shot set at `37013e0` against main `db4cc47`. The five interior presets with artworks changed (Arms and Armor 7.3%, Dendur 4.2%, Engelhard 3.7%, Greek and Roman court 1.2%, Medieval 0.3%), five presets are new (gallery 600, the Petrie court, the Lehman galleries, the Greek galleries, the west balcony), the UI captures differ because new steps move the timeline, and every other view differs by at most 386 px. Inspected at native resolution: the armour riders and figures of the Arms and Armor court, Diana over the Engelhard Court, the Petrie court's sculpture, the paintings of gallery 600 and the Lehman galleries; nothing floats, sinks into a wall or blocks a passage. The model went from 696 to 729 meshes and from 1,541,504 to 1,578,674 triangles.
- Claude: not run. The milestone's worker and the plan's survey were Claude sessions.

## Reports

### Codex (`gpt-6-astra`, xhigh)

Four findings at `37013e0`:

1. **Medium — Superseded measurements produce incorrect sizes.** [met-catalogue-rules.ts:110](C:/Users/38909/Documents/github/met-worktrees/review-m3a/scripts/met-catalogue-rules.ts:110). Five Petrie objects select “historic dimensions, superceded” before their confirmed measurements. Object **231004** becomes **1.200 m** high instead of **1.003 m**, approximately 20% too tall. This is present in the hash-matched cached record and corroborated by [The Met’s record](https://www.metmuseum.org/art/collection/search/231004). Exclude superseded elements from selection and axis supplementation, prefer confirmed measurements, add independent fixtures, and regenerate.

2. **Medium — Text fallback discards measured axes and mislabels estimates.** [met-catalogue-rules.ts:188](C:/Users/38909/Documents/github/met-worktrees/review-m3a/scripts/met-catalogue-rules.ts:188). `axes = text` replaces existing measurements without clearing their source markers. A probe with measured width **0.470 m** and text-only height **1.765 m** produced estimated width **0.671 m**, labelled `measurements`. Merge text into missing axes and update provenance per axis; test this mixed-source case.

3. **Medium — Placement checks are not bound to the emitted instances.** [placement.test.ts:151](C:/Users/38909/Documents/github/met-worktrees/review-m3a/src/model/collection/placement.test.ts:151). `ARTWORKS` comes from `stepArtworks()`, while the timeline checks establish only counts and visibility. An in-memory mutation lifting every `kit.add` matrix **10 cm** left **all seven placement tests green**, despite floating displays. Check actual instance geometry and matrices at `t = N`, or first establish their exact correspondence with the pieces being tested. The route and door reference geometry is separate from the placements; the missing link is to the rendered instances.

4. **Medium — HTTP-date `Retry-After` values are ignored.** [met-catalogue-run.ts:84](C:/Users/38909/Documents/github/met-worktrees/review-m3a/scripts/met-catalogue-run.ts:84). At 12:00 UTC, a 429 requesting retry at 13:00 instead advises 12:10 because `Number(date)` becomes `NaN`. HTTP permits both dates and delay seconds. Parse both forms and test them. [RFC 9110 §10.2.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)

Otherwise, the normalization fixtures use independent literal expectations. Serial pacing, caching, gallery rejection, all-or-nothing output, provenance, public-domain image eligibility, kinds and display rules look sound. All **94 record hashes** match the available cache. The documentation correctly distinguishes CC0 metadata from eligible images, consistent with [The Met’s API documentation](https://metmuseum.github.io/).

The unmodified placements pass their floor, wall, obstruction and clearance checks; an additional bounds check found no inter-artwork overlaps. **86 existing test bodies passed through an in-memory Node harness**, including unchanged determinism, composition and year gates. Counts are **38 meshes / 40,290 triangles** for placeholders and **729 / 1,578,714** overall.

Full `npm run verify`, browser/network execution, visual rendering, image decoding and the **4-second budget** were not verified here. No files changed or browser processes launched.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F12 | Superseded measurements chosen first: object 231004 at 1.200 m instead of 1.003 m, five Petrie objects off | Accepted | `b6bc47b`: superseded elements excluded, confirmed preferred, fixtures 231004 and 204619, the catalogue regenerated from the cache |
| F13 | A text dimension replaced measured axes and labelled estimates as measured | Accepted | `b6bc47b`: text fills missing axes only, provenance per axis (`sizeFrom`), the mixed case tested |
| F14 | The placement checks were not bound to the drawn instances: a 10 cm lift of every artwork left them green | Accepted | `b6bc47b`: the checks read the drawn instances at t = N, bound to the pieces `kit.add` was given, and the base must sit on the floor |
| F15 | `Retry-After` as an HTTP date was ignored | Accepted | `b6bc47b`, completed in `7c370b1` (review 2) |
| F16 | Coordinator: painting grids rendered hard-edged, reading as pixel art | Accepted | `b6bc47b`: linear filtering, so a painting reads as a soft blur of itself |

## Verification

Reported by the worker at `37013e0`: `verify` green, 437 unit tests in 47 files and 63 e2e, the network check red on a planted fetch. The coordinator's shot comparison is above.

## Round outcome

Four findings accepted, plus the coordinator's F16, all repaired in `b6bc47b`. Review 2 is a focused check of the repair.
