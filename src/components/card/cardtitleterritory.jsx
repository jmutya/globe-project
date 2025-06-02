import React from "react";

const cardtitleterritory = () => {
  return (
    <div className="flex items-center mb-4">
      <div className="rounded-lg bg-orange-500 h-12 w-12 flex items-center justify-center">
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
              d="M4 18v-6m4 6v-4m4 4v-8m4 8V9m4 9V5"
            />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-gray-700 ml-3 uppercase tracking-wider">
          Overall Alarm Distribution by Territory
        </h2>
    </div>
  );
};

export default cardtitleterritory;
