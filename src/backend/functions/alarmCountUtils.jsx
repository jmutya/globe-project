import * as XLSX from "xlsx";
import supabase from "../supabase/supabase"; // Ensure this path is correct

// Robust date parser (keep this as is)
const parseExcelDate = (value) => {
  if (!value) return null;
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + value * 86400000);
  }
  if (typeof value === "string") {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
      const [, month, day, year, hour, minute, second] = match.map(Number);
      return new Date(year, month - 1, day, hour, minute, second);
    }
  }
  const parsed = new Date(value);
  return isNaN(parsed) ? null : parsed;
};

// Your existing function, now correctly exported
export const fetchSeverityCounts = async () => {
  try {
    // ... (your existing logic for fetchSeverityCounts)
    // Make sure this function's logic is what you intend for it,
    // especially headers.indexOf("number") and headers.indexOf("severity")
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    let allRows = [];

    for (const file of files) {
      // IMPORTANT: If bucket is private, use createSignedUrl
      const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
      if (!fileUrl || !fileUrl.publicUrl) {
          console.warn(`Could not get public URL for ${file.name} in fetchSeverityCounts. Skipping.`);
          continue;
      }
      const response = await fetch(fileUrl.publicUrl);
       if (!response.ok) {
        console.warn(`Failed to fetch ${file.name} in fetchSeverityCounts (status: ${response.status}). Skipping.`);
        continue;
      }
      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) continue;
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

      if (sheet.length > 1) {
        const headers = sheet[0].map(h => String(h || "").trim());;
        const openedIndex = headers.indexOf("number"); // Based on your description for the new requirement
        const severityIndex = headers.indexOf("severity"); // Note: 'severity' lowercase

        if (openedIndex === -1) { // Severity can be optional if only counting numbers
            console.warn(`Column "number" not found in ${file.name}. Skipping for severity counts.`);
            continue;
        }
        // If severityIndex is -1, severity will be an empty string, which is handled

        sheet.slice(1).forEach((row) => {
          const openedDate = parseExcelDate(row[openedIndex]);
          const severity = severityIndex !== -1 ? String(row[severityIndex] || "").trim() : "N/A"; // Handle if severity column is missing

          if (openedDate) { // Only openedDate is strictly required now for this logic if severity is optional
            allRows.push({
              openedDate,
              severity,
              yearMonth: `${openedDate.getFullYear()}-${String(openedDate.getMonth() + 1).padStart(2, "0")}`,
            });
          }
        });
      }
    }

    if (allRows.length === 0) return { counts: {}, mostRecentMonth: null, uniqueDateCountInMonth: 0 };

    const mostRecentMonth = allRows.map(r => r.yearMonth).sort().reverse()[0];
    if (!mostRecentMonth) return { counts: {}, mostRecentMonth: null, uniqueDateCountInMonth: 0 };

    const recentMonthRows = allRows.filter(r => r.yearMonth === mostRecentMonth);

    const seenDates = new Set();
    const uniqueRows = recentMonthRows.filter(r => {
      const time = r.openedDate.getTime();
      if (seenDates.has(time)) return false;
      seenDates.add(time);
      return true;
    });

    const counts = {};
    uniqueRows.forEach(({ severity }) => {
      counts[severity] = (counts[severity] || 0) + 1;
    });

    return { counts, mostRecentMonth, uniqueDateCountInMonth: uniqueRows.length }; // Added uniqueDateCountInMonth
  } catch (error) {
    console.error("Error fetching severity counts:", error);
    return { counts: {}, mostRecentMonth: null, uniqueDateCountInMonth: 0, error: error.message };
  }
};

// Assume fetchStateDistribution is also in this file and needs export
// Add "export" if it's defined here. For example:
// export const fetchStateDistribution = async () => { /* ... */ };
// For now, let's mock it if it's not provided but imported by AlarmCount.jsx
// If you have fetchStateDistribution, ensure it's also exported.
// If not, you'll get another error for it in AlarmCount.jsx.
// For the purpose of THIS specific request (count "number" from most recent file),
// fetchStateDistribution might not be needed in the modified AlarmCount component.

// --- NEW FUNCTION as per your latest request ---
export const countUniqueDatesInNumberColumnFromMostRecentFile = async () => {
  try {
    const { data: files, error: listError } = await supabase.storage
      .from("uploads")
      .list("excels", {
        limit: 10, // Fetch a few to be safe, sorting is key
        sortBy: { column: "created_at", order: "desc" },
      });

    if (listError) throw listError;
    if (!files || files.length === 0) {
      console.log("No Excel files found.");
      return { count: 0, fileName: null, fileMetadata: null, processedTimestamp: Date.now() };
    }

    const mostRecentFile = files[0]; // The first file due to sorting

    // IMPORTANT: If bucket is private, use createSignedUrl
    const { data: fileUrlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(`excels/${mostRecentFile.name}`);

    if (!fileUrlData || !fileUrlData.publicUrl) {
      throw new Error(`Could not get public URL for ${mostRecentFile.name}`);
    }

    const response = await fetch(fileUrlData.publicUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${mostRecentFile.name}: ${response.status} ${response.statusText}`);
    }
    const blob = await response.arrayBuffer();
    const workbook = XLSX.read(blob, { type: "array" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      console.warn(`No sheets found in ${mostRecentFile.name}.`);
      return { count: 0, fileName: mostRecentFile.name, fileMetadata: mostRecentFile, processedTimestamp: Date.now() };
    }
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    const seenDatesInFile = new Set();

    if (sheet.length > 1) {
      const headers = sheet[0].map(h => String(h || "").trim());
      const numberColIdx = headers.indexOf("number");

      if (numberColIdx === -1) {
        console.warn(`Column "number" not found in ${mostRecentFile.name}. Headers: [${headers.join(', ')}]`);
        return { count: 0, fileName: mostRecentFile.name, fileMetadata: mostRecentFile, processedTimestamp: Date.now() };
      }

      sheet.slice(1).forEach((row) => {
        if (row === null || typeof row === 'undefined') return; // Skip empty rows that might be parsed as null
        const dateValue = row[numberColIdx];
        const parsedDate = parseExcelDate(dateValue);
        if (parsedDate) {
          const time = parsedDate.getTime();
          // Uniqueness is based on the exact timestamp from the "number" column
          seenDatesInFile.add(time);
        }
      });
    }

    return {
      count: seenDatesInFile.size,
      fileName: mostRecentFile.name,
      // Include metadata that helps identify the version of the processed file for caching
      fileMetadata: {
        name: mostRecentFile.name,
        id: mostRecentFile.id,
        created_at: mostRecentFile.created_at,
        last_modified: mostRecentFile.metadata?.lastModified || mostRecentFile.updated_at,
      },
      processedTimestamp: Date.now()
    };

  } catch (error) {
    console.error("Error counting 'number' header from most recent file:", error);
    return { count: 0, fileName: null, fileMetadata: null, error: error.message, processedTimestamp: Date.now() };
  }
};