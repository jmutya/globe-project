// components/Sidebar/navigation/createUser.js
import express from "express";
import { auth, admin } from "../../../backend/firebase/firebaseAdmin.mjs";

const router = express.Router();

router.post("/create-user", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRecord = await auth.createUser({
      email,
      password,
    });

    res.status(200).json({ message: "User created", uid: userRecord.uid });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ New Route to delete user
router.post("/delete-user", async (req, res) => {
  const { email } = req.body;

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(userRecord.uid);
    res.status(200).json({ message: "User deleted from authentication." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user.", error: error.message });
  }
});

export default router;