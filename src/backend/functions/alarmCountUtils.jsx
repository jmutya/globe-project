// utils/alarmUtils.js
import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

// Count only severity occurrences
export const fetchSeverityCounts = async () => {
  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    let counts = {};

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

        if (severityIndex === -1) continue;

        sheet.slice(1).forEach((row) => {
          const severity = String(row[severityIndex] || "").trim();
          if (severity) {
            counts[severity] = (counts[severity] || 0) + 1;
          }
        });
      }
    }

    return counts;
  } catch (error) {
    console.error("Error fetching severity counts:", error);
    return {};
  }
};
