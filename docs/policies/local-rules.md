# Local rules — met

Rules that bind only in this repo, alongside the fleet canon in AGENTS.md. The canon sync never opens this file.

- The build process is the product (owner, 2026-10-10): every visible part of the model arrives through a build step, and the page plays the steps forward and backward, one at a time or continuously. A part that exists only in the finished state is a defect.
- Fidelity is checked against photographs of the real building, outside and inside (owner, 2026-10-10). A modelling change names the reference images it was compared with, from `docs/research/`.
- The owner keeps a render gallery (owner, 2026-10-28): the private artifact https://claude.ai/artifact/YFUsoCGDEin8eGcUoxMPBV shows the standard shot set of main. After each merge to main that changes a render, take main's shots, rebuild the page with `python -I tmp/gallery/build.py <shots-log> "<note>"` and republish `tmp/gallery/index.html` to that artifact's URL. The builder lives under the ignored `tmp/gallery/`; on a fresh machine, rebuild it from the artifact's published page.
