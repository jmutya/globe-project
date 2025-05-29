import * as XLSX from "xlsx";
import supabase from "../supabase/supabase"; // Adjust path as needed

const getLatestMonthlyFile = (files) => {
  let latestFile = null;
  let latestDate = null;

  files.forEach((file) => {
    // Extract YYYY-MM from filename, e.g. alarm_2025-03.xlsx
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

export const fetchAlarmTypeLineData = async () => {
  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    // Get only the most recent file based on YYYY-MM in filename
    const latestFile = getLatestMonthlyFile(files);
    if (!latestFile) {
      console.warn("No files with date pattern found");
      return { chartData: [], alarmTypes: [] };
    }

    const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${latestFile.name}`);
    const response = await fetch(fileUrl.publicUrl);
    const blob = await response.arrayBuffer();
    const workbook = XLSX.read(blob, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    let alarmData = {};

    if (sheet.length > 1) {
      const headers = sheet[0];
      const timestampIndex = headers.indexOf("opened_at");
      const alarmTypeIndex = headers.indexOf("u_aor001");

      if (timestampIndex === -1 || alarmTypeIndex === -1) return { chartData: [], alarmTypes: [] };

      sheet.slice(1).forEach(row => {
        let timestamp = row[timestampIndex];
        const alarmTypeRaw = row[alarmTypeIndex];
        const alarmType = typeof alarmTypeRaw === "string" ? alarmTypeRaw.trim() : null;

        if (timestamp && alarmType) {
          let date = "";

          if (typeof timestamp === "number") {
            const excelEpoch = new Date(1899, 11, 30);
            date = new Date(excelEpoch.getTime() + timestamp * 86400000)
              .toISOString()
              .split("T")[0];
          } else if (typeof timestamp === "string") {
            const parts = timestamp.split(" ")[0].split("/");
            if (parts.length === 3) {
              const [month, day, year] = parts;
              date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            }
          }

          if (!date) return;

          if (!alarmData[date]) alarmData[date] = {};
          alarmData[date][alarmType] = (alarmData[date][alarmType] || 0) + 1;
        }
      });
    }

    const allAlarmTypes = new Set();
    Object.values(alarmData).forEach(types => {
      Object.keys(types).forEach(type => allAlarmTypes.add(type));
    });

    const formattedData = Object.entries(alarmData).map(([date, alarms]) => {
      let entry = { date };
      allAlarmTypes.forEach(type => {
        entry[type] = alarms[type] || 0;
      });
      return entry;
    });

    formattedData.sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      chartData: formattedData,
      alarmTypes: [...allAlarmTypes]
    };
  } catch (error) {
    console.error("Error fetching or processing files:", error);
    return {
      chartData: [],
      alarmTypes: []
    };
  }
};
