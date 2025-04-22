// utils/alarmUtils.js
import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

// Count tickets per Caller for the current month
export const fetchCallerCountsThisMonth = async () => {
  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let callerCounts = {};

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
        const callerIndex = headers.indexOf("Caller");
        const dateIndex = headers.findIndex((header) =>
          ["Opened"].some((label) =>
            String(header).toLowerCase().includes(label.toLowerCase())
          )
        );

        if (callerIndex === -1 || dateIndex === -1) continue;

        sheet.slice(1).forEach((row) => {
          const caller = String(row[callerIndex] || "").trim();
          const rawDate = row[dateIndex];

          // Try to parse the date
          const ticketDate = new Date(rawDate);
          if (
            caller &&
            ticketDate instanceof Date &&
            !isNaN(ticketDate) &&
            ticketDate.getMonth() === currentMonth &&
            ticketDate.getFullYear() === currentYear
          ) {
            callerCounts[caller] = (callerCounts[caller] || 0) + 1;
          }
        });
      }
    }

    return callerCounts;
  } catch (error) {
    console.error("Error fetching caller counts:", error);
    return {};
  }
};
