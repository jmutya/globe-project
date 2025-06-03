import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx"; // Keep XLSX for client-side export functionality
import {
  ExclamationCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid";
import { ArrowUp, ArrowDown, FileText } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Import functions from the dedicated processing service
import {
  fetchAndProcessExcelData,
  calculateAccuracy,
  formatDateTimeFromISO,
} from "../../../../backend/insightfunctions/ticketissuancefunctions"; // Adjust path as needed

import AccuracyProgress from "../../InsightsContent/AccuracyProgress"; // Assuming this path is correct

function TicketIssuance() {
  const [unmatchedRows, setUnmatchedRows] = useState([]);
  const [allProcessedRows, setAllProcessedRows] = useState([]);
  const [ticketOpenedMonthOptions, setTicketOpenedMonthOptions] = useState([]);
  const [uploadedMonthOptions, setUploadedMonthOptions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedUploadedMonth, setSelectedUploadedMonth] = useState("");
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc");
  const [isLoading, setIsLoading] = useState(true);

  // The main data loading function
  const loadData = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await fetchAndProcessExcelData(); // Call the service function

      setUnmatchedRows(data.unmatchedRows);
      setAllProcessedRows(data.allProcessedRows);
      setTicketOpenedMonthOptions(data.ticketOpenedMonthOptions);
      setUploadedMonthOptions(data.uploadedMonthOptions);
    } catch (err) {
      // FIX: Ensure error object is converted to string for logging
      console.error("Error loading data in component:", err.message || String(err));
      // Set the error state with a clear message
      setError(`Failed to load data: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered rows for display based on selected filters and search term
  const filteredUnmatchedRows = unmatchedRows.filter((row) => {
    const matchesOpenedMonth =
      selectedMonth === "" || row.ticketOpenedMonth === selectedMonth;
    const matchesUploadedMonth =
      selectedUploadedMonth === "" ||
      row.fileUploadMonth === selectedUploadedMonth;
    const matchesSearch =
      searchTerm === "" ||
      (row.assignedTo &&
        row.assignedTo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (row.number &&
        String(row.number).toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesOpenedMonth && matchesUploadedMonth && matchesSearch;
  });

  // Calculate overall accuracy for the filtered data
  const filteredProcessedRows = allProcessedRows.filter((row) => {
    const matchesOpenedMonth =
      selectedMonth === "" || row.ticketOpenedMonth === selectedMonth;
    const matchesUploadedMonth =
      selectedUploadedMonth === "" ||
      row.fileUploadMonth === selectedUploadedMonth;
    return matchesOpenedMonth && matchesUploadedMonth;
  });

  const currentMonthTotalTickets = filteredProcessedRows.length;
  const currentMonthIncompleteTickets = filteredProcessedRows.filter(
    (row) => row.hasError
  ).length;

  const displayAccuracyForProgressBar = calculateAccuracy(
    currentMonthTotalTickets,
    currentMonthIncompleteTickets
  );

  // Calculate per-person accuracy for the table
  const personStatsFiltered = {};
  filteredProcessedRows.forEach((row) => {
    const name = row.assignedTo || "Unassigned";
    if (name) {
      if (!personStatsFiltered[name]) {
        personStatsFiltered[name] = { total: 0, incomplete: 0 };
      }
      personStatsFiltered[name].total++;
      if (row.hasError) {
        personStatsFiltered[name].incomplete++;
      }
    }
  });

  const getPersonAccuracy = (assignedTo) => {
    const name = assignedTo || "Unassigned";
    const stats = personStatsFiltered[name];
    if (stats) {
      return calculateAccuracy(stats.total, stats.incomplete);
    }
    return "N/A";
  };

  const sortedEntries = Object.entries(personStatsFiltered).sort(
    ([nameA, statsA], [nameB, statsB]) => {
      const accuracyA = parseFloat(calculateAccuracy(statsA.total, statsA.incomplete));
      const accuracyB = parseFloat(calculateAccuracy(statsB.total, statsB.incomplete));

      if (sortOrder === "asc") {
        return accuracyA - accuracyB;
      } else {
        return accuracyB - accuracyA;
      }
    }
  );

  // --- Export Functions ---
  const exportToPdf = () => {
    setTimeout(() => {
      const input = document.getElementById("accuracy-table-report");
      if (!input) {
        console.error("Element with ID 'accuracy-table-report' not found.");
        return;
      }

      html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: true,
      })
        .then((canvas) => {
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const imgWidth = 210;
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
          pdf.save("ticket_issuance_accuracy_report.pdf");
        })
        .catch((err) => {
          // FIX: Ensure error object is converted to string for logging
          console.error("Error generating PDF:", err.message || String(err));
        });
    }, 100);
  };

  const handleExportToExcel = () => {
    const dataToExport = filteredUnmatchedRows.map((row) => ({
      "Ticket Number": row.number || "N/A",
      "Assigned To": row.assignedTo || "N/A",
      "Opened Date": row.opened || "N/A",
      "Uploaded Date": formatDateTimeFromISO(row.fileUploadFullDateTime) || "N/A",
      "Failure Category": row.failureCategory || "N/A",
      "Cause": row.cause || "N/A",
      "AOR001": row.aor001 || "N/A",
      "AOR002": row.aor002 || "N/A",
      "Has Incomplete Data": row.hasError ? "Yes" : "No",
      "Missing Columns": row.hasError ? row.missingColumns.join(", ") : "None",
    }));

    if (dataToExport.length === 0) {
      alert("No data to export for the current filters.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incomplete Tickets");
    XLSX.writeFile(wb, "Incomplete_Ticket_Issuance_Report.xlsx");
  };

  return (
    <div className="mb-10 mt-10">
      <div className="flex flex-col lg:flex-row gap-6 bg-white p-4 rounded-lg shadow">
        {isLoading && (
          <div className="text-center w-full py-10">
            <p className="text-xl font-semibold text-blue-600">
              Loading and Processing Excel Data...
            </p>
            <p className="text-gray-500">This may take a moment depending on the number and size of files.</p>
          </div>
        )}

        {!isLoading && error && (
          <p className="text-red-500 my-2">Error: {error}</p>
        )}
        {!isLoading && !error && allProcessedRows.length === 0 && (
          <p className="text-gray-600 my-2">
            No Excel files found or no data to process.
          </p>
        )}

        {!isLoading && !error && allProcessedRows.length > 0 && (
          <>
            <div className="lg:basis-1/4">
              <h3 className="font-semibold mb-2">Ticket Issuance Accuracy</h3>
              <AccuracyProgress
                percentage={parseFloat(displayAccuracyForProgressBar)}
              />
            </div>

            <div className="lg:basis-3/4">
              <h4 className="flex items-center gap-2 font-semibold text-yellow-600">
                <ExclamationCircleIcon className="h-5 w-5" />
                Incomplete Data – Requires Attention ({filteredUnmatchedRows.length})
              </h4>

              <div className="flex flex-col md:flex-row gap-2 my-4">
                <input
                  type="text"
                  placeholder="Search by assigned person or ticket number…"
                  className="flex-1 p-2 border rounded-lg"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setExpandedIndex(null);
                  }}
                />
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

                <select
                  className="flex-1 p-2 border rounded-lg"
                  value={selectedUploadedMonth}
                  onChange={(e) => {
                    setSelectedUploadedMonth(e.target.value);
                    setExpandedIndex(null);
                  }}
                >
                  <option value="">All Uploaded Months</option>
                  {uploadedMonthOptions.map((month) => (
                    <option key={`uploaded-${month}`} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleExportToExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Export Incomplete to Excel
                </button>
              </div>

              {filteredUnmatchedRows.length > 0 ? (
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
                          <p className="text-sm text-gray-600">
                            Uploaded:{" "}
                            {formatDateTimeFromISO(row.fileUploadFullDateTime)}
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
                            **Failure Category:**{" "}
                            <span className="text-red-600 font-semibold">
                              {row.failureCategory || "Empty"}
                            </span>
                          </p>
                          <p className="text-sm text-gray-700 mb-1">
                            **Cause:**{" "}
                            <span className="text-red-600 font-semibold">
                              {row.cause || "Empty"}
                            </span>
                          </p>
                          <p className="text-sm text-gray-700 mb-1">
                            **AOR001:**{" "}
                            <span className="text-red-600 font-semibold">
                              {row.aor001 || "Empty"}
                            </span>
                          </p>
                          <p className="text-sm text-gray-700 mb-1">
                            **AOR002:**{" "}
                            <span className="text-red-600 font-semibold">
                              {row.aor002 || "Empty"}
                            </span>
                          </p>
                          {row.missingColumns &&
                            row.missingColumns.length > 0 && (
                              <p className="text-sm text-red-600">
                                Missing: {row.missingColumns.join(", ")}
                              </p>
                            )}
                          <p className="text-sm text-gray-600 mt-2">
                            Accuracy for **{row.assignedTo || "N/A"}**:{" "}
                            {getPersonAccuracy(row.assignedTo)}%
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 my-2">No incomplete rows found for the selected filters.</p>
              )}
            </div>
          </>
        )}
      </div>

      {!isLoading && !error && allProcessedRows.length > 0 && (
        <div
          className="mt-10 bg-white p-4 rounded-lg shadow"
          id="accuracy-table-report"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold mb-4">
              Completion Accuracy per Assigned Person - Ticket Issuance -{" "}
              {selectedMonth && selectedUploadedMonth
                ? `for tickets opened in ${selectedMonth} from files uploaded in ${selectedUploadedMonth}`
                : selectedMonth
                ? `for tickets opened in ${selectedMonth}`
                : selectedUploadedMonth
                ? `for files uploaded in ${selectedUploadedMonth}`
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
      )}
    </div>
  );
}

export default TicketIssuance;