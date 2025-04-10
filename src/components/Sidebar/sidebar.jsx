import React, { useState, useCallback, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { FaSignOutAlt, FaTimes } from "react-icons/fa";
import {
  ChartBarSquareIcon,
  UsersIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";
const NetworkSurveillanceDashboard = lazy(() => import("../content/dashboard"));
const Reports = lazy(() => import("../content/reports"));
const AddEmail = lazy(() => import("../content/addemail"));
const ExcelUploader = lazy(() => import("../content/documents"));
import SearchBar from "../../main/searchbar/searchbar";
import MainContent from "../../main/mainContent";
import Logo from "./navigation/logo";

const navigation = [
  { name: "Dashboard", icon: ChartBarSquareIcon },
  { name: "Reports", icon: ChartBarSquareIcon },
  { name: "Documents", icon: DocumentIcon },
  { name: "Add Emails", icon: UsersIcon },
];

const SocialLink = ({ link }) => (
  <a
    href={link.link}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center p-2 space-x-3 rounded-md hover:bg-indigo-700"
  >
    <link.icon className="w-6 h-6" />
    <span>{link.name}</span>
  </a>
);

const Sidebar = ({ user }) => {
  const auth = getAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState("Dashboard");
  const [showLogoutModal, setShowLogoutModal] = useState(false); // Modal visibility state

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      navigate("/"); // Redirect to login page after logout
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  }, [auth, navigate]);

  const renderContent = () => {
    switch (selected) {
      case "Dashboard":
        return (
          <Suspense fallback={<div>Loading Dashboard...</div>}>
            <NetworkSurveillanceDashboard />
          </Suspense>
        );
      case "Reports":
        return (
          <Suspense fallback={<div>Loading Report...</div>}>
            <Reports />
          </Suspense>
        );
      case "Documents":
        return (
          <Suspense fallback={<div>Loading Documents...</div>}>
            <ExcelUploader />
          </Suspense>
        );
      case "Add Emails":
        return (
          <Suspense fallback={<div>Loading Documents...</div>}>
            <AddEmail />
          </Suspense>
        );

      default:
        return <div>Select an option from the sidebar.</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="flex flex-col w-64 bg-indigo-600 p-4 text-white h-screen overflow-y-auto">
        <Logo />
        <nav className="space-y-2">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => setSelected(item.name)}
              className={`flex items-center p-2 space-x-3 rounded-md ${
                selected === item.name
                  ? "bg-indigo-700 font-bold border-l-[3px] border-white pl-4"
                  : "hover:bg-indigo-700"
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-lg">{item.name}</span>
            </button>
          ))}
        </nav>

        {/* Social Media Links */}
        <div className="mt-auto pt-10">
          <h2 className="mb-2 text-2xl font-bold font-poppins">RSC Mindanao</h2>

          {/* Divider Line */}
          <div className="border-t border-gray-300 my-4"></div>

          {/* Logout button triggers the modal */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center p-2 mt-4 space-x-3 rounded-md hover:bg-indigo-700"
          >
            <FaSignOutAlt className="w-6 h-6" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="flex justify-between items-center mb-6">
          <SearchBar />
          <div className="flex items-center space-x-4">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <div className="flex items-center space-x-2">
              <span>
                <p className="text-sm font-semibold">
                  {user?.email?.split("@")[0]}
                </p>
              </span>
            </div>
          </div>
        </div>
        <MainContent renderContent={renderContent} />
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ease-out animate__animated animate__fadeIn">
    <div className="bg-white p-8 rounded-lg w-1/3 max-w-md shadow-lg transform transition-all duration-500 ease-in-out animate__animated animate__zoomIn">
      <h2 className="text-2xl font-semibold text-center text-gray-900 mb-6">
        Are you sure you want to logout?
      </h2>
      <div className="flex justify-between space-x-4">
        <button
          onClick={() => setShowLogoutModal(false)} // Close the modal
          className="flex-1 px-6 py-3 text-gray-700 border border-gray-300 rounded-md transition duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          <FaTimes className="inline-block mr-2" /> Cancelssss
        </button>
        <button
          onClick={() => {
            handleLogout();
            setShowLogoutModal(false); // Close the modal and logout
          }}
          className="flex-1 px-6 py-3 bg-red-600 text-white rounded-md transition duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <FaSignOutAlt className="inline-block mr-2" /> Logout
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default Sidebar;
