import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

// Robust date parser
const parseExcelDate = (value) => {
  if (!value) return null;

  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + value * 86400000);
  }

  if (typeof value === "string") {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
      const [, month, day, year, hour, minute, second] = match.map(Number);
      return new Date(year, month - 1, day, hour, minute, second);
    }
  }

  const parsed = new Date(value);
  return isNaN(parsed) ? null : parsed;
};

export const fetchSeverityCounts = async () => {
  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    let allRows = [];

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
        const severityIndex = headers.indexOf("Severity");

        if (openedIndex === -1 || severityIndex === -1) continue;

        sheet.slice(1).forEach((row) => {
          const openedDate = parseExcelDate(row[openedIndex]);
          const severity = String(row[severityIndex] || "").trim();

          if (openedDate && severity) {
            allRows.push({
              openedDate,
              severity,
              yearMonth: `${openedDate.getFullYear()}-${String(openedDate.getMonth() + 1).padStart(2, "0")}`,
            });
          }
        });
      }
    }

    if (allRows.length === 0) return { counts: {}, mostRecentMonth: null };

    // Get the most recent month string
    const mostRecentMonth = allRows.map(r => r.yearMonth).sort().reverse()[0];

    // Filter rows for the most recent month only
    const recentMonthRows = allRows.filter(r => r.yearMonth === mostRecentMonth);

    // Deduplicate by exact openedDate time (using getTime)
    const seenDates = new Set();
    const uniqueRows = recentMonthRows.filter(r => {
      const time = r.openedDate.getTime();
      if (seenDates.has(time)) return false;
      seenDates.add(time);
      return true;
    });

    // Count severity from unique rows
    const counts = {};
    uniqueRows.forEach(({ severity }) => {
      counts[severity] = (counts[severity] || 0) + 1;
    });

    return { counts, mostRecentMonth };
  } catch (error) {
    console.error("Error fetching severity counts:", error);
    return { counts: {}, mostRecentMonth: null };
  }
};
