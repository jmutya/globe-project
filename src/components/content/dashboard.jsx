import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { LineChart, Line } from "recharts";
import { AreaChart, Area } from "recharts";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

const alarmData = [
  { name: "Critical", value: 1, color: "#f87171" },
  { name: "Major", value: 2, color: "#fbbf24" },
  { name: "Normal", value: 3, color: "#34d399" }
];

const statusData = [
  { name: "Active", count: 6 },
  { name: "Inactive", count: 4 }
];

const alarmsOverTime = [
  { month: "Jan", alarms: 3 },
  { month: "Feb", alarms: 5 },
  { month: "Mar", alarms: 2 },
  { month: "Apr", alarms: 4 },
  { month: "May", alarms: 3 }
];

const sitePerformance = [
  { parameter: "Uptime", score: 90 },
  { parameter: "Latency", score: 70 },
  { parameter: "Throughput", score: 85 },
  { parameter: "Packet Loss", score: 60 }
];

const networkTraffic = [
  { day: "Mon", traffic: 200 },
  { day: "Tue", traffic: 450 },
  { day: "Wed", traffic: 350 },
  { day: "Thu", traffic: 400 },
  { day: "Fri", traffic: 300 }
];

const errorTypes = [
  { type: "Timeout", count: 10 },
  { type: "Connection Lost", count: 7 },
  { type: "Server Error", count: 5 },
  { type: "Bad Request", count: 3 }
];

const NetworkAnalytics = () => {
  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">🌐 Network Surveillance Dashboard</h1>
      <p className="text-gray-700 mb-6">Real-time analytics and monitoring of network health</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Alarm Severity Distribution */}
        <div className="bg-white p-4 shadow-md rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Alarm Severity Distribution</h2>
          <PieChart width={250} height={250}>
            <Pie data={alarmData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
              {alarmData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>

        {/* Site Status Overview */}
        <div className="bg-white p-4 shadow-md rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Site Status Overview</h2>
          <BarChart width={250} height={250} data={statusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#4f46e5" />
          </BarChart>
        </div>

        {/* Alarms Over Time */}
        <div className="bg-white p-4 shadow-md rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Alarms Over Time</h2>
          <LineChart width={250} height={250} data={alarmsOverTime}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="alarms" stroke="#22c55e" />
          </LineChart>
        </div>

        {/* Site Performance Metrics */}
        <div className="bg-white p-4 shadow-md rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Site Performance Metrics</h2>
          <RadarChart outerRadius={80} width={250} height={250} data={sitePerformance}>
            <PolarGrid />
            <PolarAngleAxis dataKey="parameter" />
            <PolarRadiusAxis />
            <Radar name="Performance" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
          </RadarChart>
        </div>

        {/* Network Traffic Analysis */}
        <div className="bg-white p-4 shadow-md rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Network Traffic Analysis</h2>
          <AreaChart width={250} height={250} data={networkTraffic}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="traffic" stroke="#f87171" fill="#f87171" />
          </AreaChart>
        </div>

        {/* Network Error Types */}
        <div className="bg-white p-4 shadow-md rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Network Error Types</h2>
          <BarChart width={250} height={250} data={errorTypes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#ef4444" />
          </BarChart>
        </div>
      </div>
    </div>
  );
};

export default NetworkAnalytics;
