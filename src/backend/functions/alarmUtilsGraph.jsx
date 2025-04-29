import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

export const fetchAlarmSeverityData = async () => {
  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    if (!files || files.length === 0) {
      // console.error("No files found in Supabase storage.");
      return { severityCounts: {}, latestMonth: "No data" };
    }

    let severityCounts = {};
    let latestDate = null;

    // First, loop through the files and collect the most recent date
    for (const file of files) {
      // console.log(`Processing file: ${file.name}`);

      const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
      if (!fileUrl || !fileUrl.publicUrl) {
        // console.error(`Failed to get public URL for ${file.name}`);
        continue;
      }

      const response = await fetch(fileUrl.publicUrl);
      if (!response.ok) {
        // console.error(`Failed to fetch file ${file.name}: ${response.statusText}`);
        continue;
      }

      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

      // console.log(`Processing sheet: ${sheetName} in file: ${file.name}`);

      if (sheet.length <= 1) {
        // console.warn(`Sheet ${sheetName} is empty or has only headers.`);
        continue;
      }

      const headers = sheet[0];
      const severityIndex = headers.indexOf("Severity");
      const dateIndex = headers.indexOf("Opened");

      if (severityIndex === -1 || dateIndex === -1) {
        // console.warn(`Severity or Opened column missing in ${file.name}`);
        continue;
      }

      sheet.slice(1).forEach((row) => {
        const severity = String(row[severityIndex] || "").trim();
        const dateCell = row[dateIndex];
        const date = parseExcelDate(dateCell);

        if (severity && date) {
          if (!latestDate || date > latestDate) latestDate = date;
        }
      });
    }

    if (!latestDate) {
      // console.warn("No valid dates found across all files.");
      return { severityCounts: {}, latestMonth: "No data" };
    }

    const formattedMonth = latestDate
      ? latestDate.toLocaleString("default", { month: "long", year: "numeric" })
      : "No data";

    // Now, loop through the files again, but only count data for the most recent month
    severityCounts = {};

    for (const file of files) {
      const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
      if (!fileUrl || !fileUrl.publicUrl) {
        // console.error(`Failed to get public URL for ${file.name}`);
        continue;
      }

      const response = await fetch(fileUrl.publicUrl);
      if (!response.ok) {
        // console.error(`Failed to fetch file ${file.name}: ${response.statusText}`);
        continue;
      }

      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

      if (sheet.length <= 1) {
        // console.warn(`Sheet ${sheetName} is empty or has only headers.`);
        continue;
      }

      const headers = sheet[0];
      const severityIndex = headers.indexOf("Severity");
      const dateIndex = headers.indexOf("Opened");

      if (severityIndex === -1 || dateIndex === -1) {
        // console.warn(`Severity or Opened column missing in ${file.name}`);
        continue;
      }

      sheet.slice(1).forEach((row) => {
        const severity = String(row[severityIndex] || "").trim();
        const dateCell = row[dateIndex];
        const date = parseExcelDate(dateCell);

        // Only include rows from the most recent month
        if (severity && date && isSameMonth(date, latestDate)) {
          severityCounts[severity] = (severityCounts[severity] || 0) + 1;
        }
      });
    }

    // console.log("Severity counts for latest month:", severityCounts);

    return { severityCounts, latestMonth: formattedMonth };
  } catch (error) {
    console.error("Error in fetchAlarmSeverityData:", error);
    return { severityCounts: {}, latestMonth: "No data" };
  }
};

// Helper function to check if a date is in the same month and year as the latestDate
const isSameMonth = (date, latestDate) => {
  return (
    date.getFullYear() === latestDate.getFullYear() &&
    date.getMonth() === latestDate.getMonth()
  );
};

const parseExcelDate = (dateValue) => {
  // console.log("Parsing date:", dateValue); // Debugging

  if (typeof dateValue === "string") {
    // Split the date and time based on the comma separator
    const [datePart, timePart] = dateValue.split(", ");
    if (!datePart || !timePart) {
      // console.error("Invalid date or time part:", dateValue);
      return null;
    }

    let [month, day, year] = datePart.split("/").map(Number); // Use let to allow reassignment
    let [time, period] = timePart.split(" "); // Time and AM/PM
    let [hours, minutes, seconds] = time.split(":").map(Number); // Use let to allow reassignment

    // Debugging
    // console.log("Parsed date:", { day, month, year, hours, minutes, seconds, period });

    // Adjust for AM/PM
    if (period === "PM" && hours < 12) hours += 12; // Convert PM times
    if (period === "AM" && hours === 12) hours = 0; // Convert 12 AM to 00:00

    if (!day || !month || !year) {
      // console.error("Date format is incorrect:", datePart);
      return null;
    }

    if (hours === undefined || minutes === undefined || seconds === undefined) {
      // console.error("Time format is incorrect:", timePart);
      return null;
    }

    // Construct the formatted date string in ISO format: yyyy-MM-ddTHH:mm:ss
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    const date = new Date(formattedDate);

    // Debugging the result
    // console.log("Constructed date:", date);

    return date.toString() === "Invalid Date" ? null : date;
  }

  if (typeof dateValue === "number") {
    const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
    // console.log("Excel number converted to date:", excelDate);
    return excelDate.toString() === "Invalid Date" ? null : excelDate;
  }

  return null;
};
