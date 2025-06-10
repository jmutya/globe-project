import React from 'react'
import { AdjustmentsHorizontalIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import FilterData from "../content/insight/InsightContent/advancefilter";

function outage() {
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-[calc(100vh-theme.headerHeight)] md:min-h-[88vh] rounded-lg">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8"> {/* Enhanced shadow and border */}
        <div className="flex items-center mb-5">
          <AdjustmentsHorizontalIcon className="w-7 h-7 text-indigo-600 mr-3" /> {/* Slightly larger icon */}
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-800">Outage Advanced Filters</h2>
        </div>
        { <FilterData />}
      </div>
    </div>
  )
}

export default outage