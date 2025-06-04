import "./index.css"; // Or './App.css'
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
  const { user, loading } = useAuth();
   // Get authentication state
  if (loading) {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-white z-50">
      <div className="relative w-64 h-40 overflow-hidden mx-auto">

        {/* Running Dino across screen */}
        <img
         src="/DinosaursGIF.gif"
          alt="Running Dino"
          className="absolute top-4 left-1/2 transform -translate-x-2/4 h-20 animate-runner"
          style={{ visibility: 'hidden' }}
          onLoad={(e) => e.target.style.visibility = 'visible'}
        />
    
        {/* Message */}
        <div className="absolute bottom-2 w-full text-center">
          <p className="text-gray-600 font-medium text-sm">
            Loading... Dino dodging obstacles!
          </p>
        </div>
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
              <AddEmail user={user} />
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
