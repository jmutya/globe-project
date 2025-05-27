import React, { useState } from "react";
import FilterData from "../InsightsContent/filter";
import TicketIssuance from "./InsightContent/TicketIssuance";
import ClosingAccuracy from "./InsightContent/ClosingAccuracy";

// Heroicons for a more modern and consistent look
import { AdjustmentsHorizontalIcon, ChartBarIcon } from "@heroicons/react/24/outline";

const InsightLayout = () => {
  const [selectedAccuracyView, setSelectedAccuracyView] = useState("ticketIssuance");

  return (
    <div className="p-8 bg-gray-50 min-h-[88vh] rounded-lg"> {/* Adjusted padding and background */}   
      {/* === Custom Filters Section === */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8"> {/* Refined styling */}
        <div className="flex items-center mb-5">
          <AdjustmentsHorizontalIcon className="w-6 h-6 text-indigo-600 mr-3" /> {/* Heroicon */}
          <h2 className="text-xl font-semibold text-gray-800">Outage Advanced Filters</h2>
        </div>
        <FilterData />
      </div>

      {/* === Accuracy View Switcher Section === */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"> {/* Refined styling */}
        <div className="flex items-center justify-between mb-5">
        
          <div className="flex items-center">
            <ChartBarIcon className="w-6 h-6 text-indigo-600 mr-3" /> {/* Heroicon */}
            <h2 className="text-xl font-semibold text-gray-800">Performance Accuracy View</h2>
          </div>
         
          <div className="relative inline-block text-gray-700"> {/* Styled dropdown */}

             <label className="text-m justify">Accuracy Selection : </label>
            <select
              className="appearance-none bg-gray-100 border border-gray-300 py-2 pl-4 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base cursor-pointer transition duration-150 ease-in-out"
              value={selectedAccuracyView}
              onChange={(e) => setSelectedAccuracyView(e.target.value)}
            >
              <option value="ticketIssuance">Ticket Issuance</option>
              <option value="closingAccuracy">Closing Accuracy</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
        
        {/* === Dynamic Content Area === */}
        <div className="mt-6"> {/* Added margin top for spacing */}
          {selectedAccuracyView === "ticketIssuance" && <TicketIssuance />}
          {selectedAccuracyView === "closingAccuracy" && <ClosingAccuracy />}
        </div>
      </div>
    </div>
  );
};

export default InsightLayout;