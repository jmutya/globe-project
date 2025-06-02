// src/Dashboard_file.js
import React from "react";
import AlarmCount from "../content/dashboardContent/alarmcount";
import AlarmTypeLineGraph from "../content/dashboardContent/linegraph";
import AlarmTypeBarGraph from "../content/dashboardContent/bargraph";
import AlarmsSeverity from "../content/dashboardContent/alarmseveritygraph";
import TerritoryGraph from "../content/dashboardContent/territorygraph";
import AreaLineGraph from "../content/dashboardContent/arealinegraph";
import AlarmCategory from "../content/dashboardContent/AlarmCauseOfOutage";
import TitleforCount from "../card/cardtitleticketcount";
import TitleforState from "../card/cardtitlestate";
import TitleforFailure from "../card/cardtitlefailure";
import Mycom from "../content/dashboardContent/mycom";
import Manualvsauto from "../content/dashboardContent/manualvsauto";

// Card Component Definition
const Card = ({ title, children, isWide = false }) => { // Added isWide prop
  const cardStyle = {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "16px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    backgroundColor: "#fff",
    minWidth: "250px",
    flexShrink: 0,
    flexGrow: 1,
    // Default width for a single card
    flexBasis: "calc(33.33% - 16px)",
    maxWidth: "calc((100% / 3) - 16px)",
  };

  // Adjust style if isWide prop is true
  if (isWide) {
    cardStyle.flexBasis = "calc(66.66% - 16px)"; // Takes up two slots minus gap
    cardStyle.maxWidth = "calc((100% / 1.5) - 16px)"; // Approx 2/3 of the row
  }

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

// Main Dashboard Component
const Dashboard_file = () => {
  const dashboardStyle = {
    padding: "20px",
    backgroundColor: "#f4f7f6",
    minHeight: "100vh",
  };

  const dashboardHeaderStyle = {
    fontSize: "2em",
    marginBottom: "20px",
    color: "#333",
    textAlign: "center",
  };

  const rowContainerStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-start", // Changed to flex-start for consistent alignment
    gap: "16px",
    marginBottom: "16px",
  };

  return (
    <div style={dashboardStyle}>
      {/* First Row - explicitly limited to 3 cards */}
      <div style={rowContainerStyle}>
        <Card>
          <TitleforCount />
          <AlarmCount />
        </Card>
        <Card>
          <TitleforFailure />
          <AlarmTypeBarGraph />
        </Card>
        <Card title="Overall Alarm Distribution by territory">
          <TerritoryGraph />
        </Card>
      </div>

      {/* Second Row - for the remaining cards and the PDF button */}
      <div style={rowContainerStyle}>
        <Card>
          <TitleforState />
          <AlarmCategory />
        </Card>
        <Card title="Mycom">{/* <Mycom /> */}</Card>
        <Card title="Manual">
          <Manualvsauto />
        </Card>
      </div>

      {/* Third Row - for the remaining cards, with AreaLineGraph being wide */}
      <div style={rowContainerStyle}> {/* Using rowContainerStyle directly */}
        <Card title="Overall Trends in Mindanao">
          <AlarmTypeLineGraph />
        </Card>
        <Card title="Overall Area Line Graph" isWide={true}> {/* <--- Added isWide prop here */}
          <AreaLineGraph />
        </Card>
      </div>

      {/* Standalone button row */}
      <div className="flex justify-center mt-4">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors duration-300 flex items-center gap-2"
          onClick={() => alert("Generate PDF functionality would go here!")} // Replace with actual PDF generation logic
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Generate PDF
        </button>
      </div>
    </div>
  );
};

export default Dashboard_file;