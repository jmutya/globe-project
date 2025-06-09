// src/utils/reportUtils.js
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";

const CACHE_KEY = "reportedCreatedData";
const CACHE_DURATION_MS = 59 * 60 * 1000; // 59 minutes

// --- Supabase Interaction Logic ---

/**
 * Fetches and parses all Excel files from the Supabase bucket.
 * @returns {Promise<object[]>} A promise that resolves to the combined JSON data from all files.
 */
const fetchAndParseExcelFiles = async () => {
  const { data: files, error: listError } = await supabase.storage
    .from("uploads")
    .list("excels");

  if (listError) {
    console.error("Supabase list error:", listError);
    throw listError;
  }

  let allData = [];
  for (const file of files || []) {
    try {
      const { data: blob, error: downloadError } = await supabase.storage
        .from("uploads")
        .download(`excels/${file.name}`);

      if (downloadError) {
        throw downloadError;
      }

      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "",
      });
      allData = [...allData, ...sheetData];
    } catch (error) {
      console.error(`Failed to process file ${file.name}:`, error);
      continue; // Skip to the next file
    }
  }
  return allData;
};

// --- Data Transformation Logic ---

/**
 * Converts various date formats (string, Excel number) to an ISO string.
 * @param {string|number} value - The date value from the Excel sheet.
 * @returns {string} The date in ISO format or an empty string if invalid.
 */
const convertExcelDate = (value) => {
  if (typeof value === "string") {
    const cleaned = value.replace(/\s+/g, " ").trim();
    const [datePart, timePart, ampm] = cleaned.split(" ");
    if (!datePart || !timePart || !ampm) return "";

    const [day, month, year] = datePart.split("/");
    let [hour, minute, second] = timePart.split(":").map(Number);

    if (ampm.toLowerCase() === "pm" && hour < 12) hour += 12;
    if (ampm.toLowerCase() === "am" && hour === 12) hour = 0;

    const date = new Date(
      `${year}-${month}-${day}T${String(hour).padStart(2, "0")}:${String(
        minute
      ).padStart(2, "0")}:${String(second).padStart(2, "0")}`
    );
    return !isNaN(date) ? date.toISOString() : "";
  }

  if (typeof value === "number") {
    const millisecondsPerDay = 86400000;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * millisecondsPerDay);
    return date.toISOString();
  }

  return "";
};

/**
 * Main function to get report data, using a cache to avoid redundant fetches.
 * @returns {Promise<object[]>} The processed report data.
 */
export const getReportedAndCreatedData = async () => {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION_MS) {
      console.log("Returning cached data.");
      return data;
    }
  }

  console.log("Fetching new data from Supabase.");
  const rawData = await fetchAndParseExcelFiles();

  const processedData = rawData.map((row) => {
    const reportedRaw = row["u_reported_date"];
    const createdRaw = row["sys_created_on"];
    const caller = String(row["caller_id"] || "Unknown Caller").trim();
    const number = String(row["number"] || "N/A").trim();

    const reportedISO = convertExcelDate(reportedRaw);
    const createdISO = convertExcelDate(createdRaw);

    let mttt = "N/A";
    if (reportedISO && createdISO) {
      const reportedDate = new Date(reportedISO);
      const createdDate = new Date(createdISO);
      const diffInMs = createdDate - reportedDate;
      mttt = (diffInMs / (1000 * 60)).toFixed(2);
    }

    return {
      caller,
      number,
      reported: reportedISO ? reportedISO.replace("T", " ").slice(0, 19) : "",
      created: createdISO ? createdISO.replace("T", " ").slice(0, 19) : "",
      mttt,
    };
  });

  // Cache the newly fetched data
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ timestamp: Date.now(), data: processedData })
  );

  return processedData;
};