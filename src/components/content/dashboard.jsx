import React from "react";
import AlarmTypeLineGraph from "./dashboardContent/linegraph";
import AlarmTypeBarGraph from "./dashboardContent/bargraph";
import TerritoryGraph from "./dashboardContent/territorygraph";
import AreaLineGraph from "./dashboardContent/arealinegraph";

const SeverityPieChart = () => {
  return (
    <div className="p-4 bg-white shadow-lg rounded-lg h-[88vh] overflow-y-auto overflow-x-hidden">
      {/* 🔥 Include the line graph here */}
      <div className="mt-6">
        <AlarmTypeLineGraph />
      </div>

      {/* 🔥 Bar Graph & Territory Graph */}
      <div className="mt-6 flex space-x-6 min-w-full">
        <div className="flex-1 min-w-[400px]">
          <AlarmTypeBarGraph />
        </div>
        <div className="flex-1 min-w-[400px]">
          <TerritoryGraph />
        </div>
      </div>

      {/* 🔥 Area Line Graph */}
      <div className="mt-6 pb-10">
        <AreaLineGraph />
      </div>
    </div>
  );
};

export default SeverityPieChart;
