import React, { useState, useEffect, useCallback } from "react"; // Import useCallback
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { fetchAlarmCategoryChartData } from "../../../backend/functions/FunctionCauseOfOutage";
import ChartSkeleton from "../../UI/ChartSkeleton"; // Import the new skeleton component

// Define a palette of colors for the chart segments
const COLORS = [
  "#8884d8", // Indigo
  "#82ca9d", // Green
  "#ffc658", // Yellow
  "#ff7300", // Orange
  "#0088FE", // Blue
  "#00C49F", // Teal
  "#FFBB28", // Gold
  "#FF8042", // Coral
  "#AF19FF", // Purple
  "#DE3163", // Crimson
];

const AlarmCategory = () => {
  const [chartData, setChartData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // State for error handling
  const [activeIndex, setActiveIndex] = useState(null);

  // Memoize the data loading function
  const loadChartData = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Clear any previous errors

    try {
      const { formattedData, totalCount } = await fetchAlarmCategoryChartData();
      // Assign colors to data entries
      const dataWithColors = formattedData.map((entry, index) => ({
        ...entry,
        fill: COLORS[index % COLORS.length], // Cycle through predefined colors
      }));
      setChartData(dataWithColors);
      setTotalCount(totalCount);
    } catch (err) {
      console.error("Error loading alarm category chart data:", err);
      setError("Failed to load chart data. Please try again later.");
      setChartData([]); // Clear data on error
      setTotalCount(0); // Reset total on error
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependencies are empty as it doesn't rely on props or state for its core logic

  useEffect(() => {
    loadChartData();
  }, [loadChartData]); // Depend on loadChartData to re-run if it changes (due to useCallback)

  // Render Skeleton while loading
  if (isLoading) {
    return <ChartSkeleton />;
  }

  // Render error message if data loading failed
  if (error) {
    return (
      <div className="bg-white rounded-md shadow p-6 flex items-center justify-center h-[350px] text-red-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75M2.697 16.126c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <p className="text-center font-semibold">Error Loading Chart</p>
        <p className="text-sm text-center">{error}</p>
      </div>
    );
  }

  // Render message if no data is available after loading
  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-md shadow p-6 flex items-center justify-center h-[350px]">
        <p className="text-sm text-gray-500">No alarm category data available for the chart.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md shadow p-6">
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="75%"
            dataKey="value"
            paddingAngle={2}
            cornerRadius={8}
            activeIndex={activeIndex}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            // You can remove Cell component and put fill directly on Pie if colors are static
            // However, using Cell allows for dynamic styling like the activeIndex effect
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.fill} // Use the fill property from the data entry
                style={{
                  opacity: activeIndex === index ? 0.9 : 1,
                  transform: activeIndex === index ? "scale(1.02)" : "scale(1)", // Slightly less aggressive scale
                  transformOrigin: "center",
                  transition: "all 0.2s ease-out", // Slightly faster transition
                }}
              />
            ))}
          </Pie>

          <Tooltip
            formatter={(value, name) => {
              const percent = totalCount > 0 ? ((value / totalCount) * 100).toFixed(1) : (0).toFixed(1);
              return [`${value} (${percent}%)`, name];
            }}
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #eee",
              borderRadius: "12px",
              fontSize: "13px",
              padding: "10px",
              boxShadow: "0px 4px 8px rgba(0,0,0,0.1)" // Add subtle shadow
            }}
          />

          <Legend
            iconType="circle"
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
            wrapperStyle={{
              fontSize: "13px",
              paddingTop: "16px",
              color: "#666",
              flexWrap: "wrap", // Allow legend items to wrap if many
              justifyContent: "center",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AlarmCategory;