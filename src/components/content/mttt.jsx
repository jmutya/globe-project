import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";
import supabase from "../../backend/supabase/supabase";

// Convert Excel date to ISO format
const convertExcelDate = (value) => {
  if (typeof value === "string") {
    const cleaned = value.replace(/\s+/g, " ").trim();
    const [datePart, timePart, ampm] = cleaned.split(" ");
    if (!datePart || !timePart || !ampm) return "";

    const [day, month, year] = datePart.split("/");
    let [hour, minute, second] = timePart.split(":").map(Number);

    if (ampm.toLowerCase() === "pm" && hour < 12) hour += 12;
    if (ampm.toLowerCase() === "am" && hour === 12) hour = 0;

    const date = new Date(
      `${year}-${month}-${day}T${String(hour).padStart(2, "0")}:${minute}:${second}`
    );
    return !isNaN(date) ? date.toISOString() : "";
  }

  if (typeof value === "number") {
    const millisecondsPerDay = 86400000;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * millisecondsPerDay);
    return date.toISOString();
  }

  return "";
};

// Read and parse Excel file from Supabase
const processExcelData = async (fileUrl) => {
  const response = await fetch(fileUrl);
  const blob = await response.arrayBuffer();
  const workbook = XLSX.read(blob, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
};

// Fetch data from Supabase
const fetchReportedAndCreated = async () => {
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

  return allData.map((row) => {
    const reportedRaw = row["Reported"];
    const createdRaw = row["Created"];
    const caller = row["Caller"];
    const number = row["Number"];

    const reportedISO = convertExcelDate(reportedRaw);
    const createdISO = convertExcelDate(createdRaw);

    let mttt = "N/A";
    if (reportedISO && createdISO) {
      const reportedDate = new Date(reportedISO);
      const createdDate = new Date(createdISO);
      const diffInMs = createdDate - reportedDate;
      mttt = (diffInMs / (1000 * 60)).toFixed(2);
    }

    return {
      caller,
      number,
      reported: reportedISO.replace("T", " ").slice(0, 19),
      created: createdISO.replace("T", " ").slice(0, 19),
      mttt,
    };
  });
};

const ReportedCreatedTable = () => {
  const [reportData, setReportData] = useState([]);
  const [evaluationFilter, setEvaluationFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState({
    column: "ticketcount",
    direction: "asc",
  });

  useEffect(() => {
    const getReportData = async () => {
      const data = await fetchReportedAndCreated();
      setReportData(data);
    };
    getReportData();
  }, []);

  // Group by caller and compute average MTTT
  const groupedByCaller = reportData.reduce((acc, item) => {
    if (!acc[item.caller]) acc[item.caller] = { totalMTTT: 0, count: 0 };
    const val = parseFloat(item.mttt);
    if (!isNaN(val)) {
      acc[item.caller].totalMTTT += val;
      acc[item.caller].count += 1;
    }
    return acc;
  }, {});

  const totalMTTTByCaller = Object.entries(groupedByCaller).map(
    ([caller, data]) => ({
      caller,
      totalMTTT: (data.totalMTTT / data.count).toFixed(2),
      ticketcount: data.count,
    })
  );

  // Filter passed/failed
  const filteredRows = totalMTTTByCaller.filter((item) => {
    if (evaluationFilter === "All") return true;
    const passed = parseFloat(item.totalMTTT) < 16;
    return evaluationFilter === "Passed" ? passed : !passed;
  });

  // Sort
  const sortedData = [...filteredRows].sort((a, b) => {
    if (sortConfig.column === "ticketcount") {
      return sortConfig.direction === "asc"
        ? a.ticketcount - b.ticketcount
        : b.ticketcount - a.ticketcount;
    }
    return 0;
  });

  // Format minutes → d/h/m/s
  const formatMinutesToHMS = (minutes) => {
    const num = parseFloat(minutes);
    if (isNaN(num)) return "N/A";
    const secs = Math.floor(num * 60);
    const days = Math.floor(secs / 86400);
    const hrs = Math.floor((secs % 86400) / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const rem = secs % 60;
    return [
      days > 0 && `${days}d`,
      hrs > 0 && `${hrs}h`,
      mins > 0 && `${mins}m`,
      rem > 0 && `${rem}s`,
    ]
      .filter(Boolean)
      .join(" ") || "0s";
  };

  const handleSort = (col) => {
    const dir =
      sortConfig.column === col && sortConfig.direction === "asc"
        ? "desc"
        : "asc";
    setSortConfig({ column: col, direction: dir });
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = sortedData.map((item) => ({
      Caller: item.caller,
      "Assigned Tickets": item.ticketcount,
      MTTT: formatMinutesToHMS (item.totalMTTT),
      Evaluation: parseFloat(item.totalMTTT) < 16 ? "Passed" : "Failed",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "MTTT by Caller");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      "mttt_report.xlsx"
    );
  };

  // Compute overall average for header
  const validRows = reportData.filter((r) => !isNaN(parseFloat(r.mttt)));
  const avg =
    validRows.reduce((sum, r) => sum + parseFloat(r.mttt), 0) /
    (validRows.length || 1);

  return (
    <div className="max-h-[850px] overflow-auto border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
      {/* Overall Average */}
      <div className="overflow-y-auto max-h-[300px] rounded-xl p-6 bg-gray-50 mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <h3 className="text-lg font-medium text-gray-600">Overall Average MTTT</h3>
          <span className="inline-block text-lg font-semibold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-xl">
            {formatMinutesToHMS(avg)}
          </span>
        </div>
      </div>

      {/* Filters & Export */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          {["All", "Passed", "Failed"].map((t) => (
            <button
              key={t}
              onClick={() => setEvaluationFilter(t)}
              className={`px-4 py-1.5 text-sm rounded-lg border ${
                evaluationFilter === t
                  ? "bg-indigo-300 text-white"
                  : "bg-white text-gray-700 hover:bg-indigo-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={handleExportExcel}
          className="bg-green-500 text-white text-sm px-4 py-1.5 rounded-lg shadow hover:bg-green-600 transition"
        >
          Export as Excel
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">MTTT by Caller</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-indigo-50">
            <tr>
              <th className="px-6 py-3 text-left text-indigo-700 uppercase tracking-wider">
                Caller
              </th>
              <th
                className="px-6 py-3 text-center text-indigo-700 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("ticketcount")}
              >
                Number of Assigned Tickets{" "}
                {sortConfig.column === "ticketcount" && (
                  sortConfig.direction === "asc" ? (
                    <FaArrowUp className="inline-block ml-2" />
                  ) : (
                    <FaArrowDown className="inline-block ml-2" />
                  )
                )}
              </th>
              <th className="px-6 py-3 text-center text-indigo-700 uppercase tracking-wider">
                MTTT
              </th>
              <th className="px-6 py-3 text-center text-indigo-700 uppercase tracking-wider">
                Evaluation
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((item, idx) => {
              const passed = parseFloat(item.totalMTTT) < 16;
              return (
                <tr key={idx} className="hover:bg-indigo-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{item.caller}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-900">
                    {item.ticketcount}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-900">
                    {formatMinutesToHMS(item.totalMTTT)}
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {passed ? "Passed" : "Failed"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportedCreatedTable;
