import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

const processExcelData = async (signedUrl) => {
  const response = await fetch(signedUrl);
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
};

export const fetchFtrData = async () => {
  const { data: files, error: listError } = await supabase.storage
    .from("uploads")
    .list("excels");

  if (listError) {
    console.error("Error listing files:", listError);
    return { allData: [], filteredResolutionCodes: [] };
  }

  const allSheetsData = await Promise.all(
    files.map(async (file) => {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("uploads")
        .createSignedUrl(`excels/${file.name}`, 60);

      if (signedUrlError) {
        console.error(`Error creating signed URL for ${file.name}:`, signedUrlError);
        return [];
      }

      return processExcelData(signedUrlData.signedUrl);
    })
  );

  const rawData = allSheetsData.flat();

  // Apply the filtering condition
  const filteredData = rawData.filter((row) => {
    const state = String(row["state"] || "").trim().toLowerCase();
    const priority = String(row["u_service_priority"] || "").trim().toLowerCase();
    return !(state === "cancelled" || priority !== "3 - access");
  });

  const excludedCount = rawData.length - filteredData.length;
  console.log(`Filtered out ${excludedCount} rows due to cancelled state or unmatched priority.`);

  // Then, filter for resolution codes
  const filteredResolutionCodes = filteredData.filter(
    (row) => row["close_code"]?.trim() === "Closed/Resolved by Caller"
  );

  return { allData: filteredData, filteredResolutionCodes };
};
