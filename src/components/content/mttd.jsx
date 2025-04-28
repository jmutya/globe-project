import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";

const AlarmOpenedMonths = () => {
  const [alarmData, setAlarmData] = useState([]);
  const [monthlyMissingCount, setMonthlyMissingCount] = useState({});

  useEffect(() => {
    const fetchAlarmData = async () => {
      try {
        const { data: files, error } = await supabase.storage.from("uploads").list("excels");
        if (error) throw error;

        const tempData = [];
        const monthCounter = {};

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
            const causeIndex = headers.indexOf("Cause");
            const failureCategoryIndex = headers.indexOf("Failure Category");

            if (openedIndex === -1) continue;

            sheet.slice(1).forEach(row => {
              const opened = row[openedIndex];
              const aor001 = row[aor001Index] || "";
              const aor002 = row[aor002Index] || "";
              const cause = row[causeIndex] || "";
              const failureCategory = row[failureCategoryIndex] || "";

              const isAnyFieldEmpty = !aor001 || !aor002 || !cause || !failureCategory;
              if (!isAnyFieldEmpty) return; // Skip rows where all fields are filled

              let openedFormatted = "";

              if (typeof opened === "number") {
                const date = new Date((opened - 25569) * 86400 * 1000);
                const day = String(date.getDate()).padStart(2, "0");
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const year = date.getFullYear();
                openedFormatted = `${day}/${month}/${year}`;

                // Count missing fields by month
                const monthYear = `${month}/${year}`;
                if (monthCounter[monthYear]) {
                  monthCounter[monthYear] += 1;
                } else {
                  monthCounter[monthYear] = 1;
                }
              } else if (typeof opened === "string") {
                openedFormatted = opened;
              }

              tempData.push({
                opened: openedFormatted,
                aor001,
                aor002,
                cause,
                failureCategory
              });
            });
          }
        }

        setAlarmData(tempData);
        setMonthlyMissingCount(monthCounter);
      } catch (error) {
        console.error("Error fetching alarm data:", error);
        setAlarmData([]);
        setMonthlyMissingCount({});
      }
    };

    fetchAlarmData();
  }, []);

  return (
    <div className="p-4 rounded-xl shadow bg-white text-gray-800 space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-4">Alarms Missing Important Data</h2>
        {alarmData.length > 0 ? (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700 sticky top-0">
                <tr>
                  <th className="p-2 text-left">Opened</th>
                  <th className="p-2 text-left">AOR001</th>
                  <th className="p-2 text-left">AOR002</th>
                  <th className="p-2 text-left">Cause</th>
                  <th className="p-2 text-left">Failure Category</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Loading or no incomplete data found...</p>
        )}
      </div>

      {/* Second Table for Missing Fields Count by Month */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Monthly Missing Fields Summary</h2>
        {Object.keys(monthlyMissingCount).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-2 text-left">Month</th>
                  <th className="p-2 text-left">Missing Entries</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(monthlyMissingCount)
                  .sort((a, b) => {
                    const [monthA, yearA] = a[0].split("/").map(Number);
                    const [monthB, yearB] = b[0].split("/").map(Number);
                    return yearA !== yearB ? yearA - yearB : monthA - monthB;
                  })
                  .map(([month, count], idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{month}</td>
                      <td className="p-2">{count}</td>
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
