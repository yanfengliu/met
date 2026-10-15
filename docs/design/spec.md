# The Met — design spec

The contract every part of this repo builds against. Change it here first, in the same commit as the code that needs the change.

## Product

One page, `index.html`. It shows a procedural model of The Metropolitan Museum of Art's main building on Fifth Avenue, New York, in its present-day form, outside and inside. The model is never simply loaded: it is assembled by an ordered list of build steps, and the viewer plays that build forward or backward, one step at a time or continuously, scrubs it, jumps between chapters, and orbits, zooms and moves freely at any point. The page opens on the finished building, the last frame of the build; Play runs the build from the empty site. A walk mode puts the viewer on the ground in first person, to walk through what is built at the current position.

The order of the build is the order the real building grew: chapters are historical eras (the 1880 Vaux building, the 1902 Hunt facade and Great Hall, the McKim, Mead & White wings, the Roche-Dinkeloo additions, the 2014 plaza). Within a chapter, steps follow the order a builder would raise it: ground and footprint, structure and walls, openings and ornament, interior, roof. Only parts that exist today are modelled; each appears in the era it was built. The research behind the chapter list is in `docs/research/`.

Interior spaces are reached in three ways: interior camera presets, a horizontal section cut that removes everything above a chosen height, and a floor picker that shows one floor at a time with everything over it removed.

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
- **Materials.** A material with `userData.castShadow === false`, or any transparent one, never casts shadows (glass, water and the flat ground materials of the palette). A material with `userData.solid === false` is walked through: the walk mode's collision leaves its pieces out (water, foliage, the jets of the plaza fountains, and the passable copies of the bronze and dark glass that stand in for the open central doors); every other material is solid. The engine gives every model material the section-cut clipping plane, except one with `userData.sectionCut === false`: the cut leaves it whole and its cap pass leaves its meshes out. Everything the site builds as landscape opts out (trees, ground, streets, paths, rocks, walls, fences, lamps, benches, fountains and the plaza's furniture), using the site's own copies of materials the building shares, so only the building is cut; the excavation, the pad and the 1970 front steps are the building's and stay cut. A floor view hides the landscape that rises above its cut whole instead (Page, Floor picker). Builders never set `clippingPlanes`.
- **Lights.** A step light's intensity follows its step's progress (0 at `f = 0`, its own intensity at `f = 1`); lights never toggle visibility, so shaders never recompile during playback.
- **Timeline position.** With N steps, the position `t` runs over `[0, N]`. Step `i` (0-based) has local progress `f = clamp(t − i, 0, 1)`. At `f = 0` none of its pieces is visible; at `f = 1` every piece sits exactly at its final matrix; in between, each piece moves through its own window of `f` according to `motion` and `stagger`, and an arriving piece is briefly tinted so the eye finds it. An integer `t = k` is a rest position: steps 1..k (1-based) are complete and nothing is moving.
- **Determinism.** The scene state at `t` is a pure function of `t`. Evaluating `t` after any history of plays, reversals, steps and scrubs gives byte-identical instance matrices, colours and visibilities to evaluating it fresh. Caching may skip rewriting unchanged values; it may never make the result depend on the path. This is what makes backward playback exact, and a test asserts it.
- **Playback.** Play forward and play backward run `t` continuously at `weight × BASE_SECONDS / speed` seconds per step and stop at 0 or N. Step forward animates to the next integer, step back to the previous one; a second press while moving retargets. Scrubbing sets `t` directly. Speed is 0.5×, 1×, 2× or 4×. Play forward at N starts again from 0, and play backward at 0 from N. The player is pure logic with no DOM and is unit-tested on its own.

## Page

- **Timeline bar** (bottom): buttons for start, step back, play backward, play/pause, step forward, end; a speed control; the Walk toggle (`walk-toggle`, pressed in walk mode); a scrubber over `[0, N]` with chapter boundaries marked; a label `Step k / N · <year> · <chapter> — <title>` with the step's detail beneath, where k = ⌈t⌉ (the step just completed at a rest position, the step playing in between) and k = 0 reads `— Empty site`. Every control has an accessible name and a `data-testid`.
- **Chapter menu**: the chapters in order, with their years and summary; choosing one moves to the start of its first step; a chapter with no steps is shown disabled.
- **View menu**: exterior and interior camera presets (named in `src/viewer/presets.ts`: `fit` presets frame the model's bounds from a direction; `look` presets are explicit cameras with an optional `fov` and, for straight-down views, `up`), a follow-camera toggle that frames each step's `focus` during playback and switches off when the user drags, zooms or moves the camera by keys (a press without movement leaves it on), one button per walk spawn (`walk-spawn-<id>`, "Walk from ...", which enters walk mode there), and a section cut (an on/off toggle and a height slider). The cut keeps `y < cut` for every building material, shadows included (landscape opts out; see Materials), and draws the back faces of cut solids in one flat colour so cut walls read as solid from above; that pass leaves out each mesh wholly under the cut, as nothing of it is cut.
- **Floor picker** (`floor-picker`, a group named "Floor"): a column of buttons at the left of the view, All (`floor-all`) at the top and the floors under it from the highest down (`floor-<id>`), the choice in view pressed; Page Up and Page Down move up and down it. The floors are data in `src/viewer/floors.ts`, each with its id, label, level (from `src/model/frame.ts`), the section-cut height that shows it and the plan area the camera frames, picked by looking at the model:
  - `ground` (`GROUND_FLOOR_Y`), cut at 3.1 m: under the Temple of Dendur pool's slab (underside 3.11 m), the lowest slab over the ground floor.
  - `main` (`MAIN_FLOOR_Y`), cut at 7.8 m: under the Wallace Wing's mezzanine (underside 7.91 m), the lowest slab over the main floor, so no mezzanine (8.4 to 10.0 m) covers it.
  - `second` (`SECOND_FLOOR_Y`), cut at 12.7 m: over the Roche wings' second floor (12.34 m) and under the Fifth Avenue links' second-floor slab (13.15 m); every cut from 13.15 to 15.0 m slices a slab or roof, and one at 15.2 m leaves the Morgan wing's roof over its second floor.
  - `roof-garden` (`ROOF_GARDEN_Y`), cut at 27.4 m and framing the garden alone: over its potted trees (26.9 m) and the park's tallest crown (27.3 m); nothing stands over it.
  - Choosing a floor sets the cut to the floor's height, hides the landscape that rises above it, and frames the floor's storey from above at 65°, from the side the camera looked from (the orbit's horizontal direction is kept), turning the follow camera off as a preset does; the framing is fitted again after a resize while the camera stands there. Choosing it again frames it again.
  - Hidden landscape (`src/viewer/floor-view.ts`): every landscape mesh whose highest standing piece rises above the cut, whole, never sliced; a landscape piece at least 30 m across both ways is ground (the terrain, the merged park paths) and never hides, and pieces of one step with the same final matrix (a tree's trunk and crown, a lamp's post and globe) hide together. Hidden meshes neither draw nor cast shadows, and the zoom's pick passes through them.
  - All gives back the cut the user had before the first floor was chosen, on or off at its height, shows every landscape piece again and leaves the camera where it is. Moving the cut slider or pressing the cut toggle ends the floor view instead (All is pressed again) and the hand-set cut stands as the user's own.
  - Walk mode belongs to the walker: entering it ends the floor view as All does, the picker hides while walking and the floor keys do nothing. The walk's collision never reads the floor view, so it is the same whether a floor was chosen or not.
  - Like the cut, the floor view is a view filter: it sets the cut and each hidden mesh's layer mask, never what the timeline writes, and which meshes hide depends on the floor alone, read from each piece's final matrix, so the scene at `t` stays a pure function of `t` (and the floor).
  - Known limits: the map's floor-3 plates (the north end pavilion's at 15.9 m, the 1924 American Wing's at 13.9 m) have no entry, because no single cut shows them without slicing roofs elsewhere; the mezzanines (map floor 1M) have none, and the main floor's cut passes under them; where a wing's second floor lies higher than the frame's level (the Fifth Avenue links' at 13.6 m, the American Wing's at 14.1 m), the second floor's cut shows that wing's floor below. Landscape hides by whole meshes, so one standing piece over the cut hides every piece of its mesh, and an object placed with different matrices (the magnolias by the steps) can lose its crown alone.
- **Camera framing**: presets and the follow camera frame the part of the canvas above the timeline bar. A preset lands exactly where it says, even right after a drag. When the canvas changes shape, the preset in view is fitted again, as long as the camera still stands where the preset put it. The neutral workspace ground, not part of the model, lies 0.5 m below the lower of grade and the model's lowest point, so model terrain always lies on top of it.
- **Follow camera at load**: on unless the query sets `shot=1`, a `view=` that names a preset, `cam=`, `walk=1` or a `floor=` that names a floor. It moves the camera only while the build plays.
- **No WebGL 2**: if the renderer cannot start, the page says WebGL 2 is not available, gives the browser's reason and what to do, and does not report a build failure.
- **Camera** (orbit view): drag to orbit, right-drag to pan, and the wheel, a pinch or a middle-button drag to zoom toward the pointer (`src/viewer/zoom.ts`). A zoom step moves the camera along the ray under the pointer and keeps its view direction. In, it moves a tenth of the distance to the surface under the pointer (`src/viewer/pick.ts`: the first drawn piece, or the workspace ground; above the section cut, cut pieces are passed through, and so is the landscape a floor view hides), at least 0.25 m, and stops 0.5 m before that surface; over open sky it flies on as if a surface stood 10 m ahead. Out, it moves a tenth of the distance to the orbit target, at least 0.25 m, until the target is 6 km away. Each step puts the orbit target on the view axis at the depth of what it heads for. Steps never shrink toward an invisible point, so every notch moves the camera until one of the two bounds, and either bound gives way at once to the other direction (`docs/learning/defect-register.md`, "The wheel stops zooming"). The camera stays 0.4 m above the workspace ground.
- **Keyboard**, by physical key (`event.code`), in two modes. A focused button keeps Space and Enter, a focused slider other than the scrubber keeps its arrows, Home, End, Page Up and Page Down, and a text field keeps every key.

  | Key | Orbit view | Walk mode |
  |---|---|---|
  | Space | play/pause | jump |
  | Shift+Space | play backward, or pause | jump |
  | → / ← | step forward / step back | walk right / left |
  | ↑ / ↓ | nothing | walk forward / back |
  | Home / End | go to start / end | nothing |
  | Page Up / Page Down | up / down a floor of the floor picker, All above the top floor, staying put at either end | nothing |
  | W / S | move the camera and its target forward / back along the view laid flat | walk forward / back |
  | A / D | move them left / right | walk left / right |
  | Q / E | move them down / up | nothing |
  | Shift, held | doubles the speed of W A S D Q E | runs |
  | F | enters walk mode | returns to the orbit view |

  Orbit-view moves run at half the camera-to-target distance per second, at least 1.5 m/s (`src/viewer/orbit-keys.ts`), so they cover the same share of the view from an aerial preset as from inside a hall. They keep the camera above its floor and turn the follow camera off, as a drag does.
- **Walk mode** (`src/walk/`), entered by the Walk toggle, F, a view-menu spawn or `walk=1`:
  - **Body.** A capsule of radius 0.35 m and height 1.75 m, the eye 1.6 m above its feet. It walks at 3 m/s and runs at 6 m/s, jumps 0.45 m and falls under gravity (9.81 m/s²).
  - **Ground.** It steps up and down edges of up to 0.35 m, so stairs and the front steps are climbed by walking. It walks on slopes up to 40°; a steeper one stops it like a wall, and it slides down one it lands on, the keys unable to push it uphill. It stands on the surface under its centre or, over a gap, on the lower rim of two opposite probes 0.3 m out, so it bridges a gap narrower than about 0.6 m yet falls off an edge as soon as its centre passes it. It slides along walls. Physics runs in fixed steps of 1/120 s, so a walk is the same at any frame rate.
  - **Looking.** A click on the view asks for pointer lock, and the mouse then turns the view; Esc frees the pointer, as browsers do. Where the lock is not available, a drag with the mouse or a finger turns the view. Pitch stays within ±85°; the field of view is 60°.
  - **Collision.** Every piece of every step complete at the current `t` (f = 1) whose material is solid, at its final matrix, through a three-mesh-bvh BVH per distinct geometry and a grid over the instances. Neither the section cut nor the floor view changes it. It is built on entering walk mode, after one frame showing "Preparing walk mode", and again whenever the set of complete steps changes while walking. With nothing built, the walker stands on the workspace ground.
  - **Entering and leaving.** Entering puts the walker at the spawn asked for, else where it last stood in this page, else at `plaza`. While walking, the timeline keys are off, the bar's controls still work, the follow camera is off, and a status line says how to look, move and leave. Leaving puts the orbit camera at the walker's eye with its target 5 m ahead, at the field of view it had before. Walking reads the scene and never writes it.
  - **Spawns** (`src/walk/spawns.ts`): `plaza`, on the entrance axis halfway between the foot of the front steps and the curb, facing the facade (the default); `great-hall`, on the Great Hall floor 8 m in from its north end, facing south down the nave; `second-floor`, on the landing at the top of the Grand Staircase, facing down it.
- **First load**: the page opens on the finished building, `t = N`, paused, in the orbit view at the default preset. `autoplay=1` plays the build on load instead, from `t = 0` unless the query sets a position. Play at `N` starts again from 0, as Playback says.

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
| `autoplay=1` or `autoplay=0` | `1`: play the build on load, from `t = 0` unless `t` or `step` sets a position. `0`: do not play, the default |
| `walk=1` | Start in walk mode |
| `spawn=<id>` | With `walk=1`, the walk spawn to start at (`plaza`, `great-hall`, `second-floor`); one that names no spawn starts at `plaza` with a warning; without `walk=1` it is ignored with a warning |
| `floor=<id>` | Start on that floor of the floor picker (`ground`, `main`, `second`, `roof-garden`; `all` shows every floor), framed unless `view=` or `cam=` names a camera; one that names no floor, or any with `walk=1`, is ignored with a warning |
| `noui=1` | Hide the page chrome |

The renderer keeps `preserveDrawingBuffer: true`, or headless capture reads a blank canvas. `window.__met` exposes read-only facts for tests (step ids, titles, each step's `focus` and piece `bounds`, chapters with their first step and count, presets, bounds, `N`, current `t`, mode, speed, follow, the follow camera's current goal, cut, `floors` (each floor's id, label, name, level and cut), `floor` (the floor picker's choice in view, the landscape meshes it hides and the user's own cut it gives back), view, the camera with its `fov` and the `aspect` of the canvas above the bar, budget stats, `perf.buildMs` (the timeline build alone) / `perf.readyMs` (navigation start to ready) from `performance` marks, and `walk`: the mode (`orbit` or `walk`), whether it is preparing, the spawn last used and the spawn ids, the eye and the unit look direction (null in the orbit view), the on-ground flag, whether the pointer is locked, `bvhMs` (milliseconds of the last collision build), what that build holds (complete steps, instances, triangles) and `frameMs` (the median work per walking frame over the last 120); types in `src/viewer/facts.ts` and `src/walk/walk-mode.ts`). In capture mode with `walk=1`, the collision is built and the walker placed before the first frame. Every value is a detached, deeply frozen snapshot, so no write to it reaches the page; tests drive the page through its real controls, never by writing state.

## Modules and ownership

| Path | Contents | Owner |
|---|---|---|
| `src/main.ts` | boot: query, viewer, sequence, player, UI | engine |
| `src/viewer/` | renderer, scene, sky, lights, camera and controls, zoom and pick, orbit keys, presets, section cut, floors and the floor view | engine |
| `src/walk/` | walk mode: the walker, its collision world over per-geometry BVHs, spawns | engine |
| `src/build/` | types, kit and batching, timeline evaluation, player | engine |
| `src/build/chapters.ts`, `src/build/sequence.ts` | chapter list and order | coordinator |
| `src/ui/` | timeline bar, chapter and view menus, floor picker | engine |
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

The finished model: at most 3,000,000 triangles per frame counting instances, at most 900 instanced meshes, all geometry built in under 4 seconds on this machine. A unit test computes the first two from the sequence without WebGL. The e2e suite bounds the third from above: from navigation start to `window.__shotReady` on the dev server, which also covers loading the modules (and any geometry they build on import), starting the renderer and the first frames, must take under 4 s. Walk mode at `t = N`: the collision built in at most 2 s, and a median walking frame under 16.7 ms, both on this machine (`tests/e2e/walk.spec.ts`).

## Verification

- Automated: unit tests for the timeline (determinism, forward/backward symmetry, rest positions), the player, batching, sequence integrity (unique ids, every step adds at least one piece, every piece inside the site bounds, no NaN matrix), the budgets, the walker on fixtures built through the page's own collision path (walls, sliding, a turned wall, slopes, stairs, ledges, drops, gaps, jumps, frame rate, incomplete steps and `solid === false`), the zoom step and the orbit keys, the floors (levels and cuts in order, no floor's cut slicing a slab of the real model), the floor view's landscape filter on the real sequence (what hides, ground never, objects whole, the same at any `t`) and the cut it gives back, and the public walk routes of `src/model/hunt/routes.ts` walked both ways by the real walker over the whole model's collision (`src/model/hunt/routes.test.ts`): R1 from the plaza through the central doors into the Great Hall, R2 up the Grand Staircase to the second floor, R3 through the Egyptian galleries into the Temple of Dendur hall, R4 through the Greek galleries into the Leon Levy and Shelby White Court; Playwright tests that drive every control and the keyboard and check the label, the scrubber and the canvas, walk the real model from the plaza up the front steps and along routes R1 to R4 through real keys and drags (`tests/e2e/routes.spec.ts`), drive the wheel to both zoom bounds, and drive the floor picker by mouse and Page Up and Page Down (the cut, the hidden landscape, the framing, the canvas and its share of the cut colour, All, the slider, walk mode).
- Visual: `npm run shots` captures the standard set (every preset at the finished state, the aerial preset at t = 0 and at the end of each chapter with steps, the section cut, each floor of the floor picker framed on its own and from `aerial-ne` and `top`, the walker's view at each walk spawn, and the page at 1280×720 and 390×844) into `.shots/shots/`; `npm run sweep -- --t <t> [--seed <n>]` adds seeded random cameras; authors inspect each image at native resolution and compare it with the reference photographs named in `docs/research/`. Sweeps add random camera angles for exploration.
