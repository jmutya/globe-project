import React from "react";

const getProgressBarColor = (value) => {
  if (value >= 90) return "bg-green-500";
  if (value >= 74) return "bg-yellow-400";
  return "bg-red-500";
};

const AccuracyByPersonTable = ({ accuracyData, title, valueAccessor = (item) => item }) => {
  if (!accuracyData || Object.keys(accuracyData).length === 0) {
    return null;
  }

  return (
    <div className="mt-6 bg-white shadow-md rounded-xl p-6 max-h-96 overflow-y-auto">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto text-sm text-gray-700">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-4 py-3 text-left font-medium">Assigned Person</th>
              <th className="px-4 py-3 text-center font-medium">Accurate Tickets / Tickets Issued</th>
              <th className="px-4 py-3 text-left font-medium w-1/2">Accuracy</th>
              <th className="px-4 py-3 text-left font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(accuracyData).map(([person, data], idx) => {
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

export default AccuracyByPersonTable;
