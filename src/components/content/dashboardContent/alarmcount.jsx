import React, { useEffect, useState, useCallback } from "react";
import CountUp from "react-countup";
import { FiRefreshCw } from "react-icons/fi";
import { fetchAlarmCount } from "../../../backend/functions/alarmCountUtils"; // Corrected path as per your update

// Helper component for loading state
const SkeletonBlock = ({ className }) => (
  <div className={`bg-gray-200 animate-pulse rounded ${className}`}></div>
);

const AlarmCount = () => {
  const [alarmCount, setAlarmCount] = useState(0); // More descriptive name
  const [mostRecentFileName, setMostRecentFileName] = useState(""); // More descriptive name
  const [lastProcessedTime, setLastProcessedTime] = useState(""); // More descriptive name
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // useCallback to memoize the loadData function, preventing unnecessary re-creations
  // This is good practice when passing functions down to child components or when
  // the function is part of a dependency array for other hooks.
  const loadAlarmData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null); // Clear previous errors on a new load attempt

    try {
      const data = await fetchAlarmCount(forceRefresh);
      setAlarmCount(data.count);
      setMostRecentFileName(data.fileName);
      setLastProcessedTime(
        new Date(data.processedTimestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (err) {
      console.error("Failed to load alarm count:", err);
      // Provide a user-friendly error message, but log the detailed error for debugging
      setError(
        "Failed to load data. Please try again later."
      );
      setAlarmCount(0); // Reset count on error
      setMostRecentFileName("N/A"); // Indicate no file on error
      setLastProcessedTime("N/A"); // Indicate no processed time on error
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array means this function is created once

  // useEffect to call loadAlarmData on component mount
  useEffect(() => {
    loadAlarmData();
  }, [loadAlarmData]); // Dependency array includes loadAlarmData due to useCallback

  // Render Skeleton while loading
  if (isLoading) {
    return (
      <div className="bg-white rounded-md shadow p-6 w-full h-[362px] flex flex-col justify-center items-center">
        <SkeletonBlock className="h-8 w-3/4 mb-4" />
        <SkeletonBlock className="h-16 w-1/2 mb-2" />
        <SkeletonBlock className="h-4 w-2/3" />
      </div>
    );
  }

  // Render Error message if an error occurred
  if (error) {
    return (
      <div className="bg-white rounded-md shadow p-6 w-full h-[362px] flex flex-col justify-center items-center text-red-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75M2.697 16.126c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <p className="text-center font-semibold">Data Loading Error</p>
        <p className="text-sm text-center">{error}</p>
      </div>
    );
  }

  // Render the actual content
  return (
    <div className="bg-white rounded-md shadow p-6 w-full h-[362px] flex flex-col justify-center items-center text-center relative">
      <button
        onClick={() => loadAlarmData(true)} // Pass true to force refresh
        disabled={isLoading} // Disable button while loading
        className={`absolute top-4 right-4 p-2 rounded-full ${
          isLoading
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-500 hover:text-blue-600"
        }`}
        title="Refresh data" // More descriptive title
      >
        <FiRefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
      </button>
      <p className="text-xs text-gray-500 mb-3">
        (Most Recent File: {mostRecentFileName || "N/A"})
      </p>
      <CountUp
        end={alarmCount}
        duration={1.5}
        separator=","
        className="text-5xl font-bold text-gray-800"
      />
      <p className="text-xs text-gray-400 mt-2">Last processed: {lastProcessedTime}</p>
    </div>
  );
};

export default AlarmCount;