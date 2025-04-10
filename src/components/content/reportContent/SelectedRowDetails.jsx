// src/components/SelectedRowDetails.js
import React from "react";

const SelectedRowDetails = ({ selectedRow, percentage }) => (
  <div className="mt-10 p-4 bg-gray-100 text-gray-800 rounded">
    <h3 className="text-lg font-semibold">Selected Row Details</h3>
    <p>
      <strong>Ticket Number:</strong> {selectedRow.number}
    </p>
    <p>
      <strong>Assigned To:</strong> {selectedRow.assignedTo || "Not Assigned"}
    </p>
    <p>
      <strong>Missing Columns:</strong> {selectedRow.missingColumns.join(", ")}
    </p>
    <p>
      <strong>Accuracy Percentage:</strong> {percentage}%
    </p>
  </div>
);

export default SelectedRowDetails;
