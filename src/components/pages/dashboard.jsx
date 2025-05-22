import React, { Suspense, lazy, useState, useRef } from "react";
import Card from "../card/Card";
import LazyLoadWrapper from "../content/LazyLoadWrapper";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const AlarmCount = lazy(() => import("../content/dashboardContent/alarmcount"));
const AlarmsSeverity = lazy(() => import("../content/dashboardContent/alarmseveritygraph"));
const AlarmCategory = lazy(() => import("../content/dashboardContent/AlarmCauseOfOutage"));
const AlarmTypeLineGraph = lazy(() => import("../content/dashboardContent/linegraph"));
const AlarmTypeBarGraph = lazy(() => import("../content/dashboardContent/bargraph"));
const TerritoryGraph = lazy(() => import("../content/dashboardContent/territorygraph"));
const AreaLineGraph = lazy(() => import("../content/dashboardContent/arealinegraph"));

const Dashboard = () => {
  // Create refs for each section
  const sectionRefs = {
    alarmCount: useRef(),
    alarmsSeverity: useRef(),
    alarmCategory: useRef(),
    alarmTypeBarGraph: useRef(),
    territoryGraph: useRef(),
    areaLineGraph: useRef(),
    alarmTypeLineGraph: useRef(),
  };

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

  // Export function capturing each section separately and paginating PDF
  const exportToPDF = async () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    let isFirstPage = true;

    for (const key of Object.keys(sectionRefs)) {
      const element = sectionRefs[key].current;
      if (!element) continue;

      // Render section to canvas with higher scale for better quality
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pageWidth) / imgProps.width;

      if (!isFirstPage) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pdfHeight);
      isFirstPage = false;
    }

    pdf.save("dashboard-report.pdf");
  };

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg h-[88vh] overflow-y-auto space-y-6">
      {/* Export Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={exportToPDF}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
        >
          Export Dashboard as PDF
        </button>
      </div>

      {/* Dashboard sections with individual refs */}
      <div className="space-y-6">
        <div ref={sectionRefs.alarmCount} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div ref={sectionRefs.alarmCategory} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

        <div ref={sectionRefs.territoryGraph}>
          <Suspense fallback={<div>Loading Territory Graph...</div>}>
            <LazyLoadWrapper onLoaded={() => handleComponentLoaded("territoryGraph")}>
              <Card><TerritoryGraph /></Card>
            </LazyLoadWrapper>
          </Suspense>
        </div>

        <div ref={sectionRefs.areaLineGraph}>
          <Suspense fallback={<div>Loading Area Line Graph...</div>}>
            <LazyLoadWrapper onLoaded={() => handleComponentLoaded("areaLineGraph")}>
              <Card><AreaLineGraph /></Card>
            </LazyLoadWrapper>
          </Suspense>
        </div>

        <div ref={sectionRefs.alarmTypeLineGraph}>
          <Suspense fallback={<div>Loading Alarm Type Line Graph...</div>}>
            <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmTypeLineGraph")}>
              <Card><AlarmTypeLineGraph /></Card>
            </LazyLoadWrapper>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
