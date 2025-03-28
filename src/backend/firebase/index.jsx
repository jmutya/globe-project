const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.beforeCreate = functions.auth.user().beforeCreate(async (user, context) => {
  const email = user.email;
  const db = admin.firestore();

  const authorizedUsersRef = db.collection("authorizedUsers").where("email", "==", email);
  const snapshot = await authorizedUsersRef.get();

  if (snapshot.empty) {
    throw new functions.auth.HttpsError(
      "permission-denied",
      "You are not authorized to create an account."
    );
  }
  return;
});
