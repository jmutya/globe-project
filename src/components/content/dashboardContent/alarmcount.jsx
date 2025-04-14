import React, { useState, useEffect } from "react";
import { fetchSeverityCounts } from "../../../backend/functions/alarmCountUtils"; // Adjust path if needed

const AlarmCount = () => {
  const [severityCounts, setSeverityCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const counts = await fetchSeverityCounts();
      setSeverityCounts(counts);
      setIsLoading(false);
    };

    loadData();
  }, []);

  const totalCount = Object.values(severityCounts).reduce((acc, count) => acc + count, 0);

  return (
    <div className="p-6 rounded-lg shadow-lg max-w-md mx-auto mt-10 flex flex-col">
      <h2 className="text-xl font-semibold text-black mb-4">Ticket Count</h2>

      {isLoading ? (
        <div className="flex justify-center items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          <p className="text-white">Processing Data...</p>
        </div>
      ) : totalCount > 0 ? (
        <p className="text-6xl font-semibold font-serif text-center text-indigo-600 mt-4">
          {totalCount}
        </p>
      ) : (
        <p className="text-white text-center mt-6">No data available</p>
      )}
    </div>
  );
};

export default AlarmCount;
