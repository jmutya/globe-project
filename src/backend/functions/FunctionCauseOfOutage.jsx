import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

const chartColors = [
  "#FF5E5E", "#FFB84C", "#FFD93D", "#72D86B",
  "#2BA8FF", "#0087A5", "#9951FF", "#FF7BAC"
];

export const fetchAlarmCategoryChartData = async () => {
  try {
    // Step 1: Fetch all Excel files
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    let mostRecentFile = null;
    let mostRecentDate = new Date(0);

    // Step 2: Find the file with the most recent "Opened" date
    for (const file of files) {
      const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
      const response = await fetch(fileUrl.publicUrl);
      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

      if (sheet.length <= 1) continue;

      const headers = sheet[0];
      const openedIndex = headers.indexOf("opened_at");

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

    // No file found
    if (!mostRecentFile) {
      return { formattedData: [], totalCount: 0 };
    }

    // Step 3: Process only the most recent file
    const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${mostRecentFile.name}`);
    const response = await fetch(fileUrl.publicUrl);
    const blob = await response.arrayBuffer();
    const workbook = XLSX.read(blob, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    const headers = sheet[0];
    const openedIndex = headers.indexOf("opened_at");
    const causeIndex = headers.indexOf("u_cause");

    if (openedIndex === -1 || causeIndex === -1) {
      return { formattedData: [], totalCount: 0 };
    }

    const recentMonth = mostRecentDate.getMonth();
    const recentYear = mostRecentDate.getFullYear();

    const categoryCounts = {};

    // Step 4: Iterate through the rows and count the categories
    for (const row of sheet.slice(1)) {
      const openedDate = new Date(row[openedIndex]);
      let cause = String(row[causeIndex] || "").trim();

      // If Cause is empty, categorize it as "Unknown"
      if (!cause) {
        cause = "Unknown";
      }

      if (
        !isNaN(openedDate) &&
        openedDate.getMonth() === recentMonth &&
        openedDate.getFullYear() === recentYear
      ) {
        categoryCounts[cause] = (categoryCounts[cause] || 0) + 1;
      }
    }

    // Step 5: Format the data for the chart
    const formattedData = Object.entries(categoryCounts).map(([name, value], index) => ({
      name,
      value,
      fill: chartColors[index % chartColors.length],
    }));

    // Step 6: Calculate total count
    const totalCount = formattedData.reduce((sum, item) => sum + item.value, 0);

    // Step 7: Return chart data and total count
    return { formattedData, totalCount };
  } catch (error) {
    console.error("Error fetching category chart data:", error);
    return { formattedData: [], totalCount: 0 };
  }
};
