# Carrier Helper

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://avinzarlez.github.io/carrier-helper)
[![Deploy to GitHub Pages](https://github.com/AvinZarlez/carrier-helper/actions/workflows/deploy.yml/badge.svg)](https://github.com/AvinZarlez/carrier-helper/actions/workflows/deploy.yml)
[![Lint](https://github.com/AvinZarlez/carrier-helper/actions/workflows/lint.yml/badge.svg)](https://github.com/AvinZarlez/carrier-helper/actions/workflows/lint.yml)
[![Run Tests](https://github.com/AvinZarlez/carrier-helper/actions/workflows/test.yml/badge.svg)](https://github.com/AvinZarlez/carrier-helper/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Your shift tracker, your data.** Carrier Helper is a free, no-account-required time tracker built for mail carriers. Clock in and out with one tap, then see exactly how many hours you worked and what you earned — right in your browser, on any device.

---

## ⚡ Quick Start

1. Open the [live app](https://avinzarlez.github.io/carrier-helper) — no install, no sign-in required.
2. Press **Clock In** when your shift starts.
3. Press **Clock Out** when it ends.
4. Head to **Hours View** to see your hours and estimated pay.

That's it. Your data is saved automatically in your browser.

---

## Features

### 🕐 One-Tap Time Tracking

Hit **Clock In** and **Clock Out** — the app handles the rest. Your active shift is always visible at the top of the screen with a live timer.

### 📊 Hours View — Pay Breakdown by Week, Month, or Year

Switch between weekly, monthly, and yearly summaries to see:

- **Total hours** worked in any period
- Breakdown by **base hours**, **overtime**, and **penalty overtime**
- **Night differential** and **Sunday premium** hours
- **Estimated pay** calculated from your pay rate settings

Navigate any period with ‹ Prev / Next › buttons, jump to a specific week with the date picker, click any month or year directly, or hit **This Week / This Month** to snap back to today.

### 💾 Your Data Stays With You

All data is stored locally in your browser — no server, no account. Back up or move your data at any time with CSV export:

- Export everything (entries + pay settings) as a single file
- Import it on any other browser or device
- All imports are non-destructive by default (merge, not replace)

### ☁️ Optional Cloud Sync

Want your shifts on every device automatically? Connect a free Firebase account and every clock-in, clock-out, and settings change syncs in real time. Fully opt-in — the app works completely offline without it.

### 📱 Works on Mobile and Web

The app is fully responsive and works on any screen, from a 320 px phone to a widescreen desktop. No app store download required.

### ⚡ Quick Clock-In / Clock-Out Shortcuts

Add `?clock-in=true` or `?clock-out=true` to the page URL to automatically clock in or out when the page loads. Create home-screen shortcuts on your phone for one-tap clocking — see the **About** tab in the app or the [URL Parameters guide](docs/url-parameters.md) for step-by-step instructions.

---

## Documentation

For guides on data management, cloud sync setup, and how to deploy your own copy, see the **[docs/ folder](docs/README.md)**.
