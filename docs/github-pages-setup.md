# GitHub Pages Setup

This document explains how the Carrier Helper site is structured for GitHub Pages and walks you through forking the repository to deploy your own copy.

---

## How It Works

Carrier Helper is a static web application (plain HTML, CSS, and JavaScript). There is no build step — the files in the root of the repository are served directly by GitHub Pages.

### Repository Structure

```text
carrier-helper/
├── index.html          # Main application page
├── css/
│   └── style.css       # Application styles
├── js/
│   ├── common.js       # Shared utilities (storage, formatting, CSV, pay calculations)
│   ├── time-entries.js # Time Entries view (clock in/out, entries table)
│   ├── data-viewer.js  # Data Viewer view (export/import, tab navigation)
│   ├── meta-data.js    # Meta Data view (USPS pay scale settings)
│   ├── hours-view.js   # Hours View (weekly/monthly/yearly summaries)
│   ├── app.js          # Application bootstrap and URL parameter handling
│   ├── firebase-config.js # Firebase configuration (empty by default)
│   └── cloud-sync.js   # Firebase cloud sync module
├── docs/               # Technical documentation (you are here)
├── .github/
│   └── workflows/
│       ├── deploy.yml  # GitHub Actions workflow that publishes the site
│       ├── lint.yml    # ESLint + markdownlint
│       └── test.yml    # Unit test workflow
└── tests/              # Jest unit tests
```

### Deployment Pipeline

Every push to the `main` branch triggers the GitHub Actions workflow defined in `.github/workflows/deploy.yml`. That workflow:

1. Checks out the repository.
2. Configures GitHub Pages settings automatically.
3. Uploads the entire repository root as a Pages artifact.
4. Deploys the artifact to GitHub Pages.

The deployed URL follows the pattern:

```text
https://<your-github-username>.github.io/<repository-name>/
```

---

## Forking and Deploying Your Own Copy

Follow these steps to fork this repository and publish your own GitHub Pages site.

### 1. Fork the Repository

1. Go to [https://github.com/AvinZarlez/carrier-helper](https://github.com/AvinZarlez/carrier-helper).
2. Click **Fork** in the top-right corner.
3. Choose the GitHub account or organization where you want the fork to live.
4. Click **Create fork**.

### 2. Enable GitHub Pages in Your Fork

GitHub Pages must be configured to use **GitHub Actions** as the source (not the legacy "Deploy from a branch" option).

1. In your forked repository, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Save the setting.

> **Note:** This setting is not automatically copied when you fork. You *must* set it manually in your fork.

### 3. Trigger a Deployment

After saving the Pages setting, push any change to the `main` branch (or edit a file directly on GitHub). The `Deploy to GitHub Pages` workflow will run automatically and publish your site.

You can watch the progress under **Actions → Deploy to GitHub Pages**.

### 4. Access Your Site

Once the workflow completes successfully, your site will be live at:

```text
https://<your-github-username>.github.io/carrier-helper/
```

---

## Local Development

You can preview the app locally without any special tooling because it is pure HTML/CSS/JS.

### Option A — VSCode Live Server (recommended)

1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) in VSCode.
2. Open the repository folder in VSCode.
3. Right-click `index.html` and choose **Open with Live Server**, or use the **Live Server (Chrome)** launch configuration in `.vscode/launch.json`.
4. The app opens at `http://localhost:5500` and hot-reloads on every file save.

### Option B — Any Static File Server

```bash
# Python 3
python3 -m http.server 5500

# Node.js (npx)
npx serve .
```

Then open `http://localhost:5500` in your browser.

---

## Customising the Site

Application logic is split across several files in `js/` (see the repository structure above) and all styles live in `css/style.css`. The entry point is `index.html`. No build tools or package managers are required.
