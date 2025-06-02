import React from "react";

const cardtitleticketcount = () => {
  return (
    <div className="flex items-center mb-4">
      <div className="rounded-lg bg-blue-500 h-12 w-12 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="white"
          className="w-8 h-8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 6.75L9 15.75L6 12.75M21 12a9 9 0 
            11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-sm font-semibold text-gray-700 ml-3 uppercase tracking-wider">
          Ticket Count
        </h2>
    </div>
  );
};

export default cardtitleticketcount;
