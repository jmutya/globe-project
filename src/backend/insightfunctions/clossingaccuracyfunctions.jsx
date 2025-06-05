// src/services/excelService.js

import * as XLSX from "xlsx";
import supabase from "../supabase/supabase"; // Adjust path if necessary

// --- Caching Configuration ---
const CACHE_KEY = "excelDataCache";
const CACHE_DURATION_MINUTES = 7 * 24 * 60 * 60 * 1000; // Cache data for 5 minutes

// Simple in-memory cache store
let dataCache = null; // { timestamp: Date, data: { unmatchedRows, allProcessedRows, ... } }

/**
 * Helper to check if the cache is valid (not expired).
 */
const isCacheValid = () => {
  if (!dataCache || !dataCache.timestamp || !dataCache.data) {
    return false;
  }
  const now = new Date();
  const cacheTime = new Date(dataCache.timestamp);
  const diffMinutes = (now.getTime() - cacheTime.getTime()) / (1000 * 60);
  return diffMinutes < CACHE_DURATION_MINUTES;
};

// --- Helper Functions (No changes needed here) ---

/**
 * Format Excel-serial date (number) or raw string into "YYYY/MM/DD".
 */
const formatOpenedDate = (value) => {
  if (!value) return "";
  if (typeof value === "number") {
    // Excel dates start from Jan 1, 1900. 25569 is the offset to 1970-01-01.
    const date = new Date((value - 25569) * 86400 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }
  return value;
};

/**
 * Convert "YYYY/MM/DD" into "MM/YYYY". Used for grouping by ticket opened month.
 */
const getMonthFromDate = (dateStr) => {
  if (!dateStr || dateStr === "Invalid Date") return "Invalid Date";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Invalid Date";
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${month < 10 ? "0" : ""}${month}/${year}`;
};

/**
 * Convert an ISO date string (from Supabase created_at) into "MM/YYYY".
 * Returns "Invalid Date" if unable to parse.
 */
const getMonthYearFromISO = (isoDateString) => {
  if (!isoDateString) return "Invalid Date";
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${year}`;
  } catch (error) {
    console.error(
      "Error parsing ISO date string for month/year:",
      isoDateString,
      error
    );
    return "Invalid Date";
  }
};

/**
 * Formats an ISO date string (from Supabase) to "MM/DD/YYYY HH:MM AM/PM".
 */
export const formatDateTimeFromISO = (isoDateString) => {
  if (!isoDateString) return "N/A";
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return "Invalid Date";

    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yyyy = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;
    const hours12 = String(hours).padStart(2, "0");

    return `${mm}/${dd}/${yyyy} ${hours12}:${minutes} ${ampm}`;
  } catch (error) {
    console.error(
      "Error formatting ISO date string for display:",
      isoDateString,
      error
    );
    return "Invalid Date";
  }
};

/**
 * Calculate accuracy percentage (two decimal places).
 */
export const calculateAccuracy = (total, incomplete) => {
  if (total === 0) return "0.00";
  return (((total - incomplete) / total) * 100).toFixed(2);
};

/**
 * Main function: fetches all Excel files from Supabase Storage -> parses them -> returns:
 * {
 * unmatchedRows: Array<...>,
 * allProcessedRows: Array<...>,
 * ticketOpenedMonthOptions: Array<"MM/YYYY">,
 * uploadedFileOptions: Array<string> // <-- CHANGED: Now contains filenames
 * }
 *
 * Each processed row has shape:
 * {
 * number,
 * cause,
 * reason,
 * assignedTo,
 * opened,             // "YYYY/MM/DD"
 * ticketOpenedMonth,      // "MM/YYYY"
 * fileName,               // <-- ADDED: The name of the Excel file
 * fileUploadFullDateTime, // raw ISO string from Supabase
 * hasError: boolean,
 * missingColumns: Array<string>
 * }
 *
 * @param {boolean} forceRefresh - If true, bypass the cache and refetch data.
 */
export async function fetchAndProcessExcelData(forceRefresh = false) {
  // 1. Check Cache
  if (!forceRefresh && isCacheValid()) {
    console.log("Returning data from cache.");
    return dataCache.data;
  }

  console.log("Fetching and processing data (cache bypassed or expired).");
  const allUnmatched = [];
  const allProcessed = [];
  const ticketMonthsSet = new Set();
  // Changed set name for clarity and to store filenames
  const uploadedFileNamesSet = new Set();

  try {
    // 2) List all files under "uploads/excels"
    const { data: files, error: listError } = await supabase.storage
      .from("uploads")
      .list("excels", {
        sortBy: { column: "name", order: "asc" },
      });

    if (listError) {
      throw listError;
    }

    if (!files || files.length === 0) {
      // No files -> return empty structures and clear cache
      const emptyResult = {
        unmatchedRows: [],
        allProcessedRows: [],
        ticketOpenedMonthOptions: [],
        uploadedFileOptions: [], // <-- CHANGED: empty array for filenames
      };
      dataCache = { timestamp: new Date(), data: emptyResult }; // Cache the empty result
      return emptyResult;
    }

    // 3) Iterate over each file
    for (const file of files) {
      // Skip any placeholder files (e.g. ".emptyFolderPlaceholder")
      if (file.name === ".emptyFolderPlaceholder") {
        continue;
      }

      const fileName = file.name;
      const fileUploadFullDateTime = file.created_at; // ISO timestamp
      // Removed fileUploadMonth as it's no longer needed for filter options
      // const fileUploadMonth = getMonthYearFromISO(file.created_at);

      // --- CHANGE START ---
      // Instead of adding month, add the filename to the set
      uploadedFileNamesSet.add(fileName);
      // --- CHANGE END ---

      // 4) Get a **signed URL** for this file (recommended for private buckets)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("uploads")
        .createSignedUrl(`excels/${fileName}`, 60); // URL valid for 60 seconds

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.warn(`Could not get signed URL for "${fileName}": ${signedUrlError?.message || 'Unknown error'}. Skipping.`);
        continue;
      }

      // 5) Fetch the raw .xlsx
      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) {
        console.warn(
          `Failed to fetch ${fileName}: HTTP ${response.status}. Skipping.`
        );
        continue;
      }
      const arrayBuffer = await response.arrayBuffer();

      // 6) Parse with XLSX
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      // 7) Process each row
      sheetJson.forEach((row) => {
        const state = String(row["state"] || "").trim().toLowerCase();
        if (state === "cancelled") { // Ensure case-insensitive check
          return; // skip cancelled entries
        }

        const cause = row["u_cause"];
        const reason = row["u_reason_for_outage"];
        const assignedTo = row["assigned_to"];
        const number = row["number"];
        const openedRaw = row["opened_at"];
        const openedFormatted = formatOpenedDate(openedRaw);

        const missingColumns = [];
        if (!cause || typeof cause !== "string") missingColumns.push("u_cause");
        if (!reason || typeof reason !== "string")
          missingColumns.push("u_reason_for_outage");

        // Determine if there's an error: cause mismatch
        const hasError =
          !cause ||
          !reason ||
          typeof cause !== "string" ||
          typeof reason !== "string" ||
          reason.split("-")[0].trim().toLowerCase() !==
            cause.trim().toLowerCase();

        const ticketOpenedMonth = getMonthFromDate(openedFormatted);
        if (ticketOpenedMonth !== "Invalid Date") {
          ticketMonthsSet.add(ticketOpenedMonth);
        }

        const processedRow = {
          number,
          cause,
          reason,
          assignedTo,
          opened: openedFormatted,
          ticketOpenedMonth,
          // --- CHANGE START ---
          fileName, // Add fileName to each processed row
          // fileUploadMonth, // Removed as it's no longer used for filtering by filename
          // --- CHANGE END ---
          fileUploadFullDateTime,
          hasError,
          missingColumns,
        };

        allProcessed.push(processedRow);
        if (hasError) {
          allUnmatched.push(processedRow);
        }
      });
    }

    // 8) Sort month arrays (descending: newest first)
    const sortMonthsDesc = (arr) =>
      arr.sort((a, b) => {
        const [ma, ya] = a.split("/").map(Number);
        const [mb, yb] = b.split("/").map(Number);
        if (ya !== yb) return yb - ya;
        return mb - ma;
      });

    const ticketOpenedMonthOptions = sortMonthsDesc(
      Array.from(ticketMonthsSet)
    );
    // --- CHANGE START ---
    // Sort filenames alphabetically
    const uploadedFileOptions = Array.from(uploadedFileNamesSet).sort();
    // --- CHANGE END ---

    const result = {
      unmatchedRows: allUnmatched,
      allProcessedRows: allProcessed,
      ticketOpenedMonthOptions,
      uploadedFileOptions, // <-- CHANGED: Now returns filenames
    };

    // 9. Cache the result before returning
    dataCache = { timestamp: new Date(), data: result };
    return result;

  } catch (err) {
    console.error("Error in fetchAndProcessExcelData:", err);
    throw err;
  }
}