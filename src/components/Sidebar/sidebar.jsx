import React, { useState, useCallback, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { getAuth, signOut } from "firebase/auth";
import { FaSignOutAlt } from "react-icons/fa";
import {
  ChartBarSquareIcon,
  UsersIcon,
  BellAlertIcon,
  SignalIcon,
  DocumentIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";
import Alarms from "../content/alarm";
const NetworkSurveillanceDashboard = lazy(() => import("../content/dashboard"));
const Reports = lazy(() => import("../content/reports"));
const AddEmail = lazy(() => import("../content/addemail"));
const ExcelUploader = lazy(() => import("../content/documents"));
import SearchBar from "../../main/searchbar/searchbar";
import MainContent from "../../main/mainContent";
import Logo from "./navigation/logo";

const navigation = [
  { name: "Dashboard", icon: ChartBarSquareIcon },
  { name: "Reports", icon: ChartBarIcon },
  { name: "Documents", icon: DocumentIcon },
  { name: "Add Emails", icon: UsersIcon },
];

const socialLinks = [
  { name: "Facebook", icon: FaFacebook, link: "https://facebook.com" },
  { name: "Instagram", icon: FaInstagram, link: "https://instagram.com" },
  { name: "Twitter", icon: FaTwitter, link: "https://twitter.com" },
];

const NavigationItem = ({ item, selected, onClick }) => (
  <button
    onClick={() => onClick(item.name)}
    className={`flex items-center p-2 space-x-3 rounded-md ${
      selected === item.name
        ? "bg-indigo-700 font-bold border-l-[3px] border-white pl-4"
        : "hover:bg-indigo-700"
    }`}
  >
    <item.icon className="w-6 h-6" />
    <span className="text-lg">{item.name}</span>
  </button>
);

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

  // Using useCallback to memoize logout handler
  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      navigate("/"); // Redirect to login page after logout
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  }, [auth, navigate]);

  const [selected, setSelected] = useState("Dashboard");

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
            <NavigationItem
              key={item.name}
              item={item}
              selected={selected}
              onClick={setSelected}
            />
          ))}
        </nav>

        {/* Social Media Links */}
        <div className="mt-auto pt-10">
  <h2 className="mb-2 text-2xl">RSC Mindanao</h2>

  {/* Divider Line */}
  <div className="border-t border-gray-300 my-4"></div>

  <a
    href="#"
    onClick={handleLogout}
    className="flex items-center p-2 mt-4 space-x-3 rounded-md hover:bg-indigo-700"
  >
    <FaSignOutAlt className="w-6 h-6" />
    <span>Logout</span>
  </a>
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
    </div>
  );
};

export default Sidebar;
