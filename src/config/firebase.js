const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

let serviceAccount;

if (serviceAccountJson) {
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY must be valid JSON');
  }
} else if (serviceAccountPath) {
  const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Firebase service account file not found at ${resolvedPath}`);
  }
  serviceAccount = require(resolvedPath);
} else {
  throw new Error('Either FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_PATH must be set');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

console.log('Firebase Admin SDK initialized successfully.');

const verifyFirebaseToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    if (decodedToken.firebase?.sign_in_provider !== 'google.com') {
      throw new Error('Only Google sign-in is allowed');
    }

    return decodedToken;
  } catch (error) {
    if (error.code === 'auth/id-token-revoked') {
      throw new Error('Firebase ID token has been revoked');
    }
    throw new Error('Invalid or expired Firebase ID token');
  }
};

module.exports = {
  admin,
  verifyFirebaseToken
};
