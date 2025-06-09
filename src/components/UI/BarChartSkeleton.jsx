import React from 'react';

const BarChartSkeleton = () => {
  const fixedHeights = [60, 50, 75, 40, 65, 55]; // fixed percentages

  return (
    <div className="bg-white rounded-md shadow p-6 h-[350px] flex flex-col justify-between relative">
      {/* Bars Container */}
      <div className="flex flex-1 items-end justify-between px-4">
        {fixedHeights.map((height, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded animate-pulse w-[30px]"
            style={{ height: `${height}%` }}
          ></div>
        ))}
      </div>

      {/* X-axis Labels */}
      <div className="flex justify-between mt-4 px-4">
        {fixedHeights.map((_, i) => (
          <div key={i} className="h-3 w-10 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>

      {/* Y-axis (safe position) */}
      <div className="absolute top-6 left-6 bottom-16 w-2 bg-gray-200 rounded animate-pulse"></div>
    </div>
  );
};

export default BarChartSkeleton;