import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Login from "./userauth/login";
import Sidebar from "./components/Sidebar/sidebar";
import AddEmail from "./components/content/addemail";
import ProtectedRoute from "./userauth/protectedroute"; // Import the protected route
import CellSitesTopology from "./components/content/cellsites";
import AlarmLegends from "./components/content/alarm";
import ExcelUploader from "./components/content/documents";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Prevents flickering

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false); // Set loading to false when authentication is determined
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <p>Loading...</p>; // Placeholder while checking authentication
  }

  return (
    <Router>
  <Routes>
    {/* Redirect logged-in users to dashboard */}
    <Route path="/" element={user ? <Navigate to="/sidebar" /> : <Login />} />

    {/* Protected Routes */}
    <Route path="/sidebar" element={<ProtectedRoute><Sidebar /></ProtectedRoute>} />
    <Route path="/addemail" element={<ProtectedRoute><AddEmail /></ProtectedRoute>} />
    <Route path="/cellsites" element={<ProtectedRoute><CellSitesTopology /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute>< AlarmLegends/></ProtectedRoute>} />
    <Route path="/documents" element={<ProtectedRoute><ExcelUploader /></ProtectedRoute>} />

  </Routes>
</Router>

  );
}

export default App;
