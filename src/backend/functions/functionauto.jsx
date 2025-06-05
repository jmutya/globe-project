import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

const chartColors = [
  "#FF5E5E",
  "#FFB84C",
  "#FFD93D",
  "#72D86B",
  "#2BA8FF",
  "#0087A5",
  "#9951FF",
  "#FF7BAC",
];

// Define cache constants outside the function
const CACHE_KEY = "ManualticketingChartDataCacheperstate";
const CACHE_TIMESTAMP_KEY = "ManualticketingDataTimestamp";
const CACHE_TOTAL_COUNT_KEY = "ManualticketingChartTotalCountCache"; // New key for total count
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
      const monthIndex = new Date(
        Date.parse(`${monthName} 1, ${year}`)
      ).getMonth();
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
    const { data: files, error } = await supabase.storage
      .from("uploads")
      .list("excels");
    if (error) throw error;

    // Step 2: Find the latest monthly file
    const latestFile = getLatestMonthlyFile(files);

    if (!latestFile) {
      console.warn("No files with a recognized date pattern found in storage.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      localStorage.removeItem(CACHE_TOTAL_COUNT_KEY);
      return { formattedData: [], totalCount: 0 };
    }

    // Step 3: Fetch the signed URL
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("uploads")
      .createSignedUrl(`excels/${latestFile.name}`, 60);
    if (urlError) throw urlError;

    // Step 4: Download and parse the Excel file
    const response = await fetch(signedUrlData.signedUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch file: ${response.status} ${response.statusText}`
      );
    }

    const blob = await response.arrayBuffer();
    const workbook = XLSX.read(blob, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
    });

    if (sheet.length <= 1) {
      console.warn("Excel sheet is empty or contains only headers.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      localStorage.removeItem(CACHE_TOTAL_COUNT_KEY);
      return { formattedData: [], totalCount: 0 };
    }

    const headers = sheet[0];
    const findHeaderIndex = (label) =>
      headers.findIndex(
        (h) => String(h).trim().toLowerCase() === label.toLowerCase()
      );

    const stateIndex = findHeaderIndex("state");
    const callerIdIndex = findHeaderIndex("caller_id");
    const priorityIndex = findHeaderIndex("u_service_priority");

    if (stateIndex === -1 || callerIdIndex === -1 || priorityIndex === -1) {
      console.warn(
        "Required columns ('state', 'caller_id', 'u_service_priority') not found."
      );
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      localStorage.removeItem(CACHE_TOTAL_COUNT_KEY);
      return { formattedData: [], totalCount: 0 };
    }

    // Step 5: Filter and count data
    const categoryCounts = {};
    let totalCount = 0;

    for (const row of sheet.slice(1)) {
      const stateRaw = row[stateIndex];
      const callerRaw = row[callerIdIndex];
      const priorityRaw = row[priorityIndex];

      const stateValue = String(stateRaw || "").trim();
      const callerValue = String(callerRaw || "")
        .trim()
        .toLowerCase();
      const priorityValue = String(priorityRaw || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[–—−]/g, "-");

      // ✅ Include ONLY if caller is NOT "mycom integration user"
      // AND priority is exactly "3 - access"
      if (
        callerValue === "mycom integration user" ||
        priorityValue !== "3 - access"
      ) {
        continue; // skip rows that don't meet both criteria
      }

      const finalState = stateValue || "Unknown";
      categoryCounts[finalState] = (categoryCounts[finalState] || 0) + 1;
      totalCount++;
    }

    // Step 6: Format for chart
    const formattedData = Object.entries(categoryCounts).map(
      ([name, value], index) => ({
        name,
        value,
        fill: chartColors[index % chartColors.length],
      })
    );

    // Step 7: Cache and return
    localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
    localStorage.setItem(CACHE_TOTAL_COUNT_KEY, totalCount.toString());
    localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
    console.log("Fresh alarm category data fetched and cached.");

    return { formattedData, totalCount };
  } catch (error) {
    console.error(
      "Error fetching or processing alarm category chart data:",
      error
    );
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    localStorage.removeItem(CACHE_TOTAL_COUNT_KEY);
    return { formattedData: [], totalCount: 0 };
  }
};
