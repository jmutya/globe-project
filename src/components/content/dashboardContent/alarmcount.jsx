import React, { useState, useEffect } from "react";
import { fetchSeverityCounts } from "../../../backend/functions/alarmCountUtils"; // Adjust path if needed

const AlarmCount = () => {
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const counts = await fetchSeverityCounts();
      setTotalCount(Object.values(counts).reduce((acc, count) => acc + count, 0));
      setIsLoading(false);
    };

    loadData();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-sm">
      <div className="flex items-center mb-4">
        <div className="rounded-lg bg-green-500 h-12 w-12 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="white"
            className="w-7 h-7"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 5.25a3 3 0 013 3V15a3 3 0 01-3 3m-6-3h.008v.008H9v.008m6-3h.008v.008H15v.008m-3-3h.008v.008H12v.008"
            />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-gray-700 ml-3 uppercase tracking-wider">
          Ticket Count
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-300"></div>
          <p className="text-gray-500 ml-2 text-sm">Loading...</p>
        </div>
      ) : totalCount > 0 ? (
        <div className="flex items-center justify-start mt-2">
          <p className="text-4xl font-bold text-gray-800">{totalCount}</p>
        </div>
      ) : (
        <p className="text-gray-500 text-left py-6 text-sm">No active tickets</p>
      )}
      <div className="mt-4">
        <p className="text-xs text-gray-500">
          See ticket details which require immediate attention.
        </p>
      </div>
    </div>
  );
};

export default AlarmCount;