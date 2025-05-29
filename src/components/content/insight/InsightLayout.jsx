import React, { Suspense, lazy, useState } from "react";
import FilterData from "../InsightsContent/filter";
// Removed direct imports for TicketIssuance and ClosingAccuracy

// Heroicons for a more modern and consistent look
import { AdjustmentsHorizontalIcon, ChartBarIcon } from "@heroicons/react/24/outline";

// Lazy load the components that can be heavy or are conditionally rendered
const TicketIssuance = lazy(() => import("./InsightContent/TicketIssuance"));
const ClosingAccuracy = lazy(() => import("./InsightContent/ClosingAccuracy"));

// Skeleton component for the dynamic content area
const DynamicContentSkeleton = () => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse mt-6"> {/* Added mt-6 to match original spacing */}
    <div className="h-8 bg-gray-300 rounded w-1/2 mb-6"></div> {/* Mimicking a title bar */}
    <div className="space-y-5"> {/* Increased spacing a bit */}
      <div className="h-24 bg-gray-300 rounded"></div> {/* Larger block for potential charts/tables */}
      <div className="h-48 bg-gray-300 rounded"></div> {/* Another larger block */}
      <div className="flex gap-4">
        <div className="h-10 bg-gray-300 rounded w-1/4"></div>
        <div className="h-10 bg-gray-300 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);


const InsightLayout = () => {
  const [selectedAccuracyView, setSelectedAccuracyView] = useState("ticketIssuance");

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-[calc(100vh-theme.headerHeight)] md:min-h-[88vh] rounded-lg"> {/* Adjusted padding */}
      {/* === Custom Filters Section === */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8"> {/* Enhanced shadow and border */}
        <div className="flex items-center mb-5">
          <AdjustmentsHorizontalIcon className="w-7 h-7 text-indigo-600 mr-3" /> {/* Slightly larger icon */}
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-800">Outage Advanced Filters</h2>
        </div>
        <FilterData />
      </div>

      {/* === Accuracy View Switcher Section === */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200"> {/* Enhanced shadow and border */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-5 gap-4 sm:gap-0">
          <div className="flex items-center">
            <ChartBarIcon className="w-7 h-7 text-indigo-600 mr-3" /> {/* Slightly larger icon */}
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-800">Performance Accuracy View</h2>
          </div>
          
          <div className="flex items-center text-gray-700"> {/* Alignment for label and select */}
            <label htmlFor="accuracyViewSelect" className="text-sm md:text-base font-medium mr-2">Accuracy Selection:</label>
            <div className="relative">
              <select
                id="accuracyViewSelect"
                className="appearance-none bg-gray-50 border border-gray-300 py-2 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm md:text-base cursor-pointer transition duration-150 ease-in-out hover:border-gray-400"
                value={selectedAccuracyView}
                onChange={(e) => setSelectedAccuracyView(e.target.value)}
              >
                <option value="ticketIssuance">Ticket Issuance</option>
                <option value="closingAccuracy">Closing Accuracy</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* === Dynamic Content Area with Suspense === */}
        <div className="mt-6"> {/* Spacing before dynamic content */}
          <Suspense fallback={<DynamicContentSkeleton />}>
            {selectedAccuracyView === "ticketIssuance" && <TicketIssuance />}
            {selectedAccuracyView === "closingAccuracy" && <ClosingAccuracy />}
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default InsightLayout;