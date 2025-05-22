const ComingSoon = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      {/* Optional illustration or icon */}
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
      <p className="text-lg text-gray-700 max-w-md text-center">
        This page is currently under development. Please check back later.
      </p>
    </div>
  );
};

export default ComingSoon;
