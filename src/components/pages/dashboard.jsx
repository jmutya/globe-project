import React, { Suspense, lazy, useState } from "react";
import Card from "../card/Card";
import LazyLoadWrapper from "../content/LazyLoadWrapper";

// Lazy-loaded components
const AlarmCount = lazy(() => import("../content/dashboardContent/alarmcount"));
const AlarmsSeverity = lazy(() => import("../content/dashboardContent/alarmseveritygraph"));
const AlarmCategory = lazy(() => import("../content/dashboardContent/AlarmCauseOfOutage"));
const AlarmTypeLineGraph = lazy(() => import("../content/dashboardContent/linegraph"));
const AlarmTypeBarGraph = lazy(() => import("../content/dashboardContent/bargraph"));
const TerritoryGraph = lazy(() => import("../content/dashboardContent/territorygraph"));
const AreaLineGraph = lazy(() => import("../content/dashboardContent/arealinegraph"));

const Dashboard = () => {
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
      
      {/* Row 1: Count and Severity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Suspense fallback={<div>Loading Alarm Count...</div>}>
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmCount")}>
            <Card><AlarmCount /></Card>
          </LazyLoadWrapper>
        </Suspense>
        <Suspense fallback={<div>Loading Alarms Severity...</div>}>
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmsSeverity")}>
            <Card><AlarmsSeverity /></Card>
          </LazyLoadWrapper>
        </Suspense>
      </div>

      {/* Row 2: Category and Bar Graph */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Suspense fallback={<div>Loading Alarm Category...</div>}>
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmCategory")}>
            <Card><AlarmCategory /></Card>
          </LazyLoadWrapper>
        </Suspense>
        <Suspense fallback={<div>Loading Alarm Type Bar Graph...</div>}>
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmTypeBarGraph")}>
            <Card><AlarmTypeBarGraph /></Card>
          </LazyLoadWrapper>
        </Suspense>
      </div>

      {/* Row 3: Territory */}
      <Suspense fallback={<div>Loading Territory Graph...</div>}>
        <LazyLoadWrapper onLoaded={() => handleComponentLoaded("territoryGraph")}>
          <Card><TerritoryGraph /></Card>
        </LazyLoadWrapper>
      </Suspense>

      {/* Row 4: Area Line */}
      <Suspense fallback={<div>Loading Area Line Graph...</div>}>
        <LazyLoadWrapper onLoaded={() => handleComponentLoaded("areaLineGraph")}>
          <Card><AreaLineGraph /></Card>
        </LazyLoadWrapper>
      </Suspense>

      {/* Row 5: Line Graph moved to bottom */}
      <Suspense fallback={<div>Loading Alarm Type Line Graph...</div>}>
        <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmTypeLineGraph")}>
          <Card><AlarmTypeLineGraph /></Card>
        </LazyLoadWrapper>
      </Suspense>

    </div>
  );
};

export default Dashboard;
