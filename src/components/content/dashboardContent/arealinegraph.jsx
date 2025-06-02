// components/AreaLineGraph.jsx
import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { fetchAreaAlarmData } from "../../../backend/functions/alarmAreaLinegraphUtils";

const AreaLineGraph = () => {
  const [chartData, setChartData] = useState([]);
  const [alarmTypes, setAlarmTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getData = async () => {
      setIsLoading(true);
      const { chartData, alarmTypes } = await fetchAreaAlarmData();
      setChartData(chartData);
      setAlarmTypes(alarmTypes);
      setIsLoading(false);
    };
    getData();
  }, []);

  const colors = [
    "#29ABE2", // Light Blue
    "#F27059", // Coral
    "#8E44AD", // Purple
    "#27AE60", // Green
    "#F39C12", // Orange
    "#1ABC9C", // Turquoise
    "#C0392B", // Red
    "#34495E", // Dark Blue Gray
  ];

  return (
    <div className="p-6 bg-white rounded-md shadow">
      {isLoading ? (
        <div className="flex justify-center items-center h-[300px]">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="ml-3 text-gray-600">Loading Please Wait...</p>
        </div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={chartData}
            margin={{ top: 15, right: 20, left: 5, bottom: 30 }}
          >
            <CartesianGrid stroke="#e0e0e0" strokeDasharray="2 2" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, angle: 35, dy: 25 }} // <-- added this
              tickFormatter={(date) => {
                if (!date) return "";
                const cleanedDate = String(date).replace(/,/g, "").trim(); // <-- REMOVE commas
                const parsedDate = new Date(cleanedDate);
                if (isNaN(parsedDate)) return cleanedDate; // fallback
                const year = parsedDate.getFullYear();
                const month = String(parsedDate.getMonth() + 1).padStart(
                  2,
                  "0"
                );
                const day = String(parsedDate.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
              }}
            />
            <YAxis
              allowDecimals={false}
              stroke="#757575"
              tick={{ fontSize: 12 }}
              axisLine={false}
            />
            <Tooltip
              itemStyle={{ color: "#333", padding: 6 }}
              labelStyle={{
                color: "#000",
                fontWeight: "bold",
                marginBottom: 4,
              }}
              formatter={(value, name) => [`${value}`, name]}
              labelFormatter={(label) => {
                if (!label) return "";
                const cleanedLabel = String(label).replace(/,/g, "").trim(); // SAME CLEANING
                const parsedDate = new Date(cleanedLabel);
                if (isNaN(parsedDate)) return cleanedLabel; // fallback
                const year = parsedDate.getFullYear();
                const month = String(parsedDate.getMonth() + 1).padStart(
                  2,
                  "0"
                );
                const day = String(parsedDate.getDate()).padStart(2, "0");
                return `Date: ${year}-${month}-${day}`;
              }}
              wrapperStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                padding: 10,
                borderRadius: 4,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              }}
            />
            <Legend
              align="right"
              verticalAlign="top"
              iconSize={8}
              iconType="line" // Using 'line' icon for a flatter look
              wrapperStyle={{ lineHeight: "20px" }}
              textStyle={{ color: "#555" }}
            />
            {alarmTypes.map((type, index) => (
              <Line
                key={type}
                type="monotone"
                dataKey={type}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={false} // Removing dots for a cleaner, flatter line
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600 text-center mt-6">
          No alarm data available for areas.
        </p>
      )}
    </div>
  );
};

export default AreaLineGraph;
