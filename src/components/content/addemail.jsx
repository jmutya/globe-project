import React, { useState, useEffect } from "react";
import { db, auth } from "../../backend/firebase/firebaseconfig";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { FaKey, FaPlus, FaTrash } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AddEmail = () => {
  const [emails, setEmails] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

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

  const handleAddUser = async () => {
    if (!newEmail || !newPassword || !role) {
      toast.error("Please fill in all fields.");
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
        role: role,
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

  const handlePasswordReset = async (emailToReset) => {
    try {
      await sendPasswordResetEmail(auth, emailToReset);
      toast.success(`Password reset link sent to ${emailToReset}`);
    } catch (error) {
      toast.error("Error sending reset link: " + error.message);
    }
  };

  const handleDeleteUser = async (id, email) => {
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

  return (
    <div className="p-6 h-[calc(100vh-100px)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-3xl font-semibold text-indigo-700">Authorized Users</h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition"
        >
          <FaPlus /> Add User
        </button>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl bg-white p-6 shadow-sm">
        {loadingEmails ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin h-8 w-8 border-t-2 border-indigo-500 rounded-full mb-4" />
            <p className="text-gray-500">Loading emails...</p>
          </div>
        ) : emails.length > 0 ? (
          <div>
            {/* List Header */}
            <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-300 text-gray-600 text-sm font-medium">
              <div className="col-span-5">Email</div>
              <div className="col-span-3">Role</div>
              <div className="col-span-4 text-center">Actions</div>
            </div>

            {/* List Items */}
            <ul className="divide-y divide-gray-100 mt-2">
              {emails.map((user) => (
                <li
                  key={user.id}
                  className="grid grid-cols-12 gap-4 py-4 items-center hover:bg-indigo-50 transition rounded-lg px-2"
                >
                  <div className="col-span-5 text-indigo-800">{user.email}</div>
                  <div className="col-span-3 text-gray-600 capitalize">{user.role}</div>
                  <div className="col-span-4 flex justify-center gap-4">
                    {deletingId === user.id ? (
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <button
                          onClick={() => handlePasswordReset(user.email)}
                          className="text-indigo-600 hover:text-indigo-800"
                          title="Send Password Reset"
                        >
                          <FaKey size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="text-red-500 hover:text-red-700"
                          title="Revoke Access"
                        >
                          <FaTrash size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-gray-500 text-center">No users added yet.</p>
        )}
      </div>

      {/* Modal */}
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
