import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { ArrowUp, ArrowDown } from "lucide-react";
import AccuracyProgress from "../../InsightsContent/AccuracyProgress";
import supabase from "../../../../backend/supabase/supabase";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";

import Insights from "../../Insights"; // This import still seems unused.

function TicketIssuance() {
  const [accuracyPercentage, setAccuracyPercentage] = useState("0.00");
  const [incompleteRows, setIncompleteRows] = useState([]);
  const [personAccuracyMap, setPersonAccuracyMap] = useState({});
  const [monthlyAccuracyMap, setMonthlyAccuracyMap] = useState({});
  const [monthlyPersonAccuracyMap, setMonthlyPersonAccuracyMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(""); // For 'Opened' date filter (MM/YYYY)
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedUploadedMonth, setSelectedUploadedMonth] = useState(""); // For 'Added on' date filter (MM/YYYY)
  const [uploadedMonthOptions, setUploadedMonthOptions] = useState([]); // These are MM/YYYY

  const formatOpenedDate = (value) => {
    if (!value) return "";
    // Check if value is a number (XLSX date format)
    if (typeof value === "number") {
      const date = new Date((value - 25569) * 86400 * 1000); // Convert Excel serial date to JS Date
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

      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM"; // Determine AM/PM

      // Convert hours to 12-hour format
      hours = hours % 12;
      hours = hours === 0 ? 12 : hours; // The hour '0' should be '12'
      const hours12 = String(hours).padStart(2, "0");

      return `${month}/${year} ${hours12}:${minutes} ${ampm}`; // Return MM/YYYY HH:MM AM/PM format
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

  const getIncompleteRows = (
    rows,
    headers,
    uploadedMonth,
    fileUploadedDate
  ) => {
    // Added fileUploadedDate parameter
    const required = [
      "Failure Category",
      "Cause",
      "AOR001",
      "AOR002",
      "Number",
      "Opened",
    ];
    const requiredIndexes = required.map((col) => headers.indexOf(col));
    const assignedToIndex = headers.indexOf("Assigned to");

    return rows.slice(1).reduce((acc, row) => {
      const missing = required
        .map((col, i) =>
          !row[requiredIndexes[i]] ||
          row[requiredIndexes[i]].toString().trim() === ""
            ? col
            : null
        )
        .filter(Boolean);

      if (missing.length > 0) {
        acc.push({
          number: row[headers.indexOf("Number")] || "Not Provided",
          assignedTo:
            assignedToIndex !== -1 ? row[assignedToIndex] : "Not Assigned",
          opened: formatOpenedDate(row[headers.indexOf("Opened")]),
          missingColumns: missing,
          rowData: row,
          uploadedMonth: uploadedMonth, // Month for filtering
          fileUploadedDate: fileUploadedDate, // Full timestamp for display
        });
      }

      return acc;
    }, []);
  };

  const calculateAccuracy = (totalRows, incompleteCount) => {
    return totalRows > 0
      ? (((totalRows - incompleteCount) / totalRows) * 100).toFixed(2)
      : "0.00";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data: files, error: fetchError } = await supabase.storage
          .from("uploads")
          .list("excels");

        if (fetchError) throw fetchError;

        let totalRows = 0;
        let totalIncomplete = 0;
        let allIncomplete = [];
        let personStats = {};
        let monthlyStats = {};
        let monthPersonStats = {};
        let uniqueUploadedMonths = new Set();

        for (const file of files) {
          const {
            data: { publicUrl },
          } = supabase.storage
            .from("uploads")
            .getPublicUrl(`excels/${file.name}`);

          const fileUploadedDateISO = file.created_at; // Store the ISO string directly
          const fileUploadedMonth = getMonthYearFromISO(fileUploadedDateISO); // For dropdown grouping
          uniqueUploadedMonths.add(fileUploadedMonth);

          const res = await fetch(publicUrl);
          const buf = await res.arrayBuffer();
          const workbook = XLSX.read(buf, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            header: 1,
          });

          if (sheet.length <= 1) continue;

          const headers = sheet[0];
          const dataRows = sheet.slice(1);
          const incomplete = getIncompleteRows(
            sheet,
            headers,
            fileUploadedMonth,
            fileUploadedDateISO // Pass the full ISO date string
          );
          const openedIdx = headers.indexOf("Opened");
          const assignedToIdx = headers.indexOf("Assigned to");

          dataRows.forEach((row) => {
            const assignedTo = row[assignedToIdx] || "Not Assigned";
            const openedDate = formatOpenedDate(row[openedIdx]);
            const month = getMonthFromDate(openedDate);

            personStats[assignedTo] = personStats[assignedTo] || {
              total: 0,
              incomplete: 0,
            };
            monthlyStats[month] = monthlyStats[month] || {
              total: 0,
              incomplete: 0,
            };
            monthPersonStats[month] = monthPersonStats[month] || {};
            monthPersonStats[month][assignedTo] = monthPersonStats[month][
              assignedTo
            ] || { total: 0, incomplete: 0 };

            personStats[assignedTo].total++;
            monthlyStats[month].total++;
            monthPersonStats[month][assignedTo].total++;
          });

          incomplete.forEach((inc) => {
            const month = getMonthFromDate(inc.opened);
            const assignedTo = inc.assignedTo || "Not Assigned";

            personStats[assignedTo].incomplete++;
            monthlyStats[month].incomplete++;
            monthPersonStats[month][assignedTo].incomplete++;
          });

          totalRows += dataRows.length;
          totalIncomplete += incomplete.length;
          allIncomplete.push(...incomplete);
        }

        setIncompleteRows(allIncomplete);
        setPersonAccuracyMap(personStats);
        setMonthlyAccuracyMap(monthlyStats);
        setMonthlyPersonAccuracyMap(monthPersonStats);
        setAccuracyPercentage(calculateAccuracy(totalRows, totalIncomplete));
        setUploadedMonthOptions(Array.from(uniqueUploadedMonths).sort()); // Sort for consistent display
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) return <p>Loading ticket issuance data...</p>;
  if (error) return <p className="text-red-600">Error: {error.message}</p>;

  const filteredRows = incompleteRows.filter((row) => {
    const nameMatch = (row.assignedTo || "Not Assigned")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const ticketNumberMatch =
      row.number &&
      String(row.number).toLowerCase().includes(searchTerm.toLowerCase());

    const openedMonthMatch =
      !selectedMonth || getMonthFromDate(row.opened) === selectedMonth;

    const uploadedMonthMatch =
      !selectedUploadedMonth || row.uploadedMonth === selectedUploadedMonth;

    return (
      (nameMatch || ticketNumberMatch) && openedMonthMatch && uploadedMonthMatch
    );
  });

  const uniqueOpenedMonths = Array.from(
    new Set(incompleteRows.map((r) => getMonthFromDate(r.opened)))
  );

  const getPersonAccuracy = (name) => {
    if (selectedMonth && monthlyPersonAccuracyMap[selectedMonth]) {
      const person = monthlyPersonAccuracyMap[selectedMonth][name] || {
        total: 0,
        incomplete: 0,
      };
      return calculateAccuracy(person.total, person.incomplete);
    }
    const person = personAccuracyMap[name] || { total: 0, incomplete: 0 };
    return calculateAccuracy(person.total, person.incomplete);
  };

  const getMonthAccuracy = (month) => {
    const stats = monthlyAccuracyMap[month] || { total: 0, incomplete: 0 };
    return calculateAccuracy(stats.total, stats.incomplete);
  };

  const displayAccuracy = selectedMonth
    ? getMonthAccuracy(selectedMonth)
    : accuracyPercentage;

  const tableMap = selectedMonth
    ? monthlyPersonAccuracyMap[selectedMonth] || {}
    : personAccuracyMap;

  const sortedEntries = Object.entries(tableMap).sort((a, b) => {
    const accA = parseFloat(calculateAccuracy(a[1].total, a[1].incomplete));
    const accB = parseFloat(calculateAccuracy(b[1].total, b[1].incomplete));
    return sortOrder === "asc" ? accA - accB : accB - accA;
  });

  return (
    <div className="mb-10 mt-10">
      <div className="flex flex-col lg:flex-row gap-6 bg-white p-4 rounded-lg shadow">
        {/* Left: Accuracy Overview */}
        <div className="lg:basis-1/4">
          <h3 className="font-semibold mb-2">Ticket Issuance Accuracy</h3>
          <AccuracyProgress percentage={parseFloat(displayAccuracy)} />
        </div>

        {/* Right: Incomplete Rows */}
        <div className="lg:basis-3/4">
          <h4 className="flex items-center gap-2 font-semibold text-yellow-600">
            <ExclamationCircleIcon className="h-5 w-5" />
            Incomplete Data – Requires Attention
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
            <select
              className="flex-1 p-2 border rounded-lg"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setExpandedIndex(null);
              }}
            >
              <option value="">All Opened Months</option>
              {uniqueOpenedMonths.map((month) => (
                <option key={month} value={month}>
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
          </div>

          {/* Incomplete Row Cards */}
          <div className="space-y-4 max-h-96 overflow-y-auto mb-5">
            {filteredRows.length > 0 ? (
              filteredRows.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3 border rounded-lg cursor-pointer"
                  onClick={() =>
                    setExpandedIndex(expandedIndex === idx ? null : idx)
                  }
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold">#{row.number}</p>
                      <p className=" text-m text-black-600">
                        Assigned To: {row.assignedTo}
                      </p>
                      <p className="text-sm text-gray-600">
                        Opened: {row.opened}
                      </p>
                      <p className="text-sm text-gray-600">
                        Added on: {formatDateTimeFromISO(row.fileUploadedDate)}
                      </p>
                    </div>
                    {expandedIndex === idx ? (
                      <ChevronUpIcon className="w-5 h-5" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5" />
                    )}
                  </div>
                  {expandedIndex === idx && (
                    <div>
                      <p className="text-sm text-gray-600">
                        Accuracy Percentage: {getPersonAccuracy(row.assignedTo)}
                        %
                      </p>
                      <p className=" text-sm text-red-600">
                        Missing: {row.missingColumns.join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500">
                No incomplete rows found matching the filters.
              </p>
            )}
          </div>
        </div>
      </div>
      {/* Accuracy Table */}
      <div className="mt-10">
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

              <th className="border px-4 py-2 text-left">Accuracy Percentage</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map(([name, stats]) => {
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
                        className={`${color} h-4 rounded-full text-xs text-white text-center`}
                        style={{ width: `${accuracy}%` }}
                      >
                        {accuracy}%
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TicketIssuance;
