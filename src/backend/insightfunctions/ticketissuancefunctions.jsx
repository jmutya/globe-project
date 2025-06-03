import * as XLSX from "xlsx";
import supabase from "../supabase/supabase"; // Adjust path if necessary

const formatOpenedDate = (value) => {
  if (!value) return "";
  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000);
    const yyyy = date.getFullYear(); // Corrected variable name
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }
  // If already a string, assume it's a date string and try to format
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const yyyy = date.getFullYear(); // Corrected variable name
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}/${mm}/${dd}`;
    }
  } catch (e) {
    // Fallback for invalid date strings
    return value;
  }
  return value;
};

/**
 * Extracts "MM/YYYY" from a "YYYY/MM/DD" date string.
 * @param {string} dateStr - The date string in "YYYY/MM/DD" format.
 * @returns {string} "MM/YYYY" string or "Invalid Date".
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
 * Formats an ISO date string (from Supabase 'created_at') to "MM/DD/YYYY HH:MM AM/PM".
 * @param {string} isoDateString - The ISO date string.
 * @returns {string} Formatted date-time string or "N/A" / "Invalid Date".
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
    const yyyy = date.getFullYear(); // Corrected variable name

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
 * @param {number} total - Total number of items.
 * @param {number} incomplete - Number of incomplete items.
 * @returns {string} Accuracy percentage formatted to two decimal places.
 */
export const calculateAccuracy = (total, incomplete) => {
  if (total === 0) return "0.00";
  return (((total - incomplete) / total) * 100).toFixed(2);
};

/**
 * Fetches Excel files from Supabase Storage, processes them, and returns relevant data.
 * Uses createSignedUrl for private file access.
 * @returns {Promise<object>} An object containing unmatchedRows, allProcessedRows,
 * ticketOpenedMonthOptions, and uploadedMonthOptions.
 * @throws {Error} If there's an error listing files, generating signed URLs, or parsing Excel.
 */
export const fetchAndProcessExcelData = async () => {
  let allUnmatched = [];
  let allProcessed = [];
  const ticketMonthsSet = new Set(); // For months from 'Opened' column
  const uploadMonthsSet = new Set(); // For months from Supabase 'created_at'

  try {
    const { data: files, error: listError } = await supabase.storage
      .from("uploads")
      .list("excels", { sortBy: { column: "name", order: "asc" } });

    if (listError) {
      throw listError;
    }

    if (!files || files.length === 0) {
      console.log("No Excel files found in the 'excels' folder.");
      return {
        unmatchedRows: [],
        allProcessedRows: [],
        ticketOpenedMonthOptions: [],
        uploadedMonthOptions: [],
      };
    }

    for (const file of files) {
      // Skip the .emptyFolderPlaceholder file
      if (file.name === ".emptyFolderPlaceholder") {
        console.log("Skipping .emptyFolderPlaceholder file.");
        continue;
      }

      const fileUploadFullDateTime = file.created_at; // Raw ISO string
      // Use formatDateTimeFromISO and substring to get "MM/YYYY" for dropdown
      const fileUploadMonth = formatDateTimeFromISO(file.created_at).substring(
        0,
        7
      );

      if (fileUploadMonth !== "Invalid Date") {
        uploadMonthsSet.add(fileUploadMonth);
      }

      const filePath = `excels/${file.name}`;

      // --- Using createSignedUrl for private access ---
      // This call requires the client to be authenticated and have RLS permissions
      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage.from("uploads").createSignedUrl(filePath, 60); // URL valid for 60 seconds

      if (signedUrlError) {
        console.warn(
          `Could not generate signed URL for ${file.name}: ${
            signedUrlError.message || String(signedUrlError)
          }. Skipping.`
        );
        continue;
      }

      if (!signedUrlData || !signedUrlData.signedUrl) {
        console.warn(`No signed URL received for ${file.name}. Skipping.`);
        continue;
      }

      // Use the generated signed URL to fetch the file content
      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} for signed URL of ${file.name}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      // --- NEW LOGIC: Pre-process the second sheet into a lookup map ---
      let firstUpdatedByIdToNameMap = new Map();
      const secondSheetName = workbook.SheetNames[1]; // Get the name of the second sheet (index 1)

      if (secondSheetName) {
        const sheet1Data = XLSX.utils.sheet_to_json(
          workbook.Sheets[secondSheetName],
          {
            defval: "",
          }
        );
        // Populate the map: ID -> Name
        sheet1Data.forEach((row) => {
          const ID = String(row["ID"]).trim(); // Ensure ID is a string and trimmed
          const name = String(row["Name"]).trim(); // Ensure Name is a string and trimmed
          if (ID) {
            firstUpdatedByIdToNameMap.set(ID, name || "Unknown Name");
          }
        });
      } else {
        console.warn(
          `Excel file ${file.name} does not have a second sheet for ID-to-Name mapping.`
        );
        // Continue processing the first sheet, but firstupdatedby might remain as original ID if not found
      }
      // --- END NEW LOGIC ---

      const sheet = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
        {
          defval: "", // Ensure empty cells are empty strings
        }
      );

      const requiredTicketIssuanceFields = [
        "u_failure_category",
        "u_cause",
        "u_aor001",
        "u_aor002",
      ];

      sheet.forEach((row) => {
        const state = row["state"];
        if (state && String(state).trim().toLowerCase() === "Cancelled") {
          return; // Skip this row
        }

        let assignedTo = row["caller_id"];
        const callervalue = row["assigned_to"];
        let firstupdatedbyFromMainSheet = String(
          row["u_ntg_first_updated_by"] || ""
        ).trim(); // Get ID from first sheet

        const normalizedAssignedTo = String(assignedTo || "")
          .trim()
          .toLowerCase();
        const normalizedCallervalue = String(callervalue || "").trim();

        if (normalizedAssignedTo === "mycom integration user") {
          if (normalizedCallervalue === "") {
            return;
          } else {
            // Lookup the name using the ID from the first sheet in our pre-processed map
            assignedTo =
              firstUpdatedByIdToNameMap.get(firstupdatedbyFromMainSheet) ||
              "N/A";
          }
        }

        const number = row["number"];
        const openedRaw = row["opened_at"];
        const openedFormatted = formatOpenedDate(openedRaw);

        const missingColumns = [];
        let hasError = false;

        requiredTicketIssuanceFields.forEach((field) => {
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
          ticketOpenedMonth: ticketOpenedMonth,
          fileUploadMonth: fileUploadMonth,
          fileUploadFullDateTime: fileUploadFullDateTime,
          hasError,
          missingColumns,
          failureCategory: row["u_failure_category"],
          cause: row["u_cause"],
          aor001: row["u_aor001"],
          aor002: row["u_aor002"],
        };
        allProcessed.push(processedRow);

        if (hasError) {
          allUnmatched.push(processedRow);
        }
      });
    }

    const sortedTicketMonths = Array.from(ticketMonthsSet).sort((a, b) => {
      const [ma, ya] = a.split("/").map(Number);
      const [mb, yb] = b.split("/").map(Number);
      return yb !== ya ? yb - ya : mb - ma;
    });

    const sortedUploadedMonths = Array.from(uploadMonthsSet).sort((a, b) => {
      const [ma, ya] = a.split("/").map(Number);
      const [mb, yb] = b.split("/").map(Number);
      return yb !== ya ? yb - ya : mb - ma;
    });

    return {
      unmatchedRows: allUnmatched,
      allProcessedRows: allProcessed,
      ticketOpenedMonthOptions: sortedTicketMonths,
      uploadedMonthOptions: sortedUploadedMonths,
    };
  } catch (err) {
    console.error(
      "Error fetching or processing Excel files:",
      err.message || String(err)
    );
    throw err;
  }
};
