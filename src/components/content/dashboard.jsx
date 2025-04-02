import React, { useState, useEffect } from "react";
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

      <div className="mt-6">
        <TerritoryGraph />
      </div>

      <div className="mt-6">
        <AreaLineGraph />
      </div>

      <div className="mt-6">
        <AlarmTypeBarGraph />
      </div>
    </div>
  );
};

export default SeverityPieChart;
