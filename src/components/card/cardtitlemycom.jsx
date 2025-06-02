import React from 'react'

const cardtitlemycom = () => {
  return (
    <div className="flex items-center mb-4">
        <div className="rounded-lg bg-yellow-500 h-12 w-12 flex items-center justify-center">
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
              d="M11.25 3.75a8.25 8.25 0 1 0 8.25 8.25h-8.25V3.75z"
            />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-gray-700 ml-3 uppercase tracking-wider">
         MYCOM - Categories of State 
        </h2>
      </div>
  )
}

export default cardtitlemycom