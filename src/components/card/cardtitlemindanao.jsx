import React from "react";

const cardtitlemindanao = () => {
  return (
    <div className="flex items-center mb-4">
      <div className="rounded-lg bg-blue-500 h-12 w-12 flex items-center justify-center">
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
            d="M3 12l5 5L12 9l4 4 5-5" // Line chart with increasing trend
          />
        </svg>
      </div>
      <h2 className="text-sm font-semibold text-gray-700 ml-3 uppercase tracking-wider">
        Overall Alarm Trends in Mindanao
      </h2>
    </div>
  );
};

export default cardtitlemindanao;
