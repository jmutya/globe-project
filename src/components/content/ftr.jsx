// src/components/FtrTable.jsx

import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { fetchFtrData } from "../../backend/mtfunctions/ftrfunction";

const CACHE_KEY = "ftrTicketsCache";
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour

function FtrTable() {
  const [ticketsPerCaller, setTicketsPerCaller] = useState([]);
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    const getReportData = async () => {
      const now = Date.now();

      // Try to load cached tickets
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { timestamp, data } = JSON.parse(cached);
          if (timestamp && now - timestamp < CACHE_DURATION_MS && data) {
            console.log("⚡ Using cached ticket stats");
            setTicketsPerCaller(data);
            return;
          }
        } catch (err) {
          console.warn("⚠️ Error parsing cache", err);
        }
      }

      console.log("📡 Fetching fresh FTR data from backend");
      const { filteredResolutionCodes } = await fetchFtrData();

      const counts = filteredResolutionCodes.reduce((acc, row) => {
        const caller = row["caller_id"] || "Unknown";
        acc[caller] = (acc[caller] || 0) + 1;
        return acc;
      }, {});

      const ticketStats = Object.entries(counts)
        .map(([caller, count]) => ({
          caller,
          totalTickets: count,
        }))
        // MODIFICATION: Filter out "mycom integration user"
        .filter(
          (item) => item.caller.toLowerCase() !== "mycom integration user"
        );

      setTicketsPerCaller(ticketStats);

      // Cache only minimal processed data
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ timestamp: now, data: ticketStats })
        );
      } catch (err) {
        console.warn("⚠️ Failed to cache tickets:", err);
        localStorage.removeItem(CACHE_KEY); // optional: clear on failure
      }
    };

    getReportData();
  }, []);

  const handleSortToggle = () => {
    const newDirection = sortDirection === "asc" ? "desc" : "asc";
    setSortDirection(newDirection);

    const sorted = [...ticketsPerCaller].sort((a, b) => {
      return newDirection === "asc"
        ? a.totalTickets - b.totalTickets
        : b.totalTickets - a.totalTickets;
    });

    setTicketsPerCaller(sorted);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(ticketsPerCaller);
    XLSX.utils.book_append_sheet(wb, ws, "Tickets Per Caller");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      "ftr_report.xlsx"
    );
  };

  return (
    <div className="max-h-[850px] overflow-auto border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
      <div className="foverflow-y-auto max-h-[300px] rounded-xl p-6 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          Total Tickets Per Caller
        </h3>
        <button
          onClick={handleExportExcel}
          className="bg-green-500 text-white text-sm px-4 py-1.5 rounded-lg shadow hover:bg-green-600 transition"
        >
          Export as Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-indigo-50">
            <tr>
              <th className="px-6 py-3 text-left text-s font-medium text-indigo-700 uppercase tracking-wider">
                Caller
              </th>
              <th
                className="px-6 py-3 text-left text-s font-medium text-indigo-700 uppercase tracking-wider cursor-pointer"
                onClick={handleSortToggle}
              >
                Total Tickets {sortDirection === "asc" ? "▲" : "▼"}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ticketsPerCaller.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.caller}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.totalTickets}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FtrTable;