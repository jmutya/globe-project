import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import CountUp from "react-countup";
import {
  fetchSeverityCounts,
  fetchStateDistribution,
} from "../../../backend/functions/alarmCountUtils";

const COLORS = [
  "#60a5fa",
  "#facc15",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#f97316",
  "#e11d48",
  "#0ea5e9",
];

const AlarmCount = () => {
  const [totalCount, setTotalCount] = useState(0);
  const [monthName, setMonthName] = useState("");
  const [stateData, setStateData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const { counts, mostRecentMonth: monthFromSeverity } =
          await fetchSeverityCounts();
        const { stateDistribution, mostRecentMonth: monthFromState } =
          await fetchStateDistribution();

        // Calculate total count from severity
        const total = Object.values(counts).reduce(
          (acc, count) => acc + count,
          0
        );
        setTotalCount(total);

        // Pick consistent month name
        const monthToUse = monthFromState || monthFromSeverity;
        if (monthToUse) {
          const [year, month] = monthToUse.split("-");
          const date = new Date(`${year}-${month}-01`);
          const name = date.toLocaleString("default", { month: "long" });
          setMonthName(`${name} ${year}`);
        }

        // Convert state distribution to chart format
        const formattedStateData = Object.entries(stateDistribution).map(
          ([name, value], index) => ({
            name,
            value,
            fill: COLORS[index % COLORS.length],
          })
        );

        setStateData(formattedStateData);
      } catch (error) {
        console.error("Error loading alarm count data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="bg-white rounded-md shadow p-6 w-full h-[362px] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center mb-4">
        <div className="rounded-lg bg-green-500 h-12 w-12 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="white"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 7h6m-9 3v-6a2 2 0 012-2h10a2 2 0 012 2v6m-9 3h6m-3-3h.008v.008H12V10.008m-3-3h.008v.008H9V7.008m6 6h.008v.008H15V16.008"
            />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-gray-700 ml-3 uppercase tracking-wider">
          Ticket Count {monthName && `(${monthName})`}
        </h2>
      </div>

      {/* Body */}
      <div className="flex flex-1 h-full">
        {/* Left - Pie Chart */}
        <div className="w-1/2 flex items-center justify-center border-r pr-4">
          {isLoading ? (
            <div className="flex justify-center items-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 ml-2 text-sm">
                Loading Please Wait...
              </p>
            </div>
          ) : stateData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stateData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={2}
                  cornerRadius={6}
                >
                  {stateData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => {
                    const total = stateData.reduce(
                      (sum, cur) => sum + cur.value,
                      0
                    );
                    const percentage = ((value / total) * 100).toFixed(1);
                    return [`${value} (${percentage}%)`, name];
                  }}
                  itemStyle={{ color: "gray" }}
                  labelStyle={{ color: "black", fontWeight: "bold" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm text-center">
              No data available
            </p>
          )}
        </div>

        {/* Right - Total Tickets */}
        <div className="w-1/2 flex flex-col justify-center items-center pl-6">
          {isLoading ? (
            <div className="flex justify-center items-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 ml-2 text-sm">
                Loading Please Wait...
              </p>
            </div>
          ) : totalCount > 0 ? (
            <>
              <p className="text-sm font-medium text-gray-600 mb-2">
                Total Tickets
              </p>
              <CountUp
                end={totalCount}
                duration={1.5}
                separator=","
                className="text-4xl font-bold text-gray-800"
              />
            </>
          ) : (
            <p className="text-gray-500 text-sm">No active tickets</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-right">
        <p className="text-xs text-gray-500">
          See ticket details which require immediate attention.
        </p>
      </div>
    </div>
  );
};

export default AlarmCount;