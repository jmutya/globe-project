import * as XLSX from "xlsx";
import supabase from "../supabase/supabase"; // Adjust path if necessary

// Helper function to get the latest monthly file (reused from your existing code)
const getLatestMonthlyFile = (files) => {
  let latestFile = null;
  let latestDate = null;

  files.forEach((file) => {
    let fileDate = null;

    const matchMonthYear = file.name.match(/(\w+)\s+(\d{4})/);
    if (matchMonthYear) {
      const [_, monthName, year] = matchMonthYear;
      const monthIndex = new Date(Date.parse(`${monthName} 1, ${year}`)).getMonth();
      fileDate = new Date(parseInt(year), monthIndex, 1);
    }

    if (!fileDate) {
      const matchYearMonth = file.name.match(/(\d{4})-(\d{2})/);
      if (matchYearMonth) {
        const [_, year, month] = matchYearMonth;
        fileDate = new Date(parseInt(year), parseInt(month) - 1, 1);
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

// Format Excel serial to "YYYY/MM/DD"
const formatOpenedDate = (value) => {
  if (!value) return "";
  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }
  return value;
};

// Turn "YYYY/MM/DD" into "MM/YYYY" for consistent monthly grouping (for ticket opened dates)
const getMonthFromDate = (dateStr) => {
  if (!dateStr || dateStr === "Invalid Date") return "Invalid Date";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Invalid Date";
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${month < 10 ? "0" : ""}${month}/${year}`;
};

// Get MM/YYYY from ISO string for upload date
const getMonthYearFromISO = (isoDateString) => {
  if (!isoDateString) return "Invalid Date";
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${year}`;
  } catch (error) {
    console.error(
      "Error parsing ISO date string for month/year:",
      isoDateString,
      String(error) // <--- CHANGE HERE: Explicitly convert error to string
    );
    return "Invalid Date";
  }
};

// New function to format ISO date string (from Supabase) to MM/DD/YYYY HH:MM for display
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
      String(error) // <--- CHANGE HERE: Explicitly convert error to string
    );
    return "Invalid Date";
  }
};

// Placeholder for accuracy calculation
export const calculateAccuracy = (total, incomplete) => {
  if (total === 0) return "0.00";
  return (((total - incomplete) / total) * 100).toFixed(2);
};

export const fetchAndProcessExcelData = async () => {
  let allUnmatched = [];
  let allProcessed = [];
  const ticketMonthsSet = new Set();
  const uploadMonthsSet = new Set();

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
      const fileUploadFullDateTime = file.created_at;
      const fileUploadMonth = getMonthYearFromISO(file.created_at);

      if (fileUploadMonth !== "Invalid Date") {
        uploadMonthsSet.add(fileUploadMonth);
      }

      const filePath = `excels/${file.name}`;

      // --- CHANGE STARTS HERE ---
      // Generate a signed URL for the private file, valid for 60 seconds (adjust as needed)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("uploads")
        .createSignedUrl(filePath, 60); // URL valid for 60 seconds

      if (signedUrlError) {
        console.warn(
          `Could not generate signed URL for ${file.name}: ${signedUrlError.message}. Skipping.`
        );
        continue;
      }

      if (!signedUrlData || !signedUrlData.signedUrl) {
        console.warn(`No signed URL received for ${file.name}. Skipping.`);
        continue;
      }

      // Use the signed URL to fetch the file
      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} for signed URL of ${file.name}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      // --- CHANGE ENDS HERE ---

      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheet = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
        {
          defval: "",
        }
      );

      sheet.forEach((row) => {
        const state = String(row["state"] || "").trim().toLowerCase();
        if (state === "cancelled") {
          return; // Skip this row
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
          ticketOpenedMonth: ticketOpenedMonth,
          fileUploadMonth: fileUploadMonth,
          fileUploadFullDateTime: fileUploadFullDateTime,
          hasError,
          missingColumns,
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
    console.error("Error in fetchAndProcessExcelData:", err);
    throw err; // Re-throw the error so the component can catch it
  }
};