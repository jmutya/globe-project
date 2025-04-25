import React, { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react"; // You can swap this with any icon lib or SVG

const getProgressBarColor = (value) => {
  if (value >= 90) return "bg-green-500";
  if (value >= 74) return "bg-yellow-400";
  return "bg-red-500";
};

const PercentageByPersonTable = ({ accuracyData, title, valueAccessor = (item) => item }) => {
  const [sortBy, setSortBy] = useState(null);
  const [sortDirection, setSortDirection] = useState("desc");

  if (!accuracyData || Object.keys(accuracyData).length === 0) {
    return null;
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  const sortedEntries = Object.entries(accuracyData).sort(([aKey, aData], [bKey, bData]) => {
    const aVal = valueAccessor(aData);
    const bVal = valueAccessor(bData);

    if (!sortBy) return 0;

    const compareVal = sortBy === "accurate" ? aVal.accurate - bVal.accurate : aVal.total - bVal.total;
    return sortDirection === "asc" ? compareVal : -compareVal;
  });

  const SortIcon = ({ active }) =>
    active ? (
      sortDirection === "asc" ? <ArrowUp size={14} className="inline ml-1" /> : <ArrowDown size={14} className="inline ml-1" />
    ) : null;

  return (
    <div className="mt-6 bg-white shadow-md rounded-xl p-6 max-h-96 overflow-y-auto">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto text-sm text-gray-700">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-4 py-3 text-left font-medium">Assigned Person</th>
              <th
                className="px-4 py-3 text-center font-medium cursor-pointer"
                onClick={() => handleSort("accurate")}
              >
                Accurate Tickets / Tickets Issued
                <SortIcon active={sortBy === "accurate"} />
              </th>
              <th className="px-4 py-3 text-left font-medium w-1/2">Accuracy</th>
              <th
                className="px-4 py-3 text-left font-medium cursor-pointer"
                onClick={() => handleSort("total")}
              >
                %
                <SortIcon active={sortBy === "total"} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map(([person, data], idx) => {
              const { accurate, total, percentage } = valueAccessor(data);
              const barColor = getProgressBarColor(percentage);

              return (
                <tr
                  key={person}
                  className={`border-b ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } hover:bg-indigo-50 transition`}
                >
                  <td className="px-4 py-3">{person}</td>
                  <td className="px-4 py-3 text-center">{`${accurate} / ${total}`}</td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full ${barColor} transition-all duration-500 ease-out`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-indigo-600">
                    {percentage.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PercentageByPersonTable;
