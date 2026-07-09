# Screamsheet Generator V8 — Vanilla / established stack

This package contains the V8 Screamsheet Generator.

## V8 changes

- Page templates now start empty. They provide a page/layout structure only; they do not auto-insert sample blocks.
- The global **Reflow Now** command has been removed.
- Added non-destructive **Show Overflow Warnings**.
- Added selected-block scoped **Flow Selected Text Block**.
- Manual movement, resizing, exact geometry controls, image support, Markdown conversion, project save/load, and PDF export remain available.
- Export remains read-only: failed export attempts should not mutate the editor state.

## Layout behavior

Templates and layout presets are starting structures/guides. Add the blocks you need from the **Add Blocks** section, then move/resize them manually as needed.

Text continuation is deliberately scoped to the selected block. No command should restructure the entire document unless you deliberately reset or rebuild a page.

## Testing

See `V8_TEST_REPORT.txt` for the browser interaction checks run against both the Vanilla and Svelte root builds.
