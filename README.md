# Screamsheet Generator — Vanilla Layout V3

Static Cyberpunk RED screamsheet editor. Open `index.html` directly or host the folder as a static site.

## Main changes in V3

- Replaced the crowded top toolbar with a left sidebar.
- Sidebar tools are grouped into accordion sections:
  - Document
  - Pages & Templates
  - Page Layout
  - Add Blocks
  - Selected Block
  - Images
  - Markdown
  - Export & Files
- Added `Free layout` mode for granular block placement.
- Free-layout blocks can be dragged and resized with no-overlap collision checks.
- Added exact X/Y/W/H controls for selected free-layout blocks.
- Added snap-to-grid, lock/unlock, and z-order controls.
- Added automatic Markdown recognition on paste/blur.
- Added manual `Apply Markdown to Selection` command.
- Preserved PDF export, print fallback, project JSON save/load, image library, font-size controls, and newspaper overflow behavior.

## Layout modes

### Newspaper layouts

Use `1 column`, `2 columns`, `3 columns`, sidebar, feature, and map layouts for article-heavy pages. These support automatic overflow into later columns/pages.

### Free layout

Use `Free layout` for front pages, ad pages, maps, covers, and hand-tuned compositions. Blocks can be positioned manually. Text overflow is not automatically reflowed in this mode; resize the block or create another block.

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

Markdown conversion is sanitized before being inserted.

## PDF export

Use **Download PDF** for direct PDF generation. Use **Print Fallback** if the browser blocks local images while running from `file://`.
