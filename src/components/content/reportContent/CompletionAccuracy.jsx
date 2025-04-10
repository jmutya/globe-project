import React from "react";

const CompletionAccuracy = ({ individualAccuracy }) => {
  return (
    <div className="mt-6 p-4 bg-gray-100 rounded overflow-y-auto max-h-80">
      <h3 className="font-semibold text-lg mb-4">
        Completion Accuracy per Assigned Person
      </h3>
      <table className="min-w-full table-auto">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2 text-left">Assigned Person</th>
            <th className="px-4 py-2 text-left">Completion Percentage</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(individualAccuracy).map(([person, percentage]) => (
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

export default CompletionAccuracy;