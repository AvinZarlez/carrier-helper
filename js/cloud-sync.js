// Cloud Sync Module
// Provides Firebase Authentication and Firestore sync so users can access
// their time-entry data from any browser or device.

// eslint-disable-next-line no-unused-vars
const CloudSyncModule = (function () {
    let auth = null;
    let db = null;
    let currentUser = null;
    let unsubscribeListener = null;
    let isSyncing = false;

    const DATA_COLLECTION = 'userData';
    const DATA_DOCUMENT = 'entries';

    // Returns true if a Firebase project has been configured
    function isConfigured() {
        return typeof firebaseConfig !== 'undefined' &&
            firebaseConfig.apiKey &&
            firebaseConfig.apiKey !== '';
    }

    // Initialize Firebase and set up auth state listener
    function init() {
        if (!isConfigured()) {
            return; // Running in local-only mode
        }

        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            auth = firebase.auth();
            db = firebase.firestore();
            auth.onAuthStateChanged(handleAuthStateChange);
            showCloudSyncUI();
        } catch (e) {
            console.error('Firebase initialization failed:', e);
        }
    }

    // Show the cloud sync button once Firebase is ready
    function showCloudSyncUI() {
        const loginBtn = document.getElementById('cloudSyncLoginBtn');
        if (loginBtn) {
            loginBtn.style.display = 'inline-block';
        }
    }

    // Handle auth state changes (login / logout)
    async function handleAuthStateChange(user) {
        currentUser = user;
        updateAuthUI(user);

        if (user) {
            await syncFromCloud();
            startRealtimeListener();
        } else {
            stopRealtimeListener();
        }
    }

    // Sign in with email and password
    async function signIn(email, password) {
        if (!auth) {
            throw new Error('Firebase not initialized');
        }
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (e) {
            throw new Error(getAuthErrorMessage(e.code));
        }
    }

    // Create a new account with email and password
    async function signUp(email, password) {
        if (!auth) {
            throw new Error('Firebase not initialized');
        }
        try {
            await auth.createUserWithEmailAndPassword(email, password);
        } catch (e) {
            throw new Error(getAuthErrorMessage(e.code));
        }
    }

    // Sign out the current user
    async function signOut() {
        if (!auth) {
            return;
        }
        stopRealtimeListener();
        await auth.signOut();
    }

    // Upload all local entries to Firestore
    async function syncToCloud() {
        if (!db || !currentUser) {
            return;
        }

        try {
            isSyncing = true;
            updateSyncStatus('syncing');

            const localEntries = loadEntries();
            const docRef = db
                .collection('users')
                .doc(currentUser.uid)
                .collection(DATA_COLLECTION)
                .doc(DATA_DOCUMENT);

            await docRef.set({
                entries: localEntries,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdatedBy: navigator.userAgent
            });

            updateSyncStatus('synced');
        } catch (e) {
            console.error('Failed to sync to cloud:', e);
            updateSyncStatus('error', getSyncErrorMessage(e));
        } finally {
            isSyncing = false;
        }
    }

    // Download cloud entries and merge with local data
    async function syncFromCloud() {
        if (!db || !currentUser) {
            return;
        }

        try {
            updateSyncStatus('syncing');

            const docRef = db
                .collection('users')
                .doc(currentUser.uid)
                .collection(DATA_COLLECTION)
                .doc(DATA_DOCUMENT);

            const doc = await docRef.get();

            if (doc.exists) {
                const cloudEntries = doc.data().entries || [];
                const localEntries = loadEntries();
                const merged = mergeEntries(localEntries, cloudEntries);
                saveEntries(merged);
                render();
            } else {
                // No cloud data yet — upload what we have locally
                await syncToCloud();
            }

            updateSyncStatus('synced');
        } catch (e) {
            console.error('Failed to sync from cloud:', e);
            updateSyncStatus('error', getSyncErrorMessage(e));
        }
    }

    // Merge two arrays of entries, deduplicating by id
    function mergeEntries(local, cloud) {
        const map = new Map();
        // Cloud entries take precedence over local ones with the same id
        local.forEach((e) => map.set(e.id, e));
        cloud.forEach((e) => map.set(e.id, e));
        return Array.from(map.values()).sort(
            (a, b) => new Date(a.clockIn) - new Date(b.clockIn)
        );
    }

    // Start a real-time Firestore listener so changes from other devices appear instantly
    function startRealtimeListener() {
        if (!db || !currentUser) {
            return;
        }

        const docRef = db
            .collection('users')
            .doc(currentUser.uid)
            .collection(DATA_COLLECTION)
            .doc(DATA_DOCUMENT);

        unsubscribeListener = docRef.onSnapshot((doc) => {
            if (isSyncing) {
                return; // Ignore our own writes
            }
            if (doc.exists) {
                const cloudEntries = doc.data().entries || [];
                saveEntries(cloudEntries);
                render();
                updateSyncStatus('synced');
            }
        }, (e) => {
            console.error('Firestore listener error:', e);
            updateSyncStatus('error', getSyncErrorMessage(e));
        });
    }

    function stopRealtimeListener() {
        if (unsubscribeListener) {
            unsubscribeListener();
            unsubscribeListener = null;
        }
    }

    // Update the header auth UI
    function updateAuthUI(user) {
        const loginBtn = document.getElementById('cloudSyncLoginBtn');
        const userStatus = document.getElementById('cloudSyncUserStatus');
        const userEmail = document.getElementById('cloudSyncUserEmail');

        if (user) {
            if (loginBtn) {
                loginBtn.style.display = 'none';
            }
            if (userStatus) {
                userStatus.style.display = 'flex';
            }
            if (userEmail) {
                userEmail.textContent = user.email;
            }
        } else {
            if (loginBtn) {
                loginBtn.style.display = 'inline-block';
            }
            if (userStatus) {
                userStatus.style.display = 'none';
            }
            const statusEl = document.getElementById('syncStatusIndicator');
            if (statusEl) {
                statusEl.style.display = 'none';
            }
            const errorEl = document.getElementById('syncErrorDetail');
            if (errorEl) {
                errorEl.style.display = 'none';
            }
        }
    }

    // Update the sync status badge
    function updateSyncStatus(state, message) {
        const statusEl = document.getElementById('syncStatusIndicator');
        const errorEl = document.getElementById('syncErrorDetail');
        if (!statusEl) {
            return;
        }

        statusEl.style.display = 'inline-block';
        statusEl.className = 'sync-status sync-' + state;

        const labels = { syncing: '⏳ Syncing…', synced: '☁️ Synced', error: '⚠️ Sync error' };
        statusEl.textContent = labels[state] || state;

        if (errorEl) {
            if (state === 'error' && message) {
                errorEl.textContent = message;
                errorEl.style.display = 'block';
            } else {
                errorEl.style.display = 'none';
            }
        }
    }

    // Human-readable messages for common Firebase auth error codes
    function getAuthErrorMessage(code) {
        const messages = {
            'auth/user-not-found': 'No account found with that email address.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/email-already-in-use': 'An account with that email already exists.',
            'auth/weak-password': 'Password must be at least 6 characters.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/too-many-requests': 'Too many failed attempts. Please wait a moment and try again.',
            'auth/network-request-failed': 'Network error. Please check your internet connection.',
            'auth/invalid-credential': 'Invalid email or password.',
            'auth/operation-not-allowed': 'Email/password sign-in is not enabled. In the Firebase console go to Authentication → Sign-in method and enable the Email/Password provider.',
            'auth/invalid-api-key': 'Invalid Firebase API key. Check your firebase-config.js values.',
            'auth/app-not-authorized': 'This app is not authorized to use Firebase. Check your firebase-config.js authDomain.',
            'auth/configuration-not-found': 'Firebase Authentication is not configured. Enable it in the Firebase console under Authentication → Get started.'
        };
        const msg = messages[code];
        if (msg) {
            return msg;
        }
        console.error('Unhandled Firebase auth error code:', code);
        return `Authentication error (${code}). Please check the browser console for details.`;
    }

    // Human-readable messages for common Firestore error codes
    function getSyncErrorMessage(e) {
        const code = e && (e.code || '');
        const messages = {
            'permission-denied': 'Firestore permission denied. Make sure you have set the correct security rules in the Firebase console (see docs/cloud-sync-setup.md).',
            'failed-precondition': 'Firestore database not found or not ready. Go to Firebase console → Build → Firestore Database and create a database.',
            'unavailable': 'Firestore service is temporarily unavailable. Please check your internet connection and try again.',
            'unauthenticated': 'Firestore request is unauthenticated. Please sign out and sign in again.',
            'resource-exhausted': 'Firebase quota exceeded. Your free tier limits may have been reached.',
            'not-found': 'Firestore document not found. This is unexpected — try signing out and back in.'
        };
        const shortCode = code.replace('firestore/', '');
        const msg = messages[shortCode] || messages[code];
        if (msg) {
            return msg;
        }
        console.error('Firestore sync error:', e);
        return `Sync failed (${code || 'unknown error'}). Check the browser console for details.`;
    }

    // ---- Modal helpers (called from inline HTML onclick handlers) ----

    // eslint-disable-next-line no-unused-vars
    function openAuthModal() {
        const modal = document.getElementById('cloudSyncModal');
        if (modal) {
            modal.style.display = 'flex';
            const emailInput = document.getElementById('authEmail');
            if (emailInput) {
                emailInput.focus();
            }
        }
    }

    // eslint-disable-next-line no-unused-vars
    function closeAuthModal() {
        const modal = document.getElementById('cloudSyncModal');
        if (modal) {
            modal.style.display = 'none';
        }
        clearAuthError();
    }

    function clearAuthError() {
        const errorEl = document.getElementById('authError');
        if (errorEl) {
            errorEl.style.display = 'none';
            errorEl.textContent = '';
        }
    }

    function showAuthError(msg) {
        const errorEl = document.getElementById('authError');
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = 'block';
        }
    }

    function getAuthFormValues() {
        const email = (document.getElementById('authEmail') || {}).value || '';
        const password = (document.getElementById('authPassword') || {}).value || '';
        return { email: email.trim(), password };
    }

    // Called by the Sign In button in the modal
    // eslint-disable-next-line no-unused-vars
    async function handleSignIn() {
        clearAuthError();
        const { email, password } = getAuthFormValues();
        if (!email || !password) {
            showAuthError('Please enter your email and password.');
            return;
        }
        const signInBtn = document.getElementById('authSignInBtn');
        if (signInBtn) {
            signInBtn.disabled = true;
        }
        try {
            await signIn(email, password);
            closeAuthModal();
        } catch (e) {
            showAuthError(e.message);
        } finally {
            if (signInBtn) {
                signInBtn.disabled = false;
            }
        }
    }

    // Called by the Create Account button in the modal
    // eslint-disable-next-line no-unused-vars
    async function handleSignUp() {
        clearAuthError();
        const { email, password } = getAuthFormValues();
        if (!email || !password) {
            showAuthError('Please enter an email and password.');
            return;
        }
        const signUpBtn = document.getElementById('authSignUpBtn');
        if (signUpBtn) {
            signUpBtn.disabled = true;
        }
        try {
            await signUp(email, password);
            closeAuthModal();
        } catch (e) {
            showAuthError(e.message);
        } finally {
            if (signUpBtn) {
                signUpBtn.disabled = false;
            }
        }
    }

    // Called after any data change to push updates to the cloud
    // eslint-disable-next-line no-unused-vars
    function notifyDataChanged() {
        if (currentUser) {
            syncToCloud();
        }
    }

    // ---- Initialization on DOM ready ----
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', function () {
            init();
        });
    }

    // Public API
    return {
        init,
        signIn,
        signUp,
        signOut,
        syncToCloud,
        isConfigured,
        isLoggedIn: () => currentUser !== null,
        openAuthModal,
        closeAuthModal,
        handleSignIn,
        handleSignUp,
        notifyDataChanged
    };
})();
