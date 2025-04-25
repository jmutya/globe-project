import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";

const AlarmOpenedMonths = () => {
  const [monthCounts, setMonthCounts] = useState({});

  useEffect(() => {
    const fetchOpenedMonths = async () => {
      try {
        const { data: files, error } = await supabase.storage.from("uploads").list("excels");
        if (error) throw error;

        console.log("Files fetched:", files); // Debugging: Check files

        const monthCounter = {}; // Object to hold month counts

        for (const file of files) {
          const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
          const response = await fetch(fileUrl.publicUrl);
          const blob = await response.arrayBuffer();
          const workbook = XLSX.read(blob, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

          console.log("Sheet data:", sheet); // Debugging: Check the sheet data

          if (sheet.length > 1) {
            const headers = sheet[0];
            const openedIndex = headers.indexOf("Opened");

            if (openedIndex === -1) continue;

            sheet.slice(1).forEach(row => {
              const opened = row[openedIndex];
              console.log("Opened value:", opened); // Debugging: Check the "Opened" value

              if (typeof opened === "number") {
                // Convert Excel serial number to a JavaScript Date object
                const date = new Date((opened - 25569) * 86400 * 1000); // Convert Excel serial to JS Date
                
                // Format the date to "dd/mm/yyyy"
                const day = String(date.getDate()).padStart(2, "0");
                const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
                const year = date.getFullYear();

                const monthYear = `${month}/${year}`;
                
                // Count the occurrences of each month
                if (monthCounter[monthYear]) {
                  monthCounter[monthYear] += 1;
                } else {
                  monthCounter[monthYear] = 1;
                }
              }
            });
          }
        }

        console.log("Month counts:", monthCounter); // Debugging: Check final count
        setMonthCounts(monthCounter);
      } catch (error) {
        console.error("Error fetching Opened months:", error);
        setMonthCounts({});
      }
    };

    fetchOpenedMonths();
  }, []);

  return (
    <div className="p-4 rounded-xl shadow bg-white text-gray-800">
      <h2 className="text-lg font-semibold mb-2">Month-wise Count from 'Opened'</h2>
      {Object.keys(monthCounts).length > 0 ? (
        <ul className="list-disc list-inside">
          {Object.entries(monthCounts).map(([month, count], idx) => (
            <li key={idx}>
              {month}: {count} occurrences
            </li>
          ))}
        </ul>
      ) : (
        <p>Loading or no data found...</p>
      )}
    </div>
  );
};

export default AlarmOpenedMonths;
