# ☁️ Cloud Sync Setup Guide

[← Back to Documentation Hub](README.md)

This guide explains how to enable cross-device cloud sync so that your time-entry data is automatically available on every browser and device you use.

## Overview

By default the app stores all data **locally in your browser** (localStorage). Cloud sync is an **opt-in feature** that is disabled until you configure it. Once enabled:

- Entries you record on one device automatically appear on all your other signed-in devices.
- All data changes (clock-ins, deletions, imports) propagate in real time.
- You can access your full history from any browser — desktop, phone, or tablet.
- Each user's data is stored privately; no one else can read or write it.

Cloud sync is powered by **Firebase** — Google's free serverless backend. You need to create your own Firebase project and connect it to your fork of this repository. Firebase's free tier (Spark plan) is more than sufficient for normal use.

---

## Prerequisites

- A Google account (for Firebase)
- Admin access to your fork of this repository

---

## Step-by-step Setup

### Step 1 — Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com).
2. Click **Add project** (or **Create a project**).
3. Enter a project name (e.g. `carrier-helper`).
4. You can disable Google Analytics — it is not needed.
5. Click **Create project**, then **Continue**.

---

### Step 2 — Register a Web App

1. On the project overview page, click the **Web** icon (`</>`) under "Add an app to get started".
2. Enter an app nickname (e.g. `carrier-helper-web`).
3. Leave "Also set up Firebase Hosting" **unchecked** — the app is already hosted on GitHub Pages.
4. Click **Register app**.
5. Firebase shows you a `firebaseConfig` object that looks like this:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
```

1. Copy these values — you will need them in Step 6.
2. Click **Continue to console**.

> **Note:** Firebase API keys are **not secret**. They identify your project but all access is controlled by Authentication and Security Rules. It is safe to commit `js/firebase-config.js` with your real values.

---

### Step 3 — Enable Email/Password Authentication

1. In the Firebase console left sidebar, click **Build → Authentication**.
2. Click **Get started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Toggle **Enable** to on.
5. Leave "Email link (passwordless sign-in)" disabled.
6. Click **Save**.

---

### Step 4 — Create a Firestore Database

1. In the left sidebar, click **Build → Firestore Database**.
2. Click **Create database**.
3. Choose **Start in production mode** (you will set the correct rules in Step 5).
4. Select a Cloud Firestore location closest to your users (e.g. `us-east1`).
5. Click **Enable**.

---

### Step 5 — Set Firestore Security Rules

The default production rules deny all access. Replace them with rules that allow each authenticated user to read and write only their own data.

1. In **Build → Firestore Database**, click the **Rules** tab.
2. Replace the entire contents with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

1. Click **Publish**.

> **What this rule does:** A signed-in user can only read and write documents stored under their own user ID. No user can access another user's data.

---

### Step 6 — Add Your Config to the Repository

Open `js/firebase-config.js` in your fork and fill in the values you copied in Step 2:

```js
const firebaseConfig = {
    apiKey: 'AIzaSy...',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project',
    storageBucket: 'your-project.appspot.com',
    messagingSenderId: '1234567890',
    appId: '1:1234567890:web:abcdef'
};
```

Commit and push the file. The app detects that `apiKey` is now non-empty and automatically enables the cloud sync UI.

---

### Step 7 — Test the Setup

1. Open the app (your GitHub Pages URL).
2. The header should now show a **"☁️ Sign In to Sync"** button.
3. Click it, enter your email and a password (minimum 6 characters), then click **Create Account**.
4. After signing in, the header shows your email address and a **☁️ Synced** badge.
5. Clock in and out — the entry uploads to Firestore automatically.
6. Open the same URL in a different browser or device, sign in with the same account, and verify that the entry appears.

---

## Using Cloud Sync

### Creating an Account

Click **☁️ Sign In to Sync** in the page header. Enter your email and a password (minimum 6 characters), then click **Create Account**.

### Signing In on Another Device

Open the app on the other device, click **☁️ Sign In to Sync**, enter the same email and password, then click **Sign In**. Your data will load automatically.

### Automatic Sync

Any action that changes data (clocking in/out, deleting an entry, clearing all, importing a CSV) is uploaded to the cloud immediately after completing. Changes made on other signed-in devices appear in real time without needing to refresh.

### Signing Out

Click the **Sign Out** button next to your email in the header. The app returns to local-only mode; no data is deleted from your browser.

---

## How Data Is Stored

All entries are stored in Firestore under the path:

```text
users/{userId}/userData/entries
```

The full dataset is written as a single JSON document every time a change is made. At login, any locally stored entries that are not yet in the cloud are merged in (union by entry ID, same logic as the CSV "Add to Existing" import). Real-time updates from other devices overwrite local storage directly so that deletions propagate correctly.

---

## Troubleshooting

### "☁️ Sign In to Sync" button does not appear

The `apiKey` in `js/firebase-config.js` is empty. Complete Step 6 of this guide.

### "Email/password sign-in is not enabled"

Return to Step 3 and enable the **Email/Password** provider in Firebase Authentication.

### "Firestore permission denied" or "⚠️ Sync error"

Your security rules are still set to deny all access. Return to Step 5 and publish the rules shown there.

### "Firestore database not found or not ready"

You skipped Step 4. Go to **Build → Firestore Database** in the Firebase console and create a database.

### I see a sync error but no explanation

Open your browser's developer console (F12 → Console tab). The full error code and message are always logged there.

### Will cloud sync work if Firebase is unavailable?

Yes. The app reads from and writes to localStorage first. If the cloud sync upload fails, your data is still safe locally and the error badge will appear. The next successful save will re-upload everything.

---

## Firebase Free Tier Limits

Firebase's Spark (free) plan is sufficient for normal use. The relevant limits are:

| Resource | Free quota |
| --- | --- |
| Firestore reads | 50,000 / day |
| Firestore writes | 20,000 / day |
| Firestore storage | 1 GiB |
| Authentication users | Unlimited |

A typical user saving a few time entries per session will use a handful of reads and writes per day — far below the free limits.

---

## Additional Resources

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Pricing (Spark plan)](https://firebase.google.com/pricing)
