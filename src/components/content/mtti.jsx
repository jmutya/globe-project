// src/components/MttiTable.js
import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";
import { fetchMttiData } from "../../backend/mtfunctions/mttifunction"; // <-- Import backend logic

function MttiTable() {
  const [reportData, setReportData] = useState([]);
  const [evaluationFilter, setEvaluationFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState({ column: "ticketcount", direction: "asc" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getReportData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Call the imported function to get data
        const data = await fetchMttiData();
        setReportData(data);
      } catch (err) {
        setError("Failed to load report data. Please try again later.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    getReportData();
  }, []);

  // --- All remaining logic is for UI presentation and calculations ---

  const groupedByCaller = reportData.reduce((acc, item) => {
    if (!acc[item.caller]) {
      acc[item.caller] = { totalMTTI: 0, count: 0 };
    }
    const mttiValue = parseFloat(item.mtti);
    if (!isNaN(mttiValue)) {
      acc[item.caller].totalMTTI += mttiValue;
      acc[item.caller].count += 1;
    }
    return acc;
  }, {});

  const totalMTTIByCaller = Object.entries(groupedByCaller)
    .map(([caller, data]) => {
      const avgMTTI = data.count > 0 ? (data.totalMTTI / data.count).toFixed(2) : "0.00";
      return { caller, totalMTTI: avgMTTI, ticketcount: data.count };
    })
    // MODIFICATION: Filter out "mycom integration user" here
    .filter(
      (item) => item.caller.toLowerCase() !== "mycom integration user"
    );

  const filteredMTTIData = totalMTTIByCaller.filter((item) => {
    if (evaluationFilter === "All") return true;
    const isPassed = parseFloat(item.totalMTTI) < 16;
    return evaluationFilter === "Passed" ? isPassed : !isPassed;
  });

  const sortedData = [...filteredMTTIData].sort((a, b) => {
    if (sortConfig.column === "ticketcount") {
      return sortConfig.direction === "asc"
        ? a.ticketcount - b.ticketcount
        : b.ticketcount - a.ticketcount;
    }
    return 0;
  });

  const validRows = reportData.filter((item) => !isNaN(parseFloat(item.mtti)));
  const totalMTTI = validRows.reduce((sum, item) => sum + parseFloat(item.mtti), 0);
  const averageMTTIinMinutes = validRows.length > 0 ? totalMTTI / validRows.length : 0;

  const formatMinutesToHMS = (minutes) => {
    const numMinutes = parseFloat(minutes);
    if (isNaN(numMinutes) || numMinutes < 0) return "N/A";

    const totalSeconds = Math.floor(numMinutes * 60);
    const days = Math.floor(totalSeconds / 86400);
    const hrs = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const parts = [
      days > 0 && `${days}d`,
      hrs > 0 && `${hrs}h`,
      mins > 0 && `${mins}m`,
      secs > 0 && `${secs}s`
    ].filter(Boolean).join(" ");

    return parts.length > 0 ? parts : "0s";
  };

  const handleSort = (column) => {
    const direction = sortConfig.column === column && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ column, direction });
  };

  const exportToExcel = () => {
    const headers = ["Caller", "# of Assigned Tickets", "MTTI", "Evaluation"];
    const rows = sortedData.map((item) => [
      item.caller,
      item.ticketcount,
      formatMinutesToHMS(item.totalMTTI),
      parseFloat(item.totalMTTI) < 16 ? "Passed" : "Failed",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MTTI Report");
    XLSX.writeFile(workbook, "mtti_report.xlsx");
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-600">Loading Report...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600 bg-red-50 rounded-lg">{error}</div>;
  }

  return (
    <div className="max-h-[850px] overflow-auto border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
      <div className="rounded-xl p-6 bg-gray-50 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-base font-medium text-gray-600 tracking-wide">
            Overall Average MTTI
          </h3>
          <span className="inline-block text-lg font-semibold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-xl shadow-sm">
            {formatMinutesToHMS(averageMTTIinMinutes)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center my-4 gap-4">
        <div className="flex space-x-2">
          {["All", "Passed", "Failed"].map((type) => (
            <button
              key={type}
              onClick={() => setEvaluationFilter(type)}
              className={`px-4 py-1.5 text-sm rounded-lg border transition ${
                evaluationFilter === type
                  ? "bg-indigo-300 text-white border-indigo-300"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-indigo-50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <button
          onClick={exportToExcel}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">
                Caller
              </th>
              <th
                className="px-6 py-3 text-center text-xs font-medium text-indigo-700 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("ticketcount")}
              >
                # of Assigned Tickets
                {sortConfig.column === "ticketcount" && (
                  <span className="ml-2">
                    {sortConfig.direction === "asc" ? <FaArrowUp className="inline-block" /> : <FaArrowDown className="inline-block" />}
                  </span>
                )}
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-indigo-700 uppercase tracking-wider">
                MTTI
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-indigo-700 uppercase tracking-wider">
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