import React from "react";
import { FcGoogle } from "react-icons/fc"; // Import Google icon
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation

const Login = () => {
  const navigate = useNavigate(); // Hook for navigation

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-10 rounded-lg shadow-lg w-[500px] text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/src/assets/globe-logo-name.png" alt="Logo" className="w-32 h-auto" />
        </div>

        {/* Title */}
        <h2 className="text-3xl font-semibold text-gray-700 mb-6">
          Welcome Back!
        </h2>

        {/* Google Login Button */}
        <button
          onClick={() => navigate("/dashboard")} // Redirect to Dashboard
          className="w-full flex items-center justify-center bg-red-500 text-white p-4 rounded-md hover:bg-red-600 transition text-lg"
        >
          <FcGoogle className="w-6 h-6 mr-2" /> {/* Google Icon */}
          Continue with Google
        </button>
      </div>
    </div>
  );
};

export default Login;