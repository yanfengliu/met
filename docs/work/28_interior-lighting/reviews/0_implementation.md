# Review 0: implementation

## Target

Work unit 28, interior lighting (ambient occlusion, the shadow filter, the stair hall's gable): repository met, commit `f41c82b` on the worker's branch `worktree-agent-ae95d3eb21fe7823e`, read in a clean checkout at that commit. `f41c82b` is documents only over `16bc4d6`, the tree the worker's gates ran on, which has origin's main merged up to `328a9c2`. The reviewers were given `git diff 328a9c2 f41c82b` (16 files, 2,393 lines added and 32 removed).

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, codex-cli 0.163.0. Its sandbox check kept the lane. The review checkout has no `node_modules`, so it read three.js 0.186.1 in the primary checkout's, with `src/main.ts` and `src/model/palette.ts` outside the diff.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, limited to Read, Glob, Grep, Task and three read-only git commands, permission mode `dontAsk`, no MCP server. One result event on that model alone; 37 reads, 50 searches, 3 globs and 4 shell calls, no subagent call. It read three.js 0.186.1 the same way.
- The tree's `git status` and `git diff HEAD` were empty before and after, at the same HEAD. Neither lane ran tests, builds or network requests. No lane abstained.

## Reports

Absolute paths of the reviewed checkout, and of the primary checkout whose `node_modules` the lanes read three.js in, are shortened to repository paths in the lanes' links, and a report's own headings are set two levels down. Nothing else is changed; each lane's own finding numbers are kept as it wrote them, and the table after the reports maps them.

### Codex (gpt-6-astra)

Reviewed `f41c82b` read-only. No tests, builds, network requests, or file changes. The worktree lacks `node_modules`; I read the primary checkout’s installed three.js **0.186.1**.

1. **Major — rejected depth samples still supply edge shading.** [ao-shaders.ts:301](src/viewer/ao-shaders.ts:301) initializes `ivec2 found = nearest;`, then line 311 unconditionally returns `texelFetch( metAoMap, found, 0 ).x`. If every depth comparison fails, this returns the very surface the lookup rejected. A thin railing or antialiased silhouette can cover canvas samples without covering any nearby prepass pixel, especially at DPR 2. It then inherits background occlusion, violating the promised separation of edge shading. Return neutral occlusion when no matching sample exists, and cover this with a thin-foreground-over-dark-background pixel fixture. The visual consequence is inferred from the shader; I did not render it.

2. **Minor — the sun-leak gate treats opaque noncasters as daylight apertures.** [sun-leaks.test.ts:99](src/model/sun-leaks.test.ts:99) constructs `clear` using `meshes.filter((m) => !m.castShadow)`. Lines 80–81 then forgive either `clear.hit(sun)` or any such object within the axial 0.6 m search. But noncasting does not mean glazing: outside the diff, [palette.ts:120](src/model/palette.ts:120) makes opaque sidewalk material noncasting. Consequently, an unrelated noncaster can excuse sunlight arriving through a genuine shell gap. The test header acknowledges this limitation, but the spec’s “pane or door leaf” claim is stronger. Identify permitted daylight apertures explicitly.

3. **Minor — the rendered determinism test never exercises batch evacuation.** [light.spec.ts:240](tests/e2e/light.spec.ts:240) only calls `window.__met?.benchmark(count)` from an unchanged Lehman view. It never opens and closes a door or hides and restores landscape. Therefore it cannot establish the new promise that the same scene renders identically after meshes permanently leave their batches. The unit tests compare CPU vertex data, which cannot establish identical rasterization or draw-order effects. Add rendered round trips through those real controls.

Other areas checked:

- **Injection and shadows:** the installed shader signatures, chunk order, artwork hook, default/custom cache keys, and indirect-light placement match this integration. Three.js calls the hook before acquiring the program at [WebGLRenderer.js:2248](node_modules/three/src/renderers/WebGLRenderer.js:2248). The replacement retains r186.1’s frustum and bias handling; edge samples retain texture clamping. I found no additional concrete defect. The chunk-presence guards cannot detect every semantic change inside an unchanged chunk. Also, `^0.186.1` admits patch updates, not `0.187`.
- **Frame integration:** section clipping, door masks, floor masks, instance counts and versioned matrix changes have synchronization paths. Instance colour needs no depth/normal invalidation. In-place geometry edits are not tracked, but the current model’s immutability contract excludes them. Cap and parts-gallery omissions are deliberate.
- **Sizing and timing:** target sizing follows the renderer’s drawing buffer and pixel ratio. AO is inside both timing paths; [main.ts:322](src/main.ts:322) renders before recording frame work and setting readiness. The pixel reader checks drawing-buffer dimensions.
- **Gable and gate bounds:** the replacement uses the closed-wall builder and begins at 22.4 m, above walking clearance. No additional source-level geometry defect found; budgets and appearance remain unverified here. The new grid has **50 px spacing** at 1600×900, so an aligned illuminated strip narrower than 50 px can fall entirely between rays; previously spacing was 40 × approximately 40.9 px. This does not translate into a fixed physical gap width. No pre-existing test expectation or budget number changed.
- **Memory and verification limits:** batch arrays remain referenced after upload; allocation failure has no AO fallback. The unit tests cannot establish GPU appearance, and repeated-frame hashes do not establish cross-device reproducibility. The changed source/test files remain below 500 lines.

REJECT — the AO lookup applies a rejected surface’s shading when no matching depth sample exists.

### Claude (claude-opus-5-5)

#### Review of work unit 28 at f41c82b

**Verdict: approve with findings.** I found nothing major: no wrong behaviour today, no test weakened, no rule broken. There are five minor findings and seven nits.

I didn't edit or run anything. This worktree has no `node_modules`, so I read three.js 0.186.1 (the version the lockfile pins) from the main checkout's `node_modules`.

##### Minor

**M1. The pass reads world matrices before the frame updates them, and the unit tests hide this.**
- `ao-pass.ts:257-258` runs `this.resize(renderer); this.sync(scene);` and `sync` reads `mesh.matrixWorld` in three places: `world: [...mesh.matrixWorld.elements]` (`:116`), `place.premultiply(mesh.matrixWorld)` (`:160`) and `standIn.matrixWorld.copy(mesh.matrixWorld)` (`:427`).
- three.js only updates the scene graph inside the frame's own `renderer.render`: `if ( scene.matrixWorldAutoUpdate === true ) scene.updateMatrixWorld();` (`WebGLRenderer.js:1663`). That call comes after the pass (`viewer.ts:107`, then `:110`). Nothing else in `src/` updates the model's world matrices.
- So the pass always sees the previous render's matrices, and on the first frame it sees defaults that were never computed. That is harmless only because every group above the model's meshes is identity.
- If an instanced mesh ever hangs under a moved parent:
  - the batches written on frame 1 would be wrong;
  - every such mesh would fail `was.world[k] !== world[k]` (`:125`) on frame 2 and leave its batch for good, bringing back the extra draws the batching exists to avoid;
  - with on-demand rendering, a stale prepass can stay on screen.
- Every fixture calls `root.updateMatrixWorld(true)` before `sync` (`ao-pass.test.ts:170, 207, 228, 283, 435`), so the page's actual order is never tested.
- Fix: call `scene.updateMatrixWorld()` at the top of `AoPass.render`.

**M2. The spec claims more for `sun-leaks.test.ts` than it checks.**
- `spec.md:172` says "So no gap in the casters lets the sun into a room."
- The test casts `GRID = [32, 18]` rays (`sun-leaks.test.ts:40`), 50 px apart at 1600×900, from 16 views.
  - **What it can miss:** any lit patch under about 50 px across in every view (about 3° of view, roughly 0.5 m at 10 m). That includes the class this unit fixed: the sliver was about 15 px wide (`:12`), so a ray lands in it only when a ray column happens to fall there.
  - **What made the red proof red:** much of it is the second-floor spawn seeing the Great Hall's roof *through* the arch (`:23`). Openings you can see outside through are what the test reliably catches.
  - **Other blind spots:** rooms no preset or spawn looks into, and any lit point within 0.6 m of a non-caster (`:81`). Non-casters include laylights, the bronze door leaves (`hunt/materials.ts:66`), sidewalk paving and water.
  - **False positives:** `LIFT = 0.02` (`:43`, `:79`) starts the sun ray beyond any open sheet, or any solid thinner than 2 cm, that shades the point.
- Suggest rewording the bullet to what the test actually holds.

**M3. The batches keep a 43 MB JS copy that nothing reads after the first frame** (`ao-pass.ts:189-196`, `:372-385`).
- `takeOut` only edits groups (`:347-356`). three.js computes the bounding sphere for sorting during the first render, before the upload.
- Only a lost-context restore would re-read the arrays.
- Dropping them on upload (`attribute.onUpload(() => { attribute.array = null })`) halves the pass's memory, which matters on weaker devices.

**M4. Which meshes sit in a batch depends on history, so prepass draws grow over a session.**
- A door stand-in that swings once, or a small landscape mesh a floor view hides (`floor-view.ts:115-117`), leaves its batch for good (`ao-pass.ts:306-317`, `:347-356`). Each costs up to two more draws in every later prepass: one drawing it alone, and one from splitting its batch.
- Walk mode brings the hidden landscape back as these alone draws (`main.ts:190`).
- The doors' budget, "at most 20 meshes and draws" (`spec.md:256`), counts only the door layer's meshes (`doors.test.ts:44`, `:94`).
- The gates measure fresh pages. It's tens of draws, not the 668 avoided, but it's the same kind of cost the batches were built to remove, and nothing measures it after a floor view.

**M5. A failure in the pass freezes the page silently.**
- The anchor check throws inside `onBeforeCompile` (`lit-materials.ts:63-66`). That runs inside `viewer.render()`, inside the animation-frame callback.
- After a throw, `requestAnimationFrame(frame)` (`main.ts:334`) is never reached. `showError` only wraps `boot()` (`main.ts:373-377`).
- So the spec's "fails at the first compile, naming the material and the chunk" (Page: Light, Materials) is true only in the console; the page just stops drawing.
- The same applies if allocating the batch arrays fails (`ao-pass.ts:190`). A GPU out-of-memory error is never checked. Nothing can turn the pass off on a weak device (the plan leaves that to item 6).

##### Nits

- **N1. The pixel-reconstruction test checks copies, not the shader.** `distanceAt` and `placeAt` (`ao-pass.ts:60-67`, "For tests") are hand copies of the GLSL in `ao-shaders.ts:123-131`. They match today, but no test ties the shader text to them; the text test checks only `PATTERN` and the blur weights. Verification's "the shaders' place of a pixel against three.js's own projection" (`spec.md:268`) claims more. `projectionUniforms`, the real uniform values, is tested properly.
- **N2. The pass's own programs aren't precompiled.** `renderer.compile(scene, rig.camera)` (`viewer.ts:101`) doesn't include the pass's normal-material variants or its three full-screen shaders (`ao-pass.ts:234-236`). They still compile one by one on the first frame.
- **N3. "A door swung open and shut leaves the frame it found, byte for byte" (`spec.md:174`) is untested.** It rests on vertex equality. `light.spec.ts:234` swings no door, and draw order decides exact depth ties, which the model has (`section-cut.ts:7-9`).
- **N4. Nothing guards the pass's cost.** The walking budgets include it (`main.ts:294/322/328`; `benchmark` calls `render`), but with 3–5× headroom on this machine. The spec's budget paragraph (`spec.md:258`) gives the old mesh-by-mesh cost, not the final build's 0.8 ms of work and about 1 ms synced.
- **N5. One reason the plan gives for rejecting `GTAOPass` is wrong.** `plan.md:65` says it "leaves noise that its makers remove over several frames". r186's `GTAOPass` denoises within the same frame (Poisson denoise, `GTAOPass.js:25`, `:519`). The other reasons stand.
- **N6.** `showAlone` re-uploads the unchanged index, plus both static-usage attributes, on every frame of a swing (`ao-pass.ts:409`).
- **N7. The solid gable is a visible change.** It closes the vault's east end flat and gives the stair opening, which runs to 22.79 m (`walls.ts:159`), a 1.59 m-deep flat underside at Y 22.4. Worth a look when the coordinator reads the `walk-second-floor` and `int-grand-stair-west` pairs. Otherwise it's fine: a closed box with fewer triangles than before, 5 cm past the eaves at Z −33.6 (`roof.ts:40`), clear of the first rib at Z −34.1 (`stair.ts:154`), and nowhere a walker can reach.

##### Checked, nothing found

- **Shader anchors.** Each appears once in r186's physical shader (`meshphysical.glsl.js:156, 164, 190, 195`). The `getShadow` declaration and the directional-light call match exactly (`shadowmap_pars_fragment.glsl.js:150`, `lights_fragment_begin.glsl.js:197`).
  - The step-light wrappers call three.js's own functions, which are defined before the `#define`s.
  - Hemisphere and environment light land in `indirectDiffuse`/`indirectSpecular` before `aomap_fragment` (`lights_physical_pars_fragment.glsl.js:579, 644-645`). The sun's direct light is left alone.
- **Compiling more than once and cache keys.**
  - three.js calls `onBeforeCompile` on fresh library text for each new key (`WebGLRenderer.js:2223-2255`), so nothing is injected twice.
  - The key includes `customProgramCacheKey` and is computed before the hook runs (`WebGLPrograms.js:386, 436`).
  - The `-ao` suffix keeps shaded and unshaded programs apart, the material's own key is captured before wrapping, and the artworks keep one shared program. I found no collision and no double compile.
  - r186's `compile` sets clipping state per material (`WebGLRenderer.js:1362, 1447-1450`), so the precompiled programs are the ones the first render uses.
- **Materials left out.**
  - The door stand-ins share the timeline's materials (`doors.ts:8, 162`), so they're lit.
  - The cap is a basic material (`section-cut.ts:57-66`).
  - The parts gallery's stage is its own (`stage.ts:26, 45`).
  - The doorways mesh isn't in the scene.
- **Cut, floors, doors.**
  - The prepass clips with the same plane object as the frame (`ao-pass.ts:450` and `section-cut.ts:78`); landscape is unclipped in both.
  - Hidden layers are copied to the alone meshes and stand-ins.
  - A matrix rewritten with new values triggers a value compare and takes the mesh out (`ao-pass.ts:126-130`).
  - Changes with no path out of a batch: only edits to geometry in place, and `clippingPlanes` drifting from `userData.sectionCut`. Neither happens today.
- **Shadow-map flag.** `WebGLShadowMap.render` returns before clearing `needsUpdate` when the scene has no lights (`WebGLShadowMap.js:95-97, 376`); the save and restore in `viewer.ts:105-108` is correct either way.
- **Determinism and screenshots.**
  - The occlusion is computed in the same frame it's used, and nothing reads the time or the frame count.
  - The targets follow the drawing buffer and pixel ratio on every render (`ao-pass.ts:276-282`).
  - `read()` throws on a buffer that isn't 1600×900, so a box can't silently land off its patch.
  - A byte-for-byte still view is a claim this GPU can keep.
- **Shadow filter.**
  - The PCF map uses linear filtering with `LessEqualCompare` (`WebGLShadowMap.js:261-266`), so the bilinear-tap maths holds.
  - The frustum tests and edge clamping match three.js's.
  - Spot-light calls are redirected with the same signature.
  - The bell weights its far taps at 1/52 against three.js's uniform 0.2, so acne at the same bias is no worse.
- **Upgrade guard.** Under `^0.186.1` npm only takes 0.186.x patches. The unit tests catch renamed chunks and functions. Semantic moves (for example, routing the sun through r186's `getSunShadow`, `:296-339`) would pass them, but light.spec's roughness bounds are set below three.js's own filter, so those would catch it.
- **Repo rules.** New files are at most 455 lines; no `process.env` or `import.meta.env` under `src/`; no existing test file is touched; no budget number changed; AGENTS.md is 24,150 bytes. The 180 s timeout on `sun-leaks.test.ts` is the remedy `scripts/test-headroom.ts:34` itself prescribes.

**APPROVE WITH FINDINGS.** M1 matters most: the pass reads world matrices before the frame updates them, and the fixtures hide it by calling `updateMatrixWorld(true)` first.

## Findings and disposition

Codex rejected on its first finding and Claude approved with findings. The table gives each finding one ID; the lanes' own numbers are in brackets.

| ID | Finding | Decision | Repair asked |
|---|---|---|---|
| F1 | The lit materials' lookup returns the nearest sample's occlusion even when every depth comparison failed, so a thin rail or an antialiased edge can take the background's shading (major; Codex 1). | Accepted. | No occlusion where no sample matches, proved by a pixel fixture of a thin foreground over a dark, occluded background. |
| F2 | `sun-leaks.test.ts` forgives a lit point near any mesh that casts no shadow, opaque ones among them, and the spec claims that no gap lets the sun in where a grid 50 px apart can miss the 15 px sliver this unit fixed (minor; Codex 2, Claude M2). | Accepted. | The permitted apertures named; the grid staggered row by row; the header saying what width it can miss; the spec's sentence made true; the red proof redone. |
| F3 | No rendered test goes through a mesh leaving its batch, though the spec says a door swung open and shut leaves the frame it found (minor; Codex 3, Claude N3). | Accepted. | Rendered round trips through the real controls: a door, a floor's view. |
| F4 | The pass reads world matrices before the frame updates them, and every fixture hides it by updating them first (minor; Claude M1). | Accepted. | The scene's world matrices updated at the top of the pass, and a test in the page's order. |
| F5 | The batches keep a 43 MB copy in the JS heap that nothing reads after upload (minor; Claude M3, Codex's note). | Accepted. | Dropped on upload, with what a lost context then does. |
| F6 | A mesh that leaves its batch never returns, so the prepass's draws grow over a session (minor; Claude M4). | Accepted. | The worst case measured in draws and milliseconds; a mesh rejoins if that costs more than a few tenths of a millisecond, else the bound is stated. |
| F7 | A throw inside the pass stops the frame loop with no error shown: the anchor check, or a batch that cannot be allocated (minor; Claude M5, Codex's note). | Accepted. | The pass turned off, said once in the console, and the page keeps drawing; tested. |
| F8 | Nits: the pixel-reconstruction test checks hand copies of the GLSL; the pass's own programs are not precompiled; the spec's budget paragraph gives the old cost; the plan's reason against three.js's `GTAOPass` is wrong for r186; `showAlone` uploads unchanged buffers on every frame of a swing (Claude N1, N2, N4, N5, N6). | Accepted. | Each corrected. |
| F9 | The coordinator's own, from the pairs: on the front steps the handrails' shadow shows as soft patches, a rail being thinner than a shadow texel. | To repair. | A piece thinner than a texel casts no shadow, or the patches go another way; the plaza walk shot again. |
| F10 | The solid gable gives the opening to the Great Hall a flat underside 1.59 m deep (Claude N7, for the coordinator's reading). | Taken as it is, from both pairs. | None. |

The coordinator read all seventeen pairs: the sliver is gone from both views that had it, the sun patches under the skylight grids are clean, corners, column bases and plinths have depth, and no halo or band shows. The large rooms are still evenly lit, since occlusion adds contact depth only; the worker's second stage, an ambient term that knows the sky, stays a design note.

## Verification

- The worker's `npm run verify` on `16bc4d6` through the gate lock: 756 unit tests, typecheck, lint, build and 106 of 106 e2e tests; `routes.spec` and `walk.spec` three runs in a row at 1× and three at `MET_CPU_THROTTLE=4`.
- The pairs, ignored, in the worker's worktree under `.shots/pairs/`.
- Not checked in this round: the repairs, which a second round reads with one lane; `npm run budgets`, which the landing needs once work unit 30 is on main.

## Round outcome

Rejected by Codex on F1 and approved with findings by Claude; nine findings returned to the worker on 2026-11-11. A second round reads the repairs that change behaviour with one lane.
