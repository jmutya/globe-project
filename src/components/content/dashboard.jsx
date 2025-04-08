import React, { Suspense, lazy, useState, useEffect } from "react";

// Lazy load the components
const AlarmCount = lazy(() => import("./dashboardContent/alarmcount"));
const AlarmsSeverity = lazy(() => import("./dashboardContent/alarmseveritygraph"));
const AlarmCategory = lazy(() => import("./dashboardContent/alarmcategory"));
const AlarmTypeLineGraph = lazy(() => import("./dashboardContent/linegraph"));
const AlarmTypeBarGraph = lazy(() => import("./dashboardContent/bargraph"));
const TerritoryGraph = lazy(() => import("./dashboardContent/territorygraph"));
const AreaLineGraph = lazy(() => import("./dashboardContent/arealinegraph"));

const LazyLoadWrapper = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(document.getElementById("lazyLoadComponent"));
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return (
    <div id="lazyLoadComponent">
      {isVisible ? children : <div>Loading...</div>}
    </div>
  );
};

const SeverityPieChart = () => {
  return (
    <div className="p-4 bg-white shadow-lg rounded-lg h-[88vh] overflow-y-auto">
      {/* First ROW */}
      <div className="mt-6 flex space-x-6">
        <div className="flex-1">
          <Suspense fallback={<div>Loading Alarm Count...</div>}>
            <LazyLoadWrapper>
              <AlarmCount />
            </LazyLoadWrapper>
          </Suspense>
        </div>
        <div className="flex-1">
          <Suspense fallback={<div>Loading Alarms Severity...</div>}>
            <LazyLoadWrapper>
              <AlarmsSeverity />
            </LazyLoadWrapper>
          </Suspense>
        </div>
        <div className="flex-1">
          <Suspense fallback={<div>Loading Alarm Category...</div>}>
            <LazyLoadWrapper>
              <AlarmCategory />
            </LazyLoadWrapper>
          </Suspense>
        </div>
      </div>

      {/* Second ROW */}
      <div className="mt-6">
        <Suspense fallback={<div>Loading Alarm Type Line Graph...</div>}>
          <LazyLoadWrapper>
            <AlarmTypeLineGraph />
          </LazyLoadWrapper>
        </Suspense>
      </div>

      {/* Third ROW */}
      <div className="mt-6 flex space-x-6">
        <div className="flex-1">
          <Suspense fallback={<div>Loading Alarm Type Bar Graph...</div>}>
            <LazyLoadWrapper>
              <AlarmTypeBarGraph />
            </LazyLoadWrapper>
          </Suspense>
        </div>
        <div className="flex-1 min-w-[400px]">
          <Suspense fallback={<div>Loading Territory Graph...</div>}>
            <LazyLoadWrapper>
              <TerritoryGraph />
            </LazyLoadWrapper>
          </Suspense>
        </div>
      </div>
      
      {/* Fourth ROW */}
      <div className="mt-6">
        <Suspense fallback={<div>Loading Area Line Graph...</div>}>
          <LazyLoadWrapper>
            <AreaLineGraph />
          </LazyLoadWrapper>
        </Suspense>
      </div>
    </div>
  );
};

export default SeverityPieChart;
