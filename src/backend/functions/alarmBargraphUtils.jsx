// utils/fetchFailureCategoryData.js
import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

export const fetchFailureCategoryData = async (colors) => {
  try {
    const { data: files, error } = await supabase.storage
      .from("uploads")
      .list("excels");
    if (error) throw error;

    let failureCategoryCounts = {};

    for (const file of files) {
      const { data: fileUrl } = supabase.storage
        .from("uploads")
        .getPublicUrl(`excels/${file.name}`);
      const response = await fetch(fileUrl.publicUrl);
      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
      });

      if (sheet.length > 1) {
        const headers = sheet[0];
        const failureCategoryIndex = headers.indexOf("Failure Category");

        if (failureCategoryIndex === -1) continue;

        sheet.slice(1).forEach((row) => {
          const failureCategory = row[failureCategoryIndex]?.trim();
          if (failureCategory) {
            failureCategoryCounts[failureCategory] =
              (failureCategoryCounts[failureCategory] || 0) + 1;
          }
        });
      }
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
