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
  Cell,
} from "recharts";
import { fetchTerritoryGraphData } from "../../../backend/functions/alarmTerritoryGraph"; // Adjust path if needed

const TerritoryGraph = () => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await fetchTerritoryGraphData();
      const totalCount = data.reduce((sum, item) => sum + item.count, 0);
      const dataWithPercentage = data.map((item, index) => ({
        ...item,
        fill: `hsl(${(index * 50) % 360}, 60%, 50%)`,
        percentage: totalCount > 0 ? (item.count / totalCount) * 100 : 0, // Calculate percentage
      }));
      setChartData(dataWithPercentage);
      setIsLoading(false);
    };

    loadData();
  }, []);

  return (
    <div
      className="p-6 bg-white rounded-md shadow"
      style={{ maxHeight: "450px" }}
    >
      <div className="flex items-center mb-4">
        <div className="rounded-lg bg-orange-500 h-12 w-12 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="white"
            className="w-7 h-7"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 18v-6m4 6v-4m4 4v-8m4 8V9m4 9V5"
            />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-gray-700 ml-3 uppercase tracking-wider">
          Alarm Distribution by Territory
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-600">Loading Graph...</p>
        </div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            layout="horizontal"
            barCategoryGap={15}
            margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid stroke="#e0e0e0" strokeDasharray="2 2" />
            <XAxis
              type="category"
              dataKey="category"
              stroke="#757575"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="number"
              allowDecimals={false}
              stroke="#757575"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={[
                0,
                Math.max(...chartData.map((item) => item.count)) * 1.2,
              ]}
            />
            <Tooltip
              cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
              itemStyle={{ color: "#333" }}
              labelStyle={{ color: "#000", fontWeight: "bold" }}
              formatter={(value, name, props) => [
                `${value} (${
                  props.payload.percentage
                    ? props.payload.percentage.toFixed(1)
                    : 0
                }%)`,
                "Alarms",
              ]}
            />
            <Legend
              align="right"
              verticalAlign="top"
              wrapperStyle={{ lineHeight: "24px" }}
              iconSize={14}
              iconType="square"
              textStyle={{ color: "#4a5568" }}
              payload={chartData.map((entry) => ({
                value: `Territory - ${entry.category}`,
                type: "square",
                color: entry.fill,
              }))}
            />
            <Bar dataKey="count">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600 py-8 text-center">
          No alarm data available for territories.
        </p>
      )}
    </div>
  );
};

export default TerritoryGraph;
