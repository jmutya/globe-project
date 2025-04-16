import React, { useState, useCallback, Suspense, lazy, memo } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import {
  FaSignOutAlt,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa"; // ⬅️ Add these icons
import {
  ChartBarSquareIcon,
  UsersIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";

import MainContent from "../../main/mainContent";
import Logo from "./navigation/logo";

// ⬇️ Add subcomponents to the component map
const componentMap = {
  Dashboard: lazy(() => import("../content/dashboard")),
  Reports: lazy(() => import("../content/reports")),
  Documents: lazy(() => import("../content/documents")),
  Users: lazy(() => import("../content/addemail")),
  Summary: lazy(() => import("../content/summary")),
  "Mean Time To Ticket": lazy(() => import("../content/mttt")),
  Accuracy: lazy(() => import("../content/accuracy")),
};

const navigationItems = [
  {
    name: "Dashboard",
    icon: ChartBarSquareIcon,
    subItems: [
      { name: "Dashboard" }, // 👈 include itself here
      { name: "Reports" },
      { name: "Summary" },
      { name: "Mean Time To Ticket" },
      { name: "Accuracy" },
    ],
  },
  { name: "Documents", icon: DocumentIcon },
  { name: "Users", icon: UsersIcon },
];

const SocialLink = memo(({ link }) => (
  <a
    href={link.link}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center p-2 space-x-3 rounded-md hover:bg-indigo-700"
  >
    <link.icon className="w-6 h-6" />
    <span>{link.name}</span>
  </a>
));

const Sidebar = ({ user }) => {
  const auth = getAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState("Dashboard");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [dropdowns, setDropdowns] = useState({}); // ✅ Dropdown state

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  }, [auth, navigate]);

  const renderContent = useCallback(() => {
    const SelectedComponent = componentMap[selected];
    if (SelectedComponent) {
      return (
        <Suspense fallback={<div>Loading {selected}....</div>}>
          <SelectedComponent />
        </Suspense>
      );
    }
    return <div>Select an option from the sidebar.</div>;
  }, [selected]);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="flex flex-col w-64 bg-indigo-600 p-4 text-white h-screen overflow-y-auto">
        <Logo />
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <div key={item.name}>
              <button
                onClick={() => {
                  if (item.subItems) {
                    setDropdowns((prev) => ({
                      ...prev,
                      [item.name]: !prev[item.name],
                    }));
                  } else {
                    setSelected(item.name);
                  }
                }}
                className={`flex items-center justify-between w-full p-2 space-x-3 rounded-md ${
                  selected === item.name
                    ? "bg-indigo-700 font-bold border-l-[3px] border-white pl-4"
                    : "hover:bg-indigo-700"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-6 h-6" />
                  <span className="text-lg">{item.name}</span>
                </div>
                {item.subItems &&
                  (dropdowns[item.name] ? (
                    <FaChevronUp className="w-4 h-4" />
                  ) : (
                    <FaChevronDown className="w-4 h-4" />
                  ))}
              </button>

              {/* ✅ Dropdown subItems under Dashboard */}
              {item.subItems && dropdowns[item.name] && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.name}
                      onClick={() => setSelected(subItem.name)}
                      className={`block text-left w-full text-sm text-white px-3 py-1 rounded-md ${
                        selected === subItem.name
                          ? "bg-indigo-500"
                          : "hover:bg-indigo-600"
                      }`}
                    >
                      {subItem.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Social Media Links */}
        <div className="mt-auto pt-10">
          <h2 className="mb-2 text-2xl font-bold font-poppins">RSC Mindanao</h2>
          <div className="border-t border-gray-300 my-4"></div>
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
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight capitalize font-poppins">
            {selected}
          </h1>

          <div className="flex items-center space-x-4">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <div className="flex items-center space-x-2">
              <span>
                <p className="text-sm font-medium text-gray-700 font-poppins">
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
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-6 py-3 text-gray-700 border border-gray-300 rounded-md transition duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <FaTimes className="inline-block mr-2" /> Cancel
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setShowLogoutModal(false);
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
