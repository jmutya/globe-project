import * as XLSX from "xlsx";
import supabase from "../supabase/supabase"; // Adjust the path as needed

const chartColors = [
  "#ff6384",
  "#36a2eb",
  "#ffce56",
  "#4bc0c0",
  "#9966ff",
  "#ff9f40",
  "#8b0000",
  "#008000",
];

// Define cache constants
const CACHE_KEY = "territoryGraphDataCache";
const CACHE_TIMESTAMP_KEY = "territoryGraphDataTimestamp";
const CACHE_DURATION = 59 * 60 * 1000; // 59 minutes in milliseconds

/**
 * Helper function to get the latest uploaded file based on its Supabase 'created_at' timestamp.
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
 * Fetches and processes territory graph data from the latest Excel file in Supabase storage.
 * Includes caching and a force refresh option.
 * @param {boolean} forceRefresh - If true, bypasses the cache and fetches fresh data.
 * @returns {Promise<Array>} An array of formatted data for the chart, or an empty array on error/no data.
 */
export const fetchTerritoryGraphData = async (forceRefresh = false) => {
  const now = new Date().getTime();

  // 1. Check Cache First (unless forceRefresh is true)
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

  if (cachedData && cachedTimestamp && !forceRefresh) {
    const timestamp = parseInt(cachedTimestamp, 10);
    if (now - timestamp < CACHE_DURATION) {
      console.log("Serving territory graph data from cache.");
      return JSON.parse(cachedData);
    }
  }

  // 2. Clear expired or forced cache
  if (
    forceRefresh ||
    !cachedData ||
    !cachedTimestamp ||
    now - parseInt(cachedTimestamp, 10) >= CACHE_DURATION
  ) {
    console.log("Refreshing or clearing stale cache for territory graph data.");
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  }

  // 3. Fetch fresh data
  console.log("Fetching fresh territory graph data...");
  try {
    const { data: files, error } = await supabase.storage
      .from("uploads")
      .list("excels");
    if (error) throw error;

    console.log(
      "Files found:",
      files.map((f) => ({ name: f.name, created_at: f.created_at }))
    );

    const latestFile = getLatestUploadedFile(files);
    if (!latestFile) {
      console.warn("No valid files found.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return [];
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("uploads")
      .createSignedUrl(`excels/${latestFile.name}`, 60);
    if (urlError) throw urlError;

    const response = await fetch(signedUrlData.signedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.arrayBuffer();
    const workbook = XLSX.read(blob, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
    });

    if (sheet.length <= 1) {
      console.warn("Sheet is empty or contains only headers.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return [];
    }

    const headers = sheet[0];
    const territoryIndex = headers.indexOf("u_ntg_territory");
    const priorityIndex = headers.indexOf("u_service_priority");
    const stateIndex = headers.indexOf("state");

    if (territoryIndex === -1 || priorityIndex === -1 || stateIndex === -1) {
      console.warn("Required columns missing in the sheet.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return [];
    }

    let territoryCounts = {};
    let totalAlarms = 0;

    sheet.slice(1).forEach((row) => {
      const priorityRaw = row[priorityIndex];
      const stateRaw = row[stateIndex];
      const territoryRaw = row[territoryIndex];

      const normalizedPriority =
        typeof priorityRaw === "string"
          ? priorityRaw
              .replace(/\s+/g, " ")
              .replace(/[–—−]/g, "-")
              .trim()
              .toLowerCase()
          : "";

      const normalizedState =
        typeof stateRaw === "string" ? stateRaw.trim().toLowerCase() : "";

      const territory = String(territoryRaw || "").trim();

      // Apply filtering conditions:
      if (
        normalizedPriority === "3 - access" &&
        normalizedState !== "cancelled" &&
        (territory === "7" || territory === "8")
      ) {
        territoryCounts[territory] = (territoryCounts[territory] || 0) + 1;
        totalAlarms++;
      }
    });

    const formattedData = Object.entries(territoryCounts).map(
      ([category, count], index) => ({
        category,
        count,
        percentage: ((count / totalAlarms) * 100).toFixed(1),
        fill: chartColors[index % chartColors.length],
      })
    );

    localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
    console.log("Fresh territory graph data fetched and cached.");

    return formattedData;
  } catch (error) {
    console.error("Error processing territory graph data:", error);
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    return [];
  }
};
