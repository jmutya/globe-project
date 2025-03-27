import React from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

const alarmData = [
  {
    name: "Critical",
    value: 2,
    color: "#ef4444",
    description: "🚨 Immediate action required. Potential for major service disruption.",
  },
  {
    name: "Major",
    value: 3,
    color: "#f97316",
    description: "⚠️ Significant issue. May lead to degraded performance.",
  },
  {
    name: "Minor",
    value: 4,
    color: "#facc15",
    description: "⚙️ Minor issue. Requires attention but not urgent.",
  },
  {
    name: "Warning",
    value: 5,
    color: "#60a5fa",
    description: "🔎 Potential issue. Monitor to prevent escalation.",
  },
  {
    name: "Normal",
    value: 6,
    color: "#34d399",
    description: "✅ Operational. No significant issues detected.",
  },
  {
    name: "Informational",
    value: 3,
    color: "#a78bfa",
    description: "ℹ️ Non-critical notifications for monitoring purposes.",
  },
];

export default function AlarmLegends() {
  return (
    <div className="w-full h-screen flex flex-col bg-white shadow-lg overflow-hidden">
      {/* Header */}
      <div className="text-center py-6 bg-gray-100 shadow-md">
        <h2 className="text-4xl font-bold text-gray-800 mb-2">🚨 Alarm Legends</h2>
        <p className="text-gray-600">
          Visual representation of alarm statuses, highlighting the severity and impact on cell site operations.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-grow flex flex-col md:flex-row">
        {/* Donut Chart */}
        <div className="flex flex-col justify-center items-center w-full md:w-1/2 p-4 bg-gray-50">
          <PieChart width={400} height={400}>
            <Pie
              data={alarmData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={130}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {alarmData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value} Alarms`, name]} />
          </PieChart>
        </div>

        {/* Alarm Details */}
        <div className="flex flex-col justify-start p-6 overflow-auto w-full md:w-1/2 bg-gray-100">
          <h3 className="text-2xl font-semibold mb-4 text-gray-700">📄 Alarm Details</h3>
          <ul className="space-y-4">
            {alarmData.map((entry, index) => (
              <li
                key={index}
                className="flex items-start p-4 border rounded-lg bg-white hover:bg-gray-100 transition duration-200 shadow-sm"
              >
                <span
                  className="w-6 h-6 rounded-full mt-1 mr-4"
                  style={{ backgroundColor: entry.color }}
                ></span>
                <div>
                  <strong className="text-lg text-gray-800">{entry.name}</strong>
                  <p className="text-gray-600 mt-1">{entry.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
