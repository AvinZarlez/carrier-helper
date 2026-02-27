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

### Behavior Details

- **`?clock-in=true`** — Creates a new shift (clock in) as soon as the page loads. If you
  are already clocked in (a shift is in progress), this does nothing.
- **`?clock-out=true`** — Ends the current shift (clock out) as soon as the page loads.
  If you are not currently clocked in, this does nothing.
- If **both** parameters are present, `clock-in` takes precedence.
- Any value other than `true` (e.g. `?clock-in=1` or `?clock-in=yes`) is ignored.

---

## Example URLs

Using the default GitHub Pages deployment:

```text
Clock In:   https://avinzarlez.github.io/carrier-helper/?clock-in=true
Clock Out:  https://avinzarlez.github.io/carrier-helper/?clock-out=true
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

Because the check happens after the UI is fully initialized, the page always displays the
correct state — you will see "Clocked In" immediately if the auto clock-in succeeded.
