import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

export const fetchAlarmSeverityData = async () => {
  try {
    // Step 1: Fetch files from Supabase storage
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    let severityCounts = {};
    let latestDate = null;
    let latestFile = null;

    // Step 2: Loop through files to find the one with the most recent "Opened" date
    for (const file of files) {
      const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
      const response = await fetch(fileUrl.publicUrl);
      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

      if (sheet.length > 1) {
        const headers = sheet[0];
        const dateIndex = headers.indexOf("Opened");

        if (dateIndex === -1) continue;

        // Step 3: Find the latest "Opened" date from this sheet
        sheet.slice(1).forEach((row) => {
          const dateCell = row[dateIndex];
          const date = parseExcelDate(dateCell);

          if (date && (!latestDate || date > latestDate)) {
            latestDate = date;
            latestFile = file; // Save the file with the most recent date
          }
        });
      }
    }

    // Step 4: If a file with the latest "Opened" date is found, process that file
    if (latestFile && latestDate) {
      const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${latestFile.name}`);
      const response = await fetch(fileUrl.publicUrl);
      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

      // Step 5: Process data from the most recent file
      const headers = sheet[0];
      const severityIndex = headers.indexOf("Severity");
      const dateIndex = headers.indexOf("Opened");

      if (severityIndex === -1 || dateIndex === -1) return { severityCounts: {}, latestMonth: "" };

      sheet.slice(1).forEach((row) => {
        const severity = String(row[severityIndex] || "").trim();
        const dateCell = row[dateIndex];
        const date = parseExcelDate(dateCell);

        // Process only data from the latest "Opened" month
        if (date && latestDate && date.getMonth() === latestDate.getMonth() && date.getFullYear() === latestDate.getFullYear()) {
          if (severity) {
            severityCounts[severity] = (severityCounts[severity] || 0) + 1;
          }
        }
      });

      const formattedMonth = latestDate
        ? latestDate.toLocaleString("default", { month: "long", year: "numeric" })
        : "";

      return { severityCounts, latestMonth: formattedMonth };
    }

    return { severityCounts: {}, latestMonth: "" };
  } catch (error) {
    console.error("Error in fetchAlarmSeverityData:", error);
    return { severityCounts: {}, latestMonth: "" };
  }
};

const parseExcelDate = (dateValue) => {
  if (typeof dateValue === "string") {
    const [datePart] = dateValue.split(" ");
    const [month, day, year] = datePart.split("/");
    const formattedDate = `${year}-${month}-${day}`;
    const date = new Date(formattedDate);
    return date.toString() === "Invalid Date" ? null : date;
  }

  if (typeof dateValue === "number") {
    const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
    return excelDate.toString() === "Invalid Date" ? null : excelDate;
  }

  return null;
};
