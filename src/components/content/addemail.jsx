import React, { useState, useEffect } from "react";
import { db, auth } from "../../backend/firebase/firebaseconfig";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { fetchSignInMethodsForEmail } from "firebase/auth";

const AddEmail = () => {
  // State variables to manage user input, email list, and loading states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [emailCheckResult, setEmailCheckResult] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(true);

  // Fetches emails from Firestore when the component mounts
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

  // Checks if an email exists in Firebase Authentication
  const checkEmailInAuth = async (emailToCheck) => {
    if (!emailToCheck) {
      setEmailCheckResult("");
      return;
    }
    setCheckingEmail(true);
    try {
      const methods = await fetchSignInMethodsForEmail(auth, emailToCheck);
      setEmailCheckResult(methods.length > 0 ? "✅ Email exists in Firebase Authentication." : "❌ Email not found.");
    } catch (error) {
      setEmailCheckResult("⚠️ Invalid email format or error checking email.");
    } finally {
      setCheckingEmail(false);
    }
  };

  // Debounced effect to check email existence while typing
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (email) checkEmailInAuth(email);
    }, 800);
    return () => clearTimeout(timeout);
  }, [email]);

  // Handles adding a new email to Firestore
  const handleAddUser = async () => {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "authorizedUsers"), { email });
      setEmails([...emails, email]);
      setEmail("");
      setPassword("");
      setEmailCheckResult("");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="flex flex-col md:flex-row p-4 gap-4 h-[calc(100vh-100px)]">
    
    {/* Left Panel: Add User */}
    <div className="flex-1 p-8 border-2 border-indigo-400 rounded-xl bg-gradient-to-r from-blue-100 to-indigo-200 flex flex-col justify-center shadow-lg">
        <h3 className="text-3xl font-bold mb-6 text-indigo-900">Add New User Email</h3>
        <div className="flex flex-col mb-4 gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            className="p-3 border border-gray-200 bg-white rounded-xl w-full placeholder-gray-400 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
          {checkingEmail && <p className="text-gray-500">Checking email...</p>}
          {emailCheckResult && <p className={`${emailCheckResult.includes("✅") ? "text-green-600" : "text-red-500"}`}>{emailCheckResult}</p>}
        </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="mb-4 p-3 border border-gray-200 bg-white rounded-xl w-full placeholder-gray-400 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
        <button
          onClick={handleAddUser}
          className={`px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-lg transition-all ${loading ? "opacity-50 cursor-not-allowed animate-pulse" : "hover:bg-indigo-700"}`}
          disabled={loading}
        >
          {loading ? "Adding..." : "Add User"}
        </button>
      </div>

    {/* Right Panel: Email List */}
    <div className="flex-1 p-6 border-2 border-gray-400 rounded-xl bg-gray-50 overflow-auto shadow-lg">
        <h3 className="text-3xl font-semibold mb-4 text-indigo-700">Added Emails:</h3>
        {loadingEmails ? (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="ml-3 text-gray-600">Loading emails...</p>
          </div>
        ) : emails.length > 0 ? (
          <ul className="space-y-3">
            {emails.map((email, index) => (
              <li key={index} className="p-3 border rounded-xl bg-indigo-100 text-indigo-800 px-4 py-2 shadow-md hover:bg-indigo-200">
                {email}
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
