// src/components/tables/UnmatchedRowsTable.js
import React from "react";

const UnmatchedRowsTable = ({ unmatchedRows, onRowClick }) => {
  if (!unmatchedRows || unmatchedRows.length === 0) {
    return null; // Or a message if you prefer
  }

  return (
    <div className="mt-6 p-4 bg-red-100 rounded overflow-y-auto max-h-90">
      <h3 className="font-semibold text-lg mb-4 text-red-800">
        ⚠️ Unmatched Rows Found:
      </h3>
      <table className="min-w-full table-auto">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2 text-left">Ticket Number</th>
            <th className="px-4 py-2 text-left">Resolved By</th>
            <th className="px-4 py-2 text-left">Cause</th>
            <th className="px-4 py-2 text-left">Reason for Outage</th>
          </tr>
        </thead>
        <tbody>
          {unmatchedRows.map((row, idx) => (
            <tr
              key={idx}
              className="border-b cursor-pointer hover:bg-gray-100"
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