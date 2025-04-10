// src/components/IncompleteRowsTable.js
import React from "react";

const IncompleteRowsTable = ({ hasCompleteRows, incompleteRows, setSelectedRow }) => (
  <>
    {hasCompleteRows && (
      <div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
        ✅ All required fields are complete in the uploaded Excel files.
      </div>
    )}

    {!hasCompleteRows && incompleteRows.length > 0 && (
      <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded">
        <h4 className="font-semibold mb-4 text-lg">⚠️ Incomplete Rows Found:</h4>
        <table className="min-w-full table-auto">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left">Ticket Number</th>
              <th className="px-4 py-2 text-left">Assigned To</th>
              <th className="px-4 py-2 text-left">Missing Columns</th>
            </tr>
          </thead>
          <tbody>
            {incompleteRows.map((row, idx) => (
              <tr
                key={idx}
                className="border-b cursor-pointer hover:bg-gray-100"
                onClick={() => setSelectedRow(row)}
              >
                <td className="px-4 py-2">{row.number}</td>
                <td className="px-4 py-2">
                  {row.assignedTo || "Not Assigned"}
                </td>
                <td className="px-4 py-2">
                  {row.missingColumns.length > 0
                    ? row.missingColumns.join(", ")
                    : "None"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </>
);

export default IncompleteRowsTable;
