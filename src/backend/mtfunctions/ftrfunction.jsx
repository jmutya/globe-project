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

  const allData = allSheetsData.flat();

  const filteredResolutionCodes = allData.filter(
    (row) => row["close_code"]?.trim() === "Closed/Resolved by Caller"
  );

  return { allData, filteredResolutionCodes };
};
