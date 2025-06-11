// src/utils/mttiReportUtils.js
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";
import { get, set } from "idb-keyval";

const CACHE_KEY = "mttiReportData";
const CACHE_DURATION_MS = 59 * 60 * 1000; // 59 minutes

// Convert Excel Date to ISO String
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
 * Fetches MTTI data from a private Supabase bucket, with caching using IndexedDB.
 * @returns {Promise<object[]>} The processed MTTI report data.
 */
export const fetchMttiData = async () => {
  try {
    const cached = await get(CACHE_KEY);
    if (cached) {
      const { timestamp, data } = cached;
      if (Date.now() - timestamp < CACHE_DURATION_MS) {
        console.log("Returning cached MTTI data from IndexedDB.");
        return data;
      }
    }

    console.log("Fetching new MTTI data from Supabase.");
    const { data: files, error } = await supabase.storage
      .from("uploads")
      .list("excels");

    if (error) {
      console.error("Supabase list error:", error);
      throw new Error("Failed to list files in Supabase.");
    }

    let allData = [];
    for (const file of files) {
      try {
        const { data: blob, error: downloadError } = await supabase.storage
          .from("uploads")
          .download(`excels/${file.name}`);

        if (downloadError) throw downloadError;

        const arrayBuffer = await blob.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          defval: "",
        });
        allData = [...allData, ...sheet];
      } catch (err) {
        console.error(`Failed to process file ${file.name}:`, err);
        continue;
      }
    }

    const filteredData = allData.filter((row) => {
      const state = String(row["state"] || "").trim().toLowerCase();
      const priority = String(row["u_service_priority"] || "")
        .trim()
        .toLowerCase();
      return !(state === "cancelled" || priority !== "3 - access");
    });

    const excludedCount = allData.length - filteredData.length;
    console.log(
      `Filtered out ${excludedCount} rows due to cancelled state or unmatched priority.`
    );

    const processedData = filteredData.map((row) => {
      const icRaw = row["u_investigation_completed"];
      const reportedRaw = row["u_reported_date"];
      const caller = String(row["caller_id"] || "Unknown Caller").trim();
      const number = String(row["number"] || "N/A").trim();

      const icISO = convertExcelDate(icRaw);
      const reportedISO = convertExcelDate(reportedRaw);

      let mtti = null;
      if (icISO && reportedISO) {
        const icDate = new Date(icISO);
        const reportedDate = new Date(reportedISO);
        const diffInMs = icDate - reportedDate;
        mtti = parseFloat((diffInMs / (1000 * 60)).toFixed(2));
      }

      return { caller, number, mtti };
    });

    await set(CACHE_KEY, {
      timestamp: Date.now(),
      data: processedData,
    });

    return processedData;
  } catch (err) {
    console.error("Error in fetchMttiData:", err);
    throw err;
  }
};
