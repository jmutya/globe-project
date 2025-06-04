// BarChartSkeleton.jsx
import React from 'react';

const BarChartSkeleton = () => (
  <div className="bg-white rounded-md shadow p-6 flex flex-col justify-end h-[350px]">
    {/* Simulate bars */}
    <div className="flex justify-around items-end h-full px-4 pt-8">
      {/* Dynamic heights for visual interest */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-gray-200 rounded animate-pulse"
          style={{
            width: '30px', // Bar width
            height: `${20 + Math.random() * 60}%`, // Random height between 20% and 80%
            margin: '0 4px',
          }}
        ></div>
      ))}
    </div>
    {/* Simulate X-axis labels */}
    <div className="flex justify-around mt-2 px-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
      ))}
    </div>
    {/* Simulate Y-axis */}
    <div className="absolute top-6 left-6 h-full w-3 bg-gray-200 rounded animate-pulse"></div>
  </div>
);

export default BarChartSkeleton;