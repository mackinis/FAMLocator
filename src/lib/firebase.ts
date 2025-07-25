import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';

let app: FirebaseApp;
let db: Firestore;

function initializeFirebase() {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  db = getFirestore(app);
}

// Initialize on first load
initializeFirebase();

/**
 * Gets the Firestore database instance.
 * Ensures Firebase is initialized before returning the instance.
 * @returns {Firestore} The Firestore database instance.
 */
export function getDb(): Firestore {
    if (!db) {
        initializeFirebase();
    }
    return db;
}
