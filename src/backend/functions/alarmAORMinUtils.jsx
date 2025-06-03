import * as XLSX from "xlsx";
import supabase from "../supabase/supabase"; // Adjust path as needed

const CACHE_KEY = "alarmTypeLineDataCache";
const CACHE_TIMESTAMP_KEY = "alarmTypeLineDataTimestamp";
const CACHE_DURATION = 59 * 60 * 1000; // 59 minutes

const getLatestUploadedFile = (files) => {
  let latestFile = null;
  let latestTimestamp = 0;

  files.forEach((file) => {
    const fileTimestamp = new Date(file.created_at).getTime();
    if (fileTimestamp > latestTimestamp) {
      latestTimestamp = fileTimestamp;
      latestFile = file;
    }
  });

  return latestFile;
};

export const fetchAlarmTypeLineData = async (forceRefresh = false) => {
  const now = new Date().getTime();

  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

  if (cachedData && cachedTimestamp && !forceRefresh) {
    const timestamp = parseInt(cachedTimestamp, 10);
    if (now - timestamp < CACHE_DURATION) {
      console.log("Serving alarm type line data from cache.");
      return JSON.parse(cachedData);
    }
  }

  if (
    forceRefresh ||
    !cachedData ||
    !cachedTimestamp ||
    now - parseInt(cachedTimestamp, 10) >= CACHE_DURATION
  ) {
    console.log("Alarm type line data cache expired or forced refresh.");
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  }

  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    console.log("Files found:", files.map((f) => ({ name: f.name, created_at: f.created_at })));

    const latestFile = getLatestUploadedFile(files);

    if (!latestFile) {
      console.warn("No files found.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return { chartData: [], alarmTypes: [] };
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("uploads")
      .createSignedUrl(`excels/${latestFile.name}`, 60);
    if (urlError) throw urlError;

    const response = await fetch(signedUrlData.signedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    const blob = await response.arrayBuffer();
    const workbook = XLSX.read(blob, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    if (sheet.length <= 1) {
      console.warn("Excel sheet is empty or has only headers.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return { chartData: [], alarmTypes: [] };
    }

    // Extract the header row.
    const headers = sheet[0];
    const timestampIndex = headers.indexOf("opened_at");
    const alarmTypeIndex = headers.indexOf("u_aor001");
    const servicePriorityIndex = headers.indexOf("u_service_priority");

    // Check if the required columns ("opened_at", "u_aor001", and "u_service_priority") are present.
    if (timestampIndex === -1 || alarmTypeIndex === -1 || servicePriorityIndex === -1) {
      console.warn(
        "Required columns ('opened_at', 'u_aor001', or 'u_service_priority') not found in the Excel sheet headers."
      );
      if (timestampIndex === -1) console.warn("Column 'opened_at' is missing.");
      if (alarmTypeIndex === -1) console.warn("Column 'u_aor001' is missing.");
      if (servicePriorityIndex === -1) console.warn("Column 'u_service_priority' is missing.");

      localStorage.removeItem(CACHE_KEY); // Clear cache if columns are missing.
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return { chartData: [], alarmTypes: [] };
    }

    // ✅ Filter rows: only include rows where alarmType ends with "MIN"
    const dataRows = sheet.slice(1).filter((row) => {
      const timestamp = row[timestampIndex];
      const alarmType = row[alarmTypeIndex];
      const servicePriority = row[servicePriorityIndex];

      // Include row if all conditions are met:
      // 1. Timestamp cell is not empty.
      // 2. AlarmType cell contains a string.
      // 3. The alarmType string, when trimmed and uppercased, ends with "MIN".
      // 4. ✨ ServicePriority cell contains a string, when trimmed and starts with "3".
      return (
        timestamp &&
        typeof alarmType === "string" &&
        alarmType.trim().toUpperCase().endsWith("MIN") &&
        typeof servicePriority === "string" && // Ensure it's a string before calling startsWith
        servicePriority.trim().startsWith("3")
      );
    });

    // Initialize an object to store aggregated alarm data, keyed by date.
    let alarmData = {};

    dataRows.forEach((row) => {
      const timestamp = row[timestampIndex];
      const alarmTypeRaw = row[alarmTypeIndex];
      const alarmType = typeof alarmTypeRaw === "string" ? alarmTypeRaw.trim() : null;

      if (!timestamp || !alarmType) return;

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
    });

    const allAlarmTypes = new Set();
    Object.values(alarmData).forEach((types) => {
      Object.keys(types).forEach((type) => allAlarmTypes.add(type));
    });

    const formattedData = Object.entries(alarmData).map(([date, alarms]) => {
      let entry = { date };
      allAlarmTypes.forEach((type) => {
        entry[type] = alarms[type] || 0;
      });
      return entry;
    });

    formattedData.sort((a, b) => new Date(a.date) - new Date(b.date));

    const result = {
      chartData: formattedData,
      alarmTypes: [...allAlarmTypes].sort(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
    console.log("Fresh alarm type line data fetched and cached.");

    return result;
  } catch (error) {
    console.error("Error fetching or processing alarm type line data:", error);
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    return { chartData: [], alarmTypes: [] };
  }
};
