import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { fetchAlarmTypeLineData } from "../../../backend/functions/alarmAORMinUtils";
import 'react-loading-skeleton/dist/skeleton.css';

const AlarmTypeLineGraph = () => {
  const [chartData, setChartData] = useState([]);
  const [alarmTypes, setAlarmTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const colors = [
    "#ff6384", "#36a2eb", "#ffce56", "#4bc0c0",
    "#9966ff", "#ff9f40", "#8b0000", "#008000"
  ];

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const { chartData, alarmTypes } = await fetchAlarmTypeLineData();
      setChartData(chartData);
      setAlarmTypes(alarmTypes);
      setIsLoading(false);
    };

    loadData();
  }, []);

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg">
      <h2 className="text-lg font-semibold mb-2">Overall AOR Mindanao</h2>

      {isLoading ? (
        <div className="flex justify-center items-center h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-indigo-500"></div>
          <p className="ml-3 text-gray-600">Generating Graph</p>
        </div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              tickFormatter={(date) => new Date(date).toLocaleDateString()}
            />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            {alarmTypes.map((type, index) => (
              <Line
                key={type}
                type="monotone"
                dataKey={type}
                stroke={colors[index % colors.length]}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600 text-center mt-4">No data available</p>
      )}
    </div>
  );
};

export default AlarmTypeLineGraph;
