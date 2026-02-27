# Carrier Helper - GitHub Copilot Instructions

This document provides context for GitHub Copilot agents working on the Carrier Helper project.

## Project Overview

Carrier Helper is a web application for tracking mail carrier work shifts. It allows users to clock in/out, view time entries, export/import data as CSV, and optionally sync data across devices using Firebase.

### Key Features

- **Clock In/Out** — Track work shifts with one-click clock in/out
- **Time Entries** — View all recorded shifts with timestamps and duration
- **Hours View** — Calendar summary of hours worked per week, month, and year with pay breakdown
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
│   ├── common.js           # Shared utilities (storage, formatting, CSV, metadata, pay calculations)
│   ├── time-entries.js     # Time Entries view logic
│   ├── hours-view.js       # Hours View logic (weekly/monthly/yearly summaries, pay breakdown)
│   ├── data-viewer.js      # Data Viewer view logic (read-only table, week/range nav, multi-select)
│   ├── edit-modal.js       # Edit Entry modal (shared by views)
│   ├── tab-navigation.js   # Tab switching and sub-tab navigation
│   ├── data-management.js  # Data import/export/delete functionality
│   ├── meta-data.js        # Meta Data view logic (USPS pay scale settings form)
│   ├── app.js              # Application bootstrap
│   ├── firebase-config.js  # Firebase configuration (empty by default)
│   └── cloud-sync.js       # Firebase cloud sync module
├── tests/
│   ├── setup.js            # Jest test setup
│   ├── common.test.js      # Tests for common.js core utilities
│   ├── meta-data.test.js   # Tests for common.js metadata utilities
│   ├── export-import.test.js # Tests for export filtering and import/export round-trips
│   ├── hours-calc.test.js  # Tests for common.js hours/pay calculation utilities
│   └── app.test.js         # Tests for app.js URL parameter handling
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
│       ├── lint.yml        # ESLint + markdownlint
│       └── test.yml        # Unit test workflow
├── package.json            # npm configuration for testing
└── .gitignore
```

## Code Architecture

### Script Load Order (in index.html)

1. `js/common.js` — Shared utilities (must load first)
2. `js/time-entries.js` — Time Entries view
3. `js/data-viewer.js` — Data Viewer view (table, navigation, multi-select)
4. `js/edit-modal.js` — Edit Entry modal (shared by views)
5. `js/tab-navigation.js` — Tab switching and sub-tab navigation
6. `js/data-management.js` — Data import/export/delete
7. `js/meta-data.js` — Meta Data view
8. `js/hours-view.js` — Hours View
9. `js/app.js` — Application initialization
10. Firebase SDK (external CDN)
11. `js/firebase-config.js` — Firebase configuration
12. `js/cloud-sync.js` — Cloud sync module

### Module Responsibilities

| File | Responsibility |
|------|----------------|
| `common.js` | Storage, formatting, CSV utilities, metadata utilities, hours/pay calculations (no DOM) |
| `time-entries.js` | Clock panel, entries table, delete/clear |
| `hours-view.js` | Hours View: week/month/year summaries, pay breakdown cards, period navigation |
| `data-viewer.js` | Data Viewer: read-only table, week/range navigation, view mode, multi-select |
| `edit-modal.js` | Edit Entry modal: open, validate, save, close (shared by Time Entries and Data Viewer) |
| `tab-navigation.js` | Main tab switching, Data Viewer sub-tab switching, collapse toggle |
| `data-management.js` | Export CSV (entries, metadata, combined, date range), import CSV, delete all data |
| `meta-data.js` | Meta Data form rendering, save/reset, status messages |
| `app.js` | Bootstrap and initialization |
| `cloud-sync.js` | Firebase auth and Firestore sync (entries + metadata) |

### Key Functions

#### common.js
- `loadEntries()` — Load from localStorage
- `saveEntries(entries)` — Save to localStorage + cloud sync
- `formatDate/Time/Duration()` — Date formatting
- `parseCSV()` / `generateCSV()` — Time entries CSV handling
- `mergeEntries()` — Deduplicate and sort entries
- `getDefaultMetaData()` — USPS pay scale defaults
- `loadMetaData()` / `saveMetaData(meta)` — Metadata localStorage + cloud sync
- `generateMetaDataCSV(meta)` / `parseMetaDataCSV(text)` — Metadata CSV
- `generateAllDataCSV(entries, meta)` / `parseAllDataCSV(text)` — Combined CSV
- `detectCSVType(text)` — Detect "entries", "metadata", "all", or "unknown"
- `filterEntriesByRange(entries, start, end, exclusiveEnd)` — Filter by date range
- `getExportEntries(entries, selectedIds, start, end, exclusiveEnd)` — Selection-aware export filter
- `toLocalDateString(isoString)` — ISO timestamp → YYYY-MM-DD in local time
- `getShiftHours(entry)` — Shift duration in decimal hours
- `calculateNightDiffHours(entry, meta)` — Hours within the night differential window
- `calculateSundayHours(entry)` — Hours worked on Sunday
- `calculatePaySummary(entries, meta)` — Full pay breakdown (base, OT, penalty OT, night diff, Sunday premium)

#### time-entries.js
- `handleClockButton()` — Clock in/out logic
- `renderTimeEntries()` — Render the entries table (shows "Current Shift" / "Last Shift" / hidden)
- `getLastShiftEntry()` — Get the most recent completed entry
- `getPreviousShiftsEntries()` — Get entries for the Previous Shifts section

#### hours-view.js
- `renderHoursView()` — Render the Hours View for the current period type and date
- `initHoursView()` — Attach all event listeners (called once on startup)
- `hvSetPeriodType(type)` — Switch between "week", "month", "year" period modes
- `buildWeekTableHtml(allEntries, weekStart, meta)` — Per-day breakdown table for a week
- `buildMonthTableHtml(allEntries, year, month, meta)` — Per-week breakdown table for a month
- `buildYearTableHtml(allEntries, year, meta)` — Per-month breakdown table for a year
- `hvFormatHours(hours)` — Format decimal hours as "H:MM"
- `hvFormatMoney(value)` — Format a dollar amount as "$1,234.56"

#### data-viewer.js
- `renderDataViewer()` — Render read-only table for current view (week or range)
- `getWeekStart(date)` — Get Monday of the week containing a date
- `getCurrentViewRange()` — Get start/end dates for the current view
- `setViewMode(mode)` — Switch between "week" and "range" view modes
- `clearSelection()` — Deselect all entries and hide selection banner
- `deleteSelected()` — Delete currently selected entries

#### edit-modal.js
- `openEditModal(entryId)` — Open and populate the edit modal for an entry
- `closeEditModal()` — Close the edit modal without saving
- `saveEditEntry()` — Validate and save the edited entry
- `isoToDatetimeLocal(iso)` — Convert ISO timestamp to datetime-local format

#### tab-navigation.js
- `showTab(tab)` — Switch between main views ("time-entries", "hours-view", "data-viewer", "about")
- `showSubTab(subTab)` — Switch between Time Entries and Meta Data sub-tabs

#### data-management.js
- `exportToCSV()` — Export current-view time entries (selection-aware)
- `exportMetaDataToCSV()` — Export metadata as CSV
- `exportAllDataToCSV()` — Export all entries + metadata as combined CSV
- `exportRangeToCSV()` — Export entries within a user-specified date range

#### meta-data.js
- `renderMetaDataForm()` — Populate form with stored (or default) values
- `saveMetaDataForm()` — Read form inputs and persist metadata
- `resetMetaDataForm()` — Reset all fields to USPS defaults

## Development Guidelines

### Making Changes

1. **Identify the correct file** — Use the module responsibilities table above
2. **Run lint before and after** — `npm run lint` (catches unused variables, syntax errors, style issues)
3. **Run tests before and after** — `npm test`
4. **Test in browser** — Start a local server and verify UI
5. **Update documentation** — If changing behavior or adding features

> **Important:** Always run both `npm run lint` and `npm test` locally before pushing.
> CI runs both checks on every PR and will fail if either is broken.

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
- **`/* global */` comments**: only declare globals that are **directly called** in that file.
  Listing a global that is never referenced will trigger ESLint's `no-unused-vars` rule.
  Example: if `common.js` exports both `filterEntriesByRange` and `getExportEntries` but
  a view file only calls `getExportEntries`, only `getExportEntries` goes in the `/* global */` comment.

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

**ALWAYS keep documentation up to date when making changes. This is a required step before any PR is complete:**

1. Update relevant docs in `docs/` if changing user-facing behavior
2. Update `README.md` when features are added, removed, or moved
3. Update this file (`copilot-instructions.md`) if changing:
   - File structure
   - Module responsibilities
   - Key functions
   - Script load order
   - Development guidelines
4. Update JSDoc comments in code files

> **This is mandatory, not optional.** Every PR that adds, removes, or changes a feature or file
> must include corresponding documentation updates before it is considered done.

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
5. Update `tab-navigation.js` to handle the new tab
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
