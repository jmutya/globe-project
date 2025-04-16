// functions/firebaseAdmin.js
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const auth = admin.auth();

module.exports = { admin, auth };
