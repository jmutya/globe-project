import React, { Suspense, lazy, useState } from "react";

// Lazy load the components
const AlarmCount = lazy(() => import("./dashboardContent/alarmcount"));
const AlarmsSeverity = lazy(() => import("./dashboardContent/alarmseveritygraph"));
const AlarmCategory = lazy(() => import("./dashboardContent/alarmcategory"));
const AlarmTypeLineGraph = lazy(() => import("./dashboardContent/linegraph"));
const AlarmTypeBarGraph = lazy(() => import("./dashboardContent/bargraph"));
const TerritoryGraph = lazy(() => import("./dashboardContent/territorygraph"));
const AreaLineGraph = lazy(() => import("./dashboardContent/arealinegraph"));

import LazyLoadWrapper from "./LazyLoadWrapper";

const SeverityPieChart = () => {
  const [loadedComponents, setLoadedComponents] = useState({
    alarmCount: false,
    alarmsSeverity: false,
    alarmCategory: false,
    alarmTypeLineGraph: false,
    alarmTypeBarGraph: false,
    territoryGraph: false,
    areaLineGraph: false,
  });

  const handleComponentLoaded = (componentName) => {
    setLoadedComponents((prevState) => ({
      ...prevState,
      [componentName]: true,
    }));
  };

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg h-[88vh] overflow-y-auto">
      {/* First ROW */}
      <div className="mt-6 flex space-x-6">
        <div className="flex-1">
          <Suspense fallback={<div>Loading Alarm Count...</div>}>
            <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmCount")}>
              <AlarmCount />
            </LazyLoadWrapper>
          </Suspense>
        </div>
        <div className="flex-1">
          <Suspense fallback={<div>Loading Alarms Severity...</div>}>
            <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmsSeverity")}>
              <AlarmsSeverity />
            </LazyLoadWrapper>
          </Suspense>
        </div>
        <div className="flex-1">
          <Suspense fallback={<div>Loading Alarm Category...</div>}>
            <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmCategory")}>
              <AlarmCategory />
            </LazyLoadWrapper>
          </Suspense>
        </div>
      </div>

      {/* Second ROW */}
      <div className="mt-6">
        <Suspense fallback={<div>Loading Alarm Type Line Graph...</div>}>
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmTypeLineGraph")}>
            <AlarmTypeLineGraph />
          </LazyLoadWrapper>
        </Suspense>
      </div>

      {/* Third ROW */}
      <div className="mt-6 flex space-x-6">
        <div className="flex-1">
          <Suspense fallback={<div>Loading Alarm Type Bar Graph...</div>}>
            <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmTypeBarGraph")}>
              <AlarmTypeBarGraph />
            </LazyLoadWrapper>
          </Suspense>
        </div>
        <div className="flex-1 min-w-[400px]">
          <Suspense fallback={<div>Loading Territory Graph...</div>}>
            <LazyLoadWrapper onLoaded={() => handleComponentLoaded("territoryGraph")}>
              <TerritoryGraph />
            </LazyLoadWrapper>
          </Suspense>
        </div>
      </div>

      {/* Fourth ROW */}
      <div className="mt-6">
        <Suspense fallback={<div>Loading Area Line Graph...</div>}>
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("areaLineGraph")}>
            <AreaLineGraph />
          </LazyLoadWrapper>
        </Suspense>
      </div>
    </div>
  );
};

export default SeverityPieChart;
