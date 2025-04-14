// utils/fetchAlarmTypeLineData.js
import * as XLSX from "xlsx";
import supabase from "../supabase/supabase"; // Adjust path as needed

export const fetchAlarmTypeLineData = async () => {
  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    let alarmData = {};

    for (const file of files) {
      const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
      const response = await fetch(fileUrl.publicUrl);
      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

      if (sheet.length > 1) {
        const headers = sheet[0];
        const timestampIndex = headers.indexOf("Opened");
        const alarmTypeIndex = headers.indexOf("AOR001");

        if (timestampIndex === -1 || alarmTypeIndex === -1) continue;

        sheet.slice(1).forEach(row => {
          let timestamp = row[timestampIndex];
          const alarmType = row[alarmTypeIndex]?.trim();

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
