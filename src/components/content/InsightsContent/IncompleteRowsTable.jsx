import React, { useState } from "react";
import {
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const toggleExpand = (index, row) => {
    setExpandedIndex(expandedIndex === index ? null : index);
    if (onRowClick) onRowClick(row);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setExpandedIndex(null);
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setExpandedIndex(null);
  };

  // Helper: Extract month from row date
  const getMonthFromDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const month = date.getMonth() + 1; // JavaScript months are 0-based, so add 1
    const year = date.getFullYear();
    return `${month < 10 ? "0" : ""}${month}/${year}`; // Format as "MM/YYYY"
  };
  

  const filteredRows = incompleteRows.filter((row) => {
    const assignedToMatch = (row.assignedTo || "Not Assigned")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const monthMatch =
      !selectedMonth || getMonthFromDate(row.opened) === selectedMonth;
    return assignedToMatch && monthMatch;
  });

  // Extract unique months from data for month dropdown
  const uniqueMonths = Array.from(
    new Set(
      incompleteRows
        .map((row) => getMonthFromDate(row.opened))
        .filter((month) => month !== "")
    )
  );

  if (!incompleteRows || incompleteRows.length === 0) {
    return (
      <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg text-sm">
        ✅ All required fields are complete in the uploaded Excel files.
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-xl shadow overflow-hidden max-h-[600px] flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white z-10 p-4 border-b space-y-3">
        <h4 className="font-semibold text-lg text-yellow-600 flex items-center gap-2">
          <ExclamationCircleIcon className="h-5 w-5" />
          Incomplete Data - Requires Attention
        </h4>

        {/* Search + Month Filter */}
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            placeholder="Search by assigned person's name..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg focus:ring focus:ring-yellow-200 text-sm"
          />
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg focus:ring focus:ring-yellow-200 text-sm"
          >
            <option value="">Filter by Month</option>
            {uniqueMonths.map((month, idx) => (
              <option key={idx} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="overflow-y-auto flex-1 p-4 space-y-4">
        {filteredRows.length > 0 ? (
          filteredRows.map((row, idx) => {
            const percentage = percentagePerAssignedPerson?.[row.assignedTo];
            return (
              <div
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
              </div>
            );
          })
        ) : (
          <div className="text-sm text-gray-500">
            No results found for "{searchTerm}" and selected month.
          </div>
        )}
      </div>
    </div>
  );
};

export default IncompleteRowsTable;
