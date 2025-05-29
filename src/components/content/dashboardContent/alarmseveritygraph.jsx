import React, { useState, useEffect } from "react";
import {
  PieChart, Pie, Tooltip, Legend, Cell, ResponsiveContainer,
} from "recharts";
import { fetchAlarmSeverityData } from "../../../backend/functions/alarmUtilsGraph";


const COLORS = [
  "#60a5fa", "#facc15", "#22c55e", "#ef4444",
  "#a855f7", "#f97316", "#e11d48", "#0ea5e9",
];

const AlarmsSeverity = () => {
  const [chartData, setChartData] = useState([]);
  const [latestMonth, setLatestMonth] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const { severityCounts, latestMonth } = await fetchAlarmSeverityData();

      if (!latestMonth || latestMonth === "No data") {
        setLatestMonth("No data available");
        setChartData([]);
      } else {
        setLatestMonth(latestMonth);

        const formattedData = Object.entries(severityCounts).map(
          ([name, value], index) => ({
            name,
            value,
            fill: COLORS[index % COLORS.length],
          })
        );

        setChartData(formattedData);
      }
      setIsLoading(false);
    };

    loadData();
  }, []);

  return (
    <div className="bg-white rounded-md shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="rounded-lg bg-red-500 h-12 w-12 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="white"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 3.75a8.25 8.25 0 108.25 8.25h-8.25V3.75z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-700 ml-3 uppercase tracking-wider">
            Alarm Severity Distribution {latestMonth && `(${latestMonth})`}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
           <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="ml-3 text-gray-600">Loading Please Wait...</p>
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
                dataKey="value"
                paddingAngle={2}
                cornerRadius={6}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const total = chartData.reduce((sum, cur) => sum + cur.value, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return [`${value} (${percentage}%)`, name];
                }}
                itemStyle={{ color: "gray" }}
                labelStyle={{ color: "black", fontWeight: "bold" }}
              />
              <Legend layout="horizontal" align="bottom" wrapperStyle={{ paddingTop: 20 }} iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-600 text-center py-8">No alarm data available.</p>
        )}
      </div>
    </div>
  );
};

export default AlarmsSeverity;
