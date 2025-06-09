import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

const chartColors = [
  "#2BA8FF", // Example color for 'Used'
  "#FF5E5E", // Example color for 'Invalid'
  "#FFB84C", // Example color for 'Unused'
  "#72D86B", // Other general colors
  "#FFD93D",
  "#0087A5",
  "#9951FF",
  "#FF7BAC",
];

// Define cache constants outside the function
const CACHE_KEY = "AutomaticticketingChartDataCacheperstate";
const CACHE_TIMESTAMP_KEY = "AutomaticticketingDataTimestamp";
const CACHE_TOTAL_COUNT_KEY = "AutomaticticketingChartTotalCountCache"; // New key for total count
const CACHE_DURATION = 59 * 60 * 1000; // 30 minutes in milliseconds

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

export const fetchmycomChartData = async () => {
  const now = new Date().getTime();

  // 1. Check Cache First
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  const cachedTotalCount = localStorage.getItem(CACHE_TOTAL_COUNT_KEY);

  if (cachedData && cachedTimestamp && cachedTotalCount) {
    const timestamp = parseInt(cachedTimestamp, 10);
    if (now - timestamp < CACHE_DURATION) {
      console.log("Serving automatic ticketing data from cache.");
      return {
        formattedData: JSON.parse(cachedData),
        totalCount: parseInt(cachedTotalCount, 10),
      };
    }
  }

  console.log("Fetching fresh automatic ticketing data...");
  try {
    const { data: files, error } = await supabase.storage
      .from("uploads")
      .list("excels");
    if (error) throw error;

    const latestFile = getLatestMonthlyFile(files);
    if (!latestFile) {
      console.warn("No valid file found.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      localStorage.removeItem(CACHE_TOTAL_COUNT_KEY);
      return { formattedData: [], totalCount: 0 };
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
      console.warn("Excel sheet is empty or contains only headers.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      localStorage.removeItem(CACHE_TOTAL_COUNT_KEY);
      return { formattedData: [], totalCount: 0 };
    }

    const headers = sheet[0];
    console.log("Headers found:", headers);
    const findHeaderIndex = (label) =>
      headers.findIndex(
        (h) => String(h).trim().toLowerCase() === label.toLowerCase()
      );

    const stateIndex = findHeaderIndex("state");
    const callerIdIndex = findHeaderIndex("caller_id");
    const assignedtoIndex = findHeaderIndex("assigned_to");
    const servicePriorityIndex = findHeaderIndex("u_service_priority");

    if (stateIndex === -1 || callerIdIndex === -1 || servicePriorityIndex === -1) {
      console.warn("One or more required columns are missing.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      localStorage.removeItem(CACHE_TOTAL_COUNT_KEY);
      return { formattedData: [], totalCount: 0 };
    }

    if (assignedtoIndex === -1) {
      console.warn("Column 'assigned_to' not found. Will treat as optional.");
    }

    const categoryCounts = {
      Used: 0,
      Unused: 0,
      Invalid: 0,
    };
    let totalCount = 0;

    for (const row of sheet.slice(1)) {
      const callerIdValue = String(row[callerIdIndex] || "").trim().toLowerCase();
      const stateValue = String(row[stateIndex] || "").trim();
      const assignedtoValue =
        assignedtoIndex !== -1 ? String(row[assignedtoIndex] || "").trim() : "";
      const servicePriorityValue = String(row[servicePriorityIndex] || "")
        .trim()
        .toLowerCase();

      if (callerIdValue === "mycom integration user") {
        console.log(
          `[DEBUG] caller_id: '${callerIdValue}', u_service_priority: '${servicePriorityValue}'`
        );
      }

      if (
        callerIdValue === "mycom integration user" &&
        servicePriorityValue === "3 - access"
      ) {
        let assignedCategory = null;

        if (stateValue === "Cancelled") {
          assignedCategory = "Invalid";
        } else if (assignedtoValue) {
          assignedCategory = "Used";
        } else if (!assignedtoValue) {
          assignedCategory = "Unused";
        }

        if (assignedCategory) {
          categoryCounts[assignedCategory] =
            (categoryCounts[assignedCategory] || 0) + 1;
          totalCount++;
        }
      }
    }

    const formattedData = Object.entries(categoryCounts)
      .filter(([, value]) => value > 0)
      .map(([name, value], index) => {
        let fill = chartColors[index % chartColors.length];
        if (name === "Used") fill = "#17a2b8";
        else if (name === "Invalid") fill = "#fd7e14";
        else if (name === "Unused") fill = "#dc3545";
        return { name, value, fill };
      });

    localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
    localStorage.setItem(CACHE_TOTAL_COUNT_KEY, totalCount.toString());
    localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
    console.log("Fresh automatic ticketing data fetched and cached.");

    return { formattedData, totalCount };
  } catch (error) {
    console.error("Error fetching or processing data:", error);
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    localStorage.removeItem(CACHE_TOTAL_COUNT_KEY);
    return { formattedData: [], totalCount: 0 };
  }
};

