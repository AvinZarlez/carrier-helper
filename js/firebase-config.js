/**
 * firebase-config.js — Firebase Configuration for Carrier Helper
 *
 * This file contains the Firebase project configuration values needed
 * for cloud sync functionality. When properly configured, users can
 * sync their time entries across multiple browsers and devices.
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Enable Email/Password authentication
 * 3. Create a Firestore database
 * 4. Set up security rules (see docs/cloud-sync-setup.md)
 * 5. Copy your Firebase config values below
 *
 * See docs/cloud-sync-setup.md for a complete step-by-step guide.
 *
 * SECURITY NOTE:
 * Firebase API keys are NOT secret — they identify your project but access
 * is controlled by Firebase Authentication and Firestore Security Rules.
 * It is safe to commit this file with your actual project values.
 *
 * WHAT BELONGS HERE:
 * - Firebase configuration object only
 * - No other code or logic
 *
 * WHAT DOES NOT BELONG HERE:
 * - Firebase initialization (see cloud-sync.js)
 * - Any application logic
 *
 * Leave apiKey empty to disable cloud sync (app works in local-only mode).
 */

// eslint-disable-next-line no-unused-vars
const firebaseConfig = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
};
