// src/components/UnmatchedRowsTable.js
import React from "react";

const UnmatchedRowsTable = ({ unmatchedRows }) => (
  <div>
    {unmatchedRows.length > 0 && (
      <div className="mt-6 p-4 bg-red-100 rounded">
        <h3 className="font-semibold text-lg mb-4 text-red-800">
          ⚠️ Unmatched Rows Found:
        </h3>
        <table className="min-w-full table-auto">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left">Ticket Number</th>
              <th className="px-4 py-2 text-left">Cause</th>
              <th className="px-4 py-2 text-left">Reason for Outage</th>
              <th className="px-4 py-2 text-left">Resolved By</th>
            </tr>
          </thead>
          <tbody>
            {unmatchedRows.map((row, idx) => (
              <tr key={idx} className="border-b">
                <td className="px-4 py-2">{row.number}</td>
                <td className="px-4 py-2">{row.cause || "Empty"}</td>
                <td className="px-4 py-2">{row.reason || "Empty"}</td>
                <td className="px-4 py-2">
                  {row.resolvedBy || "Unassigned"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default UnmatchedRowsTable;
