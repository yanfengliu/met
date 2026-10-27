# Review 6: implementation

## Target

Repository `met`, branch `labels`: `7f1946d..86bdf0c` (18 files, +1,216/−5), milestone M3b, given to the reviewer as a diff on stdin with a detached snapshot worktree at `86bdf0c` (main `7f1946d` merged in). Every piece of the 94 placeholders is tagged by its Met object ID through `Kit.addTagged`; walking, the look target within 6 m shows a card (title, maker, date, medium, gallery, size with estimated values marked, the metmuseum.org link and the CC0 credit) through `WalkMode.onLookTarget`; in the orbit view a click on an artwork, found by `ModelPicker.hit` from the pointer's ray, shows it; `window.__met.label` reports it.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m3b.md` (ignored). By its own account it compared tagged and untagged builds (38 meshes, 40,290 triangles and identical sampled scene bytes, reversals included), checked all 259 collection pieces' IDs, and probed the click against the real CameraRig, presets and the cut in memory; it ran no browser check.
- Coordinator: the worker's shot set was identical to main's (no standard shot shows a card); its card captures at 1280×720 and 390×844 read at native resolution: walking, the card for Tiepolo's *The Triumph of Marius* at the bottom left clear of the crosshair, with "depth estimated" on its size; in the orbit view on a phone, a column capital's card above the timeline panel.
- Claude: not run. The milestone's worker was a Claude session.

## Reports

### Codex (`gpt-6-astra`, xhigh)

Reviewed `86bdf0c`. Four findings:

1. **Medium — Small clicks also move the camera.** [click.ts:28](C:/Users/38909/Documents/github/met-worktrees/review-m3b/src/viewer/click.ts:28). Movement below `CLICK_SLOP` still reaches OrbitControls. An in-memory probe using the real CameraRig produced one label click from a 2 px movement, while disabling follow, clearing the preset and moving the camera 17.45 cm. Coordinate click classification with orbit input so movement starts only after the threshold. Test one-way sub-threshold movement with follow enabled; the existing 4 px test checks only the label.

2. **Medium — Changing presets leaves the previous artwork’s card visible.** [main.ts:235](C:/Users/38909/Documents/github/met-worktrees/review-m3b/src/main.ts:235). Click the Triumph, then choose an exterior preset: `applyPreset` changes the camera without clearing `ArtLabel.clicked`, and its instance remains visible. Clear the orbit selection when applying a preset. Add a menu-driven test without pressing Esc afterward, which would conceal the failure.

3. **Medium — Section cuts leave labels for removed artwork.** [art-label.ts:70](C:/Users/38909/Documents/github/met-worktrees/review-m3b/src/viewer/art-label.ts:70). The validity check considers only mesh visibility and instance count; clipping changes neither. A probe confirmed that lowering the cut below an artwork makes the picker return null while the label retains its ID. Validate selection against the cut when filters change, and test both the cut slider and a floor selection that removes the artwork.

4. **Medium — The unfolded narrow layout does not reserve the door-prompt band.** [styles.ts:166](C:/Users/38909/Documents/github/met-worktrees/review-m3b/src/ui/styles.ts:166). At 390×844, an unfolded card reaching its maximum height starts at y=438, inside the reserved y=414–502 band. Only folded cards reserve the additional space. The spec explicitly permits this exception, and e2e checks the band only while folded. Preserve the band in both states and align the spec, tests and Gates text.

Sound areas: all 259 collection pieces carry the correct IDs for 94 objects; no other pieces carry artwork tags. Tagged versus untagged builds retain 38 meshes, 40,290 triangles and identical sampled scene bytes, including reversals. The file-length scan passed.

Catalogue text reaches the DOM through `textContent`; missing makers and estimated dimensions are handled. Links are plain anchors without fetch logic. Walking subscribes once to the existing target hook. Esc-to-unlock-and-click is documented, though pointer lock is explicitly outside the e2e coverage.

The e2e tests use real input and assert identity, look-away hiding and drag rejection. Their populated-interior budget measures median work and mean GPU time. I ran in-memory probes only; full verification, placement tests and browser/layout checks were not rerun. No files changed.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F25 | A press under `CLICK_SLOP` shows a label and still moves the camera, turning follow off | Accepted: a click must leave the view as it was | `e06cc70`: orbit movement held until the slop is passed; a 2 px click leaves camera, follow and preset alone (red at `86bdf0c`: 0.514 m) |
| F26 | A preset leaves an orbit-clicked card up | Accepted | `e06cc70`: a preset and entering walk mode clear the selection, tested through the menu |
| F27 | A cut or a floor view removing an artwork leaves its label | Accepted | `e06cc70`: the selection re-checked against the cut and the floor view |
| F28 | Unfolded at 390×844 the card can reach into the door prompt's band | Not repaired as asked: the card and the prompt follow one look target and never show at once, so the exception stays | `e06cc70` checks it without a door (review 7, F30, done once M2a merged) |

## Verification

The worker's at `e06cc70`: unit tests (57 files, 519), typecheck, lint and build green; two e2e runs on a loaded machine missed different timing tests, each passing in the other run. The coordinator's verify on the integrated branch is in review 10.

## Round outcome

Four findings: three repaired in `e06cc70`, one kept by design with a check; review 7 is a focused check of the repair.
