import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function LogoutButton() {
  const auth = getAuth();
  const navigate = useNavigate(); // Hook for navigation

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/"); // Redirect to login page after logout
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
    >
      Logout
    </button>
  );
}

export default LogoutButton;
