import React, { useEffect, useState } from "react";
import CountUp from "react-countup";
import * as XLSX from "xlsx";
import { FiRefreshCw } from "react-icons/fi"; // Import refresh icon
import supabase from "../../../backend/supabase/supabase";

const MOST_RECENT_FILE_COUNT_CACHE_KEY = 'mostRecentFileNumberCount';
const CACHE_TTL_MS = 30 * 60 * 1000;


const SkeletonBlock = ({ className }) => (
  <div className={`bg-gray-200 animate-pulse rounded ${className}`}></div>
);

const AlarmCount = () => {
  const [displayCount, setDisplayCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [lastProcessed, setLastProcessed] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAndCacheData = async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!forceRefresh) {
        const cached = localStorage.getItem(MOST_RECENT_FILE_COUNT_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          const isValid = Date.now() - parsed.processedTimestamp < CACHE_TTL_MS;
          if (isValid) {
            setDisplayCount(parsed.count);
            setFileName(parsed.fileName);
            setLastProcessed(new Date(parsed.processedTimestamp).toLocaleTimeString([], {
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            }));
            setIsLoading(false);
            return;
          }
        }
      }

      const { data: files, error: listError } = await supabase.storage
        .from("uploads")
        .list("excels", { sortBy: { column: "created_at", order: "desc" }, limit: 1 });



      if (listError) throw listError;
      if (!files || files.length === 0) throw new Error("No files found.");
   
      const recentFile = files[0];
      const { data: fileUrl, error: urlError } = await supabase.storage
        .from("uploads")
        .createSignedUrl(`excels/${recentFile.name}`, 300);

      if (urlError) throw urlError;

      const res = await fetch(fileUrl.signedUrl);
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      const count = jsonData.filter(row => row.number !== undefined && row.number !== null && row.number !== '').length;

      const timestamp = Date.now();
      localStorage.setItem(
        MOST_RECENT_FILE_COUNT_CACHE_KEY,
        JSON.stringify({
          count,
          fileName: recentFile.name,
          processedTimestamp: timestamp,
        })
      );

      setDisplayCount(count);
      setFileName(recentFile.name);
      setLastProcessed(new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to load count: " + err.message);
      setDisplayCount(0);
      setFileName("Error");
      setLastProcessed("N/A");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAndCacheData();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-md shadow p-6 w-full h-[362px] flex flex-col justify-center items-center">
        <SkeletonBlock className="h-8 w-3/4 mb-4" />
        <SkeletonBlock className="h-16 w-1/2 mb-2" />
        <SkeletonBlock className="h-4 w-2/3" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-md shadow p-6 w-full h-[362px] flex flex-col justify-center items-center text-red-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
          strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-4">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 
            3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 
            3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 
            15.75h.007v.008H12v-.008Z" />
        </svg>
        <p className="text-center font-semibold">Data Loading Error</p>
        <p className="text-sm text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md shadow p-6 w-full h-[362px] flex flex-col justify-center items-center text-center relative">
      <button
        onClick={() => loadAndCacheData(true)}
        disabled={isLoading}
        className={`absolute top-4 right-4 p-2 rounded-full 
        ${isLoading ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-blue-600"}`}
        title="Refresh"
      >
        <FiRefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
      </button>

      <div className="rounded-lg bg-blue-500 h-16 w-16 flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none"
          viewBox="0 0 24 24" strokeWidth={1.5} stroke="white"
          className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M16.5 6.75L9 15.75L6 12.75M21 12a9 9 0 
            11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      {/* <h2 className="text-lg font-semibold text-gray-700 mb-1 uppercase tracking-wider">
        Entries in "Number" Column
      </h2> */}
      <p className="text-xs text-gray-500 mb-3">(Most Recent File: {fileName || "N/A"})</p>
      <CountUp
        end={displayCount}
        duration={1.5}
        separator=","
        className="text-5xl font-bold text-gray-800"
      />
      <p className="text-xs text-gray-400 mt-2">Last processed: {lastProcessed}</p>
    </div>
  );
};

export default AlarmCount;
