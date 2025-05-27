import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../backend/firebase/firebaseconfig";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import logo from "../assets/globe-logo-name.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user"));
    if (savedUser) {
      setEmail(savedUser.email);
      setPassword(savedUser.password);
      setRememberMe(true);
    }
  }, []);

  const isAuthorized = async (email) => {
    try {
      const q = query(collection(db, "authorizedUsers"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return { allowed: false, reason: "unauthorized" };
      const userDoc = querySnapshot.docs[0].data();
      if (userDoc.status !== "active") return { allowed: false, reason: "inactive" };
      return { allowed: true };
    } catch (error) {
      console.error("Error checking authorization:", error);
      return { allowed: false, reason: "error" };
    }
  };

  const checkActiveSession = async (uid) => {
    try {
      const sessionSnapshot = await getDocs(query(collection(db, "activeSessions"), where("uid", "==", uid)));
      return !sessionSnapshot.empty;
    } catch (error) {
      console.error("Error checking active session:", error);
      return false;
    }
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

      const authCheck = await isAuthorized(trimmedEmail);
      if (!authCheck.allowed) {
        if (authCheck.reason === "inactive") {
          setError("Your account is inactive. Contact admin.");
        } else {
          setError("You are not authorized. Contact admin.");
        }
        setLoading(false);
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const uid = userCredential.user.uid;
      const loggedInUser = { email: trimmedEmail, password: trimmedPassword, uid };

      if (rememberMe) {
        localStorage.setItem("user", JSON.stringify(loggedInUser));
      } else {
        localStorage.removeItem("user");
      }

      const hasActiveSession = await checkActiveSession(uid);
      if (hasActiveSession) {
        setError("This account is already logged in elsewhere. Please log out from other devices or wait for the session to expire.");
        await signOut(auth);
        setLoading(false);
        return;
      }

      await setDoc(doc(db, "activeSessions", uid), { uid, email: trimmedEmail, timestamp: Date.now() });
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed login attempts. Please try again later.");
      } else {
        setError("Login failed. Please check your network connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen font-sans antialiased relative overflow-hidden">
      {/* Background Gradient with Grain Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800"></div>
      {/* Subtle Grain/Noise overlay using a pseudo-element */}
      <div className="absolute inset-0 grainy-overlay"></div>

      {/* Login Box */}
      <div className="relative z-10 bg-white p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Company Logo" className="w-24 h-auto" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-2">Welcome Back!</h2>
        <p className="text-gray-600 text-center mb-6">Sign in to your account</p>

        <form onSubmit={handleEmailLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 pr-10"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 cursor-pointer"
              >
                {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-2 rounded-md border border-red-200 text-center">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700 text-sm">Remember Me</span>
            </label>
          </div>

          <button
            type="submit"
            className={`w-full p-3 rounded-md text-lg font-semibold transition duration-200 ease-in-out
              ${loading
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
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