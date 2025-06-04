import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { fetchAutomaticticketingChartData } from "../../../backend/functions/functionauto";

const Manualvsauto = () => {
  const [chartData, setChartData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadChartData = async () => {
      setIsLoading(true);
      const { formattedData, totalCount } = await fetchAutomaticticketingChartData();
      if (isMounted) {
        setChartData(formattedData);
        setTotalCount(totalCount);
        setIsLoading(false);
      }
    };

    loadChartData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-white rounded-md shadow overflow-hidden p-6">
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 ml-2">Loading Please Wait...</p>
        </div>
      ) : chartData.length > 0 ? (
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
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  style={{
                    opacity: activeIndex === index ? 0.9 : 1,
                    transform:
                      activeIndex === index ? "scale(1.05)" : "scale(1)",
                    transformOrigin: "center center",
                    transition: "all 0.3s ease-in-out",
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const percentage = ((value / totalCount) * 100).toFixed(1);
                return [`${value} (${percentage}%)`, name];
              }}
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #eee",
                borderRadius: "12px",
                fontSize: "13px",
                padding: "10px",
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
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-center text-gray-500 text-sm">No data available.</p>
      )}
    </div>
  );
};

export default Manualvsauto;
