import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../backend/firebase/firebaseconfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import logo from "../assets/globe-logo-name.png"; // Fixed image import

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isAuthorized = async (email) => {
    console.log("Checking authorization for:", email);
    try {
      const q = query(collection(db, "authorizedUsers"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      console.log("Query result:", querySnapshot.docs.map(doc => doc.data()));
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking authorization:", error);
      return false;
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Email and password cannot be empty.");
      setLoading(false);
      return;
    }

    try {
      const authorized = await isAuthorized(trimmedEmail);
      if (!authorized) {
        setError("You are not authorized. Contact admin.");
        setLoading(false);
        return;
      }

      await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      if (err.code === "auth/user-not-found") {
        setError("User not found. Please check your email.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Try again.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-10 rounded-lg shadow-lg w-[500px] text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo" className="w-32 h-auto" />
        </div>

        {/* Title */}
        <h2 className="text-3xl font-semibold text-gray-700 mb-6">Welcome Back!</h2>

        {/* Email Login Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className={`w-full p-3 rounded-md transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;