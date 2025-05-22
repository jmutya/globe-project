import React, { useState } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { FaTicketAlt } from "react-icons/fa";

// Helper function to extract month from date
const getMonthFromDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0"); // "MM"
  const year = date.getFullYear(); // "YYYY"
  return `${month}/${year}`; // "MM/YYYY"
};

const UnmatchedRowsTable = ({
  unmatchedRows,
  onRowClick,
  individualAccuracy,
}) => {
  const [expandedRowIndex, setExpandedRowIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const toggleRow = (index, row) => {
    setExpandedRowIndex(expandedRowIndex === index ? null : index);
    onRowClick(row); // Optional callback if needed
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setExpandedRowIndex(null); // Reset expanded row on search change
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setExpandedRowIndex(null); // Reset expanded row on month change
  };

  // Filter unmatchedRows by search term and month
  const filteredRows = unmatchedRows.filter((row) => {
    const resolvedByMatch = row.resolvedBy
      ? row.resolvedBy.toLowerCase().includes(searchTerm.toLowerCase())
      : false;
    const monthMatch =
      !selectedMonth || getMonthFromDate(row.opened) === selectedMonth;
    return resolvedByMatch && monthMatch;
  });

  // Extract unique months for the dropdown
  const uniqueMonths = Array.from(
    new Set(
      unmatchedRows
        .map((row) => getMonthFromDate(row.opened))
        .filter((month) => month !== "")
    )
  );

  if (!unmatchedRows || unmatchedRows.length === 0) {
    return (
      <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg text-sm">
        ✅ All required fields are complete in the uploaded Excel files.
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-xl shadow overflow-hidden max-h-[600px] flex flex-col">
      <div className="sticky top-0 bg-white z-10 p-4 border-b space-y-3">
        <h4 className="font-semibold text-lg text-red-600 mb-4 flex items-center gap-2">
          <FaExclamationTriangle className="mr-2 text-red-600" />
          Unmatched Rows Found:
        </h4>

        {/* Search and Month Filter */}
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            placeholder="Search by Resolved By..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg focus:ring focus:ring-red-200 text-sm"
          />
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg focus:ring focus:ring-red-200 text-sm"
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
      <ul className="overflow-y-auto flex-1 p-4 space-y-4">
        {filteredRows.map((row, idx) => {
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
                        Assigned To:{" "}
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
                    <strong>Closing Accuracy:</strong>{" "}
                    {accuracy
                      ? `${accuracy.accuracy.toFixed(2)}%`
                      : "Not Available"}
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

export default UnmatchedRowsTable;
