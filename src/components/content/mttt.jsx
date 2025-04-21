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
      return date.toISOString(); // full ISO string
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

// Process Excel file and return JSON
const processExcelData = async (fileUrl) => {
  const response = await fetch(fileUrl);
  const blob = await response.arrayBuffer();
  const workbook = XLSX.read(blob, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
};

// Fetch and process data
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

  const reportData = allData.map((row) => {
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
      mttt = (diffInMs / (1000 * 60)).toFixed(2); // MTTT in minutes
    }

    return {
      caller: caller,
      number: number,
      reported: reportedISO.replace("T", " ").slice(0, 19),
      created: createdISO.replace("T", " ").slice(0, 19),
      mttt,
    };
  });

  return reportData;
};

// Component
const ReportedCreatedTable = () => {
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    const getReportData = async () => {
      const data = await fetchReportedAndCreated();
      setReportData(data);
    };

    getReportData();
  }, []);

  // Group data by caller and calculate total MTTT per caller
  const groupedByCaller = reportData.reduce((acc, item) => {
    if (!acc[item.caller]) {
      acc[item.caller] = { totalMTTT: 0, count: 0 };
    }

    const mtttValue = parseFloat(item.mttt);
    if (!isNaN(mtttValue)) {
      acc[item.caller].totalMTTT += mtttValue;
      acc[item.caller].count += 1;
    }

    return acc;
  }, {});

  // Calculate total MTTT per caller
  const totalMTTTByCaller = Object.entries(groupedByCaller).map(
    ([caller, data]) => {
      const avgMTTT = (data.totalMTTT / data.count).toFixed(2); // Average MTTT for each caller
      return { caller, totalMTTT: avgMTTT , ticketcount: data.count};
    }
  );

  const totalMTTT = reportData
    .reduce((sum, item) => {
      const value = parseFloat(item.mttt);
      return !isNaN(value) ? sum + value : sum;
    }, 0)
    .toFixed(2);

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

  const validRows = reportData.filter((item) => !isNaN(parseFloat(item.mttt)));
  const averageMTTTinMinutes =
    validRows.length > 0 ? totalMTTT / validRows.length : 0;

  const averageFormatted = formatMinutesToHMS(averageMTTTinMinutes);

  return (
    <>
   <div className="max-h-[1100px] overflow-auto border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
  {/* Overall Average MTTT */}
 <div className="overflow-y-auto max-h-[300px] rounded-xl p-6 bg-gray-50">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <h3 className="text-base font-medium text-gray-600 tracking-wide">
      Overall Average MTTT
    </h3>
    <span className="inline-block text-lg font-semibold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-xl shadow-sm">
      {averageFormatted}
    </span>
  </div>
</div>



  {/* <div className="max-h-[600px] overflow-auto border rounded p-4 mb-10">
    <h3 className="text-lg font-semibold mb-4">
      Reported, Created, and MTTT (with time)
    </h3>
    <table className="min-w-full table-auto border-collapse border border-gray-300">
      <thead>
        <tr className="bg-gray-100">
          <th className="border px-4 py-2">Ticket Number</th>
          <th className="border px-4 py-2">Caller</th>
          <th className="border px-4 py-2">Reported</th>
          <th className="border px-4 py-2">Created</th>
          <th className="border px-4 py-2">MTTT (Minutes)</th>
        </tr>
      </thead>
      <tbody>
        {reportData.map((item, idx) => (
          <tr key={idx}>
            <td className="border px-4 py-2">{item.number}</td>
            <td className="border px-4 py-2">{item.caller}</td>
            <td className="border px-4 py-2">{item.reported}</td>
            <td className="border px-4 py-2">{item.created}</td>
            <td className="border px-4 py-2 text-center">
              {formatMinutesToHMS(item.mttt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div> */}

  {/* MTTT by Caller Table */}
  <div className="overflow-x-auto">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">MTTT by Caller</h3>
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-indigo-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Caller</th>
          <th className="px-6 py-3 text-center text-xs font-medium text-indigo-700 uppercase tracking-wider"># of Assigned Tickets</th>
          <th className="px-6 py-3 text-center text-xs font-medium text-indigo-700 uppercase tracking-wider">MTTT</th>
          <th className="px-6 py-3 text-center text-xs font-medium text-indigo-700 uppercase tracking-wider">Evaluation</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {totalMTTTByCaller.map((item, idx) => {
          const evaluationPassed = parseFloat(item.totalMTTT) < 16;
          return (
            <tr key={idx} className="hover:bg-gray-100">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.caller}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{item.ticketcount}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{formatMinutesToHMS(item.totalMTTT)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${evaluationPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {evaluationPassed ? 'Passed' : 'Failed'}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</div>  
  


    </>
  );
};

export default ReportedCreatedTable;
