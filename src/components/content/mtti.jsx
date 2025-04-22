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

const fetchmtti = async () => {
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
      mtti = parseFloat((diffInMtti / (1000 * 60)).toFixed(2)); // ✅ Convert to number
    }

    return {
      caller: caller,
      number: number,
      ic: icISO ? icISO.replace("T", " ").slice(0, 19) : "",
      reported: reportedISO ? reportedISO.replace("T", " ").slice(0, 19) : "",
      mtti,
    };
  });

  return reportData;
};

function MttiTable() {
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    const getReportData = async () => {
      const data = await fetchmtti();
      setReportData(data);
    };

    getReportData();
  }, []);

  // Group data by caller and calculate total MTTI per caller
  const groupedByCaller = reportData.reduce((acc, item) => {
    if (!acc[item.caller]) {
      acc[item.caller] = { totalMTTI: 0, count: 0 };
    }

    const mttiValue = parseFloat(item.mtti); // ✅ corrected from mttt
    if (!isNaN(mttiValue)) {
      acc[item.caller].totalMTTI += mttiValue;
      acc[item.caller].count += 1;
    }

    return acc;
  }, {});

  const totalMTTIByCaller = Object.entries(groupedByCaller).map(
    ([caller, data]) => {
      const avgMTTI = (data.totalMTTI / data.count).toFixed(2);
      return { caller, totalMTTI: avgMTTI, ticketcount: data.count };
    }
  );

  const totalMTTI = reportData
    .reduce((sum, item) => {
      const value = parseFloat(item.mtti);
      return !isNaN(value) ? sum + value : sum;
    }, 0)
    .toFixed(2);

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

  const validRows = reportData.filter((item) => !isNaN(parseFloat(item.mtti)));
  const averageMTTIinMinutes =
    validRows.length > 0 ? totalMTTI / validRows.length : 0;
  const averageFormatted = formatMinutesToHMS(averageMTTIinMinutes);

  return (
    <div className="max-h-[1100px] overflow-auto border rounded p-4">
      <div className="flex justify-center items-center overflow-y-auto max-h-[300px] rounded-xl p-6 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-base font-medium text-gray-600 tracking-wide">
            Overall Average MTTI
          </h3>
          <span className="inline-block text-lg font-semibold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-xl shadow-sm">
            {averageFormatted}
          </span>
        </div>
      </div>

      {/* <div className="max-h-[600px] overflow-auto border rounded p-4 mb-10">
        <h3 className="text-lg font-semibold mb-4">
          First Touched Resolution (FTR) Report
        </h3>
        <table className="min-w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Ticket Number</th>
              <th className="border px-4 py-2">Caller</th>
              <th className="border px-4 py-2">Investigation Completed</th>
              <th className="border px-4 py-2">Reported</th>
              <th className="border px-4 py-2">MTTI</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, idx) => (
              <tr key={idx}>
                <td className="border px-4 py-2">{item.number}</td>
                <td className="border px-4 py-2">{item.caller}</td>
                <td className="border px-4 py-2">{item.ic}</td>
                <td className="border px-4 py-2">{item.reported}</td>
                <td className="border px-4 py-2 text-center">
                  {formatMinutesToHMS(item.mtti)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> */}

      <div className="overflow-y-auto max-h-[700px] border rounded-lg shadow-lg p-6 bg-white">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">
          MTTI by Caller
        </h3>
        <table className="min-w-full table-auto border-separate border-spacing-0">
          <thead>
            <tr className="bg-gray-100 text-sm text-gray-700">
              <th className="px-6 py-3 text-left font-medium">Caller</th>
              <th className="px-6 py-3 text-center font-medium">
                # of Assigned Tickets
              </th>
              <th className="px-6 py-3 text-center font-medium">MTTI</th>
              <th className="px-6 py-3 text-center font-medium">Evaluation</th>
            </tr>
          </thead>
          <tbody>
            {totalMTTIByCaller.map((item, idx) => {
              const evaluationPassed = parseFloat(item.totalMTTI) < 16;
              return (
                <tr
                  key={idx}
                  className="hover:bg-gray-50 transition duration-200"
                >
                  <td className="px-6 py-4 text-gray-800">{item.caller}</td>
                  <td className="px-6 py-4 text-center text-gray-600">
                    {item.ticketcount}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600">
                    {formatMinutesToHMS(item.totalMTTI)}
                  </td>
                  <td
                    className={`px-6 py-4 text-center font-semibold ${
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

export default MttiTable;
