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
      setChartData(data);
      setIsLoading(false);
    };

    loadData();
  }, []);

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg" style={{ maxHeight: "400px" }}>
      <h2 className="text-lg font-semibold mb-2">Alarm Distribution by Territory</h2>
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
            <Tooltip
              formatter={(value, name, props) =>
                [`${value} (${props.payload.percentage}%)`, "Count"]
              }
            />
            <Legend
              payload={chartData.map((entry) => ({
                value: "Territory - " + entry.category,
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
        <p className="text-gray-600">No data available</p>
      )}
    </div>
  );
};

export default TerritoryGraph;
