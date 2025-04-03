import React, { useState, useEffect } from "react";
import AlarmTypeLineGraph from "./dashboardContent/linegraph";
import AlarmTypeBarGraph from "./dashboardContent/bargraph";
import TerritoryGraph from "./dashboardContent/territorygraph";
import AreaLineGraph from "./dashboardContent/arealinegraph";
import AlarmsSeverity from "./dashboardContent/alarmseveritygraph";
import AlarmCategory from "./dashboardContent/alarmcategory";
import AlarmCount from "./dashboardContent/alarmcount";
const SeverityPieChart = () => {
  return (
    <div className="p-4 bg-white shadow-lg rounded-lg h-[88vh] overflow-y-auto">
      {/* 🔥 FIRST ROW */}
      <div className="mt-6 flex space-x-6">
        <div className="flex-1">
          <AlarmCount />
        </div>

        <div className="flex-1">
          <AlarmsSeverity />
        </div>
        <div className="flex-1">
          <AlarmCategory />
        </div>
      </div>

      {/* 🔥 SECOND ROW*/}
      <div className="mt-6">
        <AlarmTypeLineGraph />
      </div>

      {/* 🔥 THIRD ROW*/}
      <div className="mt-6 flex space-x-6">
        <div className="flex-1">
          <AlarmTypeBarGraph />
        </div>
        <div className="flex-1">
          <TerritoryGraph />
        </div>
      </div>
      
      {/* 🔥 FOURTH ROW */}
      <div className="mt-6">
        <AreaLineGraph />
      </div>
    </div>
  );
};

export default SeverityPieChart;
