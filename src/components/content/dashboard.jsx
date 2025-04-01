import React, { useState, useEffect } from "react";
import AlarmTypeLineGraph from "./dashboardContent/linegraph";
import AlarmTypeBarGraph from "./dashboardContent/bargraph";
import TerritoryGraph from "./dashboardContent/territorygraph";
const SeverityPieChart = () => {
  return (
    <div className="p-4 bg-white shadow-lg rounded-lg h-[80vh] overflow-y-auto">
      {/* 🔥 Include the line graph here */}
      <div className="mt-6">
        <AlarmTypeLineGraph />
      </div>

      <div className="mt-6">
        <AlarmTypeBarGraph />
      </div>

      <div className="mt-6">
        <TerritoryGraph />
        </div>
    </div>
  );
};

export default SeverityPieChart;