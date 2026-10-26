# Doors, a better walk, and the collection on view

Status: active
Owner: Coordinator (Claude Code desktop session, 2026-10-14)
Created: 2026-10-25
Updated: 2026-10-26

## Problem and outcome

The owner asked (2026-10-25): "make first person work well. The doors should be interactable and can be opened and closed"; "put some placeholder artifacts in the museum"; "you can try to use met api to get the real things too". Outcome: walking feels right (no eye dip on stairs, no traps, no dead ends, a crosshair and a quiet screen); the doors the real building has open and close by looking at them and pressing E or clicking; and the major spaces hold placeholders of real objects on view there, taken from The Met's collection data, sized and coloured from it, with a label for each.

## Scope

Included, from the read-only audit of 2026-10-25 (worker `fp-audit`, evidence in `tmp/fp-audit/`, ignored):
- The eye dips 12–14 cm for a frame at every riser (`src/walk/walker.ts:211,306`: the full ease is added after a stair snap while the height is only partly interpolated).
- No crosshair or prompts; the status line and the 140 px timeline bar stay on screen while walking; the walk drag turns opposite to the orbit drag (`src/walk/walk-mode.ts:269-274`); a drag under 5 px counts as a click and locks the pointer (`walk-mode.ts:281`); walking is 3 m/s, a jog indoors.
- The Temple of Dendur's pool traps a walker (walk-through water over a floor 0.6 m down, `src/model/roche-north/sackler.ts:47`); straight through the gate, the dais's 0.6 m rise stops the walker like a wall (`sackler.ts:129-136`); the top of the Grand Staircase is a dead end, as the cross hall's back wall is solid (`src/model/hunt/stair.ts:163`) where galleries 600 and 601 open off it in the real building (`docs/research/interior.md:105`).
- Doors: the parts library builds a door's leaves as one geometry with no hinge (`src/model/lib/window.ts:206-273`). Doors that should open: the three openings of the Hunt central arch, today fixed glazed units you walk through (`src/model/hunt/arches.ts:46-50,196-204`), and the Weston door (`src/model/core/weston-facade.ts:138,155-159`). Doors that stay shut and say so: the McKim, Mead & White link doors (`src/model/mmw/facade.ts:86-98`) and the Bank door (`src/model/roche-north/bank.ts:44,170`), each over a drop behind it. Gallery doorways in the real building are open portals and get no leaves.
- The collection, from the survey of 2026-10-25 (worker `met-api`, evidence in `tmp/met-api/`, ignored): the Collection API's object records give title, maker, date, medium, measurements in cm and gallery number, and the metadata is CC0. Spaces with confirmed objects on view: Temple of Dendur (131), Greek and Roman court (162, mezzanine 170/171), Arms and Armor (371), Medieval Sculpture Hall (305), Engelhard Court (700/701), the Lehman wing (ring 952–961, exhibition 965), the balcony and stair galleries (200–205), gallery 600 behind the cross hall, the Great Hall's eagle (11013), and more (Petrie 548, Vélez Blanco 534, Rockefeller 350/360, Egyptian on R3, Greek 153 on R4). The cross hall and the Astor court (217) have none.

Excluded: real images as textures (images.metmuseum.org drops its CORS header on cached responses, so a deployed page cannot use them, and copies would add about 15 MB to Git); network requests at runtime; galleries not already modelled; doors where the real building has open portals.

Owner decision recorded (2026-10-25): AGENTS.md's non-goal "no artworks beyond a few landmark objects that define a space" becomes artworks as procedural placeholders of real objects, built from The Met's CC0 collection data fetched by hand with a script, never at runtime. Colours sampled from a public-domain object's image at that time are data, not a photo texture.

## Approach

Milestones, each on its own worker, branch and worktree, merged to main once green and reviewed:

- **M1, the walk** (worker `walk2`, after nothing): fix the eye interpolation, gated by the eye height checked every frame on the front steps and the Grand Staircase; a crosshair; a quieter screen while walking; the drag-to-look direction and the click threshold, each choice recorded in the spec with its reason; speed and look sensitivity tuned to a walk indoors, values in the spec; the pool's edge, the dais on the gate axis and a doorway from the cross hall into gallery 600, each matched against the real building in `docs/research/` before modelling, with route tests for the new way. M1 also adds the shared **look target**: every walking frame, what the eye ray meets first within a given reach, through `src/viewer/pick.ts` and never through a wall, exposed read-only in `window.__met.walk`. M2 and M3b use it.
- **M3a, the catalogue and the placeholders** (worker `collection`, in parallel with M1): `scripts/met-catalogue.ts` reads picks per space (`src/model/collection/picks.ts`), fetches object records at one request a second through a cache under `research/cache/` (ignored), stops on 403 or 429, rejects a record whose gallery is not its space's, samples colours from public-domain images (a mean colour, and for paintings a coarse grid), and writes `src/model/collection/catalogue.ts`, one CC0 record per object. It runs by hand, never in CI or the build; an offline unit test checks the file. Placeholders are procedural: each object's kind (figure, bust, vessel, slab, frame, plinth, vitrine) comes from its object name and classification, overridable in the picks, and its size from its measurements, width and depth from the kind's ratios where only a height is given; objects under 0.6 m stand in vitrines; paintings hang on gallery walls. They stand at world positions kept 1 m off routes R1–R4 and are built by one step per space after that space's fit-out step, in the same chapter and year. `docs/research/` records the API, its licence and the picks.
- **M2, doors** (worker `doors`, after M1): the design from the audit. `doorUnit` returns its leaves with a hinge and a swing; a kit method records which pieces are door leaves; once a door's step is complete, a viewer-side door layer hides the timeline's leaf and draws a stand-in at the leaf's matrix times the hinge rotation (like the cap pass's stand-ins), so the timeline never sees door state and `src/build/timeline.test.ts` holds unchanged. Looking at a door within 2 m shows "E Open", "E Close" or "Locked"; E, or a click while the pointer is locked, swings it in 0.7 s, eased, away from the walker, and a closing leaf stops before it would hit the walker. Collision takes the leaves out of the static world and moves them as instances each frame, within the walking frame budget. `doors=open|closed` sets the state at load; with `shot=1` doors stand at their final angle from the first frame; `window.__met.doors` reports them. When the timeline takes a door's step away, its state resets; when the step completes again, the door takes its default, or opens if shut it would trap the walker. Route R1 opens the entrance door with E.
- **M3b, labels** (worker `collection`, after M2): a label card (title, maker, date, medium, gallery, the CC0 credit and a metmuseum.org link) for the artwork the look target meets within 6 m in walk mode, or the one clicked in the orbit view; `window.__met` reports which.

Shared contracts, agreed before parallel work: the look target (M1) is the only way M2 and M3b find what the visitor looks at; M3a adds steps only through area modules that `COMPOSITION` reaches; no milestone changes the determinism contract.

### Amendments after review 0 (2026-10-25)

Codex's plan review (`reviews/0_plan.md`) found eleven gaps, all accepted:
- Contract C1, piece tags, owned by M1: `Kit.addTagged(geometry, material, matrix, tag, order?)` with `tag: { kind: 'door' | 'artwork', id }`; the timeline keeps each instance's tag, not as timeline state; a door's pieces never share a mesh with anything else.
- Contract C2, the hit query, owned by M1: mesh, instance, distance and tag, optionally through transparent pieces (walls still block); the walking eye's `window.__met.walk.target` and an orbit pointer use it, refreshed when an action reads it.
- M2: door leaves hidden by a presentation filter (layers), never through timeline-owned fields; a dynamic collision update with the swept leaf checked both ways; stand-ins registered with the picker and the cap pass; the lifecycle at f < 1 and f = 1 defined; `doors=open` never unlocks a locked door; `shot=1` sets doors before walk placement.
- M3a: committed provenance and fixture tests; all-or-nothing writes; measurement and colour rules with estimated and derived values marked; full placed bounds kept 1 m clear of every walking corridor and door swing; artworks untagged until M3b.
- Budgets: placeholders at most 110 meshes and 600k triangles; doors at most 20 meshes or draws, viewer-side draws counted; walking with the look target and door cycles measured in populated interiors.
- Order: M3b after both M2 and M3a. After integration, every affected route and passage is walked both ways.

## Acceptance criteria

- [ ] The eye never drops while climbing: checked every frame on the front steps and the Grand Staircase, both ways, walking and running, red before the fix.
- [ ] Walk mode shows a crosshair and hides what it does not need; the drag, click, speed and sensitivity choices are in the spec; checked at 1280×720 and 390×844.
- [ ] No trap and no dead end: the pool cannot trap a walker, the dais is crossed where the real building allows it, and a route from the top of the Grand Staircase into gallery 600 is walked by e2e through real keys.
- [ ] The Hunt central entrance's doors and the Weston door open and close with E or a click while looked at within 2 m, with a prompt; the link and Bank doors say Locked; collision follows each leaf; `doors=` and the shot contract hold; the assertions of `src/build/timeline.test.ts` hold unchanged (its recording Kit may gain `addTagged`); R1 opens a door with E in e2e; a walking frame stays under 16.7 ms.
- [ ] `src/model/collection/catalogue.ts` comes from `scripts/met-catalogue.ts` and The Met's API, checked offline; placeholders of real objects stand in at least eight of the spaces above, at real size, by kind, coloured from their samples, built in their spaces' chapters; meshes stay under 900 and triangles under 3M; the 4 s build budget holds; e2e sees no request to any metmuseum.org host.
- [ ] Looking at an artwork within 6 m, or clicking one in the orbit view, shows its label; checked through real input.
- [ ] Each milestone: `npm run verify` green (and both audits if a dependency changes), the standard shot set inspected against the last merged one, an independent review, merged to main, deployed and checked live. AGENTS.md's non-goals and `docs/research/` record the owner's decision and the data's source and licence.

## Implementation steps

- [x] Plan review (Codex, `reviews/0_plan.md`): eleven findings accepted, the plan amended; sent to M1 and M3a, which had started.
- [ ] M1 the walk, with the look target (worker `walk2`).
- [x] M3a the catalogue and the placeholders (worker `collection`, merged `7c370b1`, reviews 1 and 2): 94 real objects in ten spaces, 38 meshes and 40,290 triangles of placeholders; the model at 729 meshes and 1,578,714 triangles.
- [ ] M2 doors (worker `doors`, after M1).
- [ ] M3b labels (worker `collection`, after M2 and M3a).
- [ ] Integration, review, deploy, outcome.

## Outcome

Pending.
