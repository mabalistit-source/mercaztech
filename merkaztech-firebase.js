// Firebase config + init for the Merkaztech activity log (merkaztech-log.html / merkaztech-entry.html).
// Fill in the six values below from your Firebase project settings — see MERKAZTECH-SETUP.md.
//
// The Firebase SDK itself is loaded lazily via loadFirebase() (dynamic import), not at module
// top-level, so that a page whose config isn't filled in yet — or whose network can't reach
// the Firebase CDN — still renders and can show a clear message instead of a blank page.

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export const isConfigured = !firebaseConfig.apiKey.startsWith("YOUR_");

const SDK_BASE = "https://www.gstatic.com/firebasejs/10.13.0";

let cached = null;

// Resolves to { app, db, auth, firestore, authSdk } — firestore/authSdk are the SDK
// namespace modules themselves, so callers don't need a second network round trip
// to import collection/onSnapshot/signIn.../etc.
export async function loadFirebase() {
  if (!isConfigured) throw new Error('Firebase is not configured yet (see MERKAZTECH-SETUP.md)');
  if (cached) return cached;
  const [{ initializeApp }, firestore, authSdk] = await Promise.all([
    import(`${SDK_BASE}/firebase-app.js`),
    import(`${SDK_BASE}/firebase-firestore.js`),
    import(`${SDK_BASE}/firebase-auth.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  cached = { app, db: firestore.getFirestore(app), auth: authSdk.getAuth(app), firestore, authSdk };
  return cached;
}
