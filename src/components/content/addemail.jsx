import React, { useState, useEffect } from "react";
import { db, auth } from "../../backend/firebase/firebaseconfig";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { fetchSignInMethodsForEmail, sendPasswordResetEmail, createUserWithEmailAndPassword } from "firebase/auth";
import { FaKey } from "react-icons/fa"; // Icon for reset password
import { ToastContainer, toast } from "react-toastify"; // Import Toast components
import "react-toastify/dist/ReactToastify.css"; // Import toast stylessss

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
      setEmailCheckResult(methods.length > 0 ? "✅ Email exists in Firebase Authentication." : "❌ Email not found.");
    } catch (error) {
      setEmailCheckResult("⚠️ Invalid email format or error checking email.");
    } finally {
      setCheckingEmail(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (email) checkEmailInAuth(email);
    }, 800);
    return () => clearTimeout(timeout);
  }, [email]);

  const handleAddUser = async () => {
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
  
    setLoading(true);
  
    try {
      const response = await fetch("http://localhost:5000/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message);
      }
  
      await addDoc(collection(db, "authorizedUsers"), { email });
      setEmails([...emails, email]);
      setEmail("");
      setPassword("");
      toast.success("User created and added!");
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };  

  const handlePasswordReset = async (emailToReset) => {
    try {
      await sendPasswordResetEmail(auth, emailToReset);
      toast.success(`Password reset link sent to ${emailToReset}`);
    } catch (error) {
      toast.error("Error sending password reset link: " + error.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row p-6 gap-6 h-[calc(100vh-100px)]">
      {/* Left Panel: Add User */}
      <div className="flex-1 p-6 bg-gradient-to-r from-blue-100 to-indigo-200 rounded-lg shadow-xl flex flex-col justify-center">
        <h3 className="text-3xl font-bold text-indigo-900 mb-4">Add New User Email</h3>
        <div className="flex flex-col mb-4 gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            className="p-4 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-shadow"
          />
          {checkingEmail && <p className="text-gray-500">Checking email...</p>}
          {emailCheckResult && (
            <p className={`text-sm font-semibold ${emailCheckResult.includes("✅") ? "text-green-600" : "text-red-500"}`}>
              {emailCheckResult}
            </p>
          )}
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="p-4 border border-indigo-300 rounded-lg mb-6 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-shadow"
        />
        <button
          onClick={handleAddUser}
          className={`w-full p-4 text-white rounded-lg shadow-md bg-indigo-600 transition-all ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700"}`}
          disabled={loading}
        >
          {loading ? "Adding..." : "Add User"}
        </button>
      </div>

      {/* Right Panel: Email List */}
      <div className="flex-1 p-6 bg-white border border-gray-200 rounded-lg shadow-lg overflow-auto">
        <h3 className="text-3xl font-semibold text-indigo-700 mb-6">Added Emails</h3>
        {loadingEmails ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="ml-4 text-gray-600">Loading emails...</p>
          </div>
        ) : emails.length > 0 ? (
          <ul className="space-y-4">
            {emails.map((email, index) => (
              <li key={index} className="flex justify-between items-center p-4 border rounded-lg bg-indigo-50 text-indigo-700 shadow-md hover:bg-indigo-100">
                <span>{email}</span>
                <button
                  onClick={() => handlePasswordReset(email)}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <FaKey size={20} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No emails added yet.</p>
        )}
      </div>

      {/* Toast Notification Container */}
      <ToastContainer position="bottom-right" />
    </div>
  );
};

export default AddEmail;
