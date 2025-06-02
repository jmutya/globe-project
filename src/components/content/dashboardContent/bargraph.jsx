// components/AlarmTypeBarGraph.jsx
import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { fetchFailureCategoryData } from "../../../backend/functions/alarmBargraphUtils";

const AlarmTypeBarGraph = () => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
    const getData = async () => {
      setIsLoading(true);
      // **Corrected line: Pass the colors array to the backend function**
      const data = await fetchFailureCategoryData(colors);
      setChartData(data);
      setIsLoading(false);
    };
    getData();
  }, []);

  return (
    <div className="bg-white rounded-md shadow overflow-hidden p-6">
      <div>
        <div className="flex items-center mb-4"></div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="ml-3 text-gray-600">Loading Please Wait...</p>
        </div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 30, left: 20, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="category"
              type="category"
              stroke="#757575"
              tick={{ fontSize: 12 }}
              interval={0}
              style={{ textAnchor: "end" }}
              angle={-45}
              dy={16}
            />
            <YAxis
              type="number"
              allowDecimals={false}
              stroke="#757575"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              itemStyle={{ color: "gray" }}
              labelStyle={{ color: "black", fontWeight: "bold" }}
            />

            <Bar dataKey="count" fill="#60a5fa" barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600 py-8 text-center">
          No failure category data available.
        </p>
      )}
    </div>
  );
};

export default AlarmTypeBarGraph;
