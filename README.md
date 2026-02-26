# Carrier Helper

A simple web application designed to help mail carriers track their shifts and hours. Clock in and out with a single click, and view all your time entries in a clean spreadsheet-style interface — right in your browser, no account required.

> **Live app:** [https://avinzarlez.github.io/carrier-helper](https://avinzarlez.github.io/carrier-helper)

## What It Does

- **One-click time tracking** — press "Clock In" when your shift starts and "Clock Out" when it ends.
- **Current / Last Shift display** — while clocked in, the top section shows your active "Current Shift". When clocked out, it automatically switches to a "Last Shift" view showing your most recent completed entry.
- **Collapsible sections** — the Current/Last Shift and Previous Shifts panels can each be collapsed with the ▼ toggle button to keep the screen tidy.
- **Local storage** — all entries are saved directly in your browser; no server or login needed.
- **Previous Shifts** — recent completed shifts shown for quick reference, alongside actions to edit or delete individual entries.
- **Spreadsheet view** — every clock-in and clock-out entry is displayed in a table in the Data Viewer tab so you can review your full history at a glance.
- **CSV export / import** — download all entries as a CSV file or import from a previously exported file to back up or restore your data.
- **Cloud sync (optional)** — sign in with a free account to sync entries across all your devices via Firebase.

## Documentation

For technical details, setup instructions, and guides on forking and deploying your own version, see the **[docs/ folder](docs/README.md)**.
