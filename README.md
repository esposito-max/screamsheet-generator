# Screamsheet Generator V12 — Logo Fidelity Build

This build keeps the clean canvas architecture from V10/V11 but restores the Cyberpunk RED logo asset folder as a first-class part of the app.

## Included

- `index.html`
- `Cyberpunk RED Logos/` with 112 bundled PNG assets
- zero required backend
- zero npm requirement for normal use

## Logo behavior

- The bundled Cyberpunk RED logos appear in the Images & bundled logos sidebar.
- Use the search box to find logos such as NCPD, Biotechnica, Night City Today, Arasaka, Trauma Team, etc.
- The selected bundled logo can be used as:
  - page masthead logo;
  - image block;
  - logo block;
  - article/lead/ad image.
- Uploaded images still work and are stored inside the project JSON as data URLs.

## Page behavior

- Templates remain blank: they add no body blocks.
- Template chrome uses the actual bundled logos instead of a fake hand-built SVG.
- Body guide overlays remain visual only.
- Moving/resizing still affects only the selected block.
- Export remains read-only.

## Deployment

For GitHub Pages, upload the package root so `index.html` and `Cyberpunk RED Logos/` remain siblings.
