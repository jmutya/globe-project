import * as XLSX from "xlsx";
import supabase from "../supabase/supabase"; // Adjust path if necessary

/**
 * In-memory cache for Excel files.
 * Key: file.name
 * Value: { fileUploadFullDateTime: string, processedRows: Array, unmatchedRows: Array }
 */
const excelFileCache = new Map();

// Define a cache expiry duration (e.g., 24 hours in milliseconds)
const CACHE_EXPIRY_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Loads the cache from localStorage.
 * Checks for expiry and clears if stale.
 */
const loadCacheFromLocalStorage = () => {
    const cachedData = localStorage.getItem('excelFileCache');
    const cacheExpiry = localStorage.getItem('excelFileCacheExpiry');

    if (cachedData && cacheExpiry) {
        const now = new Date().getTime();
        if (now < parseInt(cacheExpiry, 10)) {
            try {
                // Convert string back to Map. JSON.parse will give plain objects, need to reconstruct Map.
                const parsedData = JSON.parse(cachedData);
                for (const [key, value] of Object.entries(parsedData)) {
                    excelFileCache.set(key, value);
                }
                console.log('Cache loaded from localStorage and is valid.');
            } catch (e) {
                console.error('Failed to parse cache from localStorage:', e);
                // Clear corrupted cache
                localStorage.removeItem('excelFileCache');
                localStorage.removeItem('excelFileCacheExpiry');
            }
        } else {
            console.log('Cache in localStorage expired. Clearing cache.');
            localStorage.removeItem('excelFileCache');
            localStorage.removeItem('excelFileCacheExpiry');
        }
    }
};

/**
 * Saves the current in-memory cache to localStorage with an expiry.
 */
const saveCacheToLocalStorage = () => {
    try {
        // Convert Map to plain object for JSON serialization
        const cacheAsObject = {};
        for (const [key, value] of excelFileCache.entries()) {
            cacheAsObject[key] = value;
        }
        localStorage.setItem('excelFileCache', JSON.stringify(cacheAsObject));
        localStorage.setItem('excelFileCacheExpiry', (new Date().getTime() + CACHE_EXPIRY_DURATION).toString());
        console.log('Cache saved to localStorage.');
    } catch (e) {
        console.error('Failed to save cache to localStorage:', e);
    }
};


/**
 * Converts an Excel‐style serial date or ISO string into "YYYY/MM/DD".
 */
const formatOpenedDate = (value) => {
  if (!value) return "";
  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }
  // If already a string, parse and re‐format if valid
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}/${mm}/${dd}`;
    }
  } catch (e) {
    return value;
  }
  return value;
};

/**
 * Extracts "MM/YYYY" from a "YYYY/MM/DD" date string.
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
 * Formats an ISO date string (from Supabase 'created_at') to "MM/YYYY".
 * We only use the first 7 characters, but still validate.
 */
const getUploadMonthFromISO = (isoDateString) => {
  if (!isoDateString) return "Invalid Date";
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${mm}/${yyyy}`;
  } catch {
    return "Invalid Date";
  }
};

/**
 * Formats an ISO date string (from Supabase 'created_at') to "MM/DD/YYYY HH:MM AM/PM".
 */
export const formatDateTimeFromISO = (isoDateString) => {
  if (!isoDateString) return "N/A";
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yyyy = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;
    const hours12 = String(hours).padStart(2, "0");

    return `${mm}/${dd}/${yyyy} ${hours12}:${minutes} ${ampm}`;
  } catch (error) {
    console.error(
      "Error formatting ISO date string for display:",
      isoDateString,
      error.message || String(error)
    );
    return "Invalid Date";
  }
};

/**
 * Calculates accuracy percentage.
 */
export const calculateAccuracy = (total, incomplete) => {
  if (total === 0) return "0.00";
  return (((total - incomplete) / total) * 100).toFixed(2);
};

/**
 * Fetches Excel files from Supabase Storage, processes them, and returns relevant data,
 * while caching each file’s processed output keyed by file.name + file.created_at.
 *
 * On subsequent calls, if a given file’s created_at hasn’t changed, it returns the cached
 * processedRows/unmatchedRows immediately without re‐fetching from Supabase.
 */
export const fetchAndProcessExcelData = async () => {
  // Load cache from localStorage at the beginning of the function call
  loadCacheFromLocalStorage();

  // These will hold the aggregated results across ALL files:
  const allUnmatched = [];
  const allProcessed = [];
  const ticketMonthsSet = new Set(); // months from 'Opened' column
  const uploadedFilesSet = new Set(); // Changed from uploadMonthsSet to hold filenames

  try {
    // 1) List all files in "uploads/excels" folder (sorted by name asc)
    const { data: files, error: listError } = await supabase.storage
      .from("uploads")
      .list("excels", { sortBy: { column: "name", order: "asc" } });

    if (listError) {
      throw listError;
    }

    if (!files || files.length === 0) {
      console.log("No Excel files found in the 'excels' folder.");
      // Save empty cache to localStorage if no files are found or loaded to ensure expiry is updated
      saveCacheToLocalStorage(); // Ensure cache expiry is set even if no files
      return {
        unmatchedRows: [],
        allProcessedRows: [],
        ticketOpenedMonthOptions: [],
        uploadedMonthOptions: [], // This will now contain filenames
      };
    }

    // 2) Loop through each file (& skip ".emptyFolderPlaceholder")
    for (const file of files) {
      if (file.name === ".emptyFolderPlaceholder") {
        continue;
      }

      const fileName = file.name;
      const fileUploadFullDateTime = file.created_at; // ISO string
      uploadedFilesSet.add(fileName); // Add filename to the set

      // 3) Check cache: do we already have an entry for this file AND same timestamp?
      const cachedEntry = excelFileCache.get(fileName);
      if (
        cachedEntry &&
        cachedEntry.fileUploadFullDateTime === fileUploadFullDateTime
      ) {
        // Cache hit: reuse processedRows & unmatchedRows
        const { processedRows: fileProcessedRows, unmatchedRows: fileUnmatchedRows } = cachedEntry;

        // Push to aggregated arrays
        allProcessed.push(...fileProcessedRows);
        allUnmatched.push(...fileUnmatchedRows);

        // Re‐populate month sets from the cached rows
        fileProcessedRows.forEach((row) => {
          const tMonth = row.ticketOpenedMonth;
          if (tMonth && tMonth !== "Invalid Date") {
            ticketMonthsSet.add(tMonth);
          }
        });

        // Skip re‐processing this file entirely
        continue;
      }

      // 4) Cache miss (or changed file): fetch, parse, and process from scratch
      const filePath = `excels/${fileName}`;
      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage.from("uploads").createSignedUrl(filePath, 60); // Signed URL validity

      if (signedUrlError || !signedUrlData || !signedUrlData.signedUrl) {
        console.warn(
          `Could not generate signed URL for ${fileName}: ${
            (signedUrlError && signedUrlError.message) || "No signedUrl"
          }. Skipping.`
        );
        continue;
      }

      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) {
        console.warn(
          `HTTP error! status: ${response.status} fetching ${fileName}. Skipping.`
        );
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      // --- Build ID→Name map from second sheet (if it exists) ---
      const firstUpdatedByIdToNameMap = new Map();
      const secondSheetName = workbook.SheetNames[1];
      if (secondSheetName) {
        const sheet1Data = XLSX.utils.sheet_to_json(
          workbook.Sheets[secondSheetName],
          { defval: "" }
        );
        sheet1Data.forEach((row) => {
          const ID = String(row["ID"] || "").trim();
          const name = String(row["Name"] || "").trim();
          if (ID) {
            firstUpdatedByIdToNameMap.set(ID, name || "Unknown Name");
          }
        });
      } else {
        console.warn(
          `Excel file ${fileName} does not have a second sheet for ID-to-Name mapping.`
        );
      }

      // 5) Process the first sheet, row by row
      const rawSheetRows = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
        { defval: "" }
      );

      const requiredFields = [
        "u_failure_category",
        "u_cause",
        "u_aor001",
        "u_aor002",
      ];

      // Store just for this file, so we can cache later:
      const fileProcessedRows = [];
      const fileUnmatchedRows = [];

      rawSheetRows.forEach((row) => {
        const state = String(row["state"] || "").trim().toLowerCase();
        if (state === "cancelled") {
          return; // skip cancelled tickets
        }

        let assignedTo = row["caller_id"];
        const callervalue = row["assigned_to"];
        const firstUpdatedId = String(row["u_ntg_first_updated_by"] || "").trim();

        const normalizedAssignedTo = String(assignedTo || "").trim().toLowerCase();
        const normalizedCallervalue = String(callervalue || "").trim();

        if (normalizedAssignedTo === "mycom integration user") {
          if (!normalizedCallervalue) {
            return;
          } else {
            // Replace with mapped name if available
            assignedTo =
              firstUpdatedByIdToNameMap.get(firstUpdatedId) || "N/A";
          }
        }

        const number = row["number"];
        const openedRaw = row["opened_at"];
        const openedFormatted = formatOpenedDate(openedRaw);

        const missingColumns = [];
        let hasError = false;
        requiredFields.forEach((field) => {
          if (!row[field] || String(row[field]).trim() === "") {
            missingColumns.push(field);
            hasError = true;
          }
        });

        const ticketOpenedMonth = getMonthFromDate(openedFormatted);
        if (ticketOpenedMonth !== "Invalid Date") {
          ticketMonthsSet.add(ticketOpenedMonth);
        }

        const processedRow = {
          number,
          assignedTo: assignedTo || "Unknown",
          opened: openedFormatted,
          ticketOpenedMonth,
          fileName, // Add fileName to each processedRow
          fileUploadFullDateTime,
          hasError,
          missingColumns,
          failureCategory: row["u_failure_category"],
          cause: row["u_cause"],
          aor001: row["u_aor001"],
          aor002: row["u_aor002"],
        };

        fileProcessedRows.push(processedRow);
        if (hasError) {
          fileUnmatchedRows.push(processedRow);
        }
      });

      // 6) Cache this file’s processed results
      excelFileCache.set(fileName, {
        fileUploadFullDateTime,
        processedRows: fileProcessedRows,
        unmatchedRows: fileUnmatchedRows,
      });
      
      // 7) Add this file’s rows to the global aggregates
      allProcessed.push(...fileProcessedRows);
      allUnmatched.push(...fileUnmatchedRows);
      // (ticketMonthsSet has already been added per row, uploadedFilesSet per file)
    } // end for(files)

    // Save the entire updated cache to localStorage after all files are processed
    saveCacheToLocalStorage();

    // 8) Sort month dropdowns descending (newest first):
    const sortMonthsDesc = (arr) =>
      arr.sort((a, b) => {
        const [ma, ya] = a.split("/").map(Number);
        const [mb, yb] = b.split("/").map(Number);
        if (ya !== yb) return yb - ya;
        return mb - ma;
      });

    const ticketOpenedMonthOptions = sortMonthsDesc(Array.from(ticketMonthsSet));
    // Sort filenames alphabetically for consistency
    const uploadedFileOptions = Array.from(uploadedFilesSet).sort();

    return {
      unmatchedRows: allUnmatched,
      allProcessedRows: allProcessed,
      ticketOpenedMonthOptions,
      uploadedMonthOptions: uploadedFileOptions, // Renamed to accurately reflect filenames
    };
  } catch (err) {
    console.error(
      "Error fetching or processing Excel files:",
      err.message || String(err)
    );
    throw err;
  }
};