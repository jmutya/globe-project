import * as XLSX from "xlsx";
import supabase from "../supabase/supabase";

const chartColors = [
  "#FF5E5E", "#FFB84C", "#FFD93D", "#72D86B",
  "#2BA8FF", "#0087A5", "#9951FF", "#FF7BAC"
];

const CACHE_KEY = "alarmCategoryChartDataCache";
const CACHE_TIMESTAMP_KEY = "alarmCategoryChartDataTimestamp";
const CACHE_TOTAL_COUNT_KEY = "alarmCategoryChartTotalCountCache";
const CACHE_DURATION = 59 * 60 * 1000; // ~1 hour

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

    if (fileDate && (!latestDate || fileDate > latestDate)) {
      latestDate = fileDate;
      latestFile = file;
    }
  });

  return latestFile;
};

export const fetchAlarmCategoryChartData = async () => {
  const now = new Date().getTime();

  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  const cachedTotalCount = localStorage.getItem(CACHE_TOTAL_COUNT_KEY);

  if (cachedData && cachedTimestamp && cachedTotalCount) {
    const timestamp = parseInt(cachedTimestamp, 10);
    if (now - timestamp < CACHE_DURATION) {
      console.log("Serving alarm category data from cache.");
      return {
        formattedData: JSON.parse(cachedData),
        totalCount: parseInt(cachedTotalCount, 10),
      };
    }
  }

  try {
    const { data: files, error } = await supabase.storage.from("uploads").list("excels");
    if (error) throw error;

    const latestFile = getLatestMonthlyFile(files);
    if (!latestFile) {
      console.warn("No valid file found.");
      localStorage.clear();
      return { formattedData: [], totalCount: 0 };
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("uploads")
      .createSignedUrl(`excels/${latestFile.name}`, 60);
    if (urlError) throw urlError;

    const response = await fetch(signedUrlData.signedUrl);
    if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

    const blob = await response.arrayBuffer();
    const workbook = XLSX.read(blob, { type: "array" });
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

    if (sheet.length <= 1) {
      console.warn("Sheet empty or only headers.");
      localStorage.clear();
      return { formattedData: [], totalCount: 0 };
    }

    const headers = sheet[0].map((h) => h?.toString().trim().toLowerCase());
    const stateIndex = headers.indexOf("state");
    const priorityIndex = headers.indexOf("u_service_priority");

    if (stateIndex === -1 || priorityIndex === -1) {
      console.warn("Missing required columns in Excel.");
      localStorage.clear();
      return { formattedData: [], totalCount: 0 };
    }

    const categoryCounts = {};
    let totalCount = 0;

    for (const row of sheet.slice(1)) {
      const rawPriority = row[priorityIndex] || "";
      const normalizedPriority = rawPriority
        .toString()
        .replace(/\s+/g, " ")
        .replace(/[–—−]/g, "-")
        .trim()
        .toLowerCase();

      if (normalizedPriority !== "3 - access") continue;

      let stateValue = String(row[stateIndex] || "").trim();
      if (!stateValue) stateValue = "Unknown";

      categoryCounts[stateValue] = (categoryCounts[stateValue] || 0) + 1;
      totalCount++;
    }

    const formattedData = Object.entries(categoryCounts).map(([name, value], index) => ({
      name,
      value,
      fill: chartColors[index % chartColors.length],
    }));

    localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
    localStorage.setItem(CACHE_TOTAL_COUNT_KEY, totalCount.toString());
    localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());

    console.log("Fresh alarm category data cached.");
    return { formattedData, totalCount };

  } catch (error) {
    console.error("Error processing alarm data:", error);
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    localStorage.removeItem(CACHE_TOTAL_COUNT_KEY);
    return { formattedData: [], totalCount: 0 };
  }
};
