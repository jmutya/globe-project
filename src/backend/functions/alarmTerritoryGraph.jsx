// utils/fetchTerritoryGraphData.js
import * as XLSX from "xlsx";
import supabase from "../supabase/supabase"; // Adjust the path as needed

const colors = [
  "#ff6384", "#36a2eb", "#ffce56", "#4bc0c0",
  "#9966ff", "#ff9f40", "#8b0000", "#008000",
];

export const fetchTerritoryGraphData = async () => {
  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    let territoryCounts = {};
    let totalAlarms = 0;

    for (const file of files) {
      const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
      const response = await fetch(fileUrl.publicUrl);
      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

      if (sheet.length > 1) {
        const headers = sheet[0];
        const territoryIndex = headers.indexOf("Territory");

        if (territoryIndex === -1) continue;

        sheet.slice(1).forEach((row) => {
          const territory = String(row[territoryIndex] || "").trim();
          if (territory) {
            territoryCounts[territory] = (territoryCounts[territory] || 0) + 1;
            totalAlarms++;
          }
        });
      }
    }

    const formattedData = Object.entries(territoryCounts).map(([category, count], index) => ({
      category,
      count,
      percentage: ((count / totalAlarms) * 100).toFixed(1),
      fill: colors[index % colors.length],
    }));

    return formattedData;
  } catch (error) {
    console.error("Error fetching or processing files:", error);
    return [];
  }
};
