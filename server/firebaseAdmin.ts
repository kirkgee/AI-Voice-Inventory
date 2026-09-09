import * as admin from 'firebase-admin';

/**
 * Initializes the Firebase Admin SDK.
 * Uses applicationDefault credentials or falls back to env vars.
 */
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

/**
 * Returns the Firestore admin instance.
 */
export function getDb(): admin.firestore.Firestore {
  return admin.firestore();
}

/**
 * Returns the Firebase Auth admin instance.
 */
export function getAuth(): admin.auth.Auth {
  return admin.auth();
}
