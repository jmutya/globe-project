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
        <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">
          Alarm Severity Distribution ({latestMonth || "Loading..."})
        </h2>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-gray-600">Loading Graph...</p>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
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
                  <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                itemStyle={{ color: 'gray' }}
                labelStyle={{ color: 'black', fontWeight: 'bold' }}
                formatter={(value, name) => {
                  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return [`${value} (${percentage}%)`, name];
                }}
              />
              <Legend
                layout="horizontal"
                align="bottom"
                wrapperStyle={{ paddingTop: 20 }}
                iconSize={10}
                textStyle={{ color: '#4b5563' }}
              />
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