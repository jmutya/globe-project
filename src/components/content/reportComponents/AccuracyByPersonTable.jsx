// src/components/tables/AccuracyByPersonTable.js
import React from "react";

const AccuracyByPersonTable = ({ accuracyData, title, valueAccessor = (item) => item }) => {
  if (!accuracyData || Object.keys(accuracyData).length === 0) {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-gray-100 rounded overflow-y-auto max-h-80">
      <h3 className="font-semibold text-lg mb-4">{title}</h3>
      <table className="min-w-full table-auto">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2 text-left">Assigned Person</th>
            <th className="px-4 py-2 text-left">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(accuracyData).map(([person, percentage]) => (
            <tr key={person} className="border-b">
              <td className="px-4 py-2">{person}</td>
              <td className="px-4 py-2">{percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AccuracyByPersonTable;