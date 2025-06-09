// src/components/ClosingAccuracy/ClosingAccuracy.jsx

import React, { useEffect, useState } from "react";
import {
  ExclamationCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid";
import { ArrowUp, ArrowDown, FileText } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

import AccuracyProgress from "../../InsightsContent/AccuracyProgress";
import {
  fetchAndProcessExcelData,
  formatDateTimeFromISO,
  calculateAccuracy,
} from "../../../../backend/insightfunctions/clossingaccuracyfunctions"; // <-- import the service

// Local helper: Format Excel serial to "YYYY/MM/DD"
const formatOpenedDate = (value) => {
  if (!value) return "";
  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }
  return value;
};

// Local helper: "YYYY/MM/DD" → "MM/YYYY"
const getMonthFromDate = (dateStr) => {
  if (!dateStr || dateStr === "Invalid Date") return "Invalid Date";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Invalid Date";
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${month < 10 ? "0" : ""}${month}/${year}`;
};

// Local helper: convert ISO string → "MM/DD/YYYY HH:MM AM/PM"
const formatDateTimeFromISO_Local = (isoDateString) => {
  if (!isoDateString) return "N/A";
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yyyy = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;
    const hours12 = String(hours).padStart(2, "0");

    return `${mm}/${dd}/${yyyy} ${hours12}:${minutes} ${ampm}`;
  } catch (error) {
    console.error(
      "Error formatting ISO date string for display:",
      isoDateString,
      error
    );
    return "Invalid Date";
  }
};

function ClosingAccuracy() {
  const [unmatchedRows, setUnmatchedRows] = useState([]);
  const [allProcessedRows, setAllProcessedRows] = useState([]);
  const [ticketOpenedMonthOptions, setTicketOpenedMonthOptions] = useState([]);
  // Renamed for clarity: now it holds filenames
  const [uploadedFileOptions, setUploadedFileOptions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  // Renamed to reflect it's for selected file
  const [selectedFile, setSelectedFile] = useState("");
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc");

  // 1) Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      setError(null);
      try {
        const {
          unmatchedRows: fetchedUnmatched,
          allProcessedRows: fetchedAllProcessed,
          ticketOpenedMonthOptions: fetchedTicketMonths,
          // Renamed here to match the new return from the backend function
          uploadedFileOptions: fetchedFileNames, // This now receives filenames
        } = await fetchAndProcessExcelData();

        setUnmatchedRows(fetchedUnmatched);
        setAllProcessedRows(fetchedAllProcessed);
        setTicketOpenedMonthOptions(fetchedTicketMonths);
        setUploadedFileOptions(fetchedFileNames); // Set the filenames
      } catch (err) {
        console.error("Error fetching or processing Excel data:", err);
        setError(`Failed to load data: ${err.message}`);
      }
    };

    loadData();
  }, []);

  // 2) Filter unmatchedRows by opened‐month, filename, and search term
  const filteredUnmatchedRows = unmatchedRows.filter((row) => {
    const matchesOpenedMonth =
      selectedMonth === "" || row.ticketOpenedMonth === selectedMonth;
    // Now filters by 'fileName' instead of 'fileUploadMonth'
    const matchesUploadedFile =
      selectedFile === "" || row.fileName === selectedFile;
    const matchesSearch =
      searchTerm === "" ||
      (row.assignedTo &&
        row.assignedTo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (row.number &&
        String(row.number).toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesOpenedMonth && matchesUploadedFile && matchesSearch;
  });

  // 3) Calculate overall completeness accuracy
  const filteredProcessedRows = allProcessedRows.filter((row) => {
    const matchesOpenedMonth =
      selectedMonth === "" || row.ticketOpenedMonth === selectedMonth;
    // Now filters by 'fileName'
    const matchesUploadedFile =
      selectedFile === "" || row.fileName === selectedFile;
    return matchesOpenedMonth && matchesUploadedFile;
  });

  const filteredUnmatchedForAccuracy = unmatchedRows.filter((row) => {
    const matchesOpenedMonth =
      selectedMonth === "" || row.ticketOpenedMonth === selectedMonth;
    // Now filters by 'fileName'
    const matchesUploadedFile =
      selectedFile === "" || row.fileName === selectedFile;
    return matchesOpenedMonth && matchesUploadedFile;
  });

  const totalTicketsThisFilter = filteredProcessedRows.length;
  const incompleteTicketsThisFilter = filteredUnmatchedForAccuracy.length;
  const displayAccuracyForProgressBar = calculateAccuracy(
    totalTicketsThisFilter,
    incompleteTicketsThisFilter
  );

  // 4) Per‐person accuracy (for table)
  const personStatsFiltered = {};
  filteredProcessedRows.forEach((row) => {
    const name = row.assignedTo || "Unassigned";
    if (!personStatsFiltered[name]) {
      personStatsFiltered[name] = { total: 0, incomplete: 0 };
    }
    personStatsFiltered[name].total += 1;
    if (row.hasError) {
      personStatsFiltered[name].incomplete += 1;
    }
  });

  // Helper to get individual accuracy
  const getPersonAccuracy = (assignedTo) => {
    const name = assignedTo || "Unassigned";
    const stats = personStatsFiltered[name];
    return stats ? calculateAccuracy(stats.total, stats.incomplete) : "N/A";
  };

  // Sort table entries by accuracy
  const sortedEntries = Object.entries(personStatsFiltered).sort(
    ([, statsA], [, statsB]) => {
      const accuracyA = parseFloat(
        calculateAccuracy(statsA.total, statsA.incomplete)
      );
      const accuracyB = parseFloat(
        calculateAccuracy(statsB.total, statsB.incomplete)
      );
      return sortOrder === "asc"
        ? accuracyA - accuracyB
        : accuracyB - accuracyA;
    }
  );

  // 5) Export to PDF (accuracy table)
  const exportToPdf = () => {
    setTimeout(() => {
      const input = document.getElementById("accuracy-table-report");
      if (!input) {
        console.error("Element #accuracy-table-report not found.");
        return;
      }
      html2canvas(input, { scale: 2, useCORS: true, logging: true })
        .then((canvas) => {
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const imgWidth = 210; // A4 width
          const pageHeight = 297;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }
          pdf.save("accuracy_table_report.pdf");
        })
        .catch((err) => {
          console.error("Error generating PDF:", err);
        });
    }, 100);
  };

  // 6) Export incomplete → Excel
  const handleExportToExcel = () => {
    const dataToExport = filteredUnmatchedRows.map((row) => ({
      "Ticket Number": row.number || "N/A",
      "Assigned To": row.assignedTo || "N/A",
      "Opened Date": row.opened || "N/A",
      // Changed to show fileName
      "Uploaded From File": row.fileName || "N/A",
      "Cause (Original)": row.cause || "Empty",
      "Reason For Outage (Original)": row.reason || "Empty",
      "Missing/Incorrect Fields":
        row.missingColumns && row.missingColumns.length > 0
          ? row.missingColumns.join(", ")
          : "N/A",
    }));

    if (dataToExport.length === 0) {
      alert("No data to export for the current filters.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incomplete Tickets");
    XLSX.writeFile(wb, "Incomplete_Tickets_Report.xlsx");
  };

  return (
    <div className="mb-10 mt-10">
      <div className="flex flex-col lg:flex-row gap-6 bg-white p-4 rounded-lg shadow">
        {/* Left: Accuracy Overview */}
        <div className="lg:basis-1/4">
          <h3 className="font-semibold mb-2">Closing Ticket Accuracy</h3>
          <AccuracyProgress
            percentage={parseFloat(displayAccuracyForProgressBar)}
          />
        </div>

        {/* Right: Incomplete Rows */}
        <div className="lg:basis-3/4">
          <h4 className="flex items-center gap-2 font-semibold text-yellow-600">
            <ExclamationCircleIcon className="h-5 w-5" />
            Incomplete Data – Requires Attention ({filteredUnmatchedRows.length}
            )
          </h4>

          {/* Search & Month Filters */}
          <div className="flex flex-col md:flex-row gap-2 my-4">
            <input
              type="text"
              placeholder="Search by assigned person…"
              className="flex-1 p-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setExpandedIndex(null);
              }}
            />

            {/* Dropdown for File Uploaded (Filename) */}
            <select
              className="flex-1 p-2 border rounded-lg"
              value={selectedFile} // Changed state variable
              onChange={(e) => {
                setSelectedFile(e.target.value); // Changed setter
                setExpandedIndex(null);
              }}
            >
              <option value="">All Uploaded Files</option>{" "}
              {/* Changed option text */}
              {uploadedFileOptions.map(
                (
                  fileName // Iterating over filenames
                ) => (
                  <option key={`uploaded-${fileName}`} value={fileName}>
                    {fileName} {/* Displaying the filename */}
                  </option>
                )
              )}
            </select>

            {/* Dropdown for Ticket Opened Month */}
            {selectedFile && (
              <select
                className="flex-1 p-2 border rounded-lg"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setExpandedIndex(null);
                }}
              >
                <option value="">All Opened Months</option>
                {ticketOpenedMonthOptions.map((month) => (
                  <option key={`opened-${month}`} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            )}

            {/* Export to Excel Button */}
            <button
              onClick={handleExportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Export Incomplete to Excel
            </button>
          </div>

          {/* Error and No Data Messages */}
          {error && <p className="text-red-500 my-2">Error: {error}</p>}
          {!error && allProcessedRows.length === 0 && (
            <p className="text-gray-600 my-2">
              No Excel files found or no data to process.
            </p>
          )}
          {!error &&
            allProcessedRows.length > 0 &&
            filteredUnmatchedRows.length === 0 && (
              <p className="text-gray-500 my-2">
                No incomplete rows found for the selected filters.
              </p>
            )}

          {/* Incomplete Row Cards */}
          <div className="space-y-4 max-h-96 overflow-y-auto mb-5">
            {filteredUnmatchedRows.map((row, idx) => (
              <div
                key={idx}
                className="p-3 border rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                onClick={() =>
                  setExpandedIndex(expandedIndex === idx ? null : idx)
                }
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">#{row.number || "N/A"}</p>
                    <p className="text-m text-black-600">
                      Assigned To: {row.assignedTo || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Opened: {row.opened || "N/A"}
                    </p>
                    {/* Display filename instead of full upload date/time if desired */}
                    <p className="text-sm text-gray-600">
                      File: {row.fileName || "N/A"}{" "}
                      {/* Displaying the filename */}
                    </p>
                  </div>
                  {expandedIndex === idx ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                {expandedIndex === idx && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Cause:</strong>{" "}
                      <span className="text-red-600 font-semibold">
                        {row.cause || "Empty"}
                      </span>
                    </p>
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Reason For Outage:</strong>{" "}
                      <span className="text-red-600 font-semibold">
                        {row.reason || "Empty"}
                      </span>
                    </p>
                    {row.missingColumns?.length > 0 && (
                      <p className="text-sm text-red-600">
                        Missing: {row.missingColumns.join(", ")}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-2">
                      Accuracy for <strong>{row.assignedTo || "N/A"}</strong>:{" "}
                      {getPersonAccuracy(row.assignedTo)}%
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accuracy Table */}
      <div
        className="mt-10 bg-white p-4 rounded-lg shadow"
        id="accuracy-table-report"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold mb-4">
            Completion Accuracy per Assigned Person – Closing Ticket –{" "}
            {selectedMonth && selectedFile // Updated condition
              ? `for tickets opened in ${selectedMonth} from file ${selectedFile}` // Updated text
              : selectedMonth
              ? `for tickets opened in ${selectedMonth}`
              : selectedFile // Updated condition
              ? `for file ${selectedFile}` // Updated text
              : "Overall"}
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 justify-end">
              Export to PDF:
            </label>
            <FileText
              className="h-7 w-7 text-red-600 cursor-pointer hover:text-red-800 transition-colors"
              onClick={exportToPdf}
              title="Export to PDF"
            />
          </div>
        </div>

        <table className="w-full table-auto border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Name</th>
              <th
                className="border px-4 py-2 text-left cursor-pointer select-none"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
              >
                <div className="flex items-center gap-1">
                  Accurate Tickets / Tickets Issued
                  {sortOrder === "asc" ? (
                    <ArrowUp size={16} className="text-blue-600" />
                  ) : (
                    <ArrowDown size={16} className="text-blue-600" />
                  )}
                </div>
              </th>
              <th className="border px-4 py-2 text-left">
                Accuracy Percentage
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.length > 0 ? (
              sortedEntries.map(([name, stats]) => {
                const accuracy = parseFloat(
                  calculateAccuracy(stats.total, stats.incomplete)
                );
                const color =
                  accuracy >= 90
                    ? "bg-green-500"
                    : accuracy >= 85
                    ? "bg-yellow-400"
                    : "bg-red-500";

                return (
                  <tr key={name}>
                    <td className="border px-4 py-2">{name}</td>
                    <td className="border px-4 py-2">
                      {stats.total - stats.incomplete} / {stats.total}
                    </td>
                    <td className="border px-4 py-2">
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className={`${color} h-4 rounded-full text-xs text-white text-center flex items-center justify-center`}
                          style={{ width: `${accuracy}%` }}
                        >
                          {accuracy}%
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="3"
                  className="border px-4 py-2 text-center text-gray-500"
                >
                  No assigned person data available for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ClosingAccuracy;
