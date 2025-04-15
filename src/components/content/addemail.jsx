import React, { useState, useEffect } from "react";
import { db, auth } from "../../backend/firebase/firebaseconfig";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { FaKey, FaPlus, FaTrash, FaThLarge, FaList } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AddEmail = () => {
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [emails, setEmails] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [filterRole, setFilterRole] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "authorizedUsers"));
        const emailList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEmails(emailList);
      } catch (error) {
        toast.error("Error fetching emails: " + error.message);
      } finally {
        setLoadingEmails(false);
      }
    };

    fetchEmails();
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const querySnapshot = await getDocs(collection(db, "authorizedUsers"));
          const matchedDoc = querySnapshot.docs.find(doc => doc.data().email === user.email);
          setCurrentUserRole(matchedDoc ? matchedDoc.data().role : "user");
        } catch (error) {
          console.error("Failed to fetch user role:", error);
          toast.error("Failed to fetch your role.");
        }
      }
    };

    fetchUserRole();
  }, []);

  const handleAddUser = async () => {
    if (!newEmail || !newPassword || !role) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (currentUserRole !== "admin") {
      toast.error("You do not have permission to add users.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      const docRef = await addDoc(collection(db, "authorizedUsers"), {
        email: newEmail,
        role,
        createdAt: new Date(),
      });

      setEmails([...emails, { id: docRef.id, email: newEmail, role }]);
      toast.success("User added successfully!");
      setShowModal(false);
      setNewEmail("");
      setNewPassword("");
      setRole("");
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (emailToReset, role) => {
    if (role === "admin") {
      toast.error("Cannot reset another admin’s password.");
      return;
    }
    if (currentUserRole !== "admin") {
      toast.error("You do not have permission to reset passwords.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, emailToReset);
      toast.success(`Password reset link sent to ${emailToReset}`);
    } catch (error) {
      toast.error("Error sending reset link: " + error.message);
    }
  };

  const handleDeleteUser = async (id, email, role) => {
    if (role === "admin") {
      toast.error("Cannot revoke access from another admin.");
      return;
    }

    if (currentUserRole !== "admin") {
      toast.error("You do not have permission to revoke access.");
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch("http://localhost:5000/api/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      await deleteDoc(doc(db, "authorizedUsers", id));
      setEmails(emails.filter((user) => user.id !== id));
      toast.success("User access revoked and deleted from auth.");
    } catch (error) {
      toast.error("Error revoking access: " + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEmails = emails
    .filter((user) => filterRole === "all" || user.role === filterRole)
    .filter((user) => user.email.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-6 h-[calc(100vh-100px)] flex flex-col bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-3xl font-semibold text-indigo-700">Authorized Users</h3>
        <div className="flex items-center gap-3">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="p-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>

          <input
            type="text"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md ${viewMode === "list" ? "bg-indigo-200 text-indigo-700" : "bg-white border"}`}
            title="List View"
          >
            <FaList />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md ${viewMode === "grid" ? "bg-indigo-200 text-indigo-700" : "bg-white border"}`}
            title="Grid View"
          >
            <FaThLarge />
          </button>

          <button
            onClick={() => {
              if (currentUserRole !== "admin") {
                toast.error("You do not have permission to add users.");
                return;
              }
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition"
          >
            <FaPlus /> Add User
          </button>
        </div>
      </div>

      <div className="flex-1 border border-gray-200 rounded-xl bg-white p-6 shadow-sm">
        <div className="max-h-[500px] overflow-y-auto pr-2">
          {loadingEmails ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-500">Loading emails...</p>
              </div>
            </div>
          ) : filteredEmails.length > 0 ? (
            viewMode === "list" ? (
              <>
                <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-300 text-gray-700 font-semibold text-sm px-4">
                  <div className="col-span-6">Email</div>
                  <div className="col-span-3">Role</div>
                  <div className="col-span-3 text-right">Actions</div>
                </div>

                <ul className="divide-y divide-gray-100 mt-2">
                  {filteredEmails.map((user) => (
                    <li
                      key={user.id}
                      className="grid grid-cols-12 gap-4 py-3 items-center hover:bg-indigo-50 transition rounded-lg px-4"
                    >
                      <div className="col-span-6 text-sm text-indigo-900 font-medium">{user.email}</div>
                      <div className="col-span-3 text-sm text-gray-600 capitalize">{user.role}</div>
                      <div className="col-span-3 flex justify-end gap-4">
                        <button
                          onClick={() => handlePasswordReset(user.email, user.role)}
                          className="text-indigo-600 hover:text-indigo-800"
                          title="Send Password Reset"
                        >
                          <FaKey size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email, user.role)}
                          className="text-red-500 hover:text-red-700"
                          title="Revoke Access"
                        >
                          <FaTrash size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredEmails.map((user) => (
                  <div
                    key={user.id}
                    className="border p-4 rounded-lg shadow-sm hover:shadow-md transition bg-gray-50"
                  >
                    <div className="text-indigo-800 font-semibold text-sm mb-1">{user.email}</div>
                    <div className="text-sm text-gray-600 mb-3 capitalize">Role: {user.role}</div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => handlePasswordReset(user.email, user.role)}
                        className="text-indigo-600 hover:text-indigo-800"
                        title="Send Password Reset"
                      >
                        <FaKey size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email, user.role)}
                        className="text-red-500 hover:text-red-700"
                        title="Revoke Access"
                      >
                        <FaTrash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="text-gray-500 text-center">No users found for selected role.</p>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-indigo-700 mb-4">Add New User</h3>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="password"
                placeholder="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Select Role</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>
            <div className="flex justify-end mt-6 gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={loading}
                className={`px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Adding..." : "Add User"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" />
    </div>
  );
};

export default AddEmail;
