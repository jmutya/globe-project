import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

const chartColors = ["#FF5E5E", "#FFB84C", "#FFD93D", "#72D86B", "#2BA8FF", "#0087A5", "#9951FF", "#FF7BAC"];

export const fetchAlarmCategoryChartData = async () => {
  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    let mostRecentFile = null;
    let mostRecentDate = new Date(0);

    // First pass: Find the file with the most recent "Opened" date
    for (const file of files) {
      const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
      const response = await fetch(fileUrl.publicUrl);
      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

      if (sheet.length <= 1) continue;

      const headers = sheet[0];
      const openedIndex = headers.indexOf("Opened");

      if (openedIndex === -1) continue;

      for (const row of sheet.slice(1)) {
        const openedRaw = row[openedIndex];
        const openedDate = new Date(openedRaw);

        if (!isNaN(openedDate) && openedDate > mostRecentDate) {
          mostRecentDate = openedDate;
          mostRecentFile = file;
        }
      }
    }

    if (!mostRecentFile) return [];

    // Second pass: Process only the most recent file
    const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${mostRecentFile.name}`);
    const response = await fetch(fileUrl.publicUrl);
    const blob = await response.arrayBuffer();
    const workbook = XLSX.read(blob, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    const headers = sheet[0];
    const openedIndex = headers.indexOf("Opened");
    const causeIndex = headers.indexOf("Cause");

    if (openedIndex === -1 || causeIndex === -1) return [];

    const recentMonth = mostRecentDate.getMonth();
    const recentYear = mostRecentDate.getFullYear();

    const categoryCounts = {};

    for (const row of sheet.slice(1)) {
      const openedDate = new Date(row[openedIndex]);
      const cause = String(row[causeIndex] || "").trim();

      if (
        !isNaN(openedDate) &&
        openedDate.getMonth() === recentMonth &&
        openedDate.getFullYear() === recentYear &&
        cause
      ) {
        categoryCounts[cause] = (categoryCounts[cause] || 0) + 1;
      }
    }

    const formattedData = Object.entries(categoryCounts).map(([name, value], index) => ({
      name,
      value,
      fill: chartColors[index % chartColors.length],
    }));

    return formattedData;
  } catch (error) {
    console.error("Error fetching category chart data:", error);
    return [];
  }
};
