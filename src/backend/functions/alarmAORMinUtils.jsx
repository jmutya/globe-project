import * as XLSX from "xlsx";
import supabase from "../supabase/supabase"; // Adjust path as needed

// Define cache constants
const CACHE_KEY = "alarmTypeLineDataCache";
const CACHE_TIMESTAMP_KEY = "alarmTypeLineDataTimestamp";
const CACHE_DURATION = 59 * 60 * 1000; // 59 minutes in milliseconds

/**
 * Helper function to get the latest uploaded file based on its Supabase 'created_at' timestamp.
 * This is a more reliable way to determine the "latest" file on Supabase storage.
 * @param {Array<Object>} files - Array of file objects returned from Supabase storage list.
 * @returns {Object|null} The latest file object or null if no files are found.
 */
const getLatestUploadedFile = (files) => {
  let latestFile = null;
  let latestTimestamp = 0; // Initialize with a very old timestamp (e.g., 0 for Unix epoch)

  files.forEach((file) => {
    // Supabase file objects contain a 'created_at' property, which is an ISO 8601 string.
    // Convert it to a JavaScript Date object and then to a numerical timestamp for comparison.
    const fileTimestamp = new Date(file.created_at).getTime();

    if (fileTimestamp > latestTimestamp) {
      latestTimestamp = fileTimestamp;
      latestFile = file;
    }
  });

  return latestFile;
};

/**
 * Fetches and processes alarm type line graph data from the latest Excel file in Supabase storage.
 * Includes caching and a force refresh option.
 * @param {boolean} forceRefresh - If true, bypasses the cache and fetches fresh data.
 * @returns {Promise<{chartData: Array, alarmTypes: Array}>} Formatted data and alarm types for the chart, or empty arrays on error/no data.
 */
export const fetchAlarmTypeLineData = async (forceRefresh = false) => {
  const now = new Date().getTime();

  // 1. Check Cache First (unless forceRefresh is true)
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

  if (cachedData && cachedTimestamp && !forceRefresh) {
    const timestamp = parseInt(cachedTimestamp, 10);
    // Check if the cache is still fresh (within CACHE_DURATION)
    if (now - timestamp < CACHE_DURATION) {
      console.log("Serving alarm type line data from cache.");
      return JSON.parse(cachedData);
    }
  }

  // If forceRefresh is true or cache is expired/missing, clear existing cache
  if (forceRefresh || !cachedData || !cachedTimestamp || (now - parseInt(cachedTimestamp, 10) >= CACHE_DURATION)) {
    console.log("Alarm type line data cache either forced refresh, expired, or missing. Clearing cache and fetching fresh data.");
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  }

  // 2. Fetch fresh data
  console.log("Fetching fresh alarm type line data...");
  try {
    // Step 1: Fetch all Excel files from the 'excels' folder
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    // Log files found with their names and creation timestamps for debugging
    console.log("Files found:", files.map((f) => ({ name: f.name, created_at: f.created_at })));

    // Step 2: Find the latest uploaded file based on its Supabase 'created_at' timestamp
    const latestFile = getLatestUploadedFile(files);

    if (!latestFile) {
      console.warn("No files found in the specified bucket path.");
      // Clear cache if no valid file is found to prevent stale data
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return { chartData: [], alarmTypes: [] };
    }

    // Use createSignedUrl for private bucket access (recommended for security)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("uploads")
      .createSignedUrl(`excels/${latestFile.name}`, 60); // URL valid for 60 seconds
    if (urlError) throw urlError;

    // Step 3: Fetch the content of the most recent file
    const response = await fetch(signedUrlData.signedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    const blob = await response.arrayBuffer();
    const workbook = XLSX.read(blob, { type: "array" });
    const sheetName = workbook.SheetNames[0]; // Assume data is in the first sheet
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    let alarmData = {};

    if (sheet.length <= 1) { // Only headers or empty sheet
      console.warn("Excel sheet is empty or contains only headers.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return { chartData: [], alarmTypes: [] };
    }

    const headers = sheet[0];
    const timestampIndex = headers.indexOf("opened_at");
    const alarmTypeIndex = headers.indexOf("u_aor001");

    if (timestampIndex === -1 || alarmTypeIndex === -1) {
      console.warn("Required columns 'opened_at' or 'u_aor001' not found in the Excel sheet headers.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return { chartData: [], alarmTypes: [] };
    }

    // Step 4: Process data for the chart
    sheet.slice(1).forEach(row => {
      let timestamp = row[timestampIndex];
      const alarmTypeRaw = row[alarmTypeIndex];
      const alarmType = typeof alarmTypeRaw === "string" ? alarmTypeRaw.trim() : null;

      if (timestamp && alarmType) {
        let date = "";

        // Handle Excel numeric dates (days since 1899-12-30)
        if (typeof timestamp === "number") {
          const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
          date = new Date(excelEpoch.getTime() + timestamp * 86400000) // 86400000 ms in a day
            .toISOString()
            .split("T")[0]; // Get YYYY-MM-DD
        }
        // Handle string dates in 'MM/DD/YYYY' format
        else if (typeof timestamp === "string") {
          const parts = timestamp.split(" ")[0].split("/"); // "MM/DD/YYYY HH:MM:SS" -> "MM/DD/YYYY" -> [MM, DD, YYYY]
          if (parts.length === 3) {
            const [month, day, year] = parts;
            date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }
        }

        if (!date) return; // Skip if date couldn't be parsed

        if (!alarmData[date]) alarmData[date] = {};
        alarmData[date][alarmType] = (alarmData[date][alarmType] || 0) + 1;
      }
    });

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

    // Sort data by date for proper time-series display
    formattedData.sort((a, b) => new Date(a.date) - new Date(b.date));

    const result = {
      chartData: formattedData,
      alarmTypes: [...allAlarmTypes].sort(), // Sort alarm types alphabetically
    };

    // 6. Cache the fresh data
    localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
    console.log("Fresh alarm type line data fetched and cached.");

    // Step 7: Return data
    return result;

  } catch (error) {
    console.error("Error fetching or processing alarm type line data:", error);
    // Clear cache on error to prevent serving stale/bad data
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    return { chartData: [], alarmTypes: [] };
  }
};