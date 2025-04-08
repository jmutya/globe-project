import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./userauth/AuthContext"; // Use global authentication context
import Login from "./userauth/login";
import Sidebar from "./components/Sidebar/sidebar";
import AddEmail from "./components/content/addemail";
import ProtectedRoute from "./userauth/protectedroute";
import CellSitesTopology from "./components/content/cellsites";
import AlarmLegends from "./components/content/alarm";
import ExcelUploader from "./components/content/documents";
import { FaSpinner } from "react-icons/fa";

function App() {
  const { user, loading } = useAuth(); // Get authentication state

  if (loading) {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
        <div className="p-5 rounded-lg bg-white shadow-lg flex items-center gap-2">
          <FaSpinner className="animate-spin text-xl text-blue-500" />
          <p className="text-gray-700">Loading, please wait...</p>
        </div>
      </div>
    );
  }
  

  return (
    <Router>
      <Routes>
        {/* Redirect logged-in users to dashboard */}
        <Route path="/" element={user ? <Navigate to="/sidebar" /> : <Login />} />

        {/* Protected Routes */}
        <Route path="/sidebar" element={<ProtectedRoute><Sidebar user={user} /></ProtectedRoute>} />

        <Route path="/addemail" element={<ProtectedRoute><AddEmail /></ProtectedRoute>} />
        {/* <Route path="/cellsites" element={<ProtectedRoute><CellSitesTopology /></ProtectedRoute>} /> */}
        <Route path="/reports" element={<ProtectedRoute><AlarmLegends /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><ExcelUploader /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
