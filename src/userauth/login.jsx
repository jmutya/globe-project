import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../backend/firebase/firebaseconfig";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import logo from "../assets/globe-logo-name.png";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isAuthorized = async (email) => {
    const q = query(collection(db, "authorizedUsers"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const checkActiveSession = async (uid) => {
    const sessionSnapshot = await getDocs(query(collection(db, "activeSessions"), where("uid", "==", uid)));
    return !sessionSnapshot.empty;
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

      localStorage.setItem("user", JSON.stringify({ email: trimmedEmail, uid }));

      const hasActiveSession = await checkActiveSession(uid);
      if (hasActiveSession) {
        setError("This account is already logged in elsewhere.");
        await signOut(auth);
        setLoading(false);
        return;
      }

      await setDoc(doc(db, "activeSessions", uid), {
        uid,
        email: trimmedEmail,
        timestamp: Date.now(),
      });

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
    <div className="relative flex justify-center items-center h-screen bg-[#0f172a] overflow-hidden">
      {/* Random Animated Bubbles */}
      <div className="absolute w-96 h-96 bg-blue-500 rounded-full opacity-30 blur-[100px] animate-float1" />
      <div className="absolute w-80 h-80 bg-purple-500 rounded-full opacity-30 blur-[90px] animate-float2 top-1/4 right-10" />
      <div className="absolute w-72 h-72 bg-pink-500 rounded-full opacity-30 blur-[80px] animate-float3 bottom-20 left-1/4" />
      <div className="absolute w-64 h-64 bg-cyan-500 rounded-full opacity-30 blur-[90px] animate-float4 bottom-10 right-10" />

      {/* 3D Login Box */}
      <div className="z-10 bg-white p-10 rounded-xl w-[500px] text-center shadow-xl transition-transform duration-300">
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
