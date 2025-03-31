import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../backend/firebase/firebaseconfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Create Context
const AuthContext = createContext();

// Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get user details from Firestore
        const userDoc = await getDoc(doc(db, "authorizedUsers", firebaseUser.uid));

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: userDoc.exists() ? userDoc.data().name : "Unknown User",
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook to use AuthContext
export const useAuth = () => useContext(AuthContext);
