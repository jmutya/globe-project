import React, { useState, useEffect } from "react";
import { db, auth } from "../../backend/firebase/firebaseconfig";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";

const AddEmail = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [emailCheckResult, setEmailCheckResult] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Fetch emails from Firestore on component mount
  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "authorizedUsers"));
        const emailList = querySnapshot.docs.map((doc) => doc.data().email);
        setEmails(emailList);
      } catch (error) {
        console.error("Error fetching emails:", error);
      }
    };

    fetchEmails();
  }, []);

  // Check if email exists in Firestore
  const checkIfEmailExistsInFirestore = async (email) => {
    const q = query(collection(db, "authorizedUsers"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // True if email exists
  };

  // Check if email exists in Firebase Authentication
  const checkEmailInAuth = async (emailToCheck) => {
    if (!emailToCheck) {
      setEmailCheckResult("");
      return;
    }

    setCheckingEmail(true);
    try {
      const methods = await fetchSignInMethodsForEmail(auth, emailToCheck);
      if (methods.length > 0) {
        setEmailCheckResult("✅ Email exists in Firebase Authentication.");
      } else {
        setEmailCheckResult("❌ Email does not exist in Firebase Authentication.");
      }
    } catch (error) {
      console.error("Error checking email:", error);
      setEmailCheckResult("⚠️ Invalid email format or error checking email.");
    } finally {
      setCheckingEmail(false);
    }
  };

  // Auto-check email in Firebase Auth on change
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (email) {
        checkEmailInAuth(email);
      } else {
        setEmailCheckResult("");
      }
    }, 800); // Debounced 800ms

    return () => clearTimeout(timeout);
  }, [email]);

  // Handle adding user to Firebase Auth & Firestore
  const handleAddUser = async () => {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      // Check if email exists in Firestore
      const existsInFirestore = await checkIfEmailExistsInFirestore(email);
      if (existsInFirestore) {
        alert("This email is already added to Firestore.");
        setLoading(false);
        return;
      }

      // Check Firebase Authentication
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        alert("This email already exists in Firebase Authentication.");
        setLoading(false);
        return;
      }

      // Create user in Firebase Authentication
      await createUserWithEmailAndPassword(auth, email, password);

      // Save email to Firestore
      await addDoc(collection(db, "authorizedUsers"), { email });

      // Update state with new email
      setEmails((prev) => [...prev, email]);
      alert(`Email "${email}" added successfully.`);

      // Reset form
      setEmail("");
      setPassword("");
      setEmailCheckResult("");
    } catch (error) {
      console.error("Error adding user:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg mx-auto flex gap-8 w-full h-[80vh] max-w-full">
      {/* Add New User Section */}
      <div className="flex-1 p-8 border-2 border-indigo-300 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 flex flex-col justify-center shadow-md">
        <h3 className="text-2xl font-bold mb-6 text-indigo-800">Add New User Email</h3>
        
        {/* Email Input */}
        <div className="flex flex-col mb-4 gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            className="p-3 border rounded-lg w-full"
          />
          {checkingEmail && <p className="text-gray-500">Checking email...</p>}
          {emailCheckResult && (
            <p className={`${emailCheckResult.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
              {emailCheckResult}
            </p>
          )}
        </div>

        {/* Password Input */}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="mb-4 p-3 border rounded-lg w-full"
        />

        {/* Add User Button */}
        <button
          onClick={handleAddUser}
          className={`px-6 py-3 bg-indigo-600 text-white rounded-lg ${
            loading ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700"
          }`}
          disabled={loading}
        >
          {loading ? "Adding..." : "Add User"}
        </button>
      </div>

      {/* Added Emails Section */}
      <div className="flex-1 p-6 border-2 border-gray-300 rounded-lg bg-gray-50 overflow-auto shadow-md">
        <h3 className="text-2xl font-semibold mb-4 text-indigo-700">Added Emails:</h3>
        {emails.length > 0 ? (
          <ul className="space-y-3">
            {emails.map((email, index) => (
              <li key={index} className="flex justify-between items-center p-3 border border-gray-300 rounded-lg bg-white">
                <span className="text-gray-800">{email}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No emails added yet.</p>
        )}
      </div>
    </div>
  );
};

export default AddEmail;
