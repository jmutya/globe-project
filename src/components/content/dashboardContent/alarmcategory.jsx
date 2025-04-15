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
    <div className="p-6 bg-white rounded-lg shadow-md flex flex-col items-center w-full max-w-lg mx-auto">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">Overall Alarm Distribution by Category</h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-indigo-500"></div>
          <p className="ml-4 text-gray-600">Loading Chart...</p>
        </div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={130}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={5}
              cornerRadius={8}
              activeIndex={activeIndex}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  transform={activeIndex === index ? `scale(1.1)` : ""}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return [`${value} (${percentage}%)`, name];
              }}
              wrapperStyle={{
                backgroundColor: "#fff",
                borderRadius: "4px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                padding: "10px",
              }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{
                paddingTop: "10px",
                fontSize: "12px",
                color: "#333",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600 text-center">No data available</p>
      )}
    </div>
  );
};

export default AlarmCategory;
