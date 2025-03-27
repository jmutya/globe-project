import React, { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { BellIcon, CogIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import {
  ChartBarSquareIcon, // Replaced HomeIcon with this
  UsersIcon,
  BellAlertIcon,
  SignalIcon,
  DocumentIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";
import CellSitesPage from "../content/cellsites";
import Alarms from "../content/alarm";
import "leaflet/dist/leaflet.css";
import NetworkSurveillanceDashboard from "../content/dashboard";
import AddEmail from "../content/addemail";
import Reports from "../content/reports";

const navigation = [
  { name: "Dashboard", icon: ChartBarSquareIcon }, // Changed to ChartBarSquareIcon
  { name: "Reports", icon: ChartBarIcon },
  { name: "Cell sites", icon: SignalIcon },
  // { name: "Alarms", icon: BellAlertIcon },
  { name: "Documents", icon: DocumentIcon },
  { name: "Add Emails", icon: UsersIcon },
  
];

const socialLinks = [
  { name: "Facebook", icon: FaFacebook, link: "https://facebook.com" },
  { name: "Instagram", icon: FaInstagram, link: "https://instagram.com" },
  { name: "Twitter", icon: FaTwitter, link: "https://twitter.com" },
];

export default function Dashboard() {
  const [selected, setSelected] = useState("Dashboard");

  const renderContent = () => {
    switch (selected) {
      case "Dashboard":
        return <NetworkSurveillanceDashboard />;
      case "Add Emails":
        return <AddEmail />;
      case "Alarms":
        return <Alarms />;
      case "Cell sites":
        return <CellSitesPage />;
      case "Documents":
        return <div>Access your documents here.</div>;
      case "Reports":
        return <Reports/>;
      default:
        return <div>Select an option from the sidebar.</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="flex flex-col w-64 bg-indigo-600 p-4 text-white">
        <div className="flex items-center mb-6">
          <img
            alt="Your Company"
            src="/src/assets/globe-logo-name.png"
            className="h-12 w-auto filter brightness-0 invert"
          />
        </div>
        <nav className="space-y-2">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => setSelected(item.name)}
              className={`flex items-center p-2 space-x-3 rounded-md hover:bg-indigo-700 ${
                selected === item.name ? "bg-indigo-700" : ""
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xl">{item.name}</span>{" "}
              {/* Adjusted text size to 'text-xl' */}
            </button>
          ))}
        </nav>

        {/* Social Media Links */}
        <div className="mt-auto pt-4">
          <h2 className="mb-2 text-sm">Messanging Tools</h2>
          <nav className="space-y-2">
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-2 space-x-3 rounded-md hover:bg-indigo-700"
              >
                <link.icon className="w-6 h-6" />
                <span>{link.name}</span>
              </a>
            ))}
          </nav>
          <a
            href="#"
            className="flex items-center p-2 mt-4 space-x-3 rounded-md hover:bg-indigo-700"
          >
            <CogIcon className="w-6 h-6" />
            <span>Settings</span>
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="flex justify-between items-center mb-6">
          <input
            type="search"
            placeholder="Search"
            className="px-4 py-2 border rounded-md w-1/3"
          />
          <div className="flex items-center space-x-4">
            <BellIcon className="w-6 h-6 text-gray-600" />
            <Menu>
              <MenuButton className="flex items-center space-x-2">
                <UserCircleIcon className="w-8 h-8 text-gray-600" />
                <span>Jefferson</span>
              </MenuButton>
              <MenuItems className="bg-white border rounded-md shadow-lg">
                <MenuItem>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile
                  </a>
                </MenuItem>
                <MenuItem>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </a>
                </MenuItem>
                <MenuItem>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Logout
                  </a>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </div>

        <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
