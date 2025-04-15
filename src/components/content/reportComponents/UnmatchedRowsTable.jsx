import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";

const UnmatchedRowsTable = ({ unmatchedRows, onRowClick }) => {
  if (!unmatchedRows || unmatchedRows.length === 0) {
    return null; // Or a message if you prefer
  }

  return (
    <div className="mt-6 p-4 bg-red-50 rounded-lg shadow-md max-h-90 overflow-y-auto">
      <h3 className="font-semibold text-lg mb-4 text-red-800 flex items-center">
        <FaExclamationTriangle className="mr-2 text-red-600" />
        ⚠️ Unmatched Rows Found:
      </h3>
      <table className="min-w-full table-auto">
        <thead>
          <tr className="border-b bg-red-200 text-red-800">
            <th className="px-4 py-2 text-left font-medium">Ticket Number</th>
            <th className="px-4 py-2 text-left font-medium">Resolved By</th>
            <th className="px-4 py-2 text-left font-medium">Cause</th>
            <th className="px-4 py-2 text-left font-medium">Reason for Outage</th>
          </tr>
        </thead>
        <tbody>
          {unmatchedRows.map((row, idx) => (
            <tr
              key={idx}
              className="border-b cursor-pointer hover:bg-red-100 transition-colors duration-300"
              onClick={() => onRowClick(row)}
            >
              <td className="px-4 py-2">{row.number}</td>
              <td className="px-4 py-2">{row.resolvedBy || "Unassigned"}</td>
              <td className="px-4 py-2">{row.cause || "Empty"}</td>
              <td className="px-4 py-2">{row.reason || "Empty"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UnmatchedRowsTable;
