import './index.css'; // Or './App.css'
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./userauth/AuthContext"; // Use global authentication context
import Login from "./userauth/login";
import Sidebar from "./components/layout/navigation/sidebar";
import AddEmail from "./components/pages/addemail";
import ProtectedRoute from "./userauth/protectedroute";

import ExcelUploader from "./components/pages/documents";
import { FaSpinner } from "react-icons/fa";

function App() {
  const { user, loading } = useAuth(); // Get authentication state
  if (loading) {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-white z-50">
        <div className="flex flex-col items-center space-y-4">
          {/* Spinner */}
          <div className="w-8 h-8 border-4 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
          
          {/* Message */}
          <p className="text-gray-600 font-medium text-sm">
            Loading, please wait...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <Router>
      <Routes>
        {/* Redirect logged-in users to dashboard */}
        <Route
          path="/"
          element={user ? <Navigate to="/sidebar" /> : <Login />}
        />

        {/* Protected Routes */}
        <Route
          path="/sidebar"
          element={
            <ProtectedRoute>
              <Sidebar user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/addemail"
          element={
            <ProtectedRoute>
              <AddEmail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <ExcelUploader />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
