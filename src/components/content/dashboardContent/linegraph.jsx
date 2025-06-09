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
import { fetchAlarmTypeLineData } from "../../../backend/functions/alarmAORMinUtils";
import "react-loading-skeleton/dist/skeleton.css";
import LineSkeleton from "../../UI/LineChartSkeleton"; // Import the skeleton component

const COLORS = [
  "#377EB8", // Blue
  "#E41A1C", // Red
  "#4DAF4A", // Green
  "#984EA3", // Purple
  "#FF7F00", // Orange
  "#FFFF33", // Yellow
  "#A65628", // Brown
  "#F781BF", // Pink
];

// Helper to format date strings (YYYY-MM-DD)
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const cleaned = String(dateStr).replace(/,/g, "").trim();
  const parsed = new Date(cleaned);
  if (isNaN(parsed)) return cleaned;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const AlarmTypeLineGraph = () => {
  const [chartData, setChartData] = useState([]);
  const [alarmTypes, setAlarmTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      const { chartData, alarmTypes } = await fetchAlarmTypeLineData();
      if (isMounted) {
        setChartData(chartData);
        setAlarmTypes(alarmTypes);
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="p-6 bg-white rounded-md shadow">
      {isLoading ? (
        <div className="h-[350px]">
          <LineSkeleton />
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
              tick={{ fontSize: 12, angle: 35, dy: 25 }}
              tickFormatter={formatDate}
            />
            <YAxis
              allowDecimals={false}
              stroke="#757575"
              tick={{ fontSize: 12 }}
              axisLine={false}
            />
            <Tooltip
              itemStyle={{ color: "#333", padding: 4 }}
              labelStyle={{
                color: "#000",
                fontWeight: "bold",
                marginBottom: 4,
              }}
              formatter={(value, name) => [`${value}`, name]}
              labelFormatter={(label) => `Date: ${formatDate(label)}`}
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
              iconType="circle"
              wrapperStyle={{ lineHeight: "20px" }}
              textStyle={{ color: "#555" }}
            />
            {alarmTypes.map((type, index) => (
              <Line
                key={type}
                type="monotone"
                dataKey={type}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600 text-center mt-6">
          No alarm data available for Mindanao.
        </p>
      )}
    </div>
  );
};

export default AlarmTypeLineGraph;
