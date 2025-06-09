import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const LineChartSkeleton = () => {
  return (
    <div className="w-full h-[350px] p-4 bg-white rounded-md shadow flex flex-col justify-between">
      {/* Fake Y axis labels */}
      <div className="flex justify-start space-x-2 mb-4">
        <Skeleton width={40} height={12} />
        <Skeleton width="100%" height={1} />
      </div>

      {/* Fake chart area */}
      <div className="flex-grow relative">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Simulated lines */}
          {[...Array(3)].map((_, idx) => (
            <div
              key={idx}
              className="absolute w-full h-[2px] bg-gray-200 animate-pulse"
              style={{ top: `${20 + idx * 60}px` }}
            />
          ))}
          {/* Simulated dots */}
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"
              style={{
                position: "absolute",
                left: `${10 + i * 12}%`,
                top: `${100 - (i % 3) * 25}px`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Fake X axis labels */}
      <div className="flex justify-between mt-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} width={40} height={10} />
        ))}
      </div>
    </div>
  );
};

export default LineChartSkeleton;