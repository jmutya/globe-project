import { initializeApp } from "firebase/app";
import { getAuth, deleteUser } from "firebase/auth";
import { getFirestore, deleteDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";

// ⚠️ Replace with your second Firebase project's config
const firebaseConfig2 = {
    apiKey: "AIzaSyBoW9fYNNX5eE46QftAK89gtk-uvVm2mgU",
    authDomain: "globe-project-cdd3f.firebaseapp.com",
    projectId: "globe-project-cdd3f",
    storageBucket: "globe-project-cdd3f.firebasestorage.app",
    messagingSenderId: "758541012292",
    appId: "1:758541012292:web:0133177f54c242e44ddb11",
    measurementId: "G-YN14Z9M4RE"
};

const app2 = initializeApp(firebaseConfig2, "app2");
const auth2 = getAuth(app2);
const db2 = getFirestore(app2);

const deleteUserFromFirestore = async (id) => {
  try {
    await deleteDoc(doc(db2, "authorizedUsers", id));
    toast.success("User deleted from Firestore.");
  } catch (error) {
    toast.error("Error deleting user from Firestore: " + error.message);
  }
};

const deleteUserFromAuth = async (user) => {
  try {
    await deleteUser(user);
    toast.success("User deleted from Firebase Authentication.");
  } catch (error) {
    toast.error("Error deleting user from Firebase Authentication: " + error.message);
  }
};

const handleDeleteUser = async (id, email, role, currentUserRole) => {
  if (role === "admin") {
    toast.error("Cannot revoke access from another admin.");
    return;
  }

  if (currentUserRole !== "admin") {
    toast.error("You do not have permission to revoke access.");
    return;
  }

  try {
    // Step 1: Delete from Firestore
    await deleteUserFromFirestore(id);

    // Step 2: Delete the user from Firebase Authentication
    const currentUser = auth2.currentUser;

    // Only delete the user if the current authenticated user is the same
    if (currentUser && currentUser.email === email) {
      await deleteUserFromAuth(currentUser);
    }

    toast.success("User access revoked and deleted.");
  } catch (error) {
    toast.error("Error revoking access: " + error.message);
  }
};

export { handleDeleteUser };
