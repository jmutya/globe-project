import React, { useState } from "react";
import useReportData from "../content/reportComponents/useReportData";
import AlarmLineChart from "./reportComponents/AlarmLineChart";
import AccuracyProgress from "./reportComponents/AccuracyProgress";
import IncompleteRowsTable from "./reportComponents/IncompleteRowsTable";
import UnmatchedRowsTable from "./reportComponents/UnmatchedRowsTable";
import AccuracyByPersonTable from "./reportComponents/AccuracyByPersonTable";
import FilterData from "./reportComponents/filter";

const Reports = () => {
  const [timeRange, setTimeRange] = useState("daily");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy] = useState("date");
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedUnmatchedRow, setSelectedUnmatchedRow] = useState(null);
  const [selectedAccuracyView, setSelectedAccuracyView] = useState("ticketIssuance");
  const [showAccuracyTable, setShowAccuracyTable] = useState(false);
  const [showAccuracyByPersonTable, setShowAccuracyByPersonTable] = useState(false);

  const colors = [
    "#ff6384", "#36a2eb", "#ffce56", "#4bc0c0",
    "#9966ff", "#ff9f40", "#8b0000", "#008000",
  ];

  const {
    chartData,
    alarmTypes,
    availableYears,
    incompleteRows,
    totalRows,
    percentagePerAssignedPerson,
    closingAccuracy,
    unmatchedRows,
    individualAccuracy,
    isLoading,
    accuracyPercentage,
    error,
  } = useReportData(timeRange, selectedMonth, selectedYear, sortBy);

  if (error) {
    return <div className="p-4 text-red-500">Error loading data: {error.message}</div>;
  }

  return (
    <div className="p-6 bg-white shadow-md rounded-lg overflow-y-auto" style={{ maxHeight: "88vh" }}>
      
      {/* === Filters Section === */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block mb-1 font-medium">Time Range</label>
            <select className="w-full p-2 border rounded-md" value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {timeRange === "monthly" && (
            <div>
              <label className="block mb-1 font-medium">Month</label>
              <select className="w-full p-2 border rounded-md" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("default", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(timeRange === "monthly" || timeRange === "yearly") && (
            <div>
              <label className="block mb-1 font-medium">Year</label>
              <select className="w-full p-2 border rounded-md" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block mb-1 font-medium">Sort By</label>
            <select className="w-full p-2 border rounded-md" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date">Date</option>
              <option value="total">Total Alarms</option>
            </select>
          </div>
        </div>
      </div>

      {/* === Alarm Overview Section === */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Alarm Overview</h2>
        {isLoading ? (
          <div className="flex justify-center items-center h-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-indigo-500"></div>
            <p className="ml-3 text-gray-600">Generating Graph</p>
          </div>
        ) : (
          <AlarmLineChart chartData={chartData} alarmTypes={alarmTypes} colors={colors} />
        )}
      </div>

      {/* === Custom Filters === */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Advanced Filter</h2>
        <FilterData />
      </div>

      {/* === Accuracy View Switcher === */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Select Accuracy View</h2>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Accuracy View:</label>
          <select
            className="w-full sm:w-auto p-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm"
            value={selectedAccuracyView}
            onChange={(e) => setSelectedAccuracyView(e.target.value)}
          >
            <option value="ticketIssuance">Ticket Issuance</option>
            <option value="closingAccuracy">Closing Accuracy</option>
          </select>
        </div>
      </div>

      {/* === Ticket Issuance Accuracy View === */}
      {selectedAccuracyView === "ticketIssuance" && (
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row gap-6">
            <AccuracyProgress
              percentage={accuracyPercentage}
              title="Overall Ticket Issuance Accuracy"
            />

            <div className="flex-1">
              <IncompleteRowsTable
                incompleteRows={incompleteRows}
                onRowClick={setSelectedRow}
                percentagePerAssignedPerson={percentagePerAssignedPerson}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-6 mb-4">
            <input
              type="checkbox"
              checked={showAccuracyTable}
              onChange={() => setShowAccuracyTable(!showAccuracyTable)}
              id="toggleAccuracyTable"
              className="w-5 h-5 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="toggleAccuracyTable" className="text-sm text-gray-700 font-medium">
              Show Accuracy per Assigned Person
            </label>
          </div>

          {showAccuracyTable && (
            <div className="mt-6">
              <AccuracyByPersonTable
                accuracyData={percentagePerAssignedPerson}
                title="Ticket Issuance Accuracy per Assigned Person"
              />
            </div>
          )}
        </div>
      )}

      {/* === Closing Accuracy View === */}
      {selectedAccuracyView === "closingAccuracy" && (
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row gap-6 mt-6">
            <AccuracyProgress
              percentage={closingAccuracy}
              title="Overall Closing Accuracy"
            />

            <div className="flex-1">
              <UnmatchedRowsTable
                unmatchedRows={unmatchedRows}
                onRowClick={setSelectedUnmatchedRow}
              />

              {selectedUnmatchedRow && (
                <div className="mt-4 p-4 bg-white border rounded shadow">
                  <h4 className="text-lg font-semibold mb-2 text-gray-800">Selected Row Details</h4>
                  <p><strong>Ticket Number:</strong> {selectedUnmatchedRow.number}</p>
                  <p><strong>Resolved By:</strong> {selectedUnmatchedRow.resolvedBy || "Unassigned"}</p>
                  <p><strong>Cause:</strong> {selectedUnmatchedRow.cause || "Empty"}</p>
                  <p><strong>Reason for Outage:</strong> {selectedUnmatchedRow.reason || "Empty"}</p>
                  <p><strong>Closing Accuracy:</strong> {individualAccuracy[selectedUnmatchedRow.resolvedBy] || "N/A"}%</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="toggleAccuracyByPerson"
              checked={showAccuracyByPersonTable}
              onChange={() => setShowAccuracyByPersonTable(!showAccuracyByPersonTable)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="toggleAccuracyByPerson" className="ml-2 text-sm text-gray-700 font-medium">
              Show Completion Accuracy per Assigned Person
            </label>
          </div>

          {showAccuracyByPersonTable && (
            <div className="mt-6">
              <AccuracyByPersonTable
                accuracyData={individualAccuracy}
                title="Completion Accuracy per Assigned Person"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
