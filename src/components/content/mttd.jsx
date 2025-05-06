import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";

const AlarmOpenedMonths = () => {
  const [alarmData, setAlarmData] = useState([]);
  const [monthlyMissingCount, setMonthlyMissingCount] = useState({});
  const [columnMissingCount, setColumnMissingCount] = useState({});
  const [monthlyColumnMissingCount, setMonthlyColumnMissingCount] = useState({});

  useEffect(() => {
    const fetchAlarmData = async () => {
      try {
        const { data: files, error } = await supabase.storage.from("uploads").list("excels");
        if (error) throw error;

        const tempData = [];
        const monthCounter = {};
        const tempColumnMissingCount = {
          aor001: 0,
          aor002: 0,
          cause: 0,
          failureCategory: 0,
          rfo: 0,
        };
        const tempMonthlyColumnMissingCount = {}; // New

        for (const file of files) {
          const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
          const response = await fetch(fileUrl.publicUrl);
          const blob = await response.arrayBuffer();
          const workbook = XLSX.read(blob, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

          if (sheet.length > 1) {
            const headers = sheet[0];
            const openedIndex = headers.indexOf("Opened");
            const aor001Index = headers.indexOf("AOR001");
            const aor002Index = headers.indexOf("AOR002");
            const rfoIndex = headers.indexOf("Reason For Outage");
            const causeIndex = headers.indexOf("Cause");
            const failureCategoryIndex = headers.indexOf("Failure Category");

            if (openedIndex === -1) continue;

            sheet.slice(1).forEach(row => {
              const opened = row[openedIndex];
              const aor001 = row[aor001Index] || "";
              const aor002 = row[aor002Index] || "";
              const cause = row[causeIndex] || "";
              const rfo = row[rfoIndex] || "";
              const failureCategory = row[failureCategoryIndex] || "";

              const isAnyFieldEmpty = !aor001 || !aor002 || !cause || !failureCategory || !rfo;
              if (!isAnyFieldEmpty) return; // Skip rows where all fields are filled

              let openedFormatted = "";
              let monthYear = "";

              if (typeof opened === "number") {
                const date = new Date((opened - 25569) * 86400 * 1000); // Convert Excel date to JavaScript Date
                const day = String(date.getDate()).padStart(2, "0");
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const year = date.getFullYear();
                openedFormatted = `${day}/${month}/${year}`; // Exclude time
                monthYear = `${month}/${year}`;
              } else if (typeof opened === "string") {
                // If already a string (assume it's in a valid date format like dd/mm/yyyy)
                const dateParts = opened.split(" ")[0].split("/"); // Get only the date part, ignoring time
                if (dateParts.length === 3) {
                  const [ month, day, year] = dateParts;
                  openedFormatted = `${month}/${day}/${year}`; // Exclude time
                  monthYear = `${month}/${year}`;
                }
              }

              // Update monthly missing total
              if (monthYear) {
                if (!monthCounter[monthYear]) monthCounter[monthYear] = 0;
                monthCounter[monthYear] += 1;
              }

              // Update overall missing per column
              if (!aor001) tempColumnMissingCount.aor001 += 1;
              if (!aor002) tempColumnMissingCount.aor002 += 1;
              if (!cause) tempColumnMissingCount.cause += 1;
              if (!failureCategory) tempColumnMissingCount.failureCategory += 1;
              if (!rfo) tempColumnMissingCount.rfo += 1;

              // Update monthly missing per column
              if (monthYear) {
                if (!tempMonthlyColumnMissingCount[monthYear]) {
                  tempMonthlyColumnMissingCount[monthYear] = {
                    aor001: 0,
                    aor002: 0,
                    cause: 0,
                    failureCategory: 0,
                    rfo: 0,
                  };
                }
                if (!aor001) tempMonthlyColumnMissingCount[monthYear].aor001 += 1;
                if (!aor002) tempMonthlyColumnMissingCount[monthYear].aor002 += 1;
                if (!cause) tempMonthlyColumnMissingCount[monthYear].cause += 1;
                if (!failureCategory) tempMonthlyColumnMissingCount[monthYear].failureCategory += 1;
                if (!rfo) tempMonthlyColumnMissingCount[monthYear].rfo += 1;
              }

              tempData.push({
                opened: openedFormatted,
                aor001,
                aor002,
                cause,
                failureCategory,
                rfo,
              });
            });
          }
        }

        setAlarmData(tempData);
        setMonthlyMissingCount(monthCounter);
        setColumnMissingCount(tempColumnMissingCount);
        setMonthlyColumnMissingCount(tempMonthlyColumnMissingCount);
      } catch (error) {
        console.error("Error fetching alarm data:", error);
        setAlarmData([]);
        setMonthlyMissingCount({});
      }
    };

    fetchAlarmData();
  }, []);

  return (
    <div className="p-4 rounded-xl shadow bg-white text-gray-800 space-y-8 overflow-y-auto max-h-[800px]">
      <div>
        <h2 className="text-lg font-semibold mb-4">Alarms Missing Important Data</h2>
        {alarmData.length > 0 ? (
          <>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Opened</th>
                    <th className="p-2 text-left">AOR001</th>
                    <th className="p-2 text-left">AOR002</th>
                    <th className="p-2 text-left">Cause</th>
                    <th className="p-2 text-left">Failure Category</th>
                    <th className="p-2 text-left">RFO</th>
                  </tr>
                </thead>
                <tbody>
                  {alarmData.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{item.opened}</td>
                      <td className="p-2">{item.aor001}</td>
                      <td className="p-2">{item.aor002}</td>
                      <td className="p-2">{item.cause}</td>
                      <td className="p-2">{item.failureCategory}</td>
                      <td className="p-2">{item.rfo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-right font-semibold">
                Total Missing Entries: {alarmData.length}
              </div>
            </div>
          </>
        ) : (
          <p>Loading or no incomplete data found...</p>
        )}
      </div>

      {/* Second Table for Missing Fields Count by Month */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Monthly Missing Fields Summary</h2>
        {Object.keys(monthlyColumnMissingCount).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-2 text-left">Month</th>
                  <th className="p-2 text-left">Missing AOR001</th>
                  <th className="p-2 text-left">Missing AOR002</th>
                  <th className="p-2 text-left">Missing Cause</th>
                  <th className="p-2 text-left">Missing Failure Category</th>
                  <th className="p-2 text-left">Missing RFO</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(monthlyColumnMissingCount)
                  .sort((a, b) => {
                    const [monthA, yearA] = a[0].split("/").map(Number);
                    const [monthB, yearB] = b[0].split("/").map(Number);
                    return yearA !== yearB ? yearA - yearB : monthA - monthB;
                  })
                  .map(([month, counts], idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{month}</td>
                      <td className="p-2">{counts.aor001}</td>
                      <td className="p-2">{counts.aor002}</td>
                      <td className="p-2">{counts.cause}</td>
                      <td className="p-2">{counts.failureCategory}</td>
                      <td className="p-2">{counts.rfo}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Loading summary...</p>
        )}
      </div>
    </div>
  );
};

export default AlarmOpenedMonths;
