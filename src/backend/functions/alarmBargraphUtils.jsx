import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

// Define cache constants outside the function to avoid re-declaration on each call
const CACHE_KEY = "failureCategoryDataCache";
const CACHE_TIMESTAMP_KEY = "failureCategoryDataTimestamp";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

const getLatestMonthlyFile = (files) => {
  let latestFile = null;
  let latestDate = null;

  files.forEach((file) => {
    // Extract date pattern like "Month Year" (e.g., "March 2025")
    // or "YYYY-MM" (e.g., "2025-03") from filename
    // Example: "failure March 2025.xlsx" or "failure_2025-03.xlsx"
    const matchMonthYear = file.name.match(/(\w+)\s+(\d{4})/); // "Month Year" format
    const matchYearMonth = file.name.match(/(\d{4})-(\d{2})/); // "YYYY-MM" format

    let fileDate = null;

    if (matchMonthYear) {
      // For "Month Year" format (e.g., "March 2025")
      const [_, monthName, year] = matchMonthYear;
      // Convert month name to a number (0-indexed for Date object)
      const monthIndex = new Date(Date.parse(monthName +" 1, 2000")).getMonth();
      fileDate = new Date(parseInt(year), monthIndex, 1);
    } else if (matchYearMonth) {
      // For "YYYY-MM" format (e.g., "2025-03")
      const [_, year, month] = matchYearMonth;
      fileDate = new Date(`${year}-${month}-01`);
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

export const fetchFailureCategoryData = async (colors) => {
  const now = new Date().getTime();

  // 1. Check Cache First
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

  if (cachedData && cachedTimestamp) {
    const timestamp = parseInt(cachedTimestamp, 10);
    if (now - timestamp < CACHE_DURATION) {
      console.log("Serving failure category data from cache.");
      return JSON.parse(cachedData);
    }
  }

  // 2. If no cache or cache expired, fetch fresh data
  console.log("Fetching fresh failure category data...");
  try {
    const { data: files, error } = await supabase.storage
      .from("uploads")
      .list("excels");
    if (error) throw error;

    console.log("Files found:", files.map((f) => f.name));
    // Get only the most recent file based on date pattern in filename
    const latestFile = getLatestMonthlyFile(files);
    if (!latestFile) {
      console.warn("No files with a recognized date pattern found.");
      // Clear cache if no valid file is found to prevent stale data
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return [];
    }

    // Use createSignedUrl for private bucket access:
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("uploads")
      .createSignedUrl(`excels/${latestFile.name}`, 60); // URL valid for 60 seconds
    if (urlError) throw urlError;

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

    let failureCategoryCounts = {};

    if (sheet.length > 1) {
      const headers = sheet[0];
      const failureCategoryIndex = headers.indexOf("u_failure_category");

      if (failureCategoryIndex === -1) {
        console.warn("Column 'u_failure_category' not found in the Excel sheet.");
        return []; // Return empty if header is missing
      }

      sheet.slice(1).forEach((row) => {
        let failureCategory = row[failureCategoryIndex];
        if (!failureCategory || (typeof failureCategory === 'string' && failureCategory.trim() === "")) {
          failureCategory = "unknown";
        } else if (typeof failureCategory === 'string') {
          failureCategory = failureCategory.trim();
        }
        // Handle cases where failureCategory might not be a string (e.g., number, null)
        if (typeof failureCategory !== 'string' && failureCategory !== 'unknown') {
            failureCategory = String(failureCategory); // Convert to string if not already
        }
        failureCategoryCounts[failureCategory] =
          (failureCategoryCounts[failureCategory] || 0) + 1;
      });
    }

    const formattedData = Object.entries(failureCategoryCounts).map(
      ([category, count], index) => ({
        category,
        count,
        fill: colors[index % colors.length],
      })
    );

    // 3. Cache the fresh data
    localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
    console.log("Fresh failure category data fetched and cached.");

    return formattedData;
  } catch (error) {
    console.error("Error fetching or processing failure category data:", error);
    // Clear cache on error to prevent serving stale/bad data
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    return [];
  }
};