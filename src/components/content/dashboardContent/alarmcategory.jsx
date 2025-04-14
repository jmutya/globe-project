import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { fetchAlarmCategoryChartData } from "../../../backend/functions/alarmCategoryUtils"; // adjust the path as needed

const AlarmCategory = () => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    const loadChartData = async () => {
      setIsLoading(true);
      const data = await fetchAlarmCategoryChartData();
      setChartData(data);
      setIsLoading(false);
    };

    loadChartData();
  }, []);

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg flex flex-col items-center">
      <h2 className="text-lg font-semibold mb-4">Overall Alarm Distribution by Category</h2>
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
              activeIndex={activeIndex}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  stroke="#fff"
                  strokeWidth={2}
                  transform={activeIndex === index ? `translate(10, -10)` : ""}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return [`${value} ( ${percentage}% )`, name];
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

export default AlarmCategory;
