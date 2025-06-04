// ChartSkeleton.jsx
import React from 'react';

const ChartSkeleton = () => (
  <div className="bg-white rounded-md shadow p-6 flex flex-col items-center justify-center h-[350px]">
    <div className="w-full flex-grow flex items-center justify-center">
      {/* Circle for the pie chart */}
      <div className="relative w-48 h-48 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
        {/* Inner circle to simulate the donut hole */}
        <div className="w-24 h-24 rounded-full bg-white absolute"></div>
      </div>
    </div>
    {/* Placeholder for legend items */}
    <div className="w-full mt-4 flex justify-center flex-wrap gap-x-4 gap-y-2">
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
    </div>
  </div>
);

export default ChartSkeleton;