import * as XLSX from "xlsx";
import supabase from "../supabase/supabase"; // Adjust the path as needed

const colors = [
  "#ff6384", "#36a2eb", "#ffce56", "#4bc0c0",
  "#9966ff", "#ff9f40", "#8b0000", "#008000",
];

const getLatestMonthlyFile = (files) => {
  let latestFile = null;
  let latestDate = null;

  files.forEach((file) => {
    // Extract YYYY-MM from filename, e.g. alarms_2025-03.xlsx
    const match = file.name.match(/(\d{4})-(\d{2})/);
    if (match) {
      const [_, year, month] = match;
      const fileDate = new Date(`${year}-${month}-01`);
      if (!latestDate || fileDate > latestDate) {
        latestDate = fileDate;
        latestFile = file;
      }
    }
  });

  return latestFile;
};

export const fetchTerritoryGraphData = async () => {
  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    // Get only the most recent file based on YYYY-MM in filename
    const latestFile = getLatestMonthlyFile(files);
    if (!latestFile) {
      console.warn("No files with date pattern found");
      return [];
    }

    const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${latestFile.name}`);
    const response = await fetch(fileUrl.publicUrl);
    const blob = await response.arrayBuffer();
    const workbook = XLSX.read(blob, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    let territoryCounts = {};
    let totalAlarms = 0;

    if (sheet.length > 1) {
      const headers = sheet[0];
      const territoryIndex = headers.indexOf("u_ntg_territory");

      if (territoryIndex === -1) return [];

      sheet.slice(1).forEach((row) => {
        const territory = String(row[territoryIndex] || "").trim();
        if (territory) {
          territoryCounts[territory] = (territoryCounts[territory] || 0) + 1;
          totalAlarms++;
        }
      });
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
