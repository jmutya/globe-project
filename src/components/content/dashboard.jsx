import React, { Suspense, lazy, useState } from "react";

// Lazy load the components
const AlarmCount = lazy(() => import("./dashboardContent/alarmcount"));
const AlarmsSeverity = lazy(() => import("./dashboardContent/alarmseveritygraph"));
const AlarmCategory = lazy(() => import("./dashboardContent/alarmcategory"));
const AlarmTypeLineGraph = lazy(() => import("./dashboardContent/linegraph"));
const AlarmTypeBarGraph = lazy(() => import("./dashboardContent/bargraph"));
const TerritoryGraph = lazy(() => import("./dashboardContent/territorygraph"));
const AreaLineGraph = lazy(() => import("./dashboardContent/arealinegraph"));

import Card from "./../card/Card"; // Assuming the path is correct for Card
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
    <div className="p-6 bg-white shadow-lg rounded-lg h-[88vh] overflow-y-auto space-y-6">
      {/* First ROW: Three components */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <Suspense fallback={<div className="loading-placeholder">Loading Alarm Count...</div>}>
            <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmCount")}>
              <Card>
                <AlarmCount />
              </Card>
            </LazyLoadWrapper>
          </Suspense>
        </div>

        <div>
          <Suspense fallback={<div className="loading-placeholder">Loading Alarms Severity...</div>}>
            <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmsSeverity")}>
              <Card>
                <AlarmsSeverity />
              </Card>
            </LazyLoadWrapper>
          </Suspense>
        </div>

        <div>
          <Suspense fallback={<div className="loading-placeholder">Loading Alarm Category...</div>}>
            <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmCategory")}>
              <Card>
                <AlarmCategory />
              </Card>
            </LazyLoadWrapper>
          </Suspense>
        </div>
      </div>

      {/* Second ROW: One component */}
      <div>
        <Suspense fallback={<div className="loading-placeholder">Loading Alarm Type Line Graph...</div>}>
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmTypeLineGraph")}>
            <Card>
              <AlarmTypeLineGraph />
            </Card>
          </LazyLoadWrapper>
        </Suspense>
      </div>

      {/* Third ROW: Two components */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <Suspense fallback={<div className="loading-placeholder">Loading Alarm Type Bar Graph...</div>}>
            <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmTypeBarGraph")}>
              <Card>
                <AlarmTypeBarGraph />
              </Card>
            </LazyLoadWrapper>
          </Suspense>
        </div>

        <div className="min-w-[400px]">
          <Suspense fallback={<div className="loading-placeholder">Loading Territory Graph...</div>}>
            <LazyLoadWrapper onLoaded={() => handleComponentLoaded("territoryGraph")}>
              <Card>
                <TerritoryGraph />
              </Card>
            </LazyLoadWrapper>
          </Suspense>
        </div>
      </div>

      {/* Fourth ROW: One component */}
      <div>
        <Suspense fallback={<div className="loading-placeholder">Loading Area Line Graph...</div>}>
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("areaLineGraph")}>
            <Card>
              <AreaLineGraph />
            </Card>
          </LazyLoadWrapper>
        </Suspense>
      </div>
    </div>
  );
};

export default SeverityPieChart;
