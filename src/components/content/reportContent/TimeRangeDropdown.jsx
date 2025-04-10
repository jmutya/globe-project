import React from "react";

const TimeRangeAndSort = ({
  timeRange,
  setTimeRange,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  availableYears,
  sortBy,
  setSortBy,
}) => {
  return (
    <div className="mb-4 flex gap-4 items-center flex-wrap">
      <label>Time Range:</label>
      <select
        className="p-2 border rounded-md"
        value={timeRange}
        onChange={(e) => setTimeRange(e.target.value)}
      >
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </select>

      {(timeRange === "monthly" || timeRange === "yearly") && (
        <>
          {timeRange === "monthly" && (
            <select
              className="p-2 border rounded-md"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("default", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          )}

          <select
            className="p-2 border rounded-md"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </>
      )}

      <label>Sort By:</label>
      <select
        className="p-2 border rounded-md"
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
      >
        <option value="date">Date</option>
        <option value="total">Total Alarms</option>
      </select>
    </div>
  );
};

export default TimeRangeAndSort;
