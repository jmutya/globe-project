import { doc, deleteDoc } from "firebase/firestore";
import {
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";
import { auth, db } from "../firebase/firebaseconfig";
import { toast } from "react-toastify";

// Exported function to delete both Firestore + Auth user
export const handleDeleteUser = async (
  id,
  email,
  role,
  currentUserRole,
  isEmailUser,
  isGoogleUser,
  setIsLoading,
  password
) => {
  const user = auth.currentUser;

  // Basic safety check: only allow deleting the currently logged in user
  if (!user || user.email !== email) {
    toast.error("Authenticated user mismatch. Please log in as the user to delete.");
    return;
  }

  try {
    setIsLoading(true);

    // Step 1: Reauthenticate
    if (isGoogleUser) {
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(user, provider);
    } else if (isEmailUser) {
      if (!password) {
        toast.error("Password is required to delete this user.");
        return;
      }
      if (!user.email) {
        toast.error("User email not found.");
        return;
      }
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
    }

    // Step 2: Delete from Firestore
    await deleteDoc(doc(db, "authorizedUsers", id));

    // Step 3: Delete from Firebase Authentication
    await deleteUser(user);

    toast.success(`User ${email} successfully deleted.`);
  } catch (error) {
    console.error("Error deleting user:", error);
    toast.error("Failed to delete user.");
  } finally {
    setIsLoading(false);
  }
};
