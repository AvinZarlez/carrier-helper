# Data Management Guide

[← Back to Documentation Hub](README.md)

This guide explains all the ways you can save, load, back up, and share your Carrier Helper data
(time entries and pay-scale metadata).

---

## Where Data Is Stored

By default, Carrier Helper stores all data in your **browser's localStorage**. This means:

- Data persists across page refreshes and browser restarts on the same device.
- Data is **not** shared between different browsers or devices automatically.
- Clearing your browser's cache / site data will erase the data.

To share data across devices, use [CSV export/import](#csv-exportimport) or enable [Cloud Sync](cloud-sync-setup.md).

---

## CSV Export/Import

The **Data Viewer** tab (click "Data Viewer" in the navigation at the top of the page) provides
Export and Import buttons in the **Data Management** section at the bottom. The Data Management
section is always visible regardless of whether you have the Time Entries or Meta Data sub-tab active.

### Exporting Data

Three dedicated export buttons are available:

#### 📥 Export Time Entries to CSV

Downloads the time entries currently shown in the date viewer.

- If you have **selected** specific rows (using the checkboxes), only those selected entries are exported.
- If **nothing is selected**, all entries visible in the current date view (week or custom range) are exported.
- Entries **outside** the current date view are never included.

The CSV contains the following columns:

| Column | Description |
| --- | --- |
| `id` | Unique identifier for the entry (UUID) |
| `date` | Human-readable date (e.g. `Feb 26, 2026`) |
| `clockIn` | ISO-8601 timestamp of clock-in |
| `clockOut` | ISO-8601 timestamp of clock-out (empty if still in progress) |
| `duration` | Formatted duration `HH:MM:SS` (empty if still in progress) |
| `notes` | Optional notes attached to the entry |

#### 📋 Export Meta Data to CSV

Downloads your USPS pay scale settings (base rate, overtime multipliers, thresholds, etc.)
as a key/value CSV file.

#### 📦 Export ALL Data to CSV

Downloads **all** time entries (not filtered by the current view) together with all metadata
in a single combined CSV file. Use this for full backups.

#### 📅 Export Date Range to CSV

Lets you specify a custom start and end date and downloads only the time entries that fall
within that range.

---

### Importing from CSV

Two import options are available. The import automatically detects the CSV type
(time entries, metadata, or combined) — it works from either sub-tab.

#### ➕ Add to Existing (Merge)

- Click **Add to Existing** in the Data Management section.
- Choose a previously exported CSV file.
- **Time entries CSV:** entries from the file are merged with your current data. Any entry whose `id` already exists locally is skipped (no duplicates).
- **Metadata CSV:** incoming values are merged over your current settings.
- **Combined CSV:** both entries and metadata are merged as above.
- **Use this when** you want to combine data from two different browsers, or restore entries you accidentally deleted.

#### 🔄 Replace All

- Click **Replace All** in the Data Management section.
- Choose a CSV file.
- **Time entries CSV:** all current entries are permanently deleted and replaced with those from the file.
- **Metadata CSV:** all current metadata settings are replaced with those from the file.
- **Combined CSV:** both entries and metadata are fully replaced.
- You will be asked to confirm before any data is changed.
- **Use this when** you want to restore a full backup.

---

## Meta Data — USPS Pay Scale Settings

The **Meta Data** sub-tab (within the Data Viewer) lets you configure your USPS pay scale:

| Field | Description | Default |
| --- | --- | --- |
| Base Hourly Rate | Your regular hourly wage | $23.49 (Grade 1, Step BB) |
| Night Differential | Extra pay per hour for night work | $1.08/hr |
| Overtime Rate | Multiplier applied after OT thresholds | 1.5× |
| Penalty OT Rate | Multiplier for penalty overtime | 2.0× |
| Sunday Premium | Additional % of base rate for Sunday hours | 25% |
| Daily OT Threshold | Hours/day before overtime kicks in | 8 hrs |
| Daily Penalty OT Threshold | Hours/day before penalty OT kicks in | 10 hrs |
| Weekly OT Threshold | Hours/week before overtime kicks in | 40 hrs |
| Weekly Penalty OT Threshold | Hours/week before penalty OT kicks in | 56 hrs |
| Night Start / End Time | Window for night differential pay | 6:00 PM – 6:00 AM |

These values are used by the **Hours View** to calculate estimated pay breakdowns (base, overtime, penalty overtime, night differential, and Sunday premium). Metadata is synced to the cloud alongside time entries when Cloud Sync is enabled.

---

## Hours View — Period Navigation

The **Hours View** tab summarises your hours and estimated pay for any week, month, or year.

### Period Types

| Mode | What you see | Row breakdown |
| --- | --- | --- |
| **Week** | One row per day (Mon–Sun) | Day-by-day totals |
| **Month** | One row per week whose Monday falls in the month | Week-by-week totals |
| **Year** | One row per month | Month-by-month totals |

### Date Navigation

Use the **‹ Prev** and **Next ›** buttons to move one period at a time.

Each mode also has a dedicated picker:

- **Week** — a date input lets you jump to any specific date, plus a **This Week** button that snaps back to the current calendar week.
- **Month** — a year row (showing only years that have data) and a month grid. Click any year to switch years without leaving the month view, then click any month to view it. A **This Month** button snaps back to the current month.
- **Year** — a row of buttons, one per year that has data. Click any year to jump to it directly.

---

## Cloud Sync (Cross-Device / Cross-Browser)

For automatic, real-time synchronisation across all your devices, you can enable Cloud Sync powered by Firebase.

### Quick Start

1. See [cloud-sync-setup.md](cloud-sync-setup.md) for the one-time Firebase project setup.
2. Once configured, click **☁️ Sign In to Sync** in the page header.
3. Create an account with your email and a password (min. 6 characters).
4. After signing in, every data change (entries and metadata) is uploaded automatically and the **☁️ Synced** badge appears.

### How Sync Works

- Every clock-in, clock-out, metadata save, deletion, clear, and import triggers an upload to Firestore.
- If another signed-in device makes a change, it appears in your browser in real time without needing to refresh.
- If you are offline, your data is saved to localStorage as normal. The next successful cloud operation will upload everything.

### Signing Out

Click **Sign Out** next to your email in the header. The app reverts to local-only mode. Your data remains in localStorage; nothing is deleted.

---

## Recommended Workflow

| Goal | Action |
| --- | --- |
| Back up all data | Data Management → Export ALL Data to CSV |
| Back up time entries only | Data Management → Export Time Entries to CSV (no selection, full range) |
| Back up pay scale settings | Data Management → Export Meta Data to CSV |
| Move data to a new browser | Export ALL on old browser → Import (Replace All) on new browser |
| Combine data from two browsers | Export each → Import (Add to Existing) the second file on the first browser |
| Access data on all my devices | Set up Cloud Sync (see [cloud-sync-setup.md](cloud-sync-setup.md)) |
| Restore a backup | Data Management → Import → Replace All → choose the backup CSV |
