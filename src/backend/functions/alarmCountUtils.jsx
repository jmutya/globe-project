import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase"; // Adjust path as needed

const CACHE_KEY = "mostRecentFileNumberCount";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Fetches and processes the count from the most recent Excel file in Supabase storage.
 * @param {boolean} forceRefresh - If true, bypasses the cache and fetches fresh data.
 * @returns {Promise<{count: number, fileName: string, processedTimestamp: number}>}
 * @throws {Error} If there's an issue fetching or processing the file.
 */
export const fetchAlarmCount = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.processedTimestamp < CACHE_TTL) {
        return parsed; // Return cached data if valid
      }
    }
  }

  const { data: files, error: listError } = await supabase.storage
    .from("uploads")
    .list("excels", {
      sortBy: { column: "created_at", order: "desc" },
      limit: 1,
    });

  if (listError) throw listError;
  if (!files || files.length === 0) throw new Error("No files found.");

  const recentFile = files[0];

  const { data: urlData, error: urlError } = await supabase.storage
    .from("uploads")
    .createSignedUrl(`excels/${recentFile.name}`, 300);

  if (urlError) throw urlError;

  const res = await fetch(urlData.signedUrl);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.statusText}`);

  const arrayBuffer = await res.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet);

  const rowCount = jsonData.filter(
    (row) => row.number !== undefined && row.number !== null && row.number !== ""
  ).length;

  const timestamp = Date.now();
  const dataToCache = {
    count: rowCount,
    fileName: recentFile.name,
    processedTimestamp: timestamp,
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(dataToCache));

  return dataToCache;
};