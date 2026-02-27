# URL Parameters Guide

[← Back to Documentation Hub](README.md)

Carrier Helper supports URL query parameters that let you trigger actions automatically
when the page loads. This is useful for creating one-tap shortcuts on your phone's home
screen or browser bookmarks that clock you in or out without any extra taps.

---

## Available Parameters

| Parameter | Value | Effect |
| --- | --- | --- |
| `clock-in` | `true` | Automatically clocks you in when the page loads |
| `clock-out` | `true` | Automatically clocks you out when the page loads |
| `page` | `hour`, `data`, or `about` | Opens the specified view on page load |

### Behavior Details

- **`?clock-in=true`** — Creates a new shift (clock in) as soon as the page loads. If you
  are already clocked in (a shift is in progress), this does nothing.
- **`?clock-out=true`** — Ends the current shift (clock out) as soon as the page loads.
  If you are not currently clocked in, this does nothing.
- If **both** parameters are present, `clock-in` takes precedence.
- Any value other than `true` (e.g. `?clock-in=1` or `?clock-in=yes`) is ignored.

#### Page Parameter

- **`?page=hour`** — Opens the Hours View when the page loads.
- **`?page=data`** — Opens the Data Viewer when the page loads.
- **`?page=about`** — Opens the About view when the page loads.
- Any other value, or no `page` parameter, loads the default Time Entries view.
- The `page` parameter can be combined with `clock-in` or `clock-out`
  (e.g. `?clock-in=true&page=hour`).

---

## Example URLs

Using the default GitHub Pages deployment:

```text
Clock In:    https://avinzarlez.github.io/carrier-helper/?clock-in=true
Clock Out:   https://avinzarlez.github.io/carrier-helper/?clock-out=true
Hours View:  https://avinzarlez.github.io/carrier-helper/?page=hour
Data Viewer: https://avinzarlez.github.io/carrier-helper/?page=data
About:       https://avinzarlez.github.io/carrier-helper/?page=about
```

If you host your own copy, replace the base URL with your own GitHub Pages URL.

---

## Creating Shortcuts

### iPhone / iPad (Safari)

1. Open Safari and navigate to the URL with the desired parameter (e.g. `?clock-in=true`).
2. Tap the **Share** button (square with an arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Name it something descriptive like **"Clock In"** and tap **Add**.
5. Repeat with `?clock-out=true` for a **"Clock Out"** shortcut.

### Android (Chrome)

1. Open Chrome and navigate to the URL with the desired parameter.
2. Tap the **⋮ menu** (three dots in the top-right corner).
3. Tap **Add to Home screen**.
4. Name it **"Clock In"** (or **"Clock Out"**) and tap **Add**.

### Desktop Browser

1. Navigate to the URL with the desired parameter.
2. Bookmark the page (Ctrl+D / Cmd+D).
3. Name the bookmark **"Clock In"** or **"Clock Out"**.

---

## How It Works

The `handleUrlParams()` function in `js/app.js` runs once during page initialization, after
all views have been set up. It reads `window.location.search`, checks for the `clock-in` or
`clock-out` parameter, and calls the same clock-in/clock-out logic used by the main button.

The `handlePageParam()` function runs immediately after, reading the `page` parameter and
calling `showTab()` to switch to the requested view. If no valid `page` value is found, the
default Time Entries view is shown.

Because both checks happen after the UI is fully initialized, the page always displays the
correct state — you will see "Clocked In" immediately if the auto clock-in succeeded, and
the correct view tab will be active.
