// components/Sidebar/navigation/createUser.js
import express from "express";
import { auth } from "../../../backend/firebase/firebaseAdmin.mjs";

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

export default router;