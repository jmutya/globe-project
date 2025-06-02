import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import AccuracyProgress from "../../InsightsContent/AccuracyProgress";
import supabase from "../../../../backend/supabase/supabase";
import {
  ExclamationCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid";
import { ArrowUp, ArrowDown, FileSpreadsheet, FileText } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Format Excel serial to "YYYY/MM/DD"
const formatOpenedDate = (value) => {
  if (!value) return "";
  if (typeof value === "number") {
    // Excel dates start from Jan 1, 1900. 25569 is the number of days from 1900-01-01 to 1970-01-01.
    const date = new Date((value - 25569) * 86400 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }
  // If already a string, assume it's a date string and try to format
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      // Check if the date is valid
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}/${mm}/${dd}`;
    }
  } catch (e) {
    // Fallback for invalid date strings
    return value;
  }
  return value;
};

// Turn "YYYY/MM/DD" into "MM/YYYY" for consistent monthly grouping (for ticket opened dates)
const getMonthFromDate = (dateStr) => {
  // Ensure dateStr is a valid date string before parsing
  if (!dateStr || dateStr === "Invalid Date") return "Invalid Date";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Invalid Date"; // Check for invalid date object
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${month < 10 ? "0" : ""}${month}/${year}`;
};

const getMonthYearFromISO = (isoDateString) => {
  if (!isoDateString) return "Invalid Date";
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) {
      // Check for invalid date
      return "Invalid Date";
    }
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const day = String(date.getDate()).padStart(2, "0");

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM"; // Determine AM/PM

    // Convert hours to 12-hour format
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours; // The hour '0' should be '12'
    const hours12 = String(hours).padStart(2, "0");

    return `${month}/${day}/${year} ${hours12}:${minutes} ${ampm}`; // Return MM/YYYY HH:MM AM/PM format
  } catch (error) {
    console.error(
      "Error parsing ISO date string for month/year:",
      isoDateString,
      error
    );
    return "Invalid Date";
  }
};

// New function to format ISO date string (from Supabase) to MM/DD/YYYY HH:MM AM/PM for display
const formatDateTimeFromISO = (isoDateString) => {
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
    const ampm = hours >= 12 ? "PM" : "AM"; // Determine AM/PM

    // Convert hours to 12-hour format
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours; // The hour '0' should be '12'
    const hours12 = String(hours).padStart(2, "0");

    return `${mm}/${dd}/${yyyy} ${hours12}:${minutes} ${ampm}`; // Return MM/DD/YYYY HH:MM AM/PM format
  } catch (error) {
    console.error(
      "Error formatting ISO date string for display:",
      isoDateString,
      error
    );
    return "Invalid Date";
  }
};

// Placeholder for accuracy calculation
const calculateAccuracy = (total, incomplete) => {
  if (total === 0) return "0.00";
  return (((total - incomplete) / total) * 100).toFixed(2);
};

function TicketIssuance() {
  const [unmatchedRows, setUnmatchedRows] = useState([]);
  const [allProcessedRows, setAllProcessedRows] = useState([]);
  const [ticketOpenedMonthOptions, setTicketOpenedMonthOptions] = useState([]);
  const [uploadedMonthOptions, setUploadedMonthOptions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(""); // For 'Opened' date filter (MM/YYYY)
  const [selectedUploadedMonth, setSelectedUploadedMonth] = useState(""); // For 'Added on' date filter (MM/YYYY)
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc");
  const [isLoading, setIsLoading] = useState(true);

  // Supabase connection test
  useEffect(() => {
    const testSupabaseConnection = async () => {
      const { error } = await supabase.storage.from("uploads").list("excels");

      if (error) {
        console.error("Supabase connection test error:", error);
        setError("Failed to connect to Supabase Storage.");
      }
    };
    testSupabaseConnection();
  }, []);

  const fetchAndProcessExcel = async () => {
    setError(null);
    setIsLoading(true);
    let tempAllUnmatched = [];
    let tempAllProcessed = [];
    const ticketMonthsSet = new Set(); // For months from 'Opened' column
    const uploadMonthsSet = new Set(); // For months from Supabase 'created_at' for dropdown

    try {
      const { data: files, error: listError } = await supabase.storage
        .from("uploads")
        .list("excels", { sortBy: { column: "name", order: "asc" } });

      if (listError) {
        throw listError;
      }

      if (!files || files.length === 0) {
        console.log("No Excel files found in the 'excels' folder.");
        setUnmatchedRows([]);
        setAllProcessedRows([]);
        setTicketOpenedMonthOptions([]);
        setUploadedMonthOptions([]);
        setIsLoading(false);
        return;
      }

      for (const file of files) {
        const fileUploadFullDateTime = file.created_at; // Raw ISO string for display
        const fileUploadMonth = getMonthYearFromISO(file.created_at); // MM/YYYY for dropdown filtering

        if (fileUploadMonth !== "Invalid Date") {
          uploadMonthsSet.add(fileUploadMonth); // Add to set for "Added on" dropdown (MM/YYYY)
        }

        const filePath = `excels/${file.name}`;
        const { data: urlData } = supabase.storage
          .from("uploads")
          .getPublicUrl(filePath);

        if (!urlData || !urlData.publicUrl) {
          console.warn(`Could not get public URL for ${file.name}. Skipping.`);
          continue;
        }

        const response = await fetch(urlData.publicUrl);
        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} for ${file.name}`
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheet = XLSX.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[0]],
          {
            defval: "", // Ensure empty cells are empty strings
          }
        );

        const requiredTicketIssuanceFields = [
          "u_failure_category",
          "u_cause",
          "u_aor001",
          "u_aor002",
        ];

        sheet.forEach((row) => {
          // --- EXISTING: Check for "State" column and skip if "Cancelled" ---
          const state = row["State"];
          if (state && String(state).trim().toLowerCase() === "cancelled") {
            return; // Skip this row
          }

          const number = row["number"];
          let assignedTo = row["caller_id"];
          const callervalue = row["assigned_to"];
          const openedRaw = row["opened_at"];
          const openedFormatted = formatOpenedDate(openedRaw);

           // --- NEW CONDITION: Exclude if assignedTo is "mycom" and callervalue is blank ---
          if (
            String(assignedTo).trim().toLowerCase() === "MYCOM Integration User" &&
            String(callervalue).trim() === ""
          ) {
            return; // Skip this row entirely from processing and unmatched lists
          }

          // Condition 2: If assignedTo is "mycom" and callervalue is NOT blank, use callervalue as assignedTo
          if (
            String(assignedTo).trim().toLowerCase() === "MYCOM Integration User" &&
            String(callervalue).trim() !== ""
          ) {
            assignedTo = callervalue; // Reassign assignedTo to callervalue
          }

          const missingColumns = [];
          let hasError = false;

          requiredTicketIssuanceFields.forEach((field) => {
            if (!row[field] || String(row[field]).trim() === "") {
              missingColumns.push(field);
              hasError = true;
            }
          });

          const ticketOpenedMonth = getMonthFromDate(openedFormatted);
          if (ticketOpenedMonth !== "Invalid Date") {
            ticketMonthsSet.add(ticketOpenedMonth); // Add to set for "Opened" dropdown
          }

          const processedRow = {
            number,
            assignedTo,
            opened: openedFormatted,
            ticketOpenedMonth: ticketOpenedMonth, // Month from the Excel's 'Opened' date (MM/YYYY)
            fileUploadMonth: fileUploadMonth, // Month from Supabase 'created_at' for filtering (MM/YYYY)
            fileUploadFullDateTime: fileUploadFullDateTime, // Raw ISO string for detailed display
            hasError,
            missingColumns,
            // Include other relevant fields from the row if needed for display/debug
            failureCategory: row["u_failure_category"],
            cause: row["u_cause"],
            aor001: row["u_aor001"],
            aor002: row["u_aor002"],
          };
          tempAllProcessed.push(processedRow);

          if (hasError) {
            tempAllUnmatched.push(processedRow);
          }
        });
      }

      // Sort ticket opened months (most recent first)
      const sortedTicketMonths = Array.from(ticketMonthsSet).sort((a, b) => {
        const [ma, ya] = a.split("/").map(Number);
        const [mb, yb] = b.split("/").map(Number);
        return yb !== ya ? yb - ya : mb - ma;
      });

      // Sort uploaded months (most recent first)
      const sortedUploadedMonths = Array.from(uploadMonthsSet).sort((a, b) => {
        const [ma, ya] = a.split("/").map(Number);
        const [mb, yb] = b.split("/").map(Number);
        return yb !== ya ? yb - ya : mb - ma;
      });

      setTicketOpenedMonthOptions(sortedTicketMonths);
      setUploadedMonthOptions(sortedUploadedMonths);
      setUnmatchedRows(tempAllUnmatched);
      setAllProcessedRows(tempAllProcessed);
    } catch (err) {
      console.error("Error fetching or processing Excel files:", err);
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAndProcessExcel();
  }, []);

  // Filter unmatched rows based on selected 'Opened' month AND 'Uploaded' month, and search term
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

  // --- Calculate Overall Accuracy for the Selected Filters ---
  let currentMonthTotalTickets = 0;
  let currentMonthIncompleteTickets = 0;

  // Filter all processed rows based on both selected filters
  const filteredProcessedRows = allProcessedRows.filter((row) => {
    const matchesOpenedMonth =
      selectedMonth === "" || row.ticketOpenedMonth === selectedMonth;
    const matchesUploadedMonth =
      selectedUploadedMonth === "" ||
      row.fileUploadMonth === selectedUploadedMonth;
    return matchesOpenedMonth && matchesUploadedMonth;
  });

  currentMonthTotalTickets = filteredProcessedRows.length;
  // Count incomplete from the *filtered processed rows*
  currentMonthIncompleteTickets = filteredProcessedRows.filter(
    (row) => row.hasError
  ).length;

  const displayAccuracyForProgressBar = calculateAccuracy(
    currentMonthTotalTickets,
    currentMonthIncompleteTickets
  );

  // --- Per-Person Accuracy Logic for the Table (based on selected filters) ---
  const personStatsFiltered = {}; // Structure: { "Person Name": { total: N, incomplete: M } }

  // Populate personStatsFiltered with data from the currently filtered processed rows
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

  // Function to get individual person accuracy for expanded card (now aware of both selected months)
  const getPersonAccuracy = (assignedTo) => {
    const name = assignedTo || "Unassigned";
    const stats = personStatsFiltered[name]; // Use the already filtered stats

    if (stats) {
      return calculateAccuracy(stats.total, stats.incomplete);
    }
    return "N/A";
  };

  // Sort table entries based on personStatsFiltered
  const sortedEntries = Object.entries(personStatsFiltered).sort(
    ([nameA, statsA], [nameB, statsB]) => {
      const accuracyA = parseFloat(
        calculateAccuracy(statsA.total, statsA.incomplete)
      );
      const accuracyB = parseFloat(
        calculateAccuracy(statsB.total, statsB.incomplete)
      );

      if (sortOrder === "asc") {
        return accuracyA - accuracyB;
      } else {
        return accuracyB - accuracyA;
      }
    }
  );

  const exportToPdf = () => {
    // We no longer need to toggle row expansion here, as we're targeting only the accuracy table.
    // const initialExpandedIndices = new Set(expandedIndices);
    // const allFilteredUnmatchedIndices = new Set(filteredUnmatchedRows.map((_, idx) => idx));
    // setExpandedIndices(allFilteredUnmatchedIndices);

    // Give React a moment to render (though not strictly necessary if no state changes for this section)
    setTimeout(() => {
      // CHANGE THIS ID!
      const input = document.getElementById("accuracy-table-report");
      if (!input) {
        console.error("Element with ID 'accuracy-table-report' not found.");
        // If you had any previous temporary state changes, revert them here
        // setExpandedIndices(initialExpandedIndices);
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
          const imgWidth = 210; // A4 width in mm
          const pageHeight = 297; // A4 height in mm
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
          pdf.save("accuracy_table_report.pdf"); // Give it a more specific file name

          // 3. Revert to initial expanded state after PDF is generated (if you had any)
          // setExpandedIndices(initialExpandedIndices);
        })
        .catch((err) => {
          console.error("Error generating PDF:", err);
          // Revert expansion even if PDF generation fails (if you had any)
          // setExpandedIndices(initialExpandedIndices);
        });
    }, 100); // Small delay to allow re-render
  };

  // --- New Function for Exporting to Excel ---
  const handleExportToExcel = () => {
    const dataToExport = filteredUnmatchedRows.map((row) => ({
      "Ticket Number": row.number || "N/A",
      "Assigned To": row.assignedTo || "N/A",
      "Opened Date": row.opened || "N/A",
      "Uploaded Date":
        formatDateTimeFromISO(row.fileUploadFullDateTime) || "N/A",
      "Failure Category": row.failureCategory || "N/A",
      Cause: row.cause || "N/A",
      AOR001: row.aor001 || "N/A",
      AOR002: row.aor002 || "N/A",
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
    XLSX.writeFile(wb, "Incomplete_Tickets_Report.xlsx");
  };

  return (
    <div className="mb-10 mt-10">
      <div className="flex flex-col lg:flex-row gap-6 bg-white p-4 rounded-lg shadow">
        {/* Left: Accuracy Overview */}
        <div className="lg:basis-1/4">
          <h3 className="font-semibold mb-2">Ticket Issuance Accuracy</h3>
          <AccuracyProgress
            percentage={parseFloat(displayAccuracyForProgressBar)}
            id="accuracy-table-report"
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
              placeholder="Search by assigned person or ticket number…"
              className="flex-1 p-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setExpandedIndex(null);
              }}
            />
            {/* Dropdown for Ticket Opened Month */}
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

            {/* Dropdown for File Uploaded Month */}
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

            {/* Export to Excel Button */}
            <button
              onClick={handleExportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Export Incomplete to Excel
            </button>
          </div>

          {/* Loading, Error and No Data Messages */}
          {isLoading && <p>Loading ticket issuance data...</p>}
          {!isLoading && error && (
            <p className="text-red-500 my-2">Error: {error.message}</p>
          )}
          {!isLoading && allProcessedRows.length === 0 && (
            <p className="text-gray-600 my-2">
              No Excel files found or no data to process.
            </p>
          )}
          {!isLoading &&
            allProcessedRows.length > 0 &&
            filteredUnmatchedRows.length === 0 && (
              <p className="text-gray-500 my-2">
                No incomplete rows found for the selected filters.
              </p>
            )}

          {/* Incomplete Row Cards */}
          <div className="space-y-4 max-h-96 overflow-y-auto mb-5">
            {!isLoading && filteredUnmatchedRows.length > 0
              ? filteredUnmatchedRows.map((row, idx) => (
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
                        {/* Display the full upload date and time */}
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
                ))
              : null}
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
              title="Export to PDF" // Add a title for accessibility and hover tooltip
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

export default TicketIssuance;
