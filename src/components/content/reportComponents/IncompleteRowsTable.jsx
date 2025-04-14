// src/components/tables/IncompleteRowsTable.js
import React from "react";
import { UserCircleIcon } from "@heroicons/react/24/solid"; // Or any other user icon

const IncompleteRowsTable = ({ incompleteRows, onRowClick }) => {
  if (!incompleteRows || incompleteRows.length === 0) {
    return (
      <div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
        ✅ All required fields are complete in the uploaded Excel files.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h4 className="font-semibold mb-4 text-lg">
        ⚠️ Incomplete Rows Found:
      </h4>
      <ul className="space-y-4">
        {incompleteRows.map((row, idx) => (
          <li
            key={idx}
            className="bg-white shadow rounded-md p-4 cursor-pointer hover:bg-gray-50"
            onClick={() => onRowClick(row)}
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <UserCircleIcon className="h-8 w-8 text-gray-400" /> {/* Placeholder for user icon */}
              </div>
              <div className="flex-grow">
                <div className="font-semibold">{row.number}</div>
                <div className="text-sm text-gray-500">
                  Assigned to: {row.assignedTo || "Not Assigned"}
                </div>
                {row.missingColumns.length > 0 && (
                  <div className="text-sm text-red-500">
                    Missing: {row.missingColumns.join(", ")}
                  </div>
                )}
              </div>
              <div className="ml-auto">
                <button
                  className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click when button is clicked
                    // You can add specific action for viewing details here
                    console.log("View details for:", row);
                  }}
                >
                  View
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default IncompleteRowsTable;