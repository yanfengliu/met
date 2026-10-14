# The Met — design spec

The contract every part of this repo builds against. Change it here first, in the same commit as the code that needs the change.

## Product

One page, `index.html`. It shows a procedural model of The Metropolitan Museum of Art's main building on Fifth Avenue, New York, in its present-day form, outside and inside. The model is never simply loaded: it is assembled by an ordered list of build steps, and the viewer plays that build forward or backward, one step at a time or continuously, scrubs it, jumps between chapters, and orbits and zooms freely at any point.

The order of the build is the order the real building grew: chapters are historical eras (the 1880 Vaux building, the 1902 Hunt facade and Great Hall, the McKim, Mead & White wings, the Roche-Dinkeloo additions, the 2014 plaza). Within a chapter, steps follow the order a builder would raise it: ground and footprint, structure and walls, openings and ornament, interior, roof. Only parts that exist today are modelled; each appears in the era it was built. The research behind the chapter list is in `docs/research/`.

Interior spaces are reached in two ways: interior camera presets, and a horizontal section cut that removes everything above a chosen height.

## World frame

- 1 unit = 1 metre. +Y is up. +X is Manhattan north (up Fifth Avenue). +Z is Manhattan east (toward Fifth Avenue, so the main facade faces +Z). Right-handed.
- The Manhattan grid is rotated about 29° clockwise from true north. Only the sun direction uses true compass bearings; everything else is in grid axes.
- Origin: Fifth Avenue sidewalk grade, on the axis of the central entrance (the Great Hall's east-west axis), in the plane of the Hunt facade's main wall face behind the column screen.
- The block polygons in `docs/research/exterior.md` section 2 are the walls' outer faces (the OSM outline). On a line two blocks share, the older block builds the wall, inside its own polygon, and the newer builds none there. On the building's outer outline, mouldings (cornices, string courses, sills, copings and their modillions) may project up to 1.5 m beyond the line; walls and glass never do (coordinator, 2026-10-11).
- The decoded floor map (ignored, under `research/cache/`) and every plan position in `docs/research/interior.md` sit 3.1 m +Z of this frame; subtract 3.1 m from their Z (correction of 2026-10-11, recorded in `interior.md`).
- Named levels, extents and key dimensions live in `src/model/frame.ts`, one constant per fact, each with a comment naming its source in `docs/research/`. Builders read them from there and never restate a number another builder depends on.

## Build-step API

Area modules (`src/model/site/`, `core/`, `hunt/`, `mmw/`, `roche-north/`, `roche-south/`) export named step arrays; `src/build/sequence.ts` composes each chapter of `src/build/chapters.ts`, in that order, from those arrays (its `COMPOSITION` table), so a modeller adds steps without touching it. A step's `chapter` must name the chapter its array is composed into (a test checks it); a chapter may have no steps yet. Every step array an area module's `index.ts` exports must be composed (a test checks it). Step ids are unique, stable and kebab-case, because URLs and tests name them. The types live in `src/build/types.ts`.

A step's `year`, when set, lies inside its chapter's `years` (a test checks it; `before 1872` means up to 1872). So Roche's 1970 information desk in the Great Hall is built in `roche-steps-lehman-1975`, and `mckim-mead-white-1926` runs 1904–1956 to hold its two 1956 steps.

```ts
interface StepDef {
  id: string;              // unique, stable, kebab-case
  chapter: ChapterId;      // from src/build/chapters.ts
  title: string;           // at most 48 characters, shown in the timeline
  detail?: string;         // at most 200 characters, shown under the title
  year?: string;           // overrides the chapter's years in the label, e.g. '1975'
  motion: Motion;          // how this step's pieces arrive
  stagger?: Stagger;       // the order pieces arrive in within the step; default 'order'
  weight?: number;         // playback duration multiplier; default 1
  focus?: CameraFocus;     // what the follow camera frames during this step
  build(kit: Kit): void;   // adds this step's pieces
}

interface Kit {
  // One piece: a shared geometry, a shared material and its final world matrix.
  add(geometry: BufferGeometry, material: Material, matrix: Matrix4, order?: number): void;
  // A light that switches on with the step; at most 8 in the whole sequence, never shadow-casting.
  light(light: PointLight | SpotLight): void;
}

interface Chapter { id: string; title: string; years: string; summary: string } // src/build/chapters.ts

type CameraFocus =                                         // default { kind: 'pieces' }
  | { kind: 'pieces' }                                     // this step's piece bounds, from the current viewing direction
  | { kind: 'box'; min: Vec3; max: Vec3 }                  // this world box, from the current viewing direction
  | { kind: 'view'; position: Vec3; target: Vec3 }         // this exact camera
  | { kind: 'preset'; id: string };                        // a preset of src/viewer/presets.ts

type Motion =
  | { kind: 'rise'; distance?: number }                    // slides up from below its final place
  | { kind: 'drop'; distance?: number }                    // slides down from above
  | { kind: 'grow' }                                       // scales up in Y from its own base
  | { kind: 'pop' }                                        // scales up from its own centre
  | { kind: 'slide'; from: readonly [number, number, number] }; // arrives from this world offset

type Stagger = 'order' | 'x' | '-x' | 'z' | '-z' | 'y' | 'radial' | 'none';

type Vec3 = readonly [number, number, number];
```

- **Batching.** Within one step, pieces that share the same geometry object and the same material object become one `InstancedMesh`. Steps never share a mesh, so each step shows and hides independently. Builders therefore create one geometry per distinct shape and reuse it, and take materials from the shared palette (`src/model/palette.ts`) or their own module, never cloning a material per piece.
- **Composite pieces.** A part made of several materials (a window: frame and glass) is several `add` calls with the same `order`; pieces with equal stagger keys arrive together, and a test checks that every role of a window or door part arrives with the others. Spatial staggers key on the piece's world bounding-box centre, rounded to 1 cm; `radial` keys on the horizontal distance from the centre of the step's bounds; `order` defaults to the call's index within the step.
- **Motion details.** `rise` and `drop` travel `distance` metres, by default the piece's own height but at least 3 m; `grow` scales world Y about the bottom of the piece's world box; `pop` scales about its centre with a slight overshoot. Windows are paced by rank: of R distinct keys, rank r starts at `r / (R − 1) × (1 − d)` and lasts `d = max(0.25, 1 / R)`.
- **Materials.** A material with `userData.castShadow === false`, or any transparent one, never casts shadows (glass, water and the flat ground materials of the palette). The engine gives every model material the section-cut clipping plane, except one with `userData.sectionCut === false`: the cut leaves it whole and its cap pass leaves its meshes out. Everything the site builds as landscape opts out (trees, ground, streets, paths, rocks, walls, fences, lamps, benches, fountains and the plaza's furniture), using the site's own copies of materials the building shares, so only the building is cut; the excavation, the pad and the 1970 front steps are the building's and stay cut. Builders never set `clippingPlanes`.
- **Lights.** A step light's intensity follows its step's progress (0 at `f = 0`, its own intensity at `f = 1`); lights never toggle visibility, so shaders never recompile during playback.
- **Timeline position.** With N steps, the position `t` runs over `[0, N]`. Step `i` (0-based) has local progress `f = clamp(t − i, 0, 1)`. At `f = 0` none of its pieces is visible; at `f = 1` every piece sits exactly at its final matrix; in between, each piece moves through its own window of `f` according to `motion` and `stagger`, and an arriving piece is briefly tinted so the eye finds it. An integer `t = k` is a rest position: steps 1..k (1-based) are complete and nothing is moving.
- **Determinism.** The scene state at `t` is a pure function of `t`. Evaluating `t` after any history of plays, reversals, steps and scrubs gives byte-identical instance matrices, colours and visibilities to evaluating it fresh. Caching may skip rewriting unchanged values; it may never make the result depend on the path. This is what makes backward playback exact, and a test asserts it.
- **Playback.** Play forward and play backward run `t` continuously at `weight × BASE_SECONDS / speed` seconds per step and stop at 0 or N. Step forward animates to the next integer, step back to the previous one; a second press while moving retargets. Scrubbing sets `t` directly. Speed is 0.5×, 1×, 2× or 4×. Play forward at N starts again from 0, and play backward at 0 from N. The player is pure logic with no DOM and is unit-tested on its own.

## Page

- **Timeline bar** (bottom): buttons for start, step back, play backward, play/pause, step forward, end; a speed control; a scrubber over `[0, N]` with chapter boundaries marked; a label `Step k / N · <year> · <chapter> — <title>` with the step's detail beneath, where k = ⌈t⌉ (the step just completed at a rest position, the step playing in between) and k = 0 reads `— Empty site`. Every control has an accessible name and a `data-testid`.
- **Chapter menu**: the chapters in order, with their years and summary; choosing one moves to the start of its first step; a chapter with no steps is shown disabled.
- **View menu**: exterior and interior camera presets (named in `src/viewer/presets.ts`: `fit` presets frame the model's bounds from a direction; `look` presets are explicit cameras with an optional `fov` and, for straight-down views, `up`), a follow-camera toggle that frames each step's `focus` during playback and switches off when the user drags or zooms (a press without movement leaves it on), and a section cut (an on/off toggle and a height slider). The cut keeps `y < cut` for every building material, shadows included (landscape opts out; see Materials), and draws the back faces of cut solids in one flat colour so cut walls read as solid from above.
- **Camera framing**: presets and the follow camera frame the part of the canvas above the timeline bar. A preset lands exactly where it says, even right after a drag. When the canvas changes shape, the preset in view is fitted again, as long as the camera still stands where the preset put it. The neutral workspace ground, not part of the model, lies 0.5 m below the lower of grade and the model's lowest point, so model terrain always lies on top of it.
- **Follow camera at load**: on unless the query sets `shot=1`, a `view=` that names a preset, or `cam=`.
- **No WebGL 2**: if the renderer cannot start, the page says WebGL 2 is not available, gives the browser's reason and what to do, and does not report a build failure.
- **Keyboard**: Space play/pause, → step forward, ← step back, Shift+Space play backward, Home start, End end.
- **First load**: the page starts at `t = 0` and plays forward, unless the query sets a position or `autoplay=0`.

## Query contract

`src/viewer/query.ts` is the only reader of the page URL.

| Parameter | Effect |
|---|---|
| `shot=1` | Capture mode: no autoplay, no follow camera, no animation; `window.__shotReady = true` once at least 5 frames have rendered at the requested state |
| `t=<number>` | Timeline position in `[0, N]` |
| `step=<id or 1-based index>` | Position at the end of that step; wins over `t` |
| `view=<preset id>` | Camera preset; one that names no preset is ignored with a warning, as if absent |
| `cam=px,py,pz,tx,ty,tz` | Explicit camera position and target, for sweeps |
| `cut=<metres>` | Section-cut height |
| `solo=<chapter id>` | Build only that chapter (plus `site`), for fast isolated checks |
| `autoplay=0` | Do not start playing on load |
| `noui=1` | Hide the page chrome |

The renderer keeps `preserveDrawingBuffer: true`, or headless capture reads a blank canvas. `window.__met` exposes read-only facts for tests (step ids, titles, each step's `focus` and piece `bounds`, chapters with their first step and count, presets, bounds, `N`, current `t`, mode, speed, follow, the follow camera's current goal, cut, view, the camera with its `fov` and the `aspect` of the canvas above the bar, budget stats, and `perf.buildMs` (the timeline build alone) / `perf.readyMs` (navigation start to ready) from `performance` marks; type in `src/viewer/facts.ts`). Every value is a detached, deeply frozen snapshot, so no write to it reaches the page; tests drive the page through its real controls, never by writing state.

## Modules and ownership

| Path | Contents | Owner |
|---|---|---|
| `src/main.ts` | boot: query, viewer, sequence, player, UI | engine |
| `src/viewer/` | renderer, scene, sky, lights, camera and controls, presets, section cut | engine |
| `src/build/` | types, kit and batching, timeline evaluation, player | engine |
| `src/build/chapters.ts`, `src/build/sequence.ts` | chapter list and order | coordinator |
| `src/ui/` | timeline bar, chapter and view menus | engine |
| `src/model/frame.ts` | world-frame constants from research | coordinator |
| `src/model/palette.ts` | shared materials | engine creates; others request changes |
| `src/model/lib/` | parametric architectural parts | parts library |
| `src/model/<area>/` | one folder per area (`site`, `core`, `hunt`, `mmw`, `roche-north`, `roche-south`), each exporting the step arrays `sequence.ts` composes | that area's modelling worker |
| `parts.html`, `src/parts/` | parts gallery page for the library | parts library |
| `scripts/` | capture and sweep tooling | engine |
| `tests/e2e/` | Playwright control tests | engine |

A worker edits only paths it owns. A change another owner's path needs is requested in the handoff, not made.

## Parts library

`src/model/lib/` exports pure functions that return `BufferGeometry` in local coordinates: origin at the part's base centre unless its header says otherwise, +Y up, the part's front facing +Z. Each function's header states its parameters' units and its origin. The set covers what the building repeats: classical column and pilaster (base, shaft, Corinthian capital), entablature and cornice profiles swept along a path, round-arched and flat openings in a wall, windows (frame, mullions, glass as separate geometries), balustrade runs, stairs, domes and saucer domes with or without an oculus, coffered vaults, skylights (ridge and pyramid), glass curtain walls, trees, fountains. Geometry is cached per parameter set so equal calls return the same object, which is what lets the kit instance it.

## Budgets

The finished model: at most 3,000,000 triangles per frame counting instances, at most 900 instanced meshes, all geometry built in under 4 seconds on this machine. A unit test computes the first two from the sequence without WebGL. The e2e suite bounds the third from above: from navigation start to `window.__shotReady` on the dev server, which also covers loading the modules (and any geometry they build on import), starting the renderer and the first frames, must take under 4 s.

## Verification

- Automated: unit tests for the timeline (determinism, forward/backward symmetry, rest positions), the player, batching, sequence integrity (unique ids, every step adds at least one piece, every piece inside the site bounds, no NaN matrix) and the budgets; Playwright tests that drive every control and the keyboard and check the label, the scrubber and the canvas.
- Visual: `npm run shots` captures the standard set (every preset at the finished state, the aerial preset at t = 0 and at the end of each chapter with steps, the section cut, and the page at 1280×720 and 390×844) into `.shots/shots/`; `npm run sweep -- --t <t> [--seed <n>]` adds seeded random cameras; authors inspect each image at native resolution and compare it with the reference photographs named in `docs/research/`. Sweeps add random camera angles for exploration.
