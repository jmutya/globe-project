import React, { useState, useEffect } from "react";
import { db, auth } from "../../backend/firebase/firebaseconfig";
import { auth2, db2 } from "../../backend/firebase/addingNewUserConfig";
import { handleDeleteUser } from "../../backend/firebase/deleteUsers";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

import {
  FaKey,
  FaPlus,
  FaEdit,
  FaThLarge,
  FaList,
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaSortAmountDown,
} from "react-icons/fa";

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
  const [status, setStatus] = useState(""); // Added this line
  const [loading, setLoading] = useState(false);
  const [filterRole, setFilterRole] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("recent");
  const [editModalData, setEditModalData] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const querySnapshot = await getDocs(
            collection(db, "authorizedUsers")
          );
          const matchedDoc = querySnapshot.docs.find(
            (doc) => doc.data().email === firebaseUser.email
          );
          setCurrentUserRole(matchedDoc ? matchedDoc.data().role : "user");
        } catch (error) {
          console.error("Failed to fetch user role:", error);
          toast.error("Failed to fetch your role.");
        }
      }
    });

    return () => unsubscribe();
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
      const userCredential = await createUserWithEmailAndPassword(
        auth2,
        newEmail,
        newPassword
      );
      const user = userCredential.user;

      const docRef = await addDoc(collection(db2, "authorizedUsers"), {
        email: newEmail,
        role,
        status: status || "active",
        createdAt: new Date(),
        uid: user.uid,
      });

      setEmails([...emails, { id: docRef.id, email: newEmail, role, status }]);
      toast.success("User added successfully!");
      setShowModal(false);
      setNewEmail("");
      setNewPassword("");
      setRole("");
      setStatus("");
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

  const toggleSort = () => {
    if (sortOption === "az") {
      setSortOption("za");
    } else if (sortOption === "za") {
      setSortOption("az");
    } else {
      setSortOption("az");
    }
  };

  const filteredEmails = emails
    .filter((user) => filterRole === "all" || user.role === filterRole)
    .filter((user) => !status || user.status === status)
    .filter((user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "recent") {
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      } else if (sortOption === "az") {
        return a.email.localeCompare(b.email);
      } else if (sortOption === "za") {
        return b.email.localeCompare(a.email);
      }
      return 0;
    });

  const getSortIcon = () => (
    <button
      onClick={toggleSort}
      className="ml-2 text-gray-600 hover:text-indigo-600"
      title="Toggle Sort"
    >
      {sortOption === "az" && <FaSortAlphaDown className="text-sm" />}
      {sortOption === "za" && <FaSortAlphaUp className="text-sm" />}
      {sortOption === "recent" && <FaSortAmountDown className="text-sm" />}
    </button>
  );

  const handleUpdateUser = async (userId, updates) => {
    try {
      const userRef = doc(db2, "authorizedUsers", userId);
      await updateDoc(userRef, updates);
      toast.success("User updated successfully!");
    } catch (error) {
      toast.error("Failed to update user: " + error.message);
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-100px)] flex flex-col bg-gray-50">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2 mr-6">
          <button
            onClick={() => setStatus("")}
            className={`px-4 py-2 border rounded-md text-sm ${
              status === ""
                ? "bg-indigo-100 text-indigo-700 font-medium"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatus("active")}
            className={`px-4 py-2 border rounded-md text-sm ${
              status === "active"
                ? "bg-indigo-100 text-indigo-700 font-medium"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatus("inactive")}
            className={`px-4 py-2 border rounded-md text-sm ${
              status === "inactive"
                ? "bg-indigo-100 text-indigo-700 font-medium"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Inactive
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
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
            className={`p-2 rounded-md ${
              viewMode === "list"
                ? "bg-indigo-200 text-indigo-700"
                : "bg-white border"
            }`}
            title="List View"
          >
            <FaList />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md ${
              viewMode === "grid"
                ? "bg-indigo-200 text-indigo-700"
                : "bg-white border"
            }`}
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
                {/* Header with specification */}
                <div className="grid grid-cols-10 gap-4 pb-3 border-b border-gray-300 text-gray-700 font-semibold text-sm px-4">
                  <div className="col-span-5">Email {getSortIcon()}</div>
                  <div className="col-span-2">Role</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>
                <ul className="divide-y divide-gray-100 mt-2">
                  {filteredEmails.map((user) => (
                    <li
                      key={user.id}
                      className="grid grid-cols-10 gap-4 py-3 items-center hover:bg-indigo-50 transition rounded-lg px-4"
                    >
                      <div className="col-span-5 text-sm text-indigo-900 font-medium">
                        {user.email}
                      </div>
                      <div className="col-span-2 text-sm text-gray-600 capitalize">
                        {user.role}
                      </div>
                      <div className="col-span-2 text-sm capitalize">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === "inactive"
                              ? "bg-gray-200 text-gray-600"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {user.status || "active"}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-end gap-4">
                        <button
                          onClick={() =>
                            handlePasswordReset(user.email, user.role)
                          }
                          className="text-indigo-600 hover:text-indigo-800"
                          title="Send Password Reset"
                        >
                          <FaKey size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (currentUserRole !== "admin") {
                              toast.error("You do not have permission to reset passwords.");
                              return;
                            }
                            setEditModalData(user) ||
                            setEditRole(user.role) ||
                            setEditStatus(user.status || "active")
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit User"
                        >
                          <FaEdit size={16} />
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
                    <div className="text-indigo-800 font-semibold text-sm mb-1">
                      {user.email}
                    </div>
                    <div className="text-sm text-gray-600 mb-3 capitalize">
                      Role: {user.role}
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() =>
                          handlePasswordReset(user.email, user.role)
                        }
                        className="text-indigo-600 hover:text-indigo-800"
                        title="Send Password Reset"
                      >
                        <FaKey size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (currentUserRole !== "admin") {
                            toast.error("You do not have permission to reset passwords.");
                            return;
                          }
                          setEditModalData(user) ||
                          setEditRole(user.role) ||
                          setEditStatus(user.status || "active")
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit User"
                      >
                        <FaEdit size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="text-gray-500 text-center">
              No users found for selected role.
            </p>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-indigo-700 mb-4">
              Add New User
            </h3>
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
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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

      {editModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-indigo-700 mb-4">
              Edit User – {editModalData.email}
            </h3>
            <div className="space-y-4">
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex justify-end mt-6 gap-3">
              <button
                onClick={() => setEditModalData(null)}
                className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (currentUserRole !== "admin") {
                    toast.error("Only admins can update user data.");
                    return;
                  }

                  try {
                    await handleUpdateUser(editModalData.id, {
                      role: editRole,
                      status: editStatus,
                    });

                    setEmails((prev) =>
                      prev.map((u) =>
                        u.id === editModalData.id
                          ? { ...u, role: editRole, status: editStatus }
                          : u
                      )
                    );
                    setEditModalData(null);
                  } catch (error) {
                    toast.error("Failed to update user: " + error.message);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Save Changes
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