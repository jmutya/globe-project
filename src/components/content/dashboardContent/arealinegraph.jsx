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
import { fetchAreaAlarmData } from "../../../backend/functions/alarmAreaLinegraphUtils";

const COLORS = [
  "#29ABE2", "#F27059", "#8E44AD", "#27AE60",
  "#F39C12", "#1ABC9C", "#C0392B", "#34495E",
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
    const parsed = new Date(cleaned);
    if (isNaN(parsed)) return cleaned;
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

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
              itemStyle={{ color: "#333", padding: 6 }}
              labelStyle={{ color: "#000", fontWeight: "bold" }}
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
              iconType="line"
              wrapperStyle={{ lineHeight: "20px" }}
            />
            {alarmTypes.map((type, index) => (
              <Line
                key={type}
                type="monotone"
                dataKey={type}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
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
