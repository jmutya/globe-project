import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

const CACHE_KEY = "failureCategoryDataCache";
const CACHE_TIMESTAMP_KEY = "failureCategoryDataTimestamp";
const CACHE_DURATION = 30 * 60 * 1000;

const getLatestMonthlyFile = (files) => {
  let latestFile = null;
  let latestDate = null;

  files.forEach((file) => {
    const matchMonthYear = file.name.match(/(\w+)\s+(\d{4})/);
    const matchYearMonth = file.name.match(/(\d{4})-(\d{2})/);

    let fileDate = null;

    if (matchMonthYear) {
      const [_, monthName, year] = matchMonthYear;
      const monthIndex = new Date(
        Date.parse(monthName + " 1, 2000")
      ).getMonth();
      fileDate = new Date(parseInt(year), monthIndex, 1);
    } else if (matchYearMonth) {
      const [_, year, month] = matchYearMonth;
      fileDate = new Date(`${year}-${month}-01`);
    }

    if (fileDate && (!latestDate || fileDate > latestDate)) {
      latestDate = fileDate;
      latestFile = file;
    }
  });

  return latestFile;
};

export const fetchFailureCategoryData = async (colors) => {
  const now = new Date().getTime();

  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

  if (cachedData && cachedTimestamp) {
    const timestamp = parseInt(cachedTimestamp, 10);
    if (now - timestamp < CACHE_DURATION) {
      console.log("Serving failure category data from cache.");
      return JSON.parse(cachedData);
    }
  }

  console.log("Fetching fresh failure category data...");
  try {
    const { data: files, error } = await supabase.storage
      .from("uploads")
      .list("excels");
    if (error) throw error;

    console.log(
      "Files found:",
      files.map((f) => f.name)
    );

    const latestFile = getLatestMonthlyFile(files);
    if (!latestFile) {
      console.warn("No files with a recognized date pattern found.");
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return [];
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("uploads")
      .createSignedUrl(`excels/${latestFile.name}`, 60);
    if (urlError) throw urlError;

    const response = await fetch(signedUrlData.signedUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch file: ${response.status} ${response.statusText}`
      );
    }

    const blob = await response.arrayBuffer();
    const workbook = XLSX.read(blob, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
    });

    let failureCategoryCounts = {};

    if (sheet.length > 1) {
      const headers = sheet[0];
      const failureCategoryIndex = headers.indexOf("u_failure_category");
      const priorityIndex = headers.indexOf("u_service_priority");

      if (failureCategoryIndex === -1 || priorityIndex === -1) {
        console.warn("Required columns not found in the Excel sheet.");
        return [];
      }

      sheet.slice(1).forEach((row) => {
        const priority = row[priorityIndex];

        if (
          typeof priority !== "string" ||
          priority
            .replace(/\s+/g, " ")
            .replace(/[–—−]/g, "-")
            .trim()
            .toLowerCase() !== "3 - access"
        ) {
          return; // skip this row
        }

        let failureCategory = row[failureCategoryIndex];
        if (
          !failureCategory ||
          (typeof failureCategory === "string" && failureCategory.trim() === "")
        ) {
          failureCategory = "unknown";
        } else if (typeof failureCategory === "string") {
          failureCategory = failureCategory.trim();
        }

        if (
          typeof failureCategory !== "string" &&
          failureCategory !== "unknown"
        ) {
          failureCategory = String(failureCategory);
        }

        failureCategoryCounts[failureCategory] =
          (failureCategoryCounts[failureCategory] || 0) + 1;
      });
    }

    const formattedData = Object.entries(failureCategoryCounts).map(
      ([category, count], index) => ({
        category,
        count,
        fill: colors[index % colors.length],
      })
    );

    localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
    console.log("Fresh failure category data fetched and cached.");

    return formattedData;
  } catch (error) {
    console.error("Error fetching or processing failure category data:", error);
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    return [];
  }
};