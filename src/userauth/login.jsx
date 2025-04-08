import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../backend/firebase/firebaseconfig";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import logo from "../assets/globe-logo-name.png";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // Eye icon for showing password

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // For toggling password visibility

  // Check if the user is already saved in localStorage (email and password)
  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user"));
    if (savedUser) {
      setEmail(savedUser.email);
      setPassword(savedUser.password); // Auto-fill password if stored
      setRememberMe(true); // Automatically check remember me if data exists
    }
  }, []);

  const isAuthorized = async (email) => {
    try {
      const q = query(collection(db, "authorizedUsers"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      return false;
    }
  };

  const checkActiveSession = async (uid) => {
    const sessionRef = doc(db, "activeSessions", uid);
    const sessionSnapshot = await getDocs(query(collection(db, "activeSessions"), where("uid", "==", uid)));
    return !sessionSnapshot.empty; // Returns true if user already has an active session
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      if (!trimmedEmail || !trimmedPassword) {
        setError("Email and password cannot be empty.");
        setLoading(false);
        return;
      }

      const authorized = await isAuthorized(trimmedEmail);
      if (!authorized) {
        setError("You are not authorized. Contact admin.");
        setLoading(false);
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const uid = userCredential.user.uid;
      const loggedInUser = { email: trimmedEmail, password: trimmedPassword, uid };

      // Store user in localStorage if Remember Me is checked (store email and password)
      if (rememberMe) {
        localStorage.setItem("user", JSON.stringify(loggedInUser));
      } else {
        localStorage.removeItem("user");
      }

      // Check for active session
      const hasActiveSession = await checkActiveSession(uid);
      if (hasActiveSession) {
        setError("This account is already logged in elsewhere.");
        await signOut(auth);
        setLoading(false);
        return;
      }

      // Store session in Firestore
      await setDoc(doc(db, "activeSessions", uid), { uid, email: trimmedEmail, timestamp: Date.now() });

      navigate("/dashboard");
    } catch (err) {
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
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo" className="w-32 h-auto" />
        </div>
        <h2 className="text-3xl font-semibold text-gray-700 mb-6">Welcome Back!</h2>
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-3 right-3 cursor-pointer"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="form-checkbox h-5 w-5 text-blue-500"
              />
              <span className="text-gray-700">Remember Me</span>
            </label>
          </div>

          <button
            type="submit"
            className={`w-full p-3 rounded-md transition ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"
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
