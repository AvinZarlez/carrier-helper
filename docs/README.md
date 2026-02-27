# Technical Documentation

This folder contains the technical documentation for the Carrier Helper web application.

## Documents

| Document | Description |
| --- | --- |
| [GitHub Pages Setup](github-pages-setup.md) | How the GitHub Pages deployment works and how to fork this repo to deploy your own copy |
| [Data Management](data-management.md) | How to save, export, import, and back up your time-entry data |
| [URL Parameters](url-parameters.md) | How to use `?clock-in=true`, `?clock-out=true`, and `?page=…` for automatic shortcuts |
| [Cloud Sync Setup](cloud-sync-setup.md) | Step-by-step guide to connecting the app to Firebase for cross-device cloud sync |
| [Testing](testing.md) | How to run tests locally, add new tests, and use GitHub Actions CI |

## Developer Documentation

| Document | Description |
| --- | --- |
| [Copilot Instructions](../.github/copilot-instructions.md) | Agent documentation for GitHub Copilot - project structure, architecture, and guidelines |

---

## Code File Documentation

Each JavaScript file contains a documentation header explaining:

- What the file does
- Its responsibilities
- Dependencies on other files
- What code should or should not be added to it

See the top of each file in `js/` for detailed documentation:

- `js/common.js` — Shared utilities (storage, formatting, CSV, pay calculations)
- `js/time-entries.js` — Time Entries view
- `js/hours-view.js` — Hours View (weekly/monthly/yearly summaries with pay breakdown)
- `js/data-viewer.js` — Data Viewer view (read-only table, week/range navigation, multi-select)
- `js/edit-modal.js` — Edit Entry modal (shared by Time Entries and Data Viewer)
- `js/tab-navigation.js` — Tab switching and sub-tab navigation
- `js/data-management.js` — Data import/export/delete functionality
- `js/meta-data.js` — Meta Data view (USPS pay scale settings form)
- `js/app.js` — Application bootstrap and URL parameter handling
- `js/cloud-sync.js` — Firebase cloud sync
- `js/firebase-config.js` — Firebase configuration
