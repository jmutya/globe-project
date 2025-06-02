// src/Dashboard_file.js (or wherever your file is located)
import React from 'react';
import AlarmCount from '../content/dashboardContent/alarmcount';
import AlarmTypeLineGraph from '../content/dashboardContent/linegraph';
import AlarmTypeBarGraph from '../content/dashboardContent/bargraph';
import AlarmsSeverity from '../content/dashboardContent/alarmseveritygraph';
import TerritoryGraph from '../content/dashboardContent/territorygraph';
import AreaLineGraph from '../content/dashboardContent/arealinegraph';
import AlarmCategory from '../content/dashboardContent/AlarmCauseOfOutage';

// Card Component Definition
const Card = ({ title, children }) => {
  const cardStyle = {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '16px',
    // Removed margin here, as the gap on the container will handle spacing.
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    minWidth: '250px', // Minimum width for a card
    flexShrink: 0, // Prevents cards from shrinking too much if space is tight
    flexGrow: 1, // Allows cards to grow and fill available space
    maxWidth: 'calc((100% / 3) - 16px)', // Max width for 3 cards per row with 16px gap
    flexBasis: 'calc(33.33% - 16px)', // Roughly 1/3rd width minus gap. Adjust 16px based on desired gap.
  };

  const cardTitleStyle = {
    fontSize: '1.25em',
    marginBottom: '12px',
    color: '#333',
  };

  return (
    <div style={cardStyle}>
      {title && <h3 style={cardTitleStyle}>{title}</h3>}
      <div>{children}</div>
    </div>
  );
};

// WelcomeWidget Component Definition (Unchanged, not used in Dashboard_file)
const WelcomeWidget = () => {
  const widgetStyle = {
    textAlign: 'center',
  };
  return (
    <div style={widgetStyle}>
      <h4>Hello, User!</h4>
      <p>Welcome to your dashboard.</p>
    </div>
  );
};

// StatsWidget Component Definition (Unchanged, not used in Dashboard_file)
const StatsWidget = () => {
  const statItemStyle = {
    marginBottom: '8px',
  };
  return (
    <div>
      <div style={statItemStyle}><strong>Active Users:</strong> 1,234</div>
      <div style={statItemStyle}><strong>Sales Today:</strong> $5,678</div>
      <div style={statItemStyle}><strong>Pending Tasks:</strong> 12</div>
    </div>
  );
};

// ChartWidget Component Definition (Unchanged, not used in Dashboard_file)
const ChartWidget = () => {
  const placeholderStyle = {
    height: '150px',
    backgroundColor: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#aaa',
    borderRadius: '4px',
  };
  return (
    <div>
      <p>Monthly Sales Data</p>
      <div style={placeholderStyle}>
        [Chart Placeholder]
      </div>
    </div>
  );
};

// Main Dashboard Component
const Dashboard_file = () => {
  const dashboardStyle = {
    padding: '20px',
    backgroundColor: '#f4f7f6',
    minHeight: '100vh', // Ensure it takes at least full viewport height
  };

  const dashboardHeaderStyle = {
    fontSize: '2em',
    marginBottom: '20px',
    color: '#333',
    textAlign: 'center',
  };

  const rowContainerStyle = {
    display: 'flex',
    flexWrap: 'wrap', // Allows cards to wrap within this row if needed (though we're limiting for 3)
    justifyContent: 'left', // Centers cards if there aren't enough to fill the row
    gap: '16px', // Space between cards in this row
    marginBottom: '16px', // Space between this row and the next row
  };

  return (
    <div style={dashboardStyle}>
      {/* First Row - explicitly limited to 3 cards */}
      <div style={rowContainerStyle}>
        <Card title="Ticket Count">
          <AlarmCount />
        </Card>
        <Card title="State">
          <AlarmCategory />
        </Card>
        
        <Card title="Mycom"></Card>
      </div>

      {/* Second Row - for the remaining cards and the PDF button */}
      <div style={rowContainerStyle}>
        <Card title="Failure ">
          <AlarmTypeBarGraph />
        </Card>
        <Card title="Overall Alarm Distribution by territory">
          <TerritoryGraph />
        </Card>
        <Card title="Manual">
          
        </Card>
        
      </div>

      {/* Third Row - for the remaining cards */}
      <div style={rowContainerStyle}>
          <Card title ="Overall Trends in Mindanao">
          <AlarmTypeLineGraph />
        </Card>
         <Card title="Overall Area Line Graph">
          <AreaLineGraph />
        </Card>
        </div>

      {/* Standalone button row, or you can place it within one of the existing rows */}
      {/* For a more prominent button, it's often good to have it in its own container or at the top/bottom */}
      <div className="flex justify-center mt-4"> {/* Centering the button */}
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors duration-300 flex items-center gap-2"
          onClick={() => alert('Generate PDF functionality would go here!')} // Replace with actual PDF generation logic
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Generate PDF
        </button>
      </div>
    </div>
  );
};
export default Dashboard_file;
