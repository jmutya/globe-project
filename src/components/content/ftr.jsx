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

    const ftrValue = parseFloat(item.ftr);
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

  const formatMinutesToHMS = (minutes) => {
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

  return (
    <div>
      <div className="max-h-[600px] overflow-auto border rounded p-4 mb-10">
        <h3 className="text-lg font-semibold mb-4">
          First Touched Resolution (FTR) Report
        </h3>
        <table className="min-w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Ticket Number</th>
              <th className="border px-4 py-2">Caller</th>
              <th className="border px-4 py-2">Closed</th>
              <th className="border px-4 py-2">Resolved</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, idx) => (
              <tr key={idx}>
                <td className="border px-4 py-2">{item.number}</td>
                <td className="border px-4 py-2">{item.caller}</td>
                <td className="border px-4 py-2">{item.closed}</td>
                <td className="border px-4 py-2">{item.resolved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-y-auto max-h-[700px] border rounded p-4">
        <h3 className="text-lg font-semibold mb-2">FTR by Caller</h3>
        <table className="min-w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Caller</th>
              <th className="border px-4 py-2"># of Assigned Tickets</th>
              <th className="border px-4 py-2">FTR</th>
              <th className="border px-4 py-2">Evaluation</th>
            </tr>
          </thead>
          <tbody>
            {totalftrByCaller.map((item, idx) => {
              const evaluationPassed = parseFloat(item.totalftr) < 16;
              return (
                <tr key={idx}>
                  <td className="border px-4 py-2">{item.caller}</td>
                  <td className="border px-4 py-2 text-center">
                    {item.ticketcount}
                  </td>
                  <td className="border px-4 py-2 text-center">
                    {formatMinutesToHMS(item.totalftr)}
                  </td>
                  <td
                    className={`border px-4 py-2 text-center font-semibold ${
                      evaluationPassed ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {evaluationPassed ? "Passed" : "Failed"}
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
