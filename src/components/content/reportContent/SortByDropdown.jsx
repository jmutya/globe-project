// src/components/SortByDropdown.js
import React from "react";

const SortByDropdown = ({ sortBy, setSortBy }) => (
  <>
    <label>Sort By:</label>
    <select
      className="p-2 border rounded-md"
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value)}
    >
      <option value="date">Date</option>
      <option value="total">Total Alarms</option>
    </select>
  </>
);

export default SortByDropdown;
