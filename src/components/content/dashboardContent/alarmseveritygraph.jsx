import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { fetchAlarmSeverityData } from "../../../backend/functions/alarmUtilsGraph";

const AlarmsSeverity = () => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [latestMonth, setLatestMonth] = useState("");

  const colors = [
    "#60a5fa", // Blue 400
    "#facc15", // Yellow 400
    "#22c55e", // Green 500
    "#ef4444", // Red 500
    "#a855f7", // Purple 500
    "#f97316", // Orange 500
    "#e11d48", // Pink 600
    "#0ea5e9", // Cyan 500
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
    <div className="bg-white rounded-md shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-left mb-4">
          <div className="rounded-lg bg-red-500 h-10 w-10 flex items-center justify-center mr-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="white"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3c-3.866 0-7 3.134-7 7v4.586l-.707.707A1 1 0 006 17h12a1 1 0 00.707-1.707L18 14.586V10c0-3.866-3.134-7-7-7zM12 21a2 2 0 002-2h-4a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 text-center">
            Alarm Severity Distribution ({latestMonth || "Loading..."})
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-gray-600">Loading Graph...</p>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
                cornerRadius={6}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    strokeWidth={0}
                  />
                ))}
              </Pie>
              <Tooltip
                itemStyle={{ color: "gray" }}
                labelStyle={{ color: "black", fontWeight: "bold" }}
                formatter={(value, name) => {
                  const total = chartData.reduce(
                    (acc, curr) => acc + curr.value,
                    0
                  );
                  const percentage = ((value / total) * 100).toFixed(1);
                  return [`${value} (${percentage}%)`, name];
                }}
              />
              <Legend
                layout="horizontal"
                align="bottom"
                wrapperStyle={{ paddingTop: 20 }}
                iconSize={10}
                textStyle={{ color: "#4b5563" }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-600 text-center py-8">
            No alarm data available.
          </p>
        )}
      </div>
    </div>
  );
};

export default AlarmsSeverity;
