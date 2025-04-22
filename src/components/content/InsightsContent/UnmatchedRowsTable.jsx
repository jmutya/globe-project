import React, { useState } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { FaTicketAlt } from "react-icons/fa";

const UnmatchedRowsTable = ({
  unmatchedRows,
  onRowClick,
  individualAccuracy,
}) => {
  const [expandedRowIndex, setExpandedRowIndex] = useState(null);

  const toggleRow = (index, row) => {
    setExpandedRowIndex(expandedRowIndex === index ? null : index);
    onRowClick(row); // Optional callback if needed
  };

  if (!unmatchedRows || unmatchedRows.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 ">
      <h4 className="font-semibold text-lg text-red-600 mb-4 flex items-center gap-2">
        <FaExclamationTriangle className="mr-2 text-red-600" />
        Unmatched Rows Found:
      </h4>
      <ul className="space-y-4">
        {unmatchedRows.map((row, idx) => {
          const accuracy = individualAccuracy?.[row.resolvedBy];
          return (
            <li
              key={idx}
              className="bg-red-50 border-l-4 border-red-400 shadow rounded-lg p-4 hover:bg-red-100 transition-all duration-150 cursor-pointer"
              onClick={() => toggleRow(idx, row)}
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center bg-red-500 p-2 rounded-full">
                  <FaTicketAlt className="h-10 w-10 text-white" />
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-md font-bold text-gray-800">
                        Ticket #{row.number}
                      </p>
                      <p className="text-sm text-gray-600">
                        Resolved By:{" "}
                        <span className="font-semibold text-gray-800">
                          {row.resolvedBy || (
                            <span className="text-red-600">Not Assigned</span>
                          )}
                        </span>
                      </p>
                    </div>
                    <div>
                      {expandedRowIndex === idx ? (
                        <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded content for the row */}
              {expandedRowIndex === idx && (
                <div className="mt-3 bg-white border border-red-200 p-4 rounded-md shadow-sm text-sm text-gray-700">
                  <p>
                    <strong>Ticket Number:</strong> {row.number}
                  </p>
                  <p>
                    <strong>Cause:</strong> {row.cause || "Empty"}
                  </p>
                  <p>
                    <strong>Reason for Outage:</strong> {row.reason || "Empty"}
                  </p>
                  <p>
                    <strong>Clossing Accuracy:</strong>{" "}
                    {accuracy ? `${accuracy}%` : "Not Available"}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* <table className="min-w-full table-auto">
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
                      <div>
                        <strong>Resolved By:</strong>{" "}
                        {row.resolvedBy || "Unassigned"}
                      </div>
                      <div>
                        <strong>Cause:</strong> {row.cause || "Empty"}
                      </div>
                      <div>
                        <strong>Reason for Outage:</strong>{" "}
                        {row.reason || "Empty"}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table> */}
    </div>
  );
};

export default UnmatchedRowsTable;
