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
import 'react-loading-skeleton/dist/skeleton.css';

const AlarmTypeLineGraph = () => {
  const [chartData, setChartData] = useState([]);
  const [alarmTypes, setAlarmTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const colors = [
    "#377EB8", // Blue
    "#E41A1C", // Red
    "#4DAF4A", // Green
    "#984EA3", // Purple
    "#FF7F00", // Orange
    "#FFFF33", // Yellow
    "#A65628", // Brown
    "#F781BF", // Pink
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
    <div className="p-6 bg-white rounded-md shadow">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Overall Alarm Trends in Mindanao
      </h2>

      {isLoading ? (
        <div className="flex justify-center items-center h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-500"></div>
          <p className="ml-3 text-gray-600">Loading Alarm Data...</p>
        </div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 15, right: 20, left: 5, bottom: 30 }}>
            <CartesianGrid stroke="#e0e0e0" strokeDasharray="2 2" />
            <XAxis
              dataKey="date"
              stroke="#757575"
              tick={{ fontSize: 12 }}
              tickFormatter={(date) => new Date(date).toLocaleDateString()}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              stroke="#757575"
              tick={{ fontSize: 12 }}
              axisLine={false}
            />
            <Tooltip
              itemStyle={{ color: '#333', padding: 4 }}
              labelStyle={{ color: '#000', fontWeight: 'bold', marginBottom: 4 }}
              formatter={(value, name) => [`${value}`, name]}
              labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
              wrapperStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: 10,
                borderRadius: 4,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            />
            <Legend
              align="right"
              verticalAlign="top"
              iconSize={8}
              iconType="circle"
              wrapperStyle={{ lineHeight: '20px' }}
              textStyle={{ color: '#555' }}
            />
            {alarmTypes.map((type, index) => (
              <Line
                key={type}
                type="monotone"
                dataKey={type}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 3 }} // Keep the points
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600 text-center mt-6">No alarm data available for Mindanao.</p>
      )}
    </div>
  );
};

export default AlarmTypeLineGraph;