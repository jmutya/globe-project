import React from "react";
import AlarmTypeLineGraph from "./dashboardContent/linegraph";
import AlarmTypeBarGraph from "./dashboardContent/bargraph";
import TerritoryGraph from "./dashboardContent/territorygraph";
import AreaLineGraph from "./dashboardContent/arealinegraph";
const SeverityPieChart = () => {
  return (
    <div className="p-4 bg-white shadow-lg rounded-lg h-[88vh] overflow-y-auto">
      {/* 🔥 Include the line graph here */}
      <div className="mt-6">
        <AlarmTypeLineGraph />
      </div>

      <div className="mt-6 flex space-x-6">
        <div className="flex-1">
          <AlarmTypeBarGraph />
        </div>
        <div className="flex-1 min-w-[400px]">
          <TerritoryGraph />
        </div>
      </div>

      <div className="mt-6">
        <AreaLineGraph />
      </div>
    </div>
  );
};

export default SeverityPieChart;
