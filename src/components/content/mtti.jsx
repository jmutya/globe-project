import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";

// Convert Excel Date to ISO String
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
    if (!isNaN(date)) return date.toISOString();
  }

  if (typeof value === "number") {
    const millisecondsPerDay = 86400000;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * millisecondsPerDay);
    return date.toISOString();
  }

  return "";
};

const processExcelData = async (fileUrl) => {
  const response = await fetch(fileUrl);
  const blob = await response.arrayBuffer();
  const workbook = XLSX.read(blob, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
};

const fetchmtti = async () => {
  const { data: files, error } = await supabase.storage.from("uploads").list("excels");
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
    const icRaw = row["Investigation Completed"];
    const reportedRaw = row["Reported"];
    const caller = row["Caller"];
    const number = row["Number"];

    const icISO = convertExcelDate(icRaw);
    const reportedISO = convertExcelDate(reportedRaw);

    let mtti = null;
    if (icISO && reportedISO) {
      const icDate = new Date(icISO);
      const reportedDate = new Date(reportedISO);
      const diffInMtti = icDate - reportedDate;
      mtti = parseFloat((diffInMtti / (1000 * 60)).toFixed(2));
    }

    return {
      caller,
      number,
      ic: icISO ? icISO.replace("T", " ").slice(0, 19) : "",
      reported: reportedISO ? reportedISO.replace("T", " ").slice(0, 19) : "",
      mtti,
    };
  });
};

function MttiTable() {
  const [reportData, setReportData] = useState([]);
  const [evaluationFilter, setEvaluationFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState({ column: "ticketcount", direction: "asc" });

  useEffect(() => {
    const getReportData = async () => {
      const data = await fetchmtti();
      setReportData(data);
    };
    getReportData();
  }, []);

  const groupedByCaller = reportData.reduce((acc, item) => {
    if (!acc[item.caller]) acc[item.caller] = { totalMTTI: 0, count: 0 };
    const mttiValue = parseFloat(item.mtti);
    if (!isNaN(mttiValue)) {
      acc[item.caller].totalMTTI += mttiValue;
      acc[item.caller].count += 1;
    }
    return acc;
  }, {});

  const totalMTTIByCaller = Object.entries(groupedByCaller).map(([caller, data]) => {
    const avgMTTI = (data.totalMTTI / data.count).toFixed(2);
    return { caller, totalMTTI: avgMTTI, ticketcount: data.count };
  });

  const filteredMTTIData = totalMTTIByCaller.filter((item) => {
    if (evaluationFilter === "All") return true;
    const isPassed = parseFloat(item.totalMTTI) < 16;
    return evaluationFilter === "Passed" ? isPassed : !isPassed;
  });

  const totalMTTI = reportData.reduce((sum, item) => {
    const value = parseFloat(item.mtti);
    return !isNaN(value) ? sum + value : sum;
  }, 0);

  const validRows = reportData.filter((item) => !isNaN(parseFloat(item.mtti)));
  const averageMTTIinMinutes = validRows.length > 0 ? totalMTTI / validRows.length : 0;

  const formatMinutesToHMS = (minutes) => {
    const numMinutes = parseFloat(minutes);
    if (isNaN(numMinutes)) return "N/A";
    const totalSeconds = Math.floor(numMinutes * 60);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hrs = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.length > 0 ? parts.join(" ") : "0s";
  };

  const handleSort = (column) => {
    let direction = "asc";
    if (sortConfig.column === column && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ column, direction });
  };

  const sortedData = [...filteredMTTIData].sort((a, b) => {
    if (sortConfig.column === "ticketcount") {
      return sortConfig.direction === "asc"
        ? a.ticketcount - b.ticketcount
        : b.ticketcount - a.ticketcount;
    }
    return 0;
  });

  const exportToCSV = () => {
    const headers = ["Caller", "# of Assigned Tickets", "MTTI", "Evaluation"];
    const rows = sortedData.map((item) => [
      item.caller,
      item.ticketcount,
      formatMinutesToHMS(item.totalMTTI),
      parseFloat(item.totalMTTI) < 16 ? "Passed" : "Failed",
    ]);

    const csvContent =
      [headers, ...rows]
        .map((e) => e.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "mtti_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-h-[850px] overflow-auto border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
      <div className="foverflow-y-auto max-h-[300px] rounded-xl p-6 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-base font-medium text-gray-600 tracking-wide">
            Overall Average MTTI
          </h3>
          <span className="inline-block text-lg font-semibold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-xl shadow-sm">
            {formatMinutesToHMS(averageMTTIinMinutes)}
          </span>
        </div>
      </div>

      {/* Filters & Export */}
      <div className="flex flex-wrap justify-between items-center my-4">
        <div className="flex space-x-2">
          {["All", "Passed", "Failed"].map((type) => (
            <button
              key={type}
              onClick={() => setEvaluationFilter(type)}
              className={`px-4 py-1.5 text-sm rounded-lg border ${
                evaluationFilter === type
                  ? "bg-indigo-300 text-white border-indigo-300"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-indigo-50"
              } transition`}
            >
              {type}
            </button>
          ))}
        </div>

        <button
          onClick={exportToCSV}
          className="bg-green-500 text-white text-sm px-4 py-1.5 rounded-lg shadow hover:bg-green-600 transition"
        >
          Export as Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">MTTI by Caller</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-indigo-50">
            <tr>
              <th className="px-6 py-3 text-left text-s font-medium text-indigo-700 uppercase tracking-wider">
                Caller
              </th>
              <th
                className="px-6 py-3 text-center text-s font-medium text-indigo-700 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("ticketcount")}
              >
                # of Assigned Tickets{" "}
                {sortConfig.column === "ticketcount" && (
                  <span>
                    {sortConfig.direction === "asc" ? (
                      <FaArrowUp className="inline-block ml-2" />
                    ) : (
                      <FaArrowDown className="inline-block ml-2" />
                    )}
                  </span>
                )}
              </th>
              <th className="px-6 py-3 text-center text-s font-medium text-indigo-700 uppercase tracking-wider">
                MTTI
              </th>
              <th className="px-6 py-3 text-center text-s font-medium text-indigo-700 uppercase tracking-wider">
                Evaluation
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((item, idx) => {
              const evaluationPassed = parseFloat(item.totalMTTI) < 16;
              return (
                <tr key={idx} className="hover:bg-indigo-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.caller}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {item.ticketcount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {formatMinutesToHMS(item.totalMTTI)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        evaluationPassed
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {evaluationPassed ? "Passed" : "Failed"}
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
}

export default MttiTable;
