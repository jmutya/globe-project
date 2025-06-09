// src/Dashboard_file.js
import React, { Suspense, useRef, useState, useEffect } from "react";

// Lightweight title components
import TitleforCount from "../card/cardtitleticketcount";
import TitleforState from "../card/cardtitlestate";
import TitleforFailure from "../card/cardtitlefailure";
import TitleforTerritory from "../card/cardtitleterritory";
import TitleforMindanao from "../card/cardtitlemindanao";
import TitleforArea from "../card/cardtitlearea";
import TitleforManual from "../card/cardtitlemanual";
import TitleforMycom from "../card/cardtitlemycom";

// Lazy-loaded graph components
const AlarmCount = React.lazy(() =>
  import("../content/dashboardContent/alarmcount")
);
const AlarmTypeLineGraph = React.lazy(() =>
  import("../content/dashboardContent/linegraph")
);
const AlarmTypeBarGraph = React.lazy(() =>
  import("../content/dashboardContent/bargraph")
);
const TerritoryGraph = React.lazy(() =>
  import("../content/dashboardContent/territorygraph")
);
const AreaLineGraph = React.lazy(() =>
  import("../content/dashboardContent/arealinegraph")
);
const AlarmCategory = React.lazy(() =>
  import("../content/dashboardContent/AlarmCauseOfOutage")
);
const Mycom = React.lazy(() => import("../content/dashboardContent/mycom"));
const Manualvsauto = React.lazy(() =>
  import("../content/dashboardContent/manualvsauto")
);
const GeneratePDFButton = React.lazy(() =>
  import("../content/dashboardContent/exportToPDF")
);

// Card wrapper
const Card = ({ title, children, isWide = false }) => {
  const cardStyle = {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "16px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    backgroundColor: "#fff",
    minWidth: "250px",
    flexShrink: 0,
    flexGrow: 1,
    flexBasis: isWide ? "calc(66.66% - 16px)" : "calc(33.33% - 16px)",
    maxWidth: isWide ? "calc((100% / 1.5) - 16px)" : "calc((100% / 3) - 16px)",
  };

  const cardTitleStyle = {
    fontSize: "1.25em",
    marginBottom: "12px",
    color: "#333",
  };

  return (
    <div style={cardStyle}>
      {title && <h3 style={cardTitleStyle}>{title}</h3>}
      <div>{children}</div>
    </div>
  );
};

const Dashboard_file = () => {
  const dashboardRef = useRef(null); // ref for entire dashboard

  const dashboardStyle = {
    padding: "20px",
    backgroundColor: "#f4f7f6",
    minHeight: "100vh",
  };

  const rowContainerStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: "16px",
    marginBottom: "16px",
  };

  return (
    <div>
      <div style={dashboardStyle} ref={dashboardRef}>
        <Suspense fallback={<div>Loading Dashboard...</div>}>
          {/* First row */}
          <div style={rowContainerStyle}>
            <Card>
              <TitleforCount />
              <AlarmCount />
            </Card>
            <Card>
              <TitleforFailure />
              <AlarmTypeBarGraph />
            </Card>
            <Card>
              <TitleforTerritory />
              <TerritoryGraph />
            </Card>
          </div>

          {/* Second row */}
          <div style={rowContainerStyle}>
            <Card>
              <TitleforState />
              <AlarmCategory />
            </Card>
            <Card>
              <TitleforMycom />
              <Mycom />
            </Card>
            <Card>
              <TitleforManual />
              <Manualvsauto />
            </Card>
          </div>

          {/* Third row */}
          <div style={rowContainerStyle}>
            <Card>
              <TitleforMindanao />
              <AlarmTypeLineGraph />
            </Card>
            <Card isWide>
              <TitleforArea />
              <AreaLineGraph />
            </Card>
          </div>
        </Suspense>
      </div>

      <div className="flex justify-center mt-4">
        <Suspense fallback={<div>Loading PDF button...</div>}>
          <GeneratePDFButton dashboardRef={dashboardRef} />
        </Suspense>
      </div>
    </div>
  );
};

export default Dashboard_file;
