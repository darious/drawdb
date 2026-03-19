# Agent Notes

## Automated UI Testing

- Preferred local workflow for UI work:
  - `npm install`
  - `npm install --no-save playwright`
  - `npm run dev -- --host 0.0.0.0 --port 8015`
- Preferred browser test target:
  - `http://127.0.0.1:8015/editor`
  - for deterministic smoke tests, prefer `http://127.0.0.1:8015/editor/templates/blank`

- Preferred smoke command:
  - `node scripts/playwright_phase1_smoke.mjs`

## Access Needed

- Starting the local Vite dev server on `0.0.0.0:8015` may require elevated execution in restricted sandboxes.
- Running headless Chromium / Playwright may require elevated execution in restricted sandboxes.
- Docker is not the preferred iteration path for UI testing; use the local dev server first and Docker only as a final compile/build check.

## Current Phase 1 Smoke Coverage

- YAML import into a blank template
- Table metadata persistence from YAML import:
  - description via `comment`
  - `subjectArea`
  - `tags`
- Known subject-area derivation:
  - imported-only subject areas
  - subject areas assigned directly on tables
- YAML export coverage for phase 1 metadata
- Composite relationship YAML import
- Composite relationship editor rendering:
  - multiple column pairs shown in the Relationships tab editor
- Composite relationship YAML export:
  - `from_columns`
  - `to_columns`

## Notes

- The existing canvas rectangle "subject areas" are a separate feature from phase 1 table `subjectArea`.
- Do not use table `hidden` for filter logic; filtering should remain derived UI state.
- Semi UI text/select controls are still flaky under headless Playwright in this repo.
- Do not treat table metadata editing or filter selection as browser-verified unless the smoke script is extended to cover them explicitly again.
