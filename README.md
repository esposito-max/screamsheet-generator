# Screamsheet Generator — Vanilla / Established Stack V7

Static Cyberpunk RED Screamsheet editor. Open `index.html` directly or host the folder as a static site.

## V7 interaction fixes

- Reworked block interaction so the move handle, reorder handle, and resize handle are separate controls.
- Fixed the mass-overlap failure caused by reading default/free-layout coordinates instead of the actual rendered block positions.
- Moving or resizing now freezes the current visual layout from `getBoundingClientRect()` before applying manual geometry.
- Nested grids are handled as layout items, so a block inside a multi-column/nested layout no longer collapses the surrounding layout when selected, resized, or moved.
- Reordering no longer shares the same handle/path as manual movement.
- Collision markers are cleared and recalculated per interaction instead of persisting as stale state.
- Background autosave no longer triggers full auto-pagination after every layout interaction. Reflow still runs when explicitly requested through **Reflow Now**, and text-edit auto-flow remains available from content edits.

## Core capabilities

- Sidebar accordion UI.
- Night City Today-style Screamsheet templates.
- Add, duplicate, delete, move, resize, and reorder blocks.
- Granular `X / Y / W / H` positioning in all layouts.
- Collision prevention for positioned blocks.
- Auto-flow support in all layouts, including Free layout.
- Per-block auto-flow toggle.
- Font-size controls for title and body text.
- Markdown recognition and safe conversion.
- Image upload, asset library, image/map blocks, and image placement controls.
- Project save/load as JSON.
- Download PDF and print fallback.

## V6 export stability retained

The PDF export button is read-only: it does not run auto-flow or collision repair on the live editor document. If a browser blocks the direct raster renderer, the app falls back to a safe canvas/PDF renderer instead of mutating the working document. Print Fallback remains available.

## Notes

If a block is too large to fit inside any printable area, the app marks it with an overflow warning instead of endlessly creating pages. Reduce the font size, resize the block, or make more room for continuation content.
