import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const sampleData = [
  { name: 'Region A', active: 120, inactive: 30, maintenance: 10 },
  { name: 'Region B', active: 150, inactive: 20, maintenance: 15 },
  { name: 'Region C', active: 90, inactive: 25, maintenance: 5 },
];

const alarmData = [
  { name: 'Critical Alarms', value: 15 },
  { name: 'Major Alarms', value: 25 },
  { name: 'Minor Alarms', value: 40 },
];

const Reports = () => {
  return (
    <div className="p-6 bg-gray-100 min-h-screen overflow-auto">
      {/* Enhanced Scrollbar Styling */}
      <div className="bg-white shadow-lg rounded-3xl p-6 max-h-[80vh] overflow-y-auto border border-gray-300 
                      scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-blue-100 scrollbar-thumb-rounded-full">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">
          📊 Cell Sites Statistical and Descriptive Report
        </h1>
        <p className="mb-4 text-gray-700 text-center">
          An in-depth analysis of cell site distribution, operational performance, and alarm monitoring.
        </p>

        {/* Introduction Section */}
        <div className="mt-8 p-4 rounded-xl bg-blue-100/20 border-l-4 border-blue-400 shadow-sm">
          <h2 className="text-2xl font-semibold mb-2 text-blue-600">📍 Introduction</h2>
          <p className="text-gray-700">
            Cell sites are crucial for maintaining communication networks. This report analyzes their distribution, operational statuses, and alarm monitoring metrics to enhance network performance and reliability.
          </p>
        </div>

        {/* Statistical Overview */}
        <div className="mt-8 p-4 rounded-xl bg-blue-100/20 border-l-4 border-blue-400 shadow-sm">
          <h2 className="text-2xl font-semibold mb-2 text-blue-600">📊 Statistical Overview</h2>
          <p className="text-gray-700 mb-4">
            The bar chart below illustrates the distribution of active, inactive, and under-maintenance cell sites across different regions.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sampleData} className="bg-white p-4 rounded-xl shadow-sm">
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="active" fill="#4caf50" name="Active" />
              <Bar dataKey="inactive" fill="#f44336" name="Inactive" />
              <Bar dataKey="maintenance" fill="#ff9800" name="Under Maintenance" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alarm Monitoring */}
        <div className="mt-8 p-4 rounded-xl bg-blue-100/20 border-l-4 border-blue-400 shadow-sm">
          <h2 className="text-2xl font-semibold mb-2 text-blue-600">🚨 Alarm Monitoring</h2>
          <p className="text-gray-700 mb-4">
            The pie chart represents the distribution of alarm severities recorded across the network, helping prioritize issue resolution.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart className="bg-white p-4 rounded-xl shadow-sm">
              <Pie
                data={alarmData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                fill="#8884d8"
                label
              >
                {alarmData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#ff4d4d', '#ffa500', '#4caf50'][index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Metrics */}
        <div className="mt-8 p-4 rounded-xl bg-blue-100/20 border-l-4 border-blue-400 shadow-sm">
          <h2 className="text-2xl font-semibold mb-2 text-blue-600">📈 Performance Metrics</h2>
          <p className="text-gray-700">
            This section evaluates signal strength, data throughput, latency, and network availability to gauge the overall effectiveness of cell sites.
          </p>
        </div>

        {/* Challenges and Opportunities */}
        <div className="mt-8 p-4 rounded-xl bg-blue-100/20 border-l-4 border-blue-400 shadow-sm">
          <h2 className="text-2xl font-semibold mb-2 text-blue-600">🌐 Challenges and Opportunities</h2>
          <p className="text-gray-700">
            Analyzing network challenges, alarm overload management, and exploring predictive maintenance to optimize network stability and efficiency.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
