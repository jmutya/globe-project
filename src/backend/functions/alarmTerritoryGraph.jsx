import * as XLSX from "xlsx";
import supabase from "../supabase/supabase"; // Adjust the path as needed

const chartColors = [
  "#ff6384", "#36a2eb", "#ffce56", "#4bc0c0",
  "#9966ff", "#ff9f40", "#8b0000", "#008000",
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
    // Check if the cache is still fresh (within CACHE_DURATION)
    if (now - timestamp < CACHE_DURATION) {
      console.log("Serving territory graph data from cache.");
      return JSON.parse(cachedData);
    }
  }

  // If forceRefresh is true or cache is expired/missing, clear existing cache
  if (forceRefresh || !cachedData || !cachedTimestamp || (now - parseInt(cachedTimestamp, 10) >= CACHE_DURATION)) {
    console.log("Territory graph cache either forced refresh, expired, or missing. Clearing cache and fetching fresh data.");
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  }

  // 2. Fetch fresh data
  console.log("Fetching fresh territory graph data...");
  try {
    // Step 1: Fetch all Excel files from the 'excels' folder
    // The `list` method returns file metadata, including `created_at`.
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
      return [];
    }

    // Use createSignedUrl for private bucket access (recommended for security)
    // This is more secure than getPublicUrl as it generates a temporary, signed URL.
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("uploads")
      .createSignedUrl(`excels/${latestFile.name}`, 60); // URL valid for 60 seconds
    if (urlError) throw urlError;

    // Step 3: Fetch the content of the most recent file using the signed URL
    const response = await fetch(signedUrlData.signedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    const blob = await response.arrayBuffer();
    const workbook = XLSX.read(blob, { type: "array" });
    const sheetName = workbook.SheetNames[0]; // Assume data is in the first sheet
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    let territoryCounts = {};
    let totalAlarms = 0;

    if (sheet.length <= 1) { // Only headers or empty sheet
      console.warn("Excel sheet is empty or contains only headers.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return [];
    }

    const headers = sheet[0];
    const territoryIndex = headers.indexOf("u_ntg_territory");

    if (territoryIndex === -1) {
      console.warn("Column 'u_ntg_territory' not found in the Excel sheet headers.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return [];
    }

    // Step 4: Iterate through the rows (skipping header) and count occurrences in the "u_ntg_territory" column
    sheet.slice(1).forEach((row) => {
      const territory = String(row[territoryIndex] || "").trim();
      // Filter: Only process territories "7" and "8"
      if (territory === "7" || territory === "8") {
        territoryCounts[territory] = (territoryCounts[territory] || 0) + 1;
        totalAlarms++;
      }
    });

    // Step 5: Format the data for the chart
    const formattedData = Object.entries(territoryCounts).map(([category, count], index) => ({
      category,
      count,
      percentage: ((count / totalAlarms) * 100).toFixed(1), // Calculate percentage
      fill: chartColors[index % chartColors.length], // Assign colors cyclically
    }));

    // 6. Cache the fresh data
    localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
    console.log("Fresh territory graph data fetched and cached.");

    // Step 7: Return formatted data
    return formattedData;

  } catch (error) {
    console.error("Error fetching or processing territory graph data:", error);
    // Clear cache on error to prevent serving stale/bad data
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    return [];
  }
};