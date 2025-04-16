import React, { useState, useEffect } from "react";
import { fetchSeverityCounts } from "../../../backend/functions/alarmCountUtils"; // Adjust path if needed
import CountUp from "react-countup";

const AlarmCount = () => {
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const counts = await fetchSeverityCounts();
      setTotalCount(
        Object.values(counts).reduce((acc, count) => acc + count, 0)
      );
      setIsLoading(false);
    };

    loadData();
  }, []);

  return (
    <div className="bg-white rounded-md shadow p-6 w-full h-[350px] flex flex-col justify-between">
      <div>
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
                d="M9 7h6m-9 3v-6a2 2 0 012-2h10a2 2 0 012 2v6m-9 3h6m-3-3h.008v.008H12V10.008m-3-3h.008v.008H9V7.008m6 6h.008v.008H15V16.008"
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
            <CountUp
              end={totalCount}
              duration={1.5}
              separator=","
              className="text-4xl font-bold text-gray-800"
            />
          </div>
        ) : (
          <p className="text-gray-500 text-left py-6 text-sm">
            No active tickets
          </p>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs text-gray-500">
          See ticket details which require immediate attention.
        </p>
      </div>
    </div>
  );
};

export default AlarmCount;
