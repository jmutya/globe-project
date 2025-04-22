import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function LogoutButton() {
  const auth = getAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/"); // Redirect after logout
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full px-4 py-2 text-sm md:text-base text-gray-700 hover:bg-gray-100 text-left transition duration-200 ease-in-out"
    >
      Logout
    </button>
  );
}

export default LogoutButton;
