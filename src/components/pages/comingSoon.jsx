import React, { useState, useEffect } from "react";

const ComingSoon = () => {
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    // Fixed deadline: May 27, 2025 at 23:59:59 (Philippine time assumed local)
    // Note: The Date constructor uses local time if timezone not specified.
    const deadline = new Date("2025-05-27T23:59:59");

    const updateDaysLeft = () => {
      const now = new Date();
      const diffTime = deadline - now; // milliseconds difference
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysLeft(diffDays > 0 ? diffDays : 0);
    };

    updateDaysLeft();

    const timer = setInterval(updateDaysLeft, 1000 * 60 * 60); // update every hour

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      <svg
        className="w-24 h-24 mb-8 text-indigo-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10h1l1-2 2-3 3-2 5 1 3 5v3l-2 3-1 2H3v-7z"
        ></path>
      </svg>

      <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Coming Soon</h1>
      <p className="text-lg text-gray-700 max-w-md text-center mb-4">
        This page is currently under development. Please check back later.
      </p>

      <p className="text-indigo-600 font-semibold">
        Estimated time remaining: {daysLeft} {daysLeft === 1 ? "day" : "days"}
      </p>
    </div>
  );
};

export default ComingSoon;
