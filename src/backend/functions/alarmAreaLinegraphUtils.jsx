import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

// Define cache constants
const CACHE_KEY = "areaAlarmDataCache";
const CACHE_TIMESTAMP_KEY = "areaAlarmDataTimestamp";
const CACHE_DURATION = 59 * 60 * 1000; // 59 minutes in milliseconds

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

export const fetchAreaAlarmData = async (forceRefresh = false) => {
  const now = new Date().getTime();

  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

  if (cachedData && cachedTimestamp && !forceRefresh) {
    const timestamp = parseInt(cachedTimestamp, 10);
    if (now - timestamp < CACHE_DURATION) {
      // Changed console log to match the function's purpose
      console.log("Serving area alarm data from cache.");
      return JSON.parse(cachedData);
    }
  }

  // Corrected cache invalidation logic
  if (
    forceRefresh ||
    !cachedData ||
    !cachedTimestamp ||
    (cachedTimestamp && now - parseInt(cachedTimestamp, 10) >= CACHE_DURATION) // Ensures cachedTimestamp exists
  ) {
    // Changed console log to match the function's purpose
    console.log("Area alarm data cache expired or forced refresh. Fetching fresh data.");
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  }

  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    console.log("Files found:", files.map((f) => ({ name: f.name, created_at: f.created_at })));

    const latestFile = getLatestUploadedFile(files);

    if (!latestFile) {
      console.warn("No files found in Supabase storage 'uploads/excels' folder."); // More specific message
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return { chartData: [], alarmTypes: [] };
    }
    console.log(`Processing latest file for area alarm data: ${latestFile.name}`); // Specific log

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

    const headers = sheet[0];
    const timestampIndex = headers.indexOf("opened_at");
    const alarmTypeIndex = headers.indexOf("u_aor002"); // Specific to area alarms
    const servicePriorityIndex = headers.indexOf("u_service_priority");

    if (timestampIndex === -1 || alarmTypeIndex === -1 || servicePriorityIndex === -1) {
      console.warn(
        "Required columns ('opened_at', 'u_aor002', or 'u_service_priority') not found in the Excel sheet headers."
      );
      if (timestampIndex === -1) console.warn("Column 'opened_at' is missing.");
      if (alarmTypeIndex === -1) console.warn("Column 'u_aor002' (for area alarm type) is missing."); // Corrected column name
      if (servicePriorityIndex === -1) console.warn("Column 'u_service_priority' is missing.");

      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return { chartData: [], alarmTypes: [] };
    }

    // Filter rows based on conditions
    const dataRows = sheet.slice(1).filter((row) => {
      const timestamp = row[timestampIndex];
      const alarmTypeRaw = row[alarmTypeIndex]; // Use alarmTypeRaw here
      const servicePriority = row[servicePriorityIndex];

      // Include row if all conditions are met:
      // 1. Timestamp cell is not empty.
      // 2. AlarmType cell contains a non-empty string after trimming.
      // 3. ServicePriority cell contains a string, when trimmed, starts with "3".
      return (
        timestamp &&
        typeof alarmTypeRaw === "string" && alarmTypeRaw.trim() !== '' && // Ensures non-empty string for alarmType
        typeof servicePriority === "string" &&
        servicePriority.trim().startsWith("3")
      );
    });

    // ✨ Log the total count of accepted data rows after filtering.
    console.log(`Total accepted area alarm data rows after filtering: ${dataRows.length}`);

    let alarmData = {};

    dataRows.forEach((row) => {
      const timestampValue = row[timestampIndex]; // Renamed to avoid conflict
      const alarmTypeRaw = row[alarmTypeIndex];
      // Trim here as it's confirmed to be a string from the filter
      const alarmType = alarmTypeRaw.trim();

      if (!timestampValue) return; // Should already be guaranteed by filter, but good for safety

      let date = "";

      if (typeof timestampValue === "number") {
        const excelEpoch = new Date(1899, 11, 30);
        date = new Date(excelEpoch.getTime() + timestampValue * 86400000)
          .toISOString()
          .split("T")[0];
      } else if (typeof timestampValue === "string") {
        const parts = timestampValue.split(" ")[0].split("/");
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
    console.log("Fresh area alarm data fetched, processed, and cached."); // Matched to function purpose

    return result;
  } catch (error) {
    console.error("Error fetching or processing area alarm data:", error); // Matched to function purpose
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    return { chartData: [], alarmTypes: [] };
  }
};