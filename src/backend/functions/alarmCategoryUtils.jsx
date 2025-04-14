// utils/alarmUtils.js
import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

// Predefined color palette for chart segments
const chartColors = ["#FF5E5E", "#FFB84C", "#FFD93D", "#72D86B", "#2BA8FF", "#0087A5", "#9951FF", "#FF7BAC"];

export const fetchAlarmCategoryChartData = async () => {
  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    let categoryCounts = {};

    for (const file of files) {
      const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
      const response = await fetch(fileUrl.publicUrl);
      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

      if (sheet.length > 1) {
        const headers = sheet[0];
        const causeIndex = headers.indexOf("Cause");

        if (causeIndex === -1) continue;

        sheet.slice(1).forEach((row) => {
          const cause = String(row[causeIndex] || "").trim();
          if (cause) {
            categoryCounts[cause] = (categoryCounts[cause] || 0) + 1;
          }
        });
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
