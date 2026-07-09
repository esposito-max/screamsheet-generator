# Screamsheet Generator — Vanilla / Established Stack V5

Static Cyberpunk RED Screamsheet editor. Open `index.html` directly or host the folder as a static site.

## V5 fixes

- Fixed the auto-flow duplication bug where a one-page document could keep generating repeated continuation blocks.
- Auto-flow now distinguishes between:
  - **text overflow inside a block**, which may create continuation blocks;
  - **physical page overflow**, which moves the whole block to the next safe page instead of splitting text unnecessarily.
- One-page documents are valid. If auto-flow genuinely needs more space, the app creates the next page safely.
- Vanilla and Svelte root builds now share the same static files and visible capabilities.

## Core capabilities

- Sidebar accordion UI.
- Night City Today-style Screamsheet templates.
- Add, duplicate, delete, drag, resize, and reorder blocks.
- Granular `X / Y / W / H` positioning in all layouts.
- Collision prevention for positioned blocks.
- Auto-flow in all layouts, including Free layout.
- Per-block auto-flow toggle.
- Font-size controls for title and body text.
- Markdown recognition and safe conversion.
- Image upload, asset library, image/map blocks, and image placement controls.
- Project save/load as JSON.
- Download PDF and print fallback.

## Notes

If a block is too large to fit inside any printable area, the app marks it with an overflow warning instead of endlessly creating pages. Reduce the font size, resize the block, or make more room for continuation content.


## V6 export stability note

The PDF export button is read-only: it no longer runs auto-flow or collision repair on the live editor document. If a browser blocks the direct raster renderer, the app falls back to a safe canvas/PDF renderer instead of mutating the working document. Print Fallback remains available for browser-native PDF printing.
