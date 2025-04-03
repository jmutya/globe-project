import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import supabase from "../../../backend/supabase/supabase";

const AlarmCount = () => {
  const [severityCounts, setSeverityCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAndProcessFiles();
  }, []);

  const fetchAndProcessFiles = async () => {
    try {
      const { data: files, error } = await supabase.storage.from("uploads").list("excels");
      if (error) throw error;

      let counts = {};

      for (const file of files) {
        const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
        const response = await fetch(fileUrl.publicUrl);
        const blob = await response.arrayBuffer();
        const workbook = XLSX.read(blob, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: 1,
        });

        if (sheet.length > 1) {
          const headers = sheet[0];
          const severityIndex = headers.indexOf("Severity");

          if (severityIndex === -1) continue;

          sheet.slice(1).forEach((row) => {
            const severity = String(row[severityIndex] || "").trim();
            if (severity) {
              counts[severity] = (counts[severity] || 0) + 1;
            }
          });
        }
      }

      setSeverityCounts(counts);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching or processing files:", error);
      setIsLoading(false);
    }
  };

  // Calculate total count
  const totalCount = Object.values(severityCounts).reduce((acc, count) => acc + count, 0);

  return (
    <div className="p-6  rounded-lg shadow-lg max-w-md mx-auto mt-10">
      <h2 className="text-xl font-semibold text-black mb-4">Alarm Counts</h2>

      {isLoading ? (
        <div className="flex justify-center items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          <p className="text-white">Processing Data...</p>
        </div>
      ) : totalCount > 0 ? (
        <p className="text-3xl font-semibold font-serif text-center text-indigo-600 mt-4">{totalCount}</p>
      ) : (
        <p className="text-white text-center mt-6">No data available</p>
      )}
    </div>
  );
};

export default AlarmCount;
