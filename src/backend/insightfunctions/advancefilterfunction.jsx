// backend/dataProcessingService.js
import * as XLSX from "xlsx";
import supabase from "../supabase/supabase"; // Adjust path if necessary

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = {
  timestamp: null,
  structuredData: null,
  parsingErrors: null,
  monthOptions: null,
};

// Helper function to convert Excel dates
const convertExcelDate = (value) => {
  const formatDate = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;

  if (typeof value === "number") {
    const millisecondsPerDay = 86400000;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * millisecondsPerDay);
    return formatDate(date);
  } else if (typeof value === "string") {
    const date = new Date(value);
    if (!isNaN(date)) return formatDate(date);
  }
  return "";
};

// Function to process a single Excel file from a URL (now a signed URL)
const processExcelFile = async (fileUrl) => {
  const response = await fetch(fileUrl);
  const blob = await response.arrayBuffer();
  const workbook = XLSX.read(blob, { type: "array" });
  const sheetName = workbook.SheetNames[0]; // Assuming first sheet
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
};

/**
 * Fetches and processes all Excel files from Supabase storage.
 * Uses createSignedUrl for private file access.
 * Applies simple in-memory caching to reduce redundant processing.
 * @returns {Object} An object containing structuredData, parsingErrors, and monthOptions.
 */
export const fetchAndProcessAllExcelData = async () => {
  const now = Date.now();
  if (
    cache.timestamp &&
    now - cache.timestamp < CACHE_TTL_MS &&
    cache.structuredData &&
    cache.parsingErrors &&
    cache.monthOptions
  ) {
    console.log("✅ Data served from in-memory cache");
    return {
      structuredData: cache.structuredData,
      parsingErrors: cache.parsingErrors,
      monthOptions: cache.monthOptions,
    };
  }
  console.log(
    "♻️ Cache expired or not found — fetching fresh data from Supabase..."
  );

  const { data: files, error } = await supabase.storage
    .from("uploads")
    .list("excels");

  if (error) {
    console.error("Supabase error fetching files:", error);
    throw new Error(`Failed to fetch files from storage: ${error.message}`);
  }

  let allData = [];
  const processedNumbers = new Set();
  const errors = [];

  for (const file of files) {
    if (file.name === ".emptyFolderPlaceholder") continue;

    const filePath = `excels/${file.name}`;
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage.from("uploads").createSignedUrl(filePath, 60);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      errors.push(
        `Failed to get signed URL for ${file.name}: ${
          signedUrlError?.message || "Unknown error"
        }`
      );
      continue;
    }

    try {
      const sheet = await processExcelFile(signedUrlData.signedUrl);
      const uniqueRows = sheet.filter((row) => {
        const number = row["number"];
        if (number && !processedNumbers.has(number)) {
          processedNumbers.add(number);
          return true;
        }
        return false;
      });
      allData.push(...uniqueRows);
    } catch (e) {
      errors.push(`Error processing ${file.name}: ${e.message}`);
    }
  }

  const structuredData = allData
    .map((row, idx) => {
      // const state = row["state"];
      // const service = row["u_service_priority"];
      // if (
      //   (state && String(state).trim().toLowerCase() === "cancelled") ||
      //   (service && String(service).trim().toLowerCase() !== "3-access")
      // ) {
      //   return null;
      // }

      const desc = row["short_description"];
      const cleanDesc = desc?.replace(/^[\s']+/, "");
      const match = cleanDesc?.match(/\(([^)]+)\)/);
      const date = convertExcelDate(row["opened_at"]);
      const reason = row["u_reason_for_outage"] || "Empty";
      const number = row["number"] || "";

      if (!desc) {
        errors.push(
          `Row ${idx + 1}: Missing Short description (Ticket Number: ${
            number || "N/A"
          })`
        );
        return null;
      }
      if (!match) {
        errors.push(
          `Row ${
            idx + 1
          }: Could not match pattern in "${desc}" (Ticket Number: ${
            number || "N/A"
          })`
        );
        return null;
      }
      const parts = match[1].split("-");
      if (parts.length < 5) {
        errors.push(
          `Row ${idx + 1}: Not enough parts in "${match[1]}" (Ticket Number: ${
            number || "N/A"
          })`
        );
        return null;
      }

      return {
        region: parts[0]?.trim() || "Unknown",
        area: parts[2]?.trim() || "Unknown",
        territory: parts[3]?.trim() || "Unknown",
        province: parts[4]?.trim() || "Unknown",
        reason,
        date,
        number,
      };
    })
    .filter(Boolean);

  const monthOptions = [
    ...new Set(
      structuredData.map((item) => item.date?.slice(0, 7)).filter(Boolean)
    ),
  ].sort();

  // Update cache
  cache.timestamp = now;
  cache.structuredData = structuredData;
  cache.parsingErrors = errors;
  cache.monthOptions = monthOptions;

  console.log("✅ Fetched and cached fresh data from Supabase");

  return { structuredData, parsingErrors: errors, monthOptions };
};

/**
 * Applies filters to the structured data and generates chart/summary data.
 * @param {Array} data - The raw structured data.
 * @param {Object} filters - Object containing selectedMonth, selectTerritory, selectedArea, selectedProvince.
 * @returns {Object} An object containing chartData, reasonSummary, uniqueReasonTableData, and tableData.
 */
export const generateFilteredData = (data, filters) => {
  const { selectedMonth, selectTerritory, selectedArea, selectedProvince } =
    filters;

  let filtered = [...data];

  if (selectedMonth) {
    filtered = filtered.filter((item) => item.date?.startsWith(selectedMonth));
  }
  if (selectTerritory) {
    filtered = filtered.filter((item) => item.territory === selectTerritory);
  }
  if (selectedArea) {
    filtered = filtered.filter((item) => item.area === selectedArea);
  }
  if (selectedProvince) {
    filtered = filtered.filter((item) => item.province === selectedProvince);
  }

  const tableData = filtered;

  let chartData = [];
  let reasonSummary = [];
  let uniqueReasonTableData = [];

  if (selectedProvince) {
    const groupedByDate = {};
    const reasonCount = {};
    const uniqueReasons = {};

    filtered.forEach((item) => {
      const date = item.date || "Unknown";
      const reasonCategory = item.reason?.split("-")[0]?.trim() || "Unknown";
      const fullReason = item.reason || "Empty";

      if (!groupedByDate[date]) groupedByDate[date] = {};
      groupedByDate[date][reasonCategory] =
        (groupedByDate[date][reasonCategory] || 0) + 1;
      reasonCount[reasonCategory] = (reasonCount[reasonCategory] || 0) + 1;
      uniqueReasons[fullReason] = (uniqueReasons[fullReason] || 0) + 1;
    });

    const allDates = Object.keys(groupedByDate).sort();
    const allReasonCategories = Object.keys(reasonCount);

    chartData = allDates.map((date) => {
      const entry = { date };
      allReasonCategories.forEach((reasonCategory) => {
        entry[reasonCategory] = groupedByDate[date][reasonCategory] || 0;
      });
      return entry;
    });

    reasonSummary = allReasonCategories.map((reasonCategory) => ({
      reason: reasonCategory,
      count: reasonCount[reasonCategory],
    }));

    uniqueReasonTableData = Object.entries(uniqueReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  } else {
    let groupKey = "territory";
    if (selectTerritory && !selectedArea) groupKey = "area";
    else if (selectTerritory && selectedArea && !selectedProvince)
      groupKey = "province";

    let grouped = {};
    let reasonCountLocal = {};

    filtered.forEach((item) => {
      const keyGroup = item[groupKey] || "Unknown";
      const keyDate = item.date || "Unknown";
      const reasonCategory = item.reason?.split("-")[0]?.trim() || "Empty";

      if (!grouped[keyGroup]) grouped[keyGroup] = {};
      grouped[keyGroup][keyDate] = (grouped[keyGroup][keyDate] || 0) + 1;

      reasonCountLocal[reasonCategory] =
        (reasonCountLocal[reasonCategory] || 0) + 1;
    });

    const dates = Array.from(
      new Set(filtered.map((item) => item.date).filter(Boolean))
    ).sort();

    chartData = dates.map((date) => {
      const entry = { date };
      for (const key in grouped) {
        entry[key] = grouped[key][date] || 0;
      }
      return entry;
    });

    reasonSummary = Object.entries(reasonCountLocal).map(([reason, count]) => ({
      reason,
      count,
    }));
  }

  return { chartData, reasonSummary, uniqueReasonTableData, tableData };
};
