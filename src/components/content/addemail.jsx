import React, { useState, useEffect } from "react";
import { db, auth } from "../../backend/firebase/firebaseconfig";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import {
  fetchSignInMethodsForEmail,
} from "firebase/auth";

const AddEmail = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [emailCheckResult, setEmailCheckResult] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(true);

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "authorizedUsers"));
        const emailList = querySnapshot.docs.map((doc) => doc.data().email);
        setEmails(emailList);
      } catch (error) {
        console.error("Error fetching emails:", error);
      } finally {
        setLoadingEmails(false);
      }
    };

    fetchEmails();
  }, []);

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

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (email) {
        checkEmailInAuth(email);
      } else {
        setEmailCheckResult("");
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [email]);

  const handleAddUser = async () => {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "authorizedUsers"), { email });
      setEmails((prev) => [...prev, email]);
      alert(`Email "${email}" added successfully.`);
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
      <div className="flex-1 p-8 border-2 border-indigo-300 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 flex flex-col justify-center shadow-md">
        <h3 className="text-2xl font-bold mb-6 text-indigo-800">Add New User Email</h3>
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
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="mb-4 p-3 border rounded-lg w-full"
        />
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

      <div className="flex-1 p-6 border-2 border-gray-300 rounded-lg bg-gray-50 overflow-auto shadow-md">
        <h3 className="text-2xl font-semibold mb-4 text-indigo-700">Added Emails:</h3>
        {loadingEmails ? (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="ml-3 text-gray-600">Loading emails...</p>
          </div>
        ) : emails.length > 0 ? (
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
