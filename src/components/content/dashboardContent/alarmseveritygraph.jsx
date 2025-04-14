import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer
} from "recharts";
import { fetchAlarmSeverityData } from "../../../backend/functions/alarmUtilsGraph";

const AlarmsSeverity = () => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [latestMonth, setLatestMonth] = useState("");

  const colors = [
    "#ff6384", "#36a2eb", "#ffce56",
    "#4bc0c0", "#9966ff", "#ff9f40",
    "#8b0000", "#008000"
  ];

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const { severityCounts, latestMonth } = await fetchAlarmSeverityData();
      const formattedData = Object.entries(severityCounts).map(
        ([name, value], index) => ({
          name,
          value,
          fill: colors[index % colors.length],
        })
      );
      setChartData(formattedData);
      setLatestMonth(latestMonth);
      setIsLoading(false);
    };

    loadData();
  }, []);

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg flex flex-col items-center">
      <h2 className="text-lg font-semibold mb-2 text-center">
        Overall Alarm Severity Distribution as of {latestMonth || "Loading..."}
      </h2>

      {isLoading ? (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="ml-3 text-gray-600">Generating Graph...</p>
        </div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={5}
              cornerRadius={4}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return [`${value} (${percentage}%)`, name];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600 text-center">No data available</p>
      )}
    </div>
  );
};

export default AlarmsSeverity;
