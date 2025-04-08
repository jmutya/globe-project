import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import supabase from "../../../backend/supabase/supabase";

const AlarmCount = () => {
  const [severityCounts, setSeverityCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [latestMonth, setLatestMonth] = useState(""); // Store the latest month

  useEffect(() => {
    fetchAndProcessFiles();
  }, []);

  const fetchAndProcessFiles = async () => {
    try {
      const { data: files, error } = await supabase.storage.from("uploads").list("excels");
      if (error) throw error;

      if (!files || files.length === 0) {
        setSeverityCounts({});
        setIsLoading(false);
        return;
      }

      // Sort files by `created_at` or `updated_at`
      const sortedFiles = [...files].sort((a, b) => {
        return new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0);
      });

      const latestFile = sortedFiles[0];
      console.log("Most recent file:", latestFile.name);

      const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${latestFile.name}`);
      const response = await fetch(fileUrl.publicUrl);
      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

      let counts = {};
      let latestDate = null;

      if (sheet.length > 1) {
        const headers = sheet[0];
        const severityIndex = headers.indexOf("Severity");
        const dateIndex = headers.indexOf("Opened"); // Use "Opened" column for the date

        if (severityIndex !== -1 && dateIndex !== -1) {
          sheet.slice(1).forEach((row) => {
            const severity = String(row[severityIndex] || "").trim();
            const dateCell = row[dateIndex];

            // Parse the date from the Excel sheet (Ensure it's a valid Date)
            const date = parseExcelDate(dateCell);
            if (severity && date) {
              counts[severity] = (counts[severity] || 0) + 1;

              // Track the most recent date
              if (!latestDate || date > latestDate) {
                latestDate = date;
              }
            }
          });
        }
      }

      // If we have a valid latest date, extract the month and year (without time)
      if (latestDate) {
        const formattedMonth = latestDate.toLocaleString("default", { month: "long", year: "numeric" });
        setLatestMonth(formattedMonth); // e.g., "March 2025"
      }

      console.log("Counts from latest file:", counts);
      setSeverityCounts(counts);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching or processing file:", error);
      setIsLoading(false);
    }
  };

  // Function to parse the date in the format "MM/DD/YYYY HH:mm:ss"
  // Function to parse the date in the format "MM/DD/YYYY HH:mm:ss" or Excel serial date
const parseExcelDate = (dateValue) => {
  if (typeof dateValue === "string") {
    // Handle string format, e.g., "MM/DD/YYYY HH:mm:ss"
    const [datePart] = dateValue.split(" "); // Get the date part "MM/DD/YYYY"
    if (!datePart) {
      console.error("Invalid date format:", dateValue);
      return null; // Return null if datePart is invalid
    }

    const [month, day, year] = datePart.split("/"); // Split into MM, DD, YYYY
    if (!month || !day || !year) {
      console.error("Invalid date part:", datePart);
      return null; // Return null if the date part is malformed
    }

    const formattedDate = `${year}-${month}-${day}`; // Reformat to "YYYY-MM-DD"
    const date = new Date(formattedDate); // Create a Date object

    if (date.toString() === "Invalid Date") {
      console.error("Invalid date object:", dateValue);
      return null; // Return null if the date is invalid
    }

    return date;
  }

  if (typeof dateValue === "number") {
    // Handle Excel serial date format (number)
    const excelDate = new Date((dateValue - 25569) * 86400 * 1000); // Convert serial date to JS Date
    if (excelDate.toString() === "Invalid Date") {
      console.error("Invalid date object:", dateValue);
      return null; // Return null if the date is invalid
    }
    return excelDate;
  }

  console.error("Date is not a string or number:", dateValue);
  return null; // Return null if it's neither string nor number
};


  // Calculate total count
  const totalCount = Object.values(severityCounts).reduce((acc, count) => acc + count, 0);

  return (
    <div className="p-6 rounded-lg shadow-lg max-w-md mx-auto mt-10 flex flex-col">
      <h2 className="text-xl font-semibold text-black mb-4">
        Overall Ticket Counts for {latestMonth || "Loading..."}
      </h2>

      {isLoading ? (
        <div className="flex justify-center items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          <p className="text-white">Processing Data...</p>
        </div>
      ) : totalCount > 0 ? (
        <p className="text-6xl font-semibold font-serif text-center text-indigo-600 mt-4">{totalCount}</p>
      ) : (
        <p className="text-white text-center mt-6">No data available</p>
      )}
    </div>
  );
};

export default AlarmCount;
