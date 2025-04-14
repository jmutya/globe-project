import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

export const fetchAlarmSeverityData = async () => {
  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    let severityCounts = {};
    let latestDate = null;

    for (const file of files) {
      const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
      const response = await fetch(fileUrl.publicUrl);
      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
      });

      if (sheet.length > 1) {
        const headers = sheet[0];
        const severityIndex = headers.indexOf("Severity");
        const dateIndex = headers.indexOf("Opened");

        if (severityIndex === -1 || dateIndex === -1) continue;

        sheet.slice(1).forEach((row) => {
          const severity = String(row[severityIndex] || "").trim();
          const dateCell = row[dateIndex];
          const date = parseExcelDate(dateCell);

          if (severity && date) {
            severityCounts[severity] = (severityCounts[severity] || 0) + 1;
            if (!latestDate || date > latestDate) latestDate = date;
          }
        });
      }
    }

    const formattedMonth = latestDate
      ? latestDate.toLocaleString("default", { month: "long", year: "numeric" })
      : "";

    return { severityCounts, latestMonth: formattedMonth };
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
