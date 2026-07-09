# Screamsheet Generator — Vanilla Layout V4

Static Cyberpunk RED screamsheet editor. Open `index.html` directly or host the folder as a static site.

## Main changes in V4

- Granular block movement is now available in **all** layouts, not only `Free layout`.
- Layout presets now behave as starting guides/arrangements. They no longer prevent manual positioning.
- Any selected block can be:
  - dragged with the `☰` handle;
  - resized with the lower-right resize handle;
  - positioned by exact `X / Y / W / H` values;
  - snapped to grid;
  - locked/unlocked;
  - moved forward/backward in z-order.
- Collision checks apply to manual movement and resizing so blocks cannot be placed over each other.
- `Free layout` now also participates in auto-flow.
- Auto-flow now checks both page overflow and text overflow inside positioned blocks.
- Added a selected-block auto-flow toggle so specific blocks can opt out.
- Renamed the geometry controls from “Free layout geometry” to “Block geometry.”
- Preserved the sidebar accordion UI, Markdown recognition, image controls, font-size controls, project JSON save/load, PDF export, and print fallback.

## Layout behavior

All layouts support manual arrangement. `1 column`, `2 columns`, `3 columns`, sidebar, feature, map, and `Free layout` control the initial structure and page guides, but individual blocks can still be moved and resized.

When auto-flow is enabled, long text continues into a continuation block. The app first tries to place the continuation into safe empty space on the same page; if there is no non-overlapping space, it creates or uses a following page.

## Markdown support

When `Auto-apply Markdown on paste/blur` is enabled, the editor recognizes:

- `# Heading`, `## Heading`, `### Heading`
- `**bold**` and `__bold__`
- `*italic*` and `_italic_`
- `~~strike~~`
- `` `code` ``
- `[label](https://example.com)` links
- `- bullet` lists
- `1. numbered` lists
- `> quote` blocks

Markdown conversion is sanitized before insertion.

## PDF export

Use **Download PDF** for direct PDF generation. Use **Print Fallback** if the browser blocks local images while running from `file://`.
