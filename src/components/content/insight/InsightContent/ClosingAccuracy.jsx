import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import AccuracyProgress from "../InsightsContent/AccuracyProgress";
import supabase from "../../../backend/supabase/supabase";
import { ExclamationCircleIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { ArrowUp, ArrowDown } from "lucide-react";


// Format Excel serial to "YYYY/MM/DD"
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

const getMonthFromDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${month < 10 ? "0" : ""}${month}/${year}`;
  };

// Placeholder for accuracy calculation (you'll need to implement your actual logic)
const calculateAccuracy = (total, incomplete) => {
  if (total === 0) return "0.00";
  return (((total - incomplete) / total) * 100).toFixed(2);
};

function ClosingAccuracy() {
  const [unmatchedRows, setUnmatchedRows] = useState([]);
  const [allProcessedRows, setAllProcessedRows] = useState([]); // To store all rows for accuracy calculation
  const [monthOptions, setMonthOptions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(""); // Changed default to empty for "All Months" option
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIndex, setExpandedIndex] = useState(null); // For accordion-like cards
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' or 'desc' for table sorting

  // This useEffect is now mostly for initial Supabase connection testing.
  useEffect(() => {
    const testSupabaseConnection = async () => {
      const { error } = await supabase.storage
        .from("uploads")
        .list("excels");

      if (error) {
        console.error("Supabase connection test error:", error);
        setError("Failed to connect to Supabase Storage.");
      }
    };
    testSupabaseConnection();
  }, []);

  const fetchAndProcessExcel = async () => {
    setError(null);
    let tempAllUnmatched = [];
    let tempAllProcessed = []; // To accumulate all rows for overall accuracy
    const monthsSet = new Set();

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
        setMonthOptions([]); // No months to show if no files
        return;
      }

      for (const file of files) {
        const filePath = `excels/${file.name}`;
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filePath);

        if (!urlData || !urlData.publicUrl) {
          console.warn(`Could not get public URL for ${file.name}. Skipping.`);
          continue;
        }

        const response = await fetch(urlData.publicUrl);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} for ${file.name}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
          defval: "",
        });

        sheet.forEach((row) => {
          const cause = row["Cause"];
          const reason = row["Reason For Outage"];
          const assignedTo = row["Assigned to"];
          const number = row["Number"];
          const opened = formatOpenedDate(row["Opened"]);

          // Identify missing columns (for the expanded card view)
          const missingColumns = [];
          if (!cause || typeof cause !== "string") missingColumns.push("Cause");
          if (!reason || typeof reason !== "string") missingColumns.push("Reason For Outage");

          // Your accuracy logic: Check if Cause or Reason are missing/invalid
          // or if Reason doesn't start with Cause (case-insensitive, trimmed)
          const hasError =
            !cause ||
            !reason ||
            typeof cause !== "string" ||
            typeof reason !== "string" ||
            reason.split("-")[0].trim().toLowerCase() !== cause.trim().toLowerCase();

          const processedRow = {
            number,
            cause,
            reason,
            assignedTo,
            opened,
            hasError, // Store error status directly
            missingColumns, // Store missing columns for display
          };
          tempAllProcessed.push(processedRow); // Add all rows for total count

          if (hasError) {
            const month = getMonthFromDate(opened);
            monthsSet.add(month);
            tempAllUnmatched.push({ ...processedRow, month }); // Add month to unmatched rows
          }
          
        });
      }

      
      // Sort months in descending order (newest first)
      const sortedMonths = Array.from(monthsSet).sort((a, b) => {
        const [ma, ya] = a.split("/").map(Number);
        const [mb, yb] = b.split("/").map(Number);
        return yb !== ya ? yb - ya : mb - ma;
      });

      setMonthOptions(sortedMonths); // No "All" here, it's a UI option
      setUnmatchedRows(tempAllUnmatched);
      setAllProcessedRows(tempAllProcessed); // Set all processed rows for overall accuracy

    } catch (err) {
      console.error("Error fetching or processing Excel files:", err);
      setError(`Failed to load data: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchAndProcessExcel();
  }, []);

  // Filter rows based on selected month and search term
  const filteredRows = unmatchedRows.filter((row) => {
    const matchesMonth = selectedMonth === "" || row.month === selectedMonth;
    const matchesSearch = searchTerm === "" ||
      (row.assignedTo && row.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesMonth && matchesSearch;
  });

  // Calculate overall accuracy
  const totalTickets = allProcessedRows.length;
  const incompleteTickets = unmatchedRows.length; // unmatchedRows contain only the 'errors'
  const displayAccuracy = calculateAccuracy(totalTickets, incompleteTickets);

  // Calculate accuracy per person for the table
  const personStats = {};
  allProcessedRows.forEach(row => {
    const name = row.assignedTo || "Unassigned";
    if (!personStats[name]) {
      personStats[name] = { total: 0, incomplete: 0 };
    }
    personStats[name].total++;
    if (row.hasError) {
      personStats[name].incomplete++;
    }
  });

  // Function to get individual person accuracy for expanded card
  const getPersonAccuracy = (assignedTo) => {
    const name = assignedTo || "Unassigned";
    if (personStats[name]) {
      return calculateAccuracy(personStats[name].total, personStats[name].incomplete);
    }
    return "N/A";
  };

  // Sort table entries
  const sortedEntries = Object.entries(personStats).sort(([nameA, statsA], [nameB, statsB]) => {
    const accuracyA = parseFloat(calculateAccuracy(statsA.total, statsA.incomplete));
    const accuracyB = parseFloat(calculateAccuracy(statsB.total, statsB.incomplete));

    if (sortOrder === "asc") {
      return accuracyA - accuracyB;
    } else {
      return accuracyB - accuracyA;
    }
  });

  return (
    <div className="mb-10 mt-10">
      <div className="flex flex-col lg:flex-row gap-6 bg-white p-4 rounded-lg shadow">
        {/* Left: Accuracy Overview */}
        <div className="lg:basis-1/4">
          <h3 className="font-semibold mb-2">Ticket Issuance Accuracy</h3>
          {/* Ensure AccuracyProgress can accept a percentage prop */}
          <AccuracyProgress percentage={parseFloat(displayAccuracy)} />
        </div>

        {/* Right: Incomplete Rows */}
        <div className="lg:basis-3/4">
          <h4 className="flex items-center gap-2 font-semibold text-yellow-600">
            <ExclamationCircleIcon className="h-5 w-5" />
            Incomplete Data – Requires Attention ({filteredRows.length})
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
                setExpandedIndex(null); // Close expanded card on search
              }}
            />
            <select
              className="flex-1 p-2 border rounded-lg"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setExpandedIndex(null); // Close expanded card on month change
              }}
            >
              <option value="">All Months</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          {/* Error and No Data Messages for Incomplete Rows Section */}
          {error && <p className="text-red-500 my-2">Error: {error}</p>}
          {!error && allProcessedRows.length === 0 && (
            <p className="text-gray-600 my-2">No Excel files found or no data to process.</p>
          )}
          {!error && allProcessedRows.length > 0 && filteredRows.length === 0 && (
            <p className="text-gray-500 my-2">No incomplete rows found for the selected filters.</p>
          )}

          {/* Incomplete Row Cards */}
          <div className="space-y-4 max-h-96 overflow-y-auto mb-5">
            {filteredRows.length > 0 && (
              filteredRows.map((row, idx) => (
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
                      <p className="text-sm text-gray-600">{row.opened || "N/A"}</p>
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
                        **Cause:** <span className="text-red-600 font-semibold">{row.cause || "Empty"}</span>
                      </p>
                      <p className="text-sm text-gray-700 mb-1">
                        **Reason For Outage:** <span className="text-red-600 font-semibold">{row.reason || "Empty"}</span>
                      </p>
                      {row.missingColumns && row.missingColumns.length > 0 && (
                        <p className="text-sm text-red-600">
                          Missing: {row.missingColumns.join(", ")}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-2">
                        Accuracy Percentage for **{row.assignedTo || "N/A"}**: {getPersonAccuracy(row.assignedTo)}%
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Accuracy Table */}
      <div className="mt-10 bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-4">
          Completion Accuracy per Assigned Person
        </h3>
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
              <th className="border px-4 py-2 text-left">Accuracy (%)</th>
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
                <td colSpan="3" className="border px-4 py-2 text-center text-gray-500">
                  No assigned person data available.
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