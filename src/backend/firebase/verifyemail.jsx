import React, { useEffect, useState } from "react";
import { auth } from "../../backend/firebase/firebaseconfig";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const VerifyEmail = () => {
  const [message, setMessage] = useState("Verifying...");
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      try {
        const email = window.localStorage.getItem("emailForSignIn");
        if (!email) {
          setMessage("No email found for verification.");
          return;
        }

        if (isSignInWithEmailLink(auth, window.location.href)) {
          await signInWithEmailLink(auth, email, window.location.href);
          window.localStorage.removeItem("emailForSignIn");
          setMessage("Your email has been verified! You can now log in.");
          setTimeout(() => navigate("/"), 2000);
        } else {
          setMessage("Invalid verification link.");
        }
      } catch (err) {
        console.error(err);
        setMessage("Verification failed.");
      }
    };

    verify();
  }, [navigate]);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700">{message}</h2>
      </div>
    </div>
  );
};

export default VerifyEmail;
