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
    "#ff6384",
    "#36a2eb",
    "#ffce56",
    "#4bc0c0",
    "#9966ff",
    "#ff9f40",
    "#8b0000",
    "#008000",
  ];

  useEffect(() => {
    const getData = async () => {
      setIsLoading(true);
      const data = await fetchFailureCategoryData(colors);
      setChartData(data);
      setIsLoading(false);
    };
    getData();
  }, []);

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg">
      <h2 className="text-lg font-semibold mb-2">
        Failure Category Distribution
      </h2>

      {isLoading ? (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="ml-3 text-gray-600">Generating Graph</p>
        </div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="horizontal" barSize={50}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" type="category" />
            <YAxis type="number" allowDecimals={false} />
            <Tooltip />
            <Legend
              payload={chartData.map((entry) => ({
                value: entry.category,
                type: "square",
                color: entry.fill,
              }))}
            />
            <Bar dataKey="count" fill={colors[0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600">No data available</p>
      )}
    </div>
  );
};

export default AlarmTypeBarGraph;
