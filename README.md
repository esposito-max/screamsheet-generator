# Screamsheet Generator V13

V13 keeps the V12 Screamsheet page chrome and bundled logo library, but restores the prior article/block layout behavior instead of replacing it with the heavier V11/V12 block redesign.

## Main correction

- Page chrome remains Screamsheet-styled.
- Bundled `Cyberpunk RED Logos/` remains included and usable.
- Article, lead, briefs, ad, warning, image, map, stat, Q&A, timeline, pull quote, and links blocks use the earlier stable internal layouts.
- Templates remain truly blank: they add no body blocks or placeholder DOM.
- Guides remain visual overlays only.
- Movement/resizing affects only the selected block.
- PDF export remains read-only.

## Svelte package note

The Svelte package root is GitHub Pages-ready. Upload the root files; no `npm` command is needed for normal use.
