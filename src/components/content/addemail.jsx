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
    <div className="flex-1 border border-gray-300 rounded-xl bg-white p-6 flex flex-col shadow">
      <h3 className="text-xl font-semibold text-indigo-800 mb-4">Add New User Email</h3>
      
      <div className="flex flex-col gap-3 mb-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter email"
        className="p-3 border border-gray-200 bg-white rounded-xl w-full placeholder-gray-400 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
      />
        {checkingEmail && <p className="text-sm text-gray-500">Checking email...</p>}
        {emailCheckResult && (
          <p className={`text-sm ${emailCheckResult.includes("✅") ? "text-green-600" : "text-red-500"}`}>
            {emailCheckResult}
          </p>
        )}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="mb-4 p-3 border border-gray-200 bg-white rounded-xl w-full placeholder-gray-400 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
      </div>

      <button
        onClick={handleAddUser}
        disabled={loading}
        className={`mt-auto py-3 px-4 rounded-lg text-white font-medium shadow-md ${
          loading
            ? "bg-indigo-400 opacity-50 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700 transition"
        }`}
      >
        {loading ? "Adding..." : "Add User"}
      </button>
    </div>

    {/* Right Panel: Email List */}
    <div className="flex-1 border border-gray-300 rounded-xl bg-white p-6 overflow-y-auto shadow">
      <h3 className="text-xl font-semibold text-indigo-800 mb-4">Added Emails</h3>

      {loadingEmails ? (
        <div className="flex items-center space-x-3">
          <div className="animate-spin h-6 w-6 border-2 border-t-indigo-600 border-gray-200 rounded-full" />
          <p className="text-gray-600 text-sm">Loading emails...</p>
        </div>
      ) : emails.length > 0 ? (
        <ul className="space-y-2">
          {emails.map((email, index) => (
            <li
              key={index}
              className="p-3 border border-indigo-100 rounded-lg bg-indigo-50 text-indigo-700 shadow-sm hover:bg-indigo-100"
            >
              {email}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No emails added yet.</p>
      )}
    </div>
  </div>
);

};

export default AddEmail;
