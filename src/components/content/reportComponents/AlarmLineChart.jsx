// src/components/charts/AlarmLineChart.js
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const AlarmLineChart = ({ chartData, alarmTypes, colors }) => {
  if (!chartData || chartData.length === 0) {
    return <p className="text-gray-600 text-center mt-4">No data available</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <XAxis
          dataKey="date"
          tickFormatter={(date) => new Date(date).toLocaleDateString()}
        />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        {alarmTypes.map((type, index) => (
          <Line
            key={type}
            type="monotone"
            dataKey={type}
            stroke={colors[index % colors.length]}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default AlarmLineChart;