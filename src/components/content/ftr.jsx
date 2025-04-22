import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";

// Custom date parser for "DD/MM/YYYY hh:mm:ss am/pm" format
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
      `${year}-${month}-${day}T${String(hour).padStart(
        2,
        "0"
      )}:${minute}:${second}`
    );
    if (!isNaN(date)) {
      return date.toISOString();
    }
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

  const reportData = allData.map((row) => {
    const closedRaw = row["Closed"];
    const resolvedRaw = row["Resolved"];
    const caller = row["Caller"];
    const number = row["Number"];

    const closedISO = convertExcelDate(closedRaw);
    const resolvedISO = convertExcelDate(resolvedRaw);

    let ftr = "N/A";
    if (closedISO && resolvedISO) {
      const closedDate = new Date(closedISO);
      const resolvedDate = new Date(resolvedISO);
      const diffInMs = closedDate - resolvedDate;
      ftr = (diffInMs / (1000 * 60)).toFixed(2); // in minutes
    }

    return {
      caller: caller,
      number: number,
      closed: closedISO ? closedISO.replace("T", " ").slice(0, 19) : "",
      resolved: resolvedISO ? resolvedISO.replace("T", " ").slice(0, 19) : "",
      ftr,
    };
  });

  return reportData;
};

function ftrTable() {
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    const getReportData = async () => {
      const data = await fetchftr();
      setReportData(data);
    };

    getReportData();
  }, []);

  const groupedByCaller = reportData.reduce((acc, item) => {
    if (!acc[item.caller]) {
      acc[item.caller] = { totalftr: 0, count: 0 };
    }

    const ftrValue = parseFloat(item.ftr); // ✅ corrected from mttt
    if (!isNaN(ftrValue)) {
      acc[item.caller].totalftr += ftrValue;
      acc[item.caller].count += 1;
    }

    return acc;
  }, {});

  const totalftrByCaller = Object.entries(groupedByCaller).map(
    ([caller, data]) => {
      const avgftr = (data.totalftr / data.count).toFixed(2);
      return { caller, totalftr: avgftr, ticketcount: data.count };
    }
  );
  const totalftr = reportData
  .reduce((sum, item) => {
    const value = parseFloat(item.ftr);
    return !isNaN(value) ? sum + value : sum;
  }, 0)
  .toFixed(2);

  const formatMinutesToHMS = (minutes) => {
    const numMinutes = parseFloat(minutes);
    if (isNaN(numMinutes)) return "N/A";
    const totalSeconds = Math.floor(minutes * 60);

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

  const validRows = reportData.filter((item) => !isNaN(parseFloat(item.mtti)));
  const averageftrinMinutes = validRows.length > 0 ? totalftr / validRows.length : 0;
  const averageFormatted = formatMinutesToHMS(averageftrinMinutes);


  return (
    <div className="max-h-[1100px] overflow-auto border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
      <div className="overflow-y-auto max-h-[300px] rounded-xl p-6 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-medium text-gray-600 tracking-wide">
              Overall Average FTR
            </h3>
            <span className="inline-block text-lg font-semibold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-xl shadow-sm">
              {averageFormatted}
            </span>
          </div>
        </div>

      

      <div className="overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">FTR by Caller</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-indigo-50">
            <tr>
              <th className="px-6 py-3 text-left text-s font-medium text-indigo-700 uppercase tracking-wider">Caller</th>
              <th className="px-6 py-3 text-center text-s font-medium text-indigo-700 uppercase tracking-wider"># of Assigned Tickets</th>
              <th className="px-6 py-3 text-center text-s font-medium text-indigo-700 uppercase tracking-wider">FTR</th>
              <th className="px-6 py-3 text-center text-s font-medium text-indigo-700 uppercase tracking-wider">Evaluation</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {totalftrByCaller.map((item, idx) => {
              const evaluationPassed = parseFloat(item.totalftr) < 16;
              return (
                <tr key={idx} className="hover:bg-indigo-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.caller}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {item.ticketcount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {formatMinutesToHMS(item.totalftr)}
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

export default ftrTable;
