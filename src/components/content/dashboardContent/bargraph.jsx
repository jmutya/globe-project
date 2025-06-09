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
import BarSkeleton from "../../UI/BarChartSkeleton"; // Import the new skeleton component

const COLORS = [
  "#60a5fa", // Blue 400
  "#facc15", // Yellow 400
  "#22c55e", // Green 500
  "#ef4444", // Red 500
  "#a855f7", // Purple 500
  "#f97316", // Orange 500
  "#e11d48", // Pink 600
  "#0ea5e9", // Cyan 500
];

const AlarmTypeBarGraph = () => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const getData = async () => {
      setIsLoading(true);
      const data = await fetchFailureCategoryData(COLORS);
      if (isMounted) {
        setChartData(data);
        setIsLoading(false);
      }
    };

    getData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-white rounded-md shadow p-6">
      {isLoading ? (
        <BarSkeleton />
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 30, left: 20, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="category"
              stroke="#757575"
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-45}
              dy={16}
              style={{ textAnchor: "end" }}
            />
            <YAxis
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
