# Data Management Guide

[← Back to Documentation Hub](README.md)

This guide explains all the ways you can save, load, back up, and share your Carrier Helper time-entry data.

---

## Where Data Is Stored

By default, Carrier Helper stores all time entries in your **browser's localStorage**. This means:

- Data persists across page refreshes and browser restarts on the same device.
- Data is **not** shared between different browsers or devices automatically.
- Clearing your browser's cache / site data will erase the entries.

To share data across devices, use [CSV export/import](#csv-exportimport) or enable [Cloud Sync](cloud-sync-setup.md).

---

## CSV Export/Import

The **Data Viewer** tab (click "Data Viewer" in the navigation at the top of the page) provides Export and Import buttons.

### Exporting to CSV

1. Click the **Data Viewer** tab in the navigation bar.
2. Click **📥 Export All to CSV**.
3. Your browser downloads a file named `carrier-helper-YYYY-MM-DD.csv`.

The CSV contains the following columns:

| Column | Description |
| --- | --- |
| `id` | Unique identifier for the entry (UUID) |
| `date` | Human-readable date (e.g. `Feb 26, 2026`) |
| `clockIn` | ISO-8601 timestamp of clock-in |
| `clockOut` | ISO-8601 timestamp of clock-out (empty if still in progress) |
| `duration` | Formatted duration `HH:MM:SS` (empty if still in progress) |

Keep this file as a backup or use it to transfer data to another browser or device.

---

### Importing from CSV

Two import options are available:

#### ➕ Add to Existing (Merge)

- Click **Add to Existing** in the Data Viewer.
- Choose a previously exported CSV file.
- Entries from the file are merged with your current data. Any entry whose `id` already exists locally is skipped (no duplicates).
- **Use this when** you want to combine data from two different browsers, or restore entries you accidentally deleted.

#### 🔄 Replace All

- Click **Replace All** in the Data Viewer.
- Choose a CSV file.
- **All current entries are permanently deleted** and replaced with the entries from the file.
- You will be asked to confirm before any data is changed.
- **Use this when** you want to restore a backup or move your data to a fresh browser.

---

## Cloud Sync (Cross-Device / Cross-Browser)

For automatic, real-time synchronisation across all your devices, you can enable Cloud Sync powered by Firebase.

### Quick Start

1. See [cloud-sync-setup.md](cloud-sync-setup.md) for the one-time Firebase project setup.
2. Once configured, click **☁️ Sign In to Sync** in the page header.
3. Create an account with your email and a password (min. 6 characters).
4. After signing in, every data change is uploaded automatically and the **☁️ Synced** badge appears.

### Signing In on a New Device

1. Open Carrier Helper on the new device.
2. Click **☁️ Sign In to Sync**.
3. Enter the same email and password you used when creating your account.
4. Click **Sign In** — your full entry history loads automatically.

### How Sync Works

- Every clock-in, clock-out, deletion, clear, and import triggers an upload to Firestore.
- If another signed-in device makes a change, it appears in your browser in real time without needing to refresh.
- If you are offline, your data is saved to localStorage as normal. The next successful cloud operation will upload everything.

### Signing Out

Click **Sign Out** next to your email in the header. The app reverts to local-only mode. Your data remains in localStorage; nothing is deleted.

---

## Recommended Workflow

| Goal | Action |
| --- | --- |
| Back up my data | Data Viewer → Export All to CSV |
| Move data to a new browser | Export on old browser → Import (Replace All) on new browser |
| Combine data from two browsers | Export each → Import (Add to Existing) the second file on the first browser |
| Access data on all my devices | Set up Cloud Sync (see [cloud-sync-setup.md](cloud-sync-setup.md)) |
| Restore a backup | Data Viewer → Import → Replace All → choose the backup CSV |
