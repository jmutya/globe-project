import React, { useState } from "react";

const AddEmail = () => {
  const [email, setEmail] = useState("");
  const [emails, setEmails] = useState([
    "john@example.com",
    "jane@example.com",
    "alice@example.com",
    "bob@example.com",
    "charlie@example.com",
  ]);

  const handleAddEmail = () => {
    if (email && !emails.includes(email)) {
      setEmails((prevEmails) => [...prevEmails, email]);
      setEmail("");
    }
  };

  const handleInputChange = (e) => {
    setEmail(e.target.value);
  };

  const handleDeleteEmail = (index) => {
    setEmails((prevEmails) => prevEmails.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg mx-auto flex gap-8 w-full h-[80vh] max-w-full">
      {/* Add Email Section - Left */}
      <div className="flex-1 p-8 border-2 border-indigo-300 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 flex flex-col justify-center relative shadow-md">
        <div className="absolute top-0 right-0 m-2 p-2 rounded-full bg-indigo-100 text-indigo-700 shadow">
          ✉️
        </div>
        <h3 className="text-2xl font-bold mb-6 text-indigo-800">Add New User Email</h3>
        <p className="mb-4 text-gray-600">Quickly add an email address to the list of users:</p>
        <div className="flex items-center gap-4">
          <input
            type="email"
            value={email}
            onChange={handleInputChange}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm"
            placeholder="Enter email address"
          />
          <button
            onClick={handleAddEmail}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold shadow-md hover:shadow-lg"
          >
            Add
          </button>
        </div>
      </div>

      {/* Added Emails Section - Right */}
      <div className="flex-1 p-6 border-2 border-gray-300 rounded-lg bg-gray-50 overflow-auto shadow-md">
        <h3 className="text-2xl font-semibold mb-4 text-indigo-700">Added Emails:</h3>
        {emails.length > 0 ? (
          <ul className="space-y-3">
            {emails.map((email, index) => (
              <li
                key={index}
                className="flex justify-between items-center p-3 border border-gray-300 rounded-lg bg-white shadow-sm hover:shadow-md transition"
              >
                <span className="text-gray-800">{email}</span>
                <button
                  onClick={() => handleDeleteEmail(index)}
                  className="text-red-500 hover:text-red-700 transition font-semibold"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No emails added yet.</p>
        )}
      </div>
    </div>
  );
};

export default AddEmail;
