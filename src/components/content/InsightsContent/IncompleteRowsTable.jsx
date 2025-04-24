import React, { useState } from "react";
import {
  UserCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";
import { FaTicketAlt } from "react-icons/fa";
const IncompleteRowsTable = ({
  incompleteRows,
  onRowClick,
  percentagePerAssignedPerson,
}) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleExpand = (index, row) => {
    setExpandedIndex(expandedIndex === index ? null : index);
    if (onRowClick) onRowClick(row);
  };

  if (!incompleteRows || incompleteRows.length === 0) {
    return (
      <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg text-sm">
        ✅ All required fields are complete in the uploaded Excel files.
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-y-auto max-h-[500px]">
      <h4 className="font-semibold text-lg text-yellow-600 mb-4 flex items-center gap-2">
        <ExclamationCircleIcon className="h-5 w-5" />
        Incomplete Data - Requires Attention
      </h4>
      <ul className="space-y-4">
        {incompleteRows.map((row, idx) => {
          const percentage = percentagePerAssignedPerson?.[row.assignedTo];
          return (
            <li
              key={idx}
              className="bg-yellow-50 border-l-4 border-yellow-400 shadow rounded-lg p-4 hover:bg-yellow-100 transition-all duration-150 cursor-pointer"
              onClick={() => toggleExpand(idx, row)}
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center bg-yellow-500 p-2 rounded-full">
                  <FaTicketAlt className="h-10 w-10 text-white" />
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-md font-bold text-gray-800">
                        Ticket #{row.number}
                      </p>
                      <p className="text-sm text-gray-600">
                        Assigned to:{" "}
                        <span className="font-semibold text-gray-800">
                          {row.assignedTo || (
                            <span className="text-red-600">Not Assigned</span>
                          )}
                        </span>
                      </p>
                    </div>
                    <div>
                      {expandedIndex === idx ? (
                        <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  {row.missingColumns.length > 0 && (
                    <p className="mt-1 text-sm text-yellow-700 font-medium">
                      Missing Fields:{" "}
                      <span className="font-normal">
                        {row.missingColumns.join(", ")}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Dropdown detail */}
              {expandedIndex === idx && (
                <div className="mt-3 bg-white border border-yellow-200 p-4 rounded-md shadow-sm text-sm text-gray-700">
                  <p>
                    <strong>Ticket Number:</strong> {row.number}
                  </p>
                  <p>
                    <strong>Assigned To:</strong>{" "}
                    {row.assignedTo || "Not Assigned"}
                  </p>
                  <p>
                    <strong>Missing Columns:</strong>{" "}
                    {row.missingColumns.join(", ")}
                  </p>
                  <p>
                    <strong>Accuracy Percentage:</strong>{" "}
                    {percentage != null
                      ? `${percentage.percentage.toFixed(2)}%`
                      : "N/A"}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default IncompleteRowsTable;
