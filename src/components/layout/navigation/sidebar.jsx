import React, { useState, useCallback, Suspense, lazy, memo } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import {
  FaSignOutAlt,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaUserCircle,
} from "react-icons/fa";
import {
  ChartBarSquareIcon,
  UsersIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

import MainContent from "../../../main/mainContent";
import Logo from "./logo";
import Dashboard from "../../pages/dashboard";

const componentMap = {
  // Dashboard: lazy(() => import("../../pages/dashboard")),
  "Insights": lazy(() => import("../../content/insight/InsightLayout")),
  "Upload Files": lazy(() => import("../../pages/documents")),
  "Authorized Users": lazy(() => import("../../pages/addemail")),
  // "Mean Time To Ticket": lazy(() => import("../../content/mttt")),
  // "Mean Time To Investigate": lazy(() => import("../../content/mtti")),
  // "First Touch Resolution": lazy(() => import("../../content/ftr")),
  Dashboard: lazy(() => import("../../pages/Dashboard_file")),
  // "Insights": lazy(() => import("../../content/insight/InsightContent/TicketIssuance")),
    // Dashboard: lazy(() => import("../../pages/comingSoon")),
    // "sampleUpload": lazy(() => import("../../layout/sampleUpload")),
};

const navigationItems = [
  {
    name: "Dashboard",
    icon: ChartBarSquareIcon,
    subItems: [
      { name: "Dashboard" },
      { name: "Insights" },
      // { name: "Mean Time To Ticket" },
      // { name: "Mean Time To Investigate" },
      // { name: "First Touch Resolution" },
      // { name: "sampleUpload" },
    ],
  },
  { name: "Upload Files", icon: ArrowUpTrayIcon },
  { name: "Authorized Users", icon: UsersIcon },
];

const Sidebar = ({ user }) => {
  const auth = getAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState("Dashboard");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [dropdowns, setDropdowns] = useState({});

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
        <Suspense
          fallback={
            <div className="relative h-full w-full flex flex-col items-center justify-center">
              <div className="text-gray-600 mb-10 animate-pulse">Loading {selected}....</div>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-indigo-200 overflow-hidden">
                <div className="h-full w-1/4 bg-indigo-500 animate-pulse-fast origin-left"></div>
              </div>
            </div>
          }
        >
          <SelectedComponent />
        </Suspense>
      );
    }
    return <div className="text-gray-600">Select an option from the sidebar.</div>;
  }, [selected]);

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <div className="flex flex-col w-64 bg-gradient-to-b from-blue-800 to-blue-950 p-5 text-white shadow-xl h-screen overflow-y-auto">
        <Logo />

        {/* User Info Section */}
        <div className="mt-4 mb-6 p-3 bg-blue-700 bg-opacity-50 rounded-lg flex items-center space-x-3 shadow-inner">
          <FaUserCircle className="w-8 h-8 text-blue-300" />
          <div className="flex flex-col">
            <span className="text-base font-medium text-blue-100 font-poppins">
              {user?.email?.split("@")[0]}
            </span>
            <span className="text-xs text-blue-200 opacity-80">Logged In</span>
          </div>
        </div>

        <nav className="flex-1 space-y-3">
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
                className={`flex items-center justify-between w-full py-2.5 px-4 rounded-lg transition-all duration-200 ease-in-out
                  ${
                    selected === item.name ||
                    (item.subItems &&
                      item.subItems.some((sub) => sub.name === selected))
                      ? "bg-blue-700 bg-opacity-70 font-semibold border-l-4 border-blue-300 text-blue-100 shadow-md"
                      : "hover:bg-blue-700 hover:bg-opacity-50 text-blue-200"
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-5 h-5 opacity-90" />
                  <span className="text-base">{item.name}</span>
                </div>
                {item.subItems &&
                  (dropdowns[item.name] ? (
                    <FaChevronUp className="w-3 h-3 text-blue-300" />
                  ) : (
                    <FaChevronDown className="w-3 h-3 text-blue-300" />
                  ))}
              </button>

              {item.subItems && dropdowns[item.name] && (
                <div className="ml-7 mt-1.5 space-y-1 border-l border-blue-700 pl-3">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.name}
                      onClick={() => setSelected(subItem.name)}
                      className={`block text-left w-full text-sm py-1.5 px-3 rounded-md transition-colors duration-200 ease-in-out
                        ${
                          selected === subItem.name
                            ? "bg-blue-600 font-medium text-white shadow-sm"
                            : "text-blue-200 hover:bg-blue-700 hover:bg-opacity-40"
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

        {/* Logout Button Section - Option 1: Darker blue with Red Hint */}
        <div className="mt-auto pt-7 border-t border-blue-700">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center justify-center w-full py-3 px-4 space-x-3 rounded-lg bg-blue-800 text-red-100 font-semibold transition-all duration-300 ease-in-out hover:bg-red-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-blue-800 shadow-lg"
          >
            <FaSignOutAlt className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto bg-gray-50">
        <div className="flex justify-between items-center mb-7 pb-4 border-b border-gray-200">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight capitalize font-poppins">
            {selected}
          </h1>

          {/* RSC - OMPI title with subtle gradient and tracking */}
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-extrabold font-poppins bg-gradient-to-r from-blue-600 to-blue-800 text-transparent bg-clip-text tracking-wide drop-shadow-sm">
              RSC - OMPI
            </h2>
          </div>
        </div>

        <MainContent renderContent={renderContent} />
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ease-out animate__animated animate__fadeIn">
          <div className="bg-white p-8 rounded-xl w-full max-w-md shadow-2xl transform transition-all duration-500 ease-in-out animate__animated animate__zoomIn flex flex-col items-center border border-gray-200">
            <img
              src="/sadCat.gif"
              alt="Crying Cat"
              className="w-36 h-36 object-contain mb-6"
            />
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-7">
              Are you sure you want to log out?
            </h2>
            <div className="flex justify-center space-x-4 w-full">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-6 py-3 text-gray-700 border border-gray-300 rounded-lg transition duration-200 hover:bg-gray-100 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center font-medium text-base"
              >
                <FaTimes className="inline-block mr-2 text-lg" /> Cancel
              </button>
              <button
                onClick={async () => {
                  await handleLogout();
                  setShowLogoutModal(false);
                }}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg transition duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center font-medium text-base"
              >
                <FaSignOutAlt className="inline-block mr-2 text-lg" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;