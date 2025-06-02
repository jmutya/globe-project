import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

const chartColors = [
  "#FF5E5E", "#FFB84C", "#FFD93D", "#72D86B",
  "#2BA8FF", "#0087A5", "#9951FF", "#FF7BAC"
];

// Define cache constants outside the function
const CACHE_KEY = "AutomaticticketingChartDataCacheperstate";
const CACHE_TIMESTAMP_KEY = "AutomaticticketingDataTimestamp";
const CACHE_TOTAL_COUNT_KEY = "AutomaticticketingChartTotalCountCache"; // New key for total count
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Helper function to get the latest monthly file based on a date pattern in its name.
 * Supports "Month Year" (e.g., "March 2025") and "YYYY-MM" (e.g., "2025-03") formats.
 */
const getLatestMonthlyFile = (files) => {
  let latestFile = null;
  let latestDate = null;

  files.forEach((file) => {
    let fileDate = null;

    // Try to match "Month Year" format (e.g., "failure March 2025.xlsx")
    const matchMonthYear = file.name.match(/(\w+)\s+(\d{4})/);
    if (matchMonthYear) {
      const [_, monthName, year] = matchMonthYear;
      // Date.parse can convert month name to a date, then get month index
      const monthIndex = new Date(Date.parse(`${monthName} 1, ${year}`)).getMonth();
      fileDate = new Date(parseInt(year), monthIndex, 1); // Day doesn't matter for monthly comparison
    }

    // If not matched, try to match "YYYY-MM" format (e.g., "failure_2025-03.xlsx")
    if (!fileDate) {
      const matchYearMonth = file.name.match(/(\d{4})-(\d{2})/);
      if (matchYearMonth) {
        const [_, year, month] = matchYearMonth;
        fileDate = new Date(parseInt(year), parseInt(month) - 1, 1); // Month is 0-indexed in Date object
      }
    }

    if (fileDate) {
      if (!latestDate || fileDate > latestDate) {
        latestDate = fileDate;
        latestFile = file;
      }
    }
  });

  return latestFile;
};


export const fetchAutomaticticketingChartData = async () => {
  const now = new Date().getTime();

  // 1. Check Cache First
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  const cachedTotalCount = localStorage.getItem(CACHE_TOTAL_COUNT_KEY);

  if (cachedData && cachedTimestamp && cachedTotalCount) {
    const timestamp = parseInt(cachedTimestamp, 10);
    // Check if the cache is still fresh (within 30 minutes)
    if (now - timestamp < CACHE_DURATION) {
      console.log("Serving alarm category data from cache.");
      return {
        formattedData: JSON.parse(cachedData),
        totalCount: parseInt(cachedTotalCount, 10),
      };
    }
  }

  // 2. If no cache or cache expired, fetch fresh data
  console.log("Fetching fresh alarm category data...");
  try {
    // Step 1: Fetch all Excel files from the 'excels' folder
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    // Step 2: Find the latest monthly file based on its filename (e.g., "failure March 2025.xlsx")
    const latestFile = getLatestMonthlyFile(files);

    if (!latestFile) {
      console.warn("No files with a recognized date pattern found in storage.");
      // Clear cache if no valid file is found to prevent stale data
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      localStorage.removeItem(CACHE_TOTAL_COUNT_KEY);
      return { formattedData: [], totalCount: 0 };
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

    if (sheet.length <= 1) { // Only headers or empty sheet
      console.warn("Excel sheet is empty or contains only headers.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      localStorage.removeItem(CACHE_TOTAL_COUNT_KEY);
      return { formattedData: [], totalCount: 0 };
    }

    const headers = sheet[0];
    const stateIndex = headers.indexOf("state"); // Get the index of the "state" column
    const callerIdIndex = headers.indexOf("caller_id"); // Get the index of the "caller_id" column

    if (stateIndex === -1) {
      console.warn("Column 'state' not found in the Excel sheet headers.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      localStorage.removeItem(CACHE_TOTAL_COUNT_KEY);
      return { formattedData: [], totalCount: 0 };
    }

    if (callerIdIndex === -1) {
      console.warn("Column 'caller_id' not found in the Excel sheet headers. Cannot apply filter for 'MYCOM Integration User'.");
      // If caller_id column is missing, we cannot fulfill the request to filter by it.
      // Depending on desired behavior, you might return empty or process without this specific filter.
      // For this request, we'll return empty as the filter cannot be applied.
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      localStorage.removeItem(CACHE_TOTAL_COUNT_KEY);
      return { formattedData: [], totalCount: 0 };
    }

    const categoryCounts = {};
    let totalCount = 0;

    // Step 4: Iterate through the rows (skipping header) and count occurrences in the "state" column
    for (const row of sheet.slice(1)) {
      let stateValue = String(row[stateIndex] || "").trim(); // Get state value
      const callerIdValue = String(row[callerIdIndex] || "").trim(); // Get caller_id value

      // NEW CONDITION: ONLY process rows where caller_id is "MYCOM Integration User"
      if (callerIdValue === "MYCOM Integration User") {
        continue; // Skip this row if caller_id is not "MYCOM Integration User"
      }

      // If state value is empty for the filtered rows, categorize it as "Unknown"  
      if (!stateValue) {
        stateValue = "Unknown";
      }

      categoryCounts[stateValue] = (categoryCounts[stateValue] || 0) + 1;
      totalCount++; // Increment total count for every valid row (that passed the filter)
    }

    // Step 5: Format the data for the chart
    const formattedData = Object.entries(categoryCounts).map(([name, value], index) => ({
      name,
      value,
      fill: chartColors[index % chartColors.length], // Assign colors cyclically
    }));

    // 6. Cache the fresh data
    localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
    localStorage.setItem(CACHE_TOTAL_COUNT_KEY, totalCount.toString());
    localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
    console.log("Fresh alarm category data fetched and cached.");

    // Step 7: Return chart data and total count
    return { formattedData, totalCount };

  } catch (error) {
    console.error("Error fetching or processing alarm category chart data:", error);
    // Clear cache on error to prevent serving stale/bad data
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    localStorage.removeItem(CACHE_TOTAL_COUNT_KEY);
    return { formattedData: [], totalCount: 0 };
  }
};