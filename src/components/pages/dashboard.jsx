import React, { Suspense, lazy, useState, useRef } from "react"; // Removed useEffect as it wasn't used here
import Card from "../card/Card"; // Assuming Card is just a layout wrapper
import LazyLoadWrapper from "../content/LazyLoadWrapper"; // Keep this as it tracks loading for PDF
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Lazy-loaded components
const AlarmCount = lazy(() => import("../content/dashboardContent/alarmcount"));
const AlarmsSeverity = lazy(() => import("../content/dashboardContent/alarmseveritygraph"));
const AlarmCategory = lazy(() => import("../content/dashboardContent/AlarmCauseOfOutage"));
const AlarmTypeLineGraph = lazy(() => import("../content/dashboardContent/linegraph"));
const AlarmTypeBarGraph = lazy(() => import("../content/dashboardContent/bargraph"));
const TerritoryGraph = lazy(() => import("../content/dashboardContent/territorygraph"));
const AreaLineGraph = lazy(() => import("../content/dashboardContent/arealinegraph"));

// --- Skeleton Components ---
const CardSkeleton = ({ className = "", children }) => (
  <div className={`bg-gray-100 p-4 md:p-6 rounded-lg shadow-md animate-pulse ${className}`}>
    {children || (
      <>
        <div className="h-7 bg-gray-300 rounded w-3/4 mb-4"></div> {/* Title placeholder */}
        <div className="space-y-3">
          <div className="h-5 bg-gray-300 rounded w-full"></div>
          <div className="h-5 bg-gray-300 rounded w-5/6"></div>
          <div className="h-24 md:h-32 bg-gray-300 rounded w-full mt-4"></div> {/* Content/Graph placeholder */}
        </div>
      </>
    )}
  </div>
);

// More specific for graph-like content, often taller
const GraphCardSkeleton = ({ className = "" }) => (
  <CardSkeleton className={className}>
    <div className="h-6 bg-gray-300 rounded w-1/2 mb-4"></div> {/* Title placeholder */}
    <div className="h-48 md:h-64 bg-gray-300 rounded"></div> {/* Main graph area placeholder */}
  </CardSkeleton>
);

// For smaller info cards like AlarmCount
const InfoCardSkeleton = ({ className = "" }) => (
  <CardSkeleton className={className}>
    <div className="h-6 bg-gray-300 rounded w-3/5 mb-3"></div> {/* Title for info */}
    <div className="h-10 bg-gray-300 rounded w-1/2 mt-2"></div> {/* Large number placeholder */}
    <div className="h-4 bg-gray-300 rounded w-4/5 mt-3"></div> {/* Subtext placeholder */}
  </CardSkeleton>
);
// --- End of Skeleton Components ---

const Dashboard = () => {
  // Create refs for each section
  const sectionRefs = {
    alarmMetricsSection: useRef(), // For the grid containing AlarmCount and AlarmsSeverity
    alarmBreakdownSection: useRef(), // For the grid containing AlarmCategory and AlarmTypeBarGraph
    territoryGraphSection: useRef(),
    areaLineGraphSection: useRef(),
    alarmTypeLineGraphSection: useRef(),
  };

  // This state is kept to ensure components are fully "ready" for PDF export
  // LazyLoadWrapper's onLoaded callback updates this.
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

  const exportToPDF = async () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight(); // Get page height for better fitting
    const margin = 10; // Margin for the PDF page
    const usableWidth = pageWidth - 2 * margin;
    let isFirstPage = true;
    let yPosition = margin; // Start y position for images

    // Helper function to add image to PDF and handle pagination
    const addImageToPdf = (imgData, imgProps) => {
      const pdfImageHeight = (imgProps.height * usableWidth) / imgProps.width;

      if (!isFirstPage && yPosition + pdfImageHeight + margin > pageHeight) {
        pdf.addPage();
        yPosition = margin; // Reset yPosition for new page
      }
      
      if (isFirstPage) {
        isFirstPage = false; // For the first image, yPosition might already be margin
      } else if (yPosition !== margin) { // Add some space between sections unless it's a new page start
         yPosition += 5; // Space between components on the same page
         if (yPosition + pdfImageHeight + margin > pageHeight) { // Check again after adding space
            pdf.addPage();
            yPosition = margin;
         }
      }


      pdf.addImage(imgData, "PNG", margin, yPosition, usableWidth, pdfImageHeight);
      yPosition += pdfImageHeight;
    };
    
    // Show a loading indicator for PDF generation
    const pdfButton = document.getElementById("pdfExportButton");
    if(pdfButton) pdfButton.textContent = "Generating PDF...";


    // Ensure all components intended for PDF are loaded
    // This is a simple check; you might want a more robust way if PDF is critical
    const allLoaded = Object.values(loadedComponents).every(Boolean);
    if (!allLoaded) {
      alert("Dashboard components are still loading. Please wait and try again.");
      if(pdfButton) pdfButton.textContent = "Export Dashboard as PDF";
      return;
    }


    // Iterate through refs in the desired order for the PDF
    const orderedSectionKeys = [
      "alarmMetricsSection",
      "alarmBreakdownSection",
      "territoryGraphSection",
      "areaLineGraphSection",
      "alarmTypeLineGraphSection",
    ];

    for (const key of orderedSectionKeys) {
      const element = sectionRefs[key].current;
      if (!element) {
        console.warn(`Element for ref ${key} not found.`);
        continue;
      }

      try {
        const canvas = await html2canvas(element, {
          scale: 2, // Higher scale for better quality
          useCORS: true, // If you have external images/fonts
          logging: false, // Disable extensive logging in console
          backgroundColor: '#ffffff', // Ensure background is white for consistency
          onclone: (document) => { // Ensure styles are fully applied, especially for Tailwind
            // You might need to re-apply certain global styles if they don't transfer well
          }
        });
        const imgData = canvas.toDataURL("image/png", 0.95); // Use slightly lower quality for smaller file if needed
        const imgProps = pdf.getImageProperties(imgData);
        addImageToPdf(imgData, imgProps);
      } catch (error) {
        console.error(`Error capturing section ${key} for PDF:`, error);
        alert(`Could not capture section ${key} for the PDF. It might be too complex or contain unsupported content.`);
      }
    }
    
    pdf.save("dashboard-report.pdf");
    if(pdfButton) pdfButton.textContent = "Export Dashboard as PDF";
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 shadow-lg rounded-lg h-[calc(100vh-theme.headerHeight)] md:h-[88vh] overflow-y-auto space-y-6"> {/* Adjusted padding and bg */}
      <div className="flex justify-end mb-4 sticky top-0 bg-gray-50 py-2 z-10"> {/* Sticky export button */}
        <button
          id="pdfExportButton"
          onClick={exportToPDF}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors"
        >
          Export Dashboard as PDF
        </button>
      </div>

      {/* Sections with individual Suspense and Skeletons */}
      <div className="space-y-6">
        <div ref={sectionRefs.alarmMetricsSection} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmCount")}>
            <Card>
              <Suspense fallback={<InfoCardSkeleton />}>
                <AlarmCount />
              </Suspense>
            </Card>
          </LazyLoadWrapper>
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmsSeverity")}>
            <Card>
              <Suspense fallback={<GraphCardSkeleton />}>
                <AlarmsSeverity />
              </Suspense>
            </Card>
          </LazyLoadWrapper>
        </div>

        <div ref={sectionRefs.alarmBreakdownSection} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmCategory")}>
            <Card>
              <Suspense fallback={<GraphCardSkeleton />}>
                <AlarmCategory />
              </Suspense>
            </Card>
          </LazyLoadWrapper>
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmTypeBarGraph")}>
            <Card>
              <Suspense fallback={<GraphCardSkeleton />}>
                <AlarmTypeBarGraph />
              </Suspense>
            </Card>
          </LazyLoadWrapper>
        </div>

        <div ref={sectionRefs.territoryGraphSection}>
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("territoryGraph")}>
            <Card>
              <Suspense fallback={<GraphCardSkeleton />}>
                <TerritoryGraph />
              </Suspense>
            </Card>
          </LazyLoadWrapper>
        </div>

        <div ref={sectionRefs.areaLineGraphSection}>
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("areaLineGraph")}>
            <Card>
              <Suspense fallback={<GraphCardSkeleton />}>
                <AreaLineGraph />
              </Suspense>
            </Card>
          </LazyLoadWrapper>
        </div>

        <div ref={sectionRefs.alarmTypeLineGraphSection}>
          <LazyLoadWrapper onLoaded={() => handleComponentLoaded("alarmTypeLineGraph")}>
            <Card>
              <Suspense fallback={<GraphCardSkeleton />}>
                <AlarmTypeLineGraph />
              </Suspense>
            </Card>
          </LazyLoadWrapper>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;