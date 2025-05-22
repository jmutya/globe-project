import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import supabase from "../../backend/supabase/supabase";

const processExcelData = async (fileUrl) => {
  const response = await fetch(fileUrl);
  const blob = await response.arrayBuffer();
  const workbook = XLSX.read(blob, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
};

const fetchftr = async () => {
  const { data: files, error } = await supabase.storage
    .from("uploads")
    .list("excels");

  if (error) return console.error("Supabase error:", error);

  let allData = [];

  for (const file of files) {
    const { data: fileUrl } = supabase.storage
      .from("uploads")
      .getPublicUrl(`excels/${file.name}`);

    const sheet = await processExcelData(fileUrl.publicUrl);
    allData = [...allData, ...sheet];
  }

  const filteredResolutionCodes = allData.filter(
    (row) => row["Resolution code"]?.trim() === "Closed/Resolved by Caller"
  );

  return { allData, filteredResolutionCodes };
};

function ftrTable() {
  const [ticketsPerCaller, setTicketsPerCaller] = useState([]);
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    const getReportData = async () => {
      const { filteredResolutionCodes } = await fetchftr();

      const counts = filteredResolutionCodes.reduce((acc, row) => {
        const caller = row["Caller"] || "Unknown";
        acc[caller] = (acc[caller] || 0) + 1;
        return acc;
      }, {});

      const ticketStats = Object.entries(counts).map(([caller, count]) => ({
        caller,
        totalTickets: count,
      }));

      setTicketsPerCaller(ticketStats);
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
    // Create a new workbook and append the table data
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(ticketsPerCaller);
    XLSX.utils.book_append_sheet(wb, ws, "Tickets Per Caller");

    // Generate and download
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
        {/* Export Button */}
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

export default ftrTable;
