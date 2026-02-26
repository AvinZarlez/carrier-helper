# Carrier Helper - GitHub Copilot Instructions

This document provides context for GitHub Copilot agents working on the Carrier Helper project.

## Project Overview

Carrier Helper is a web application for tracking mail carrier work shifts. It allows users to clock in/out, view time entries, export/import data as CSV, and optionally sync data across devices using Firebase.

### Key Features

- **Clock In/Out** — Track work shifts with one-click clock in/out
- **Time Entries** — View all recorded shifts with timestamps and duration
- **Data Viewer** — Read-only spreadsheet view of all entries
- **CSV Export/Import** — Backup and restore data as CSV files
- **Cloud Sync** — Optional Firebase-based sync across devices (opt-in)

## Technology Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Storage**: localStorage (primary), Firebase Firestore (optional cloud sync)
- **Testing**: Jest with jsdom
- **Deployment**: GitHub Pages (static hosting)

## File Structure

```
carrier-helper/
├── index.html              # Main HTML file
├── css/
│   └── style.css           # All application styles
├── js/
│   ├── common.js           # Shared utilities (storage, formatting, CSV)
│   ├── time-entries.js     # Time Entries view logic
│   ├── data-viewer.js      # Data Viewer view logic
│   ├── app.js              # Application bootstrap
│   ├── firebase-config.js  # Firebase configuration (empty by default)
│   └── cloud-sync.js       # Firebase cloud sync module
├── tests/
│   ├── setup.js            # Jest test setup
│   └── common.test.js      # Tests for common.js
├── docs/
│   ├── README.md           # Documentation index
│   ├── github-pages-setup.md
│   ├── data-management.md
│   ├── cloud-sync-setup.md
│   └── testing.md
├── .github/
│   ├── copilot-instructions.md  # This file
│   └── workflows/
│       ├── deploy.yml      # GitHub Pages deployment
│       └── test.yml        # Unit test workflow
├── package.json            # npm configuration for testing
└── .gitignore
```

## Code Architecture

### Script Load Order (in index.html)

1. `js/common.js` — Shared utilities (must load first)
2. `js/time-entries.js` — Time Entries view
3. `js/data-viewer.js` — Data Viewer view
4. `js/app.js` — Application initialization
5. Firebase SDK (external CDN)
6. `js/firebase-config.js` — Firebase configuration
7. `js/cloud-sync.js` — Cloud sync module

### Module Responsibilities

| File | Responsibility |
|------|----------------|
| `common.js` | Storage, formatting, CSV utilities (no DOM) |
| `time-entries.js` | Clock panel, entries table, delete/clear |
| `data-viewer.js` | Data table, export, import, tab navigation |
| `app.js` | Bootstrap and initialization |
| `cloud-sync.js` | Firebase auth and Firestore sync |

### Key Functions

#### common.js
- `loadEntries()` — Load from localStorage
- `saveEntries(entries)` — Save to localStorage + cloud sync
- `formatDate/Time/Duration()` — Date formatting
- `parseCSV()` / `generateCSV()` — CSV handling
- `mergeEntries()` — Deduplicate and sort entries

#### time-entries.js
- `handleClockButton()` — Clock in/out logic
- `renderTimeEntries()` — Render the entries table

#### data-viewer.js
- `renderDataViewer()` — Render read-only table
- `exportToCSV()` — Download CSV file
- `showTab()` — Switch between views

## Development Guidelines

### Making Changes

1. **Identify the correct file** — Use the module responsibilities table above
2. **Run tests before and after** — `npm test`
3. **Test in browser** — Start a local server and verify UI
4. **Update documentation** — If changing behavior or adding features

### Adding New Features

1. Add utility functions to `common.js` (if reusable)
2. Add view-specific logic to the appropriate view file
3. Write tests for new utility functions
4. Update this file if adding new modules

### Code Style

- Use JSDoc comments for public functions
- Keep DOM references at the top of view files
- Export functions for testing via `module.exports` check
- No external dependencies except Firebase (which is optional)

## Testing

### Running Tests

```bash
npm install    # First time only
npm test       # Run all tests with coverage
```

### Test Location

Tests are in `tests/` directory. Each JS file should have a corresponding `.test.js` file.

### Adding Tests

```js
const { functionName } = require('../js/filename.js');

describe('functionName', () => {
  it('should do something', () => {
    expect(functionName()).toBe(expected);
  });
});
```

## Important Notes

### Documentation Requirements

**ALWAYS keep documentation up to date when making changes:**

1. Update relevant docs in `docs/` if changing user-facing behavior
2. Update `README.md` when features are added, removed, or moved
3. Update this file (`copilot-instructions.md`) if changing:
   - File structure
   - Module responsibilities
   - Key functions
   - Development guidelines
4. Update JSDoc comments in code files

### Mobile & Responsive Design

**ALWAYS ensure the application is viewable and functional on tiny mobile screens (320 px wide and up).**

- Test every UI change at both desktop (960 px+) and mobile (≤ 400 px) viewport widths
- Use `overflow-x: auto` on table wrappers (already in place) so tables scroll horizontally rather than overflow the screen
- Use the existing responsive breakpoints in `css/style.css` (`@media (max-width: 600px)` and `@media (max-width: 400px)`) and extend them as needed for new UI elements
- Prefer `flex-wrap: wrap` for button rows so they wrap gracefully on narrow screens
- Avoid fixed pixel widths on interactive elements; prefer `max-width` or `width: 100%` patterns

### Cloud Sync Configuration

Firebase is **opt-in**. The app works fully offline by default. Cloud sync only activates when:
- `js/firebase-config.js` has a non-empty `apiKey`
- User signs in via the Cloud Sync modal

### Browser Compatibility

Target modern browsers (ES6+). Key browser APIs used:
- `localStorage`
- `crypto.randomUUID()`
- `Blob` and `URL.createObjectURL()` (for CSV download)
- `FileReader` (for CSV import)

### No Build Step

This is a static site with no build/bundle step. Files are served directly by GitHub Pages.

## Common Tasks

### Add a new utility function

1. Add function to `js/common.js`
2. Export it in the `module.exports` block
3. Add tests in `tests/common.test.js`
4. Run `npm test` to verify

### Add a new view

1. Create new view file: `js/new-view.js`
2. Add script tag in `index.html` (after common.js, before app.js)
3. Add HTML section in `index.html`
4. Add tab button to navigation
5. Update `data-viewer.js` or create shared navigation module
6. Update this documentation

### Fix a bug

1. Reproduce the issue
2. Write a failing test if possible
3. Fix the code
4. Verify test passes
5. Test in browser

## Resources

- [Documentation Index](../docs/README.md)
- [GitHub Pages Setup](../docs/github-pages-setup.md)
- [Data Management Guide](../docs/data-management.md)
- [Cloud Sync Setup](../docs/cloud-sync-setup.md)
- [Testing Guide](../docs/testing.md)
