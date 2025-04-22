import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./navigation/sidebar"; // Make sure the path is correct.
import { useAuth } from "../../userauth/AuthContext"; // For getting user data if needed.

const WebsiteLayout = () => {
  const { user } = useAuth(); // Fetch user details from context.

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar stays fixed */}
      <Sidebar user={user} />

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Render nested routes based on route match */}
        <Outlet />
      </div>
    </div>
  );
};

export default WebsiteLayout;
