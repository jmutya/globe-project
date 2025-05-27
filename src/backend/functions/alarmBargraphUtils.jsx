import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

const getLatestMonthlyFile = (files) => {
  let latestFile = null;
  let latestDate = null;

  files.forEach((file) => {
    // Extract YYYY-MM from filename, e.g. failure_2025-03.xlsx
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

export const fetchFailureCategoryData = async (colors) => {
  try {
    const { data: files, error } = await supabase.storage
      .from("uploads")
      .list("excels");
    if (error) throw error;

    // Get only the most recent file based on YYYY-MM in filename
    const latestFile = getLatestMonthlyFile(files);
    if (!latestFile) {
      console.warn("No files with date pattern found");
      return [];
    }

    const { data: fileUrl } = supabase.storage
      .from("uploads")
      .getPublicUrl(`excels/${latestFile.name}`);

    const response = await fetch(fileUrl.publicUrl);
    const blob = await response.arrayBuffer();
    const workbook = XLSX.read(blob, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
    });

    let failureCategoryCounts = {};

    if (sheet.length > 1) {
      const headers = sheet[0];
      const failureCategoryIndex = headers.indexOf("Failure Category");

      if (failureCategoryIndex === -1) return [];

      sheet.slice(1).forEach((row) => {
        let failureCategory = row[failureCategoryIndex];
        if (!failureCategory || failureCategory.trim() === "") {
          failureCategory = "unknown";
        } else {
          failureCategory = failureCategory.trim();
        }
        failureCategoryCounts[failureCategory] =
          (failureCategoryCounts[failureCategory] || 0) + 1;
      });
    }

    const formattedData = Object.entries(failureCategoryCounts).map(
      ([category, count], index) => ({
        category,
        count,
        fill: colors[index % colors.length],
      })
    );

    return formattedData;
  } catch (error) {
    console.error("Error fetching failure category data:", error);
    return [];
  }
};
