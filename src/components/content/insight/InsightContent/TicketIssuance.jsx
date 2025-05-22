// src/components/TicketIssuance.jsx
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import AccuracyProgress from "../../InsightsContent/AccuracyProgress";
import supabase from "../../../../backend/supabase/supabase";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";

function TicketIssuance() {
  // ─── All React Hooks ────────────────────────────────────────────────
  const [accuracyPercentage, setAccuracyPercentage] = useState("0.00");
  const [incompleteRows, setIncompleteRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [expandedIndex, setExpandedIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  // ─── Utilities ───────────────────────────────────────────────────────
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

  const getIncompleteRows = (rows, headers) => {
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

  // ─── Fetch Data ──────────────────────────────────────────────────────
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

        for (const file of files) {
          const {
            data: { publicUrl },
          } = supabase.storage
            .from("uploads")
            .getPublicUrl(`excels/${file.name}`);

          const res = await fetch(publicUrl);
          const buf = await res.arrayBuffer();
          const workbook = XLSX.read(buf, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            header: 1,
          });

          if (sheet.length <= 1) continue;

          const headers = sheet[0];
          const incomplete = getIncompleteRows(sheet, headers);
          totalRows += sheet.length - 1;
          totalIncomplete += incomplete.length;
          allIncomplete.push(...incomplete);
        }

        setIncompleteRows(allIncomplete);
        setAccuracyPercentage(calculateAccuracy(totalRows, totalIncomplete));
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // ─── Handle Loading & Errors ─────────────────────────────────────────
  if (isLoading) return <p>Loading ticket issuance data...</p>;
  if (error) return <p className="text-red-600">Error: {error.message}</p>;

  // ─── Filtering ───────────────────────────────────────────────────────
  const filteredRows = incompleteRows.filter((row) => {
    const nameMatch = (row.assignedTo || "Not Assigned")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const monthMatch =
      !selectedMonth || getMonthFromDate(row.opened) === selectedMonth;
    return nameMatch && monthMatch;
  });

  const uniqueMonths = Array.from(
    new Set(incompleteRows.map((r) => getMonthFromDate(r.opened)))
  );

  // ─── JSX Render ──────────────────────────────────────────────────────
  return (
    <div className="mb-10">
      <div className="flex flex-col lg:flex-row gap-6  bg-white p-4 rounded-lg shadow">
        {/* Left: Accuracy Overview */}
        <div className="flex-1">
          <h3 className="font-semibold mb-2">Ticket Issuance Accuracy</h3>
          <AccuracyProgress percentage={parseFloat(accuracyPercentage)} />
        </div>

        {/* Right: Incomplete Rows */}
        <div className="flex-1">
          <h4 className="flex items-center gap-2 font-semibold text-yellow-600">
            <ExclamationCircleIcon className="h-5 w-5" />
            Incomplete Data – Requires Attention{" "}
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
            <select
              className="flex-1 p-2 border rounded-lg"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setExpandedIndex(null);
              }}
            >
              <option value="">All Months</option>
              {uniqueMonths.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          {/* Incomplete Row Cards */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
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
                      <p className="mt-2 text-m text-black-600">
                        Assigned To: {row.assignedTo}
                      </p>
                      <p className="text-sm text-gray-600">{row.opened}</p>
                      <p className="text-sm text-gray-600"> Accuracy Percentage: {} </p>
                    </div>
                    {expandedIndex === idx ? (
                      <ChevronUpIcon className="w-5 h-5" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5" />
                    )}
                  </div>
                  {expandedIndex === idx && (
                    <p className="mt-2 text-sm text-red-600">
                      Missing: {row.missingColumns.join(", ")}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500">No incomplete rows found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketIssuance;
