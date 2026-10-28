# Review 0: implementation

## Target

Work unit 6 on the met repository's branch `claude/kind-brahmagupta-01cb19`: commit `a6ac047` on `795956f`, the diff `795956f..a6ac047` (38 files). In code: the sheet mark (`src/model/lib/sheet.ts`) and its declarations, the cap pass leaving sheets out (`src/viewer/section-cut.ts` `capsMesh`, `src/main.ts`), the closings of about 40 builders in `src/model/lib/` and the area folders, and the walk's crossing count (`src/walk/collision.ts` `crossings`, `src/walk/crossings.test.ts`). The gate over every piece was a draft (`tmp/closure/closure.test.next.ts`), offered for comment; `openWall`, `holeLining` and `archedPassage` are work unit 5's and were not in the round.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-28 with the same prompt: the closings (each face where the open boundary was, facing out, meeting its neighbours, renders unchanged but for the missing faces), the sheets, the crossing count (edges, corners, silhouettes, faces back to back, coplanar faces of overlapping parts) and the repo's rules. The diff came on stdin. Raw captures stay under the ignored `tmp/review-runs/w6-r0/`.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker; a smoke test read a file first. It read files outside the diff (listed in its report), ran a typecheck, ESLint, `git diff --check`, the crossing and section-cut tests in an in-memory harness (three crossing tests red with the old count), and geometry probes of winding, crossings and the lunette vault's clearance under its roof (0.1927 m). It left the worktree clean.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. The login check and the lane rule passed: one model key, the pin. It ran tsc, ESLint on the 38 files, the full unit suite (609 tests), the crossing, settle and walker tests with the old count patched in, and probes of the whole model at t = N, every library wall against the old `wall.ts`, synthetic walls, the library parts, the `prism` calls and an L of two boxes through `settle`. It left the worktree clean.

## Reports

### Codex (`gpt-6-astra`)

Found **one major and three minor issues** in `a6ac047` against `795956f`.

1. **Major — Coplanar overlaps can make `settle` miss an embedded walker.** [collision.ts:482](src/walk/collision.ts:482) retains same-facing coincident hits unless both hit triangle edges. Two closed boxes, `[-2,0,-2]..[2,4,2]` and `[-1,0,-1]..[3,4,3]`, merged into one piece reproduce this:
   - At `(x,z)=(.3,.1)`, HEAD returns `[0,0,4,4]`; the old rule returns `[0,4]`.
   - A walker with feet at `y=1` is **kept inside** by HEAD; the old rule lifts it to `y=4`.
   - At `(.5,.5)`, HEAD instead returns the odd count `[0,4,4]`.

   The rule therefore depends on triangulation within overlapping surfaces. A wall sill exactly on a rustication-band edge also reproduces an odd count. A wider model probe found six lines now counted odd where the old rule counted them even. Resolve coincident hits using surface/solid membership or winding, or remove those overlaps in builders; add coplanar-overlap and band-edge fixtures while preserving opposite-facing crossings.

2. **Minor — Channel closures add visible shelves across empty space.** [wall.ts:197](src/model/lib/wall.ts:197) adds a reverse-facing copy of a reveal through the channel void. Reproducer:
   ```ts
   wall({
     width: 4, height: 4,
     openings: [{ width: 1, height: 1.2 }],
     rustication: { start: 1.2, stop: 1.2, joint: .1, depth: .1 },
   })
   ```
   An exterior `FrontSide` ray from `(.17,2,2)` toward `(.17,1.2,-.05)` misses at the base revision but hits HEAD’s new upward face at `y=1.2`. That point lies inside the channel’s removed space. Trim the reveal where the channel removes stone and close the actual boundary, rather than adding a double-sided membrane.

3. **Minor — The pedestal underside faces inward.** [column.ts:199](src/model/lib/column.ts:199) uses planar axes `+X, −Z`, producing an upward normal. A downward ray through the default pedestal hits its bottom with `FrontSide` and misses with `BackSide`; a section cap using this geometry cannot fill its centre. Use `+Z` for the underside’s second axis. Changing outline winding alone does not fix `planar`’s prescribed normal. This affects the public pedestal builders; I found no current museum placement using them.

4. **Minor — `prism` fills point-touching notches.** [shapes.ts:125](src/model/roche-south/shapes.ts:125) treats every extracted loop as an outer contour. For:
   ```ts
   [[0,0],[4,0],[4,4],[2,4],[3,3],[2,2],[1,3],[2,4],[0,4]]
   ```
   `simpleLoops` returns areas `−2` and `16`. The old prism has top area `14`; HEAD has `18`, filling the notch twice. At `(2.1,3.1)`, the old prism has no vertical intersection; HEAD has four. Classify nested negative loops as holes. **The current Lehman outline is unaffected:** its three extracted loops have positive area.

No further findings in the inspected closings or sheet declarations. Excluding the pad and Rockefeller laylights from caps is appropriate: they are level surfaces with no volume.

The [draft gate:73](tmp/closure/closure.test.next.ts:73) samples 24 triangle interiors per shape. Add explicit coincidence/boundary cases and outward-winding checks; even crossing counts alone do not establish correct orientation. I read but did not execute this pending gate.

Validation: typecheck, ESLint, diff whitespace checks and the 500-line check passed. An in-memory assertion harness executed all four crossing tests and six section-cut tests successfully; substituting the old crossing implementation failed three crossing tests. Geometry probes checked winding, vertical crossings and roof clearance; the lunette back cleared its roof by at least **0.1927 m**. Full Vitest, build, browser and rendered verification were not run.

Outside-diff reads included the requested contracts and rules, [walker.ts:45](src/walk/walker.ts:45), `builder.ts`, `sweep.ts`, `profile.ts`, `check.ts`, `bvh-cache.ts`, and affected callers and dimensions. No files were created, edited or deleted; final Git status remained clean.
### Claude (`claude-opus-5-5[1m]`)

I found one major problem, two minor ones and several nits. The major one, an inverted face in `pedestalInto`, should be fixed before merge; it's a one-argument change. Everything else in the change checks out: the closings are closed, face outward and meet their neighbours, and HEAD passes typecheck, lint and the full unit suite (609 tests).

#### Findings

**1. Major: `pedestalInto`'s new underside faces up, into the pedestal** (`src/model/lib/column.ts:189-200`)
- **What:** the underside reuses the top's axes, so `planar`'s front is +Y (`column.ts:199`).
- **Evidence:** on 3,364 of 3,600 vertical lines through `pedestal({width: 3.2, depth: 1.6, height: 3})`, the lowest face looks up, e.g. `0.000^ 0.205^ 2.731v 3.000^`. `columnParts({pedestal: true}).pedestal` shows the same.
- **Failure:** the walk is unaffected, because parity ignores which way a face looks. The section cut is affected: from above the bottom is a front face, so the main pass draws it in lit stone and the cap pass, which draws back faces only, skips it. A cut through a pedestal shows its floor, not the cut colour.
- **Why nothing catches it:** `column.test.ts:92`'s `invertedFraction` compares winding with vertex normals, and those agree. No pedestal is built at t = N; only parts.html builds one (`src/parts/catalogue-orders.ts:47`).
- **Fix:** use `(0, 0, 1)` as axisV, as the hedge, papyrus and `prism` bottoms do. Add a check that the lowest hit on a vertical line faces down.

**2. Minor: the new crossing count misreads two cases the old count read right** (`src/walk/collision.ts:482`, `src/model/lib/wall.ts:173`)
- **(a) Two overlapping parts of one piece with tops and bottoms in the same planes**, e.g. an L of two 3 m boxes with a walker inside the corner. I ran this through the real collision path and `settle`:
  - new count: crossings `[0,0,3,3]`, result `'kept'` (the walker is left inside the stone);
  - old count: crossings `[0,3]`, result `'moved'` onto the top.
- **(b) Doubled faces, which `wall.ts:173` leaves alone on purpose.** A window with its sill on a channel floor and its head on a channel ceiling: on 300 of 300 lines in the channel's depth, the new count reads the 1.25 m opening as stone; the old count read it right. A door whose head lies on a channel ceiling is crossed an odd number of times (300/300), so the stone above it has no inside.
- **Neither occurs in the model today:**
  - None of the 54 lib walls the model builds has an opening edge on a channel edge.
  - Across 172,082 lines through the 898 non-sheet shapes, the longest same-height misread is 0.75 m (the medieval pier).
  - The 14 shapes with same-height faces each share only one plane: column sleeves on the new shaft discs, the piers, steel frames. The new count reads those better than the old one did.
- **Why nothing would catch a new case:** `crossings.test.ts` doesn't pin this trade-off, and the drafted gate's overlap measure can't see a doubled face.
- **Fix:**
  - have `wallSpec` refuse an opening edge within 1e-9 of a channel edge, naming the opening and the joint (or trim the duplicate floor or ceiling);
  - add fixtures for (a) and (b);
  - add a per-line facing-sum check to the gate.

**3. Minor: comments cite things that don't exist and claim more than HEAD does**
- **Missing anchors:**
  - `sheet.ts:2` cites a spec section "Build-step API: Solids and sheets", which doesn't exist.
  - `sheet.ts:4`, `section-cut.ts:14`, `collision.ts:451` and `crossings.test.ts:6` cite `src/model/closure.test.ts`, which doesn't exist at HEAD.
- **False claims at HEAD:** `section-cut.ts:13-14` and `main.ts:97` say every other piece is a closed solid.
  - 15 shapes are still open on every line. All are built by `openWall` or `archedPassage`: the Vaux walls, the wing B/C walls, the grand stair vault and the medieval hall's arcades and clerestory.
  - One-sided vertical faces such as the excavation cuts (`site/grid.ts:312`) are neither solids nor sheets.
  - The old bound sentence in `section-cut.ts` was deleted.
- **Spec not updated:** the spec (`:87`, `:132`) says nothing about sheets, about the cap pass leaving them out, or about how hits at one height count, despite its own rule to change it first, in the same commit.
- **Also:**
  - the plan lives in `tmp/closure/plan.md`, not under `docs/work/`;
  - AGENTS.md's gate list doesn't name `crossings.test.ts`;
  - there is no devlog line.
- **Fix:** land the spec text now, or keep the old bound in `section-cut.ts` until the gate merges, and cite only files that exist.

**4. Nit: the Grand Staircase's lead roof moved** (`hunt/roof.ts:83-86`). The old panes sat inside the bars' depth (`glazing.ts:128,131`). The new slopes are 22.5 mm higher and the gables 15 mm further out, so the rafters stand 45 mm proud instead of 67.5 mm.

**5. Nit: one existing vertex shades differently** (`pilaster.ts:95-96`). The new closing edge meets the torus's first segment at 18.7°, under the 32° crease threshold. At medium detail the torus's lowest vertex normal changes from (0.32, −0.95) to (0.16, −0.99), on faces that weren't missing.

**6. Nit: zero-area triangles** (`pilaster.ts:157`). The shaft's top cap starts its fan on the front edge, which adds 7 zero-area triangles. Start it at a back corner, as line 156 does.

**7. Nits: wording and dead code**
- `shaft.ts:6` says the shaft's ends are a circle; they are polygons through the flute centres.
- `poly.ts:104` `nearestOnEdges` is exported and never used.
- `poly.ts:121` says each loop is wound as the polygon is; that holds only where the outline pinches itself, not where it closes round a hole. In the model only the Lehman roof splits: three counter-clockwise loops whose areas sum to the whole (749.93 m²). All 19 `prism` holes land in exactly one loop.

**8. Nit: crossings fixtures** (`crossings.test.ts:46`). The diamond is wound inside out. The count only compares facings, so the test still works. The test at `:117` checks heights only, not settle's "no inside" reading its title claims.

#### Your four questions
1. **The closings:** apart from finding 1, all good.
   - `channelSidesInto` clips sloped edges to the band and skips the door's sill and the jambs. The old `wall.ts` was open in all four controls (a head or sill in a band, an arch, a door head, a blind door's foot); the new one is closed and consistently wound.
   - The shaft discs and the papyrus lobed caps share the grid's points exactly.
   - The hall roof slabs and `leadGable` are closed.
   - `halfCylinder`'s visible facets match the old cylinders'.
   - The lunette vault's back stays at least about 0.19 m under the roof's underside.
2. **The sheets:** every declared sheet is a single surface, and no solid is declared a sheet. Leaving sheets out of the cap pass is right. For the pad and the Rockefeller laylights it changes nothing: both are level, so the cap pass's strict height test (`cap-pass.ts:63`) never selected them before either.
3. **The count:** edges, corners, silhouettes and back-to-back faces are all handled right. The fixtures fail with the old count (3 of 4; the sheet case is a control). With the old count, 208 of the 898 shapes have lines read open; with the new count, 15, all work unit 5's. The regressions are in finding 2.
4. **Repo rules:** files are under 500 lines (`collision.ts` is at 491), types and lint are clean, the new error at `lehman-plan.ts:164` names what, which input and the remedy, and there are no unrelated rewrites.

#### The drafted gate
- `overlapAlong` (lines 143-172) can't see a doubled face or an inverted last face. Checking that each line's facings sum to zero costs nothing and would catch both findings 1 and 2(b).
- The header's claim (lines 13-14) that no overlap can hide a walker overclaims. An overlap at a piece's top still hides a walker partly sunk in it: the pier's [18.0, 18.4] overlap reads as outside (`medieval-hall.ts:84-85`).

#### What I read and ran
- **Read outside the diff:**
  - the spec;
  - `builder.ts`, `sweep.ts`, `profile.ts`;
  - `walker.ts:42-49` and `:157-195`;
  - the old `crossings` at 795956f;
  - three-mesh-bvh 0.9.15's ray intersection;
  - `cap-pass.ts`;
  - `glazing.ts` `ridgeSkylight`;
  - the `armor-court.ts` constants;
  - `grid.ts` `buildPad`;
  - the laylight placements;
  - `column.test.ts`;
  - the gate draft, `open-along.ts` and `plan.md`.
- **Ran:**
  - `tsc --noEmit`: clean.
  - `eslint` on the 38 changed files: clean.
  - The full unit suite: 68 files, 609 tests passed.
  - The crossings, settle and walker tests with the old count patched in, in the test process only: crossings 3 of 4 fail; settle and walker pass under both counts.
  - Probes: the whole model at t = N; every lib wall, with the old `wall.ts` as a control; synthetic walls; the library parts; the `prism` calls; the L case through `settle`.
- **Not run:** e2e and the shots.

The worktree is unchanged. My probes are in `(scratchpad path redacted)`.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | `pedestalInto`'s new underside faces up, into the pedestal, so a cut through a pedestal shows its floor rather than the cut colour (Claude 1, major; Codex 3) | Accepted. No pedestal is built at t = N; only `parts.html` builds one | The underside's second axis is +Z, as the other new bottoms'; the gate checks that a closed piece's faces looking up and looking down balance on every line it tries, which a face wound the wrong way fails |
| F1 | The crossing count reads two overlapping parts of one piece whose faces share planes, an L of two boxes, as outside where they overlap, and an odd number of times on a line through one part's diagonal, where the old count read them right (Codex 1, major; Claude 2a) | Accepted in part: the count stays. On 36,614 lines through the faces of the model's 899 walked closed shapes it reads none an odd number of times and misreads at most 0.75 m (the medieval piers' nave shafts in their capital blocks); the old count read 7,125 odd and misread up to 15.9 m, and merging every pair facing one way, the alternative, read 639 odd and misread up to 14.3 m, as the Weston openings' faces doubled on purpose show (a probe, 2026-10-28). Neither reviewer found the case in the model | A fixture pins the trade-off (`crossings.test.ts`); the gate bounds every overlap of a piece's parts on its lines below the walker's height |
| F2 | Where a window's sill lies on a channel's floor or a head on a channel's ceiling, `wall.ts` lays two faces facing one way, so the count reads the opening as stone or the stone above it as open (Claude 2b; Codex 1) | Accepted. No wall in the model has an opening edge on a channel edge | The channel's floor and ceiling leave out a hole whose sill or head is on their line (`intervalsAt`); a fixture, red without the repair |
| F3 | `channelSidesInto` adds a face back to back with the reveal's front strip where a channel crosses an opening's head, sill or arch, a membrane over the channel's void, where trimming the reveal would be truer (Codex 2) | Rejected: the face closes the stone there and keeps the facade as it renders, the reveal's front strip read as a thin lip. Trimming the reveal would cut a notch into every head and arch a channel crosses, a change to the render the task does not ask for | None |
| F4 | `prism` covers a notch pinched off at a point twice: its clockwise loop is read as an outline (Codex 4) | Accepted. The Lehman roof's three loops all run counter-clockwise | A clockwise loop is a hole of the loop that holds it; a test of a notch and the Lehman roof by their faces' areas, red with the old `prism` (18 m² for 14) |
| F5 | Comments cite a spec section and a gate that do not exist at `a6ac047` and say every other piece is a closed solid; the spec, AGENTS.md, the work doc and the devlog say nothing yet (Claude 3) | Accepted | The comments say "closed along vertical lines"; the spec, the gate, AGENTS.md, this work doc and the devlog land with work unit 5's merge, which brings the gate and closes `openWall` and `archedPassage` |
| F6 | The Grand Staircase's lead roof's slopes are 22.5 mm higher and its gables 15 mm further out than the panes it replaces, so the rafters stand 45 mm proud instead of 67.5 mm (Claude 4, nit) | Accepted, not repaired: the shell's slopes run on the bars' middle planes; the panes sat 22.5 mm under them, each corner pushed along its own normal, which no closed shell repeats | None |
| F7 | The pilaster base's closed profile meets the torus's first segment at 18.7°, under the 32° crease, so the torus's lowest vertex shades differently (Claude 5, nit) | Accepted | The moulding's back is swept apart, so the moulding's normals are as before |
| F8 | The pilaster shaft's top cap fans from the front edge, adding 7 zero-area triangles (Claude 6, nit) | Accepted | It fans from a back corner |
| F9 | `shaft.ts` calls the shaft's ends circles; `nearestOnEdges` is unused; `simpleLoops`' comment says every loop runs the polygon's way (Claude 7, nits) | Accepted | Reworded; the function removed |
| F10 | The crossings fixture's diamond is wound inside out, and the sheet case checks heights, not settle's reading (Claude 8, nit) | Accepted | The diamond is wound out; the sheet case settles a walker it is built through, which stays |
| F11 | The drafted gate's overlap measure cannot see a doubled face or one wound the wrong way, and its header says no overlap can hide a walker, where one sunk into an overlap at a piece's top is not found (Codex, Claude on the draft) | Accepted | The gate checks that faces looking up and looking down balance on each line; its header and the spec state the overlap bound exactly |

## Verification

The repairs pass the unit suite (612 tests), tsc, ESLint and the build; the crossing fixtures (6) and the `prism` test are red with the code they guard. The balance check turned up three older builders with parts wound wholly inside out, which it does not fail and which the plan records as an open finding: the coffers of `barrelVault` (`src/model/lib/dome.ts`), the Astor Court's moon gate panel and the Arms and Armor Court's gables.

## Round outcome

Both reviewers found the pedestal's underside facing in (F0, major for Claude), now repaired. Codex's major finding (F1) is a trade-off of the crossing count that the model does not meet and that the count measures better than either alternative; it is pinned by a fixture and bounded by the gate. F2, F4 and F5 are repaired, F3 rejected with a reason, and the nits repaired but F6. The gate and the docs, which land with work unit 5's merge, get a focused review there.
