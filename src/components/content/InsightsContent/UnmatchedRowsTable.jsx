import React, { useState } from "react";
import { FaExclamationTriangle } from "react-icons/fa";

const UnmatchedRowsTable = ({ unmatchedRows, onRowClick,percentagePerAssignedPerson }) => {
  const [expandedRowIndex, setExpandedRowIndex] = useState(null);

  const toggleRow = (index, row) => {
    setExpandedRowIndex(expandedRowIndex === index ? null : index);
    onRowClick(row); // Optional callback if needed
  };

  if (!unmatchedRows || unmatchedRows.length === 0) {
    return null;
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
          </tr>
        </thead>
        <tbody>
          
          {unmatchedRows.map((row, idx) => (
            
            <React.Fragment key={idx}>
              <tr
                className="border-b cursor-pointer hover:bg-red-100 transition-colors duration-300"
                onClick={() => toggleRow(idx, row)}
                
                
              >
                  
                
                <td className="px-4 py-2 font-semibold text-red-800">
                  🎫 {row.number}
                  
                </td>
              </tr>
              {expandedRowIndex === idx && (
                <tr className="bg-red-100">
                  <td className="px-6 py-3" colSpan="4">
                    <div className="text-sm space-y-1">
                      <div><strong>Resolved By:</strong> {row.resolvedBy || "Unassigned"}</div>
                      <div><strong>Cause:</strong> {row.cause || "Empty"}</div>
                      <div><strong>Reason for Outage:</strong> {row.reason || "Empty"}</div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UnmatchedRowsTable;
