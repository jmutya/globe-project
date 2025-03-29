import { Navigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

const ProtectedRoute = ({ children }) => {
  const auth = getAuth();
  const user = auth.currentUser; // Directly check Firebase Authentication

  return user ? children : <Navigate to="/" />;
};

export default ProtectedRoute;
