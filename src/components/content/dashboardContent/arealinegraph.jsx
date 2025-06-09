import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip, // Still import Tooltip
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { fetchAreaAlarmData } from "../../../backend/functions/alarmAreaLinegraphUtils";
import LineSkeleton from "../../UI/LineChartSkeleton"; // Import the skeleton component

// A slightly refreshed color palette, feel free to adjust
const COLORS = [
  "#4A90E2", // A brighter blue
  "#F5A623", // A vibrant orange-yellow
  "#7ED321", // A fresh green
  "#BD10E0", // A rich purple
  "#FF6B6B", // A soft red
  "#1DCCCD", // A teal
  "#FFD700", // Gold
  "#A3D1D1", // Light teal
];

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

  const formatDate = (rawDate) => {
    if (!rawDate) return "";
    const cleaned = String(rawDate).replace(/,/g, "").trim();
    let parsed = new Date(cleaned);

    if (isNaN(parsed) || parsed.getFullYear() < 1000) {
      const parts = cleaned.split(" ");
      if (parts.length >= 3) {
        const dateString = `${parts[0]} ${parts[1]} ${parts[2]}`;
        parsed = new Date(dateString);
      }
    }

    if (isNaN(parsed) || parsed.getFullYear() < 1000) {
      return cleaned;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // --- START: Custom Tooltip Component ---
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Filter out items with value 0 if you don't want them in the tooltip
      const relevantPayload = payload.filter((item) => item.value > 0);

      if (relevantPayload.length === 0) return null; // If no relevant data, don't show tooltip

      return (
        <div className="bg-white p-3 rounded-md shadow-lg border border-gray-200 text-sm">
          <p className="font-semibold text-gray-800 mb-2">
            Date: {formatDate(label)}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {" "}
            {/* Flex container for horizontal layout */}
            {relevantPayload.map((entry, index) => (
              <div key={`item-${index}`} className="flex items-center">
                <span
                  className="inline-block w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: entry.stroke }}
                ></span>
                <span className="text-gray-700 font-medium">{entry.name}:</span>
                <span className="text-gray-900 ml-1">
                  {entry.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };
  // --- END: Custom Tooltip Component ---

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 border border-gray-100">
      {isLoading ? (
        <div className="h-[350px]">
          <LineSkeleton />
        </div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#667085" }}
              angle={-30} // Keeping angled for readability unless you specifically re-removed it
              textAnchor="end"
              interval="preserveStartEnd"
              tickFormatter={formatDate}
            />
            <YAxis
              allowDecimals={false}
              stroke="#667085"
              tick={{ fontSize: 11, fill: "#667085" }}
              axisLine={false}
              tickLine={false}
            />
            {/* IMPORTANT CHANGE: Use the 'content' prop with your CustomTooltip */}
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "#ced4da" }}
              content={<CustomTooltip />} // Pass your custom component here
              // You can remove wrapperStyle, itemStyle, labelStyle, formatter, labelFormatter
              // as they are now handled by your CustomTooltip component
            />
            <Legend
              align="center"
              verticalAlign="bottom"
              wrapperStyle={{ paddingTop: "20px" }}
              iconSize={10}
              iconType="circle"
              formatter={(value) => (
                <span className="text-sm text-gray-700">{value}</span>
              )}
            />
            {alarmTypes.map((type, index) => (
              <Line
                key={type}
                type="monotone"
                dataKey={type}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: COLORS[index % COLORS.length],
                  strokeWidth: 2,
                  fill: "#fff",
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-[350px] bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mb-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 19V6l3-3m0 0l3 3m-3-3v14m-12 0H3C2.447 19 2 18.553 2 18V8c0-.553.447-1 1-1h18c.553 0 1 .447 1 1v10c0 .553-.447 1-1 1H9z"
            />
          </svg>
          <p className="text-lg font-medium">No alarm data available</p>
          <p className="text-sm mt-1">
            Check your data source or try again later.
          </p>
        </div>
      )}
    </div>
  );
};

export default AreaLineGraph;
