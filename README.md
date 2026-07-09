# Screamsheet Generator V11 — Vanilla

Static HTML/CSS/JS Screamsheet generator for Cyberpunk RED campaign handouts.

## Use

Open `index.html` in a browser or host the folder as static files.

## V11 rebuild notes

- Clean canvas architecture: every block is an independent positioned object.
- Templates are blank: they create page chrome and guide overlays only, never body blocks.
- No global reflow and no destructive automatic pagination.
- Optional visual guide overlays: blank, two columns, three columns, feature split, map + notes, grid.
- Screamsheet-fidelity chrome for Night City Today, The Augmented Optic, Public Advisory, Mission Packet, and Minimal Print.
- Styled blocks: Lead, Article, Briefs, Ad, Warning, Pull Quote, Image, Map, Q&A, Timeline, Stat, Links.
- Markdown conversion for text blocks.
- Font-size controls, X/Y/W/H geometry, z-order, lock, duplicate, delete.
- PDF export renders from state and does not mutate the editor.
- Uses `sgV11` localStorage key so old broken V-series drafts are not loaded automatically.

## Tested

See `V11_TEST_REPORT.json`.
