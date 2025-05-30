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
    margin: '16px', // This margin is on each card.
                  // The 'gap' in cardContainerStyle will handle spacing between cards.
                  // You might want to adjust or remove this margin depending on the desired effect with 'gap'.
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    minWidth: '250px', // Minimum width for a card
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

// WelcomeWidget Component Definition
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

// StatsWidget Component Definition
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

// ChartWidget Component Definition
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

  const cardContainerStyle = {
    display: 'flex',
    flexWrap: 'wrap', // Allows cards to wrap to the next line
    justifyContent: 'center', // Centers cards in the container if the line is not full
    // alignItems: 'flex-start', // Aligns cards to the top of the container if they have different heights
    gap: '16px', // Preferred way to add space between flex items
  };

  return (
    <div style={dashboardStyle}>
      <div style={cardContainerStyle}>
        <Card title="Ticket Count">
         <AlarmCount />
        </Card>
        <Card title="State">
          <AlarmCategory/>
        </Card>
        <Card title="Failure">
           <AlarmTypeBarGraph />
        </Card>
        <Card title="Quick Actions">
          <div>
            <button style={{ marginRight: '8px', padding: '8px 12px', cursor: 'pointer' }}>New Report</button>
            <button style={{ padding: '8px 12px', cursor: 'pointer' }}>Settings</button>
          </div>

        </Card>
        <Card> {/* Card without a title */}
          {/* <AlarmTypeLineGraph /> */} 
        </Card>
      </div>
    </div>
  );
};

export default Dashboard_file;