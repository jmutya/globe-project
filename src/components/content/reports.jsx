import React, { useState } from "react";
import useReportData from "../content/reportComponents/useReportData";
import AlarmLineChart from "./reportComponents/AlarmLineChart";
import AccuracyProgress from "./reportComponents/AccuracyProgress";
import IncompleteRowsTable from "./reportComponents/IncompleteRowsTable";
import UnmatchedRowsTable from "./reportComponents/UnmatchedRowsTable";
import AccuracyByPersonTable from "./reportComponents/AccuracyByPersonTable";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import "react-loading-skeleton/dist/skeleton.css";
import { MinusSmallIcon } from "@heroicons/react/20/solid";

const Reports = () => {
  const [timeRange, setTimeRange] = useState("daily");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy] = useState("date");
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedUnmatchedRow, setSelectedUnmatchedRow] = useState(null);
  const [selectedAccuracyView, setSelectedAccuracyView] =
    useState("ticketIssuance"); // NEW

  const colors = [
    "#ff6384",
    "#36a2eb",
    "#ffce56",
    "#4bc0c0",
    "#9966ff",
    "#ff9f40",
    "#8b0000",
    "#008000",
  ];

  const {
    chartData,
    alarmTypes,
    hasCompleteRows,
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
    return (
      <div className="p-4 text-red-500">
        Error loading data: {error.message}
      </div>
    );
  }
  const [showIssuanceDetails, setShowIssuanceDetails] = useState(false);

  return (
    <div
      className="p-4 bg-white shadow-lg rounded-lg overflow-y-auto"
      style={{ maxHeight: "88vh", height: "auto" }}
    >
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

      {isLoading ? (
        <div className="flex justify-center items-center h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-indigo-500"></div>
          <p className="ml-3 text-gray-600">Generating Graph</p>
        </div>
      ) : (
        <AlarmLineChart
          chartData={chartData}
          alarmTypes={alarmTypes}
          colors={colors}
        />
      )}

      {/* Accuracy View Toggle */}
      <label>Accuracy View: </label>
      <select
        className="p-2 border rounded-md ml-4"
        value={selectedAccuracyView}
        onChange={(e) => setSelectedAccuracyView(e.target.value)}
      >
        <option value="ticketIssuance">Ticket Issuance</option>
        <option value="closingAccuracy">Closing Accuracy</option>
      </select>

      {/* Ticket Issuance View */}
      {selectedAccuracyView === "ticketIssuance" && (
        <>
          <div className="mb-11 flex space-x-4">
            <div>
              <AccuracyProgress
                percentage={accuracyPercentage}
                title="Overall Ticket Issuance Accuracy"
              />
              {/* Toggle checkbox */}
              <div className="mt-6 flex items-center space-x-4">
                <span className="text-lg font-semibold text-gray-800">
                  Show Accuracy by Person
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={showIssuanceDetails}
                    onChange={(e) => setShowIssuanceDetails(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer dark:bg-gray-600 peer-checked:bg-indigo-600 transition-all duration-300"></div>
                  <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 transform peer-checked:translate-x-full"></div>
                </label>
              </div>
            </div>

            <div className="w-3/4 overflow-y-auto max-h-90 mb-11 space-y-6">
              <IncompleteRowsTable
                incompleteRows={incompleteRows}
                onRowClick={setSelectedRow}
                percentagePerAssignedPerson={percentagePerAssignedPerson}
              />
            </div>
          </div>

          {showIssuanceDetails && (
            <AccuracyByPersonTable
              accuracyData={percentagePerAssignedPerson}
              title="Ticket Issuance Accuracy per Assigned Person"
            />
          )}
        </>
      )}

      {/* Closing Accuracy View */}
      {selectedAccuracyView === "closingAccuracy" && (
        <>
          <div className="mb-4 rounded flex space-x-4">
            <AccuracyProgress
              percentage={closingAccuracy}
              title="Overall Closing Accuracy"
            />
            <div className="w-3/4 max-h-90 mb-11">
              <UnmatchedRowsTable
                unmatchedRows={unmatchedRows}
                onRowClick={setSelectedUnmatchedRow}
              />
              {selectedUnmatchedRow && (
                <div className="mt-4 p-4 bg-white border rounded shadow">
                  <h4 className="text-lg font-semibold mb-2 text-gray-800">
                    Selected Row Details
                  </h4>
                  <p>
                    <strong>Ticket Number:</strong>{" "}
                    {selectedUnmatchedRow.number}
                  </p>
                  <p>
                    <strong>Resolved By:</strong>{" "}
                    {selectedUnmatchedRow.resolvedBy || "Unassigned"}
                  </p>
                  <p>
                    <strong>Cause:</strong>{" "}
                    {selectedUnmatchedRow.cause || "Empty"}
                  </p>
                  <p>
                    <strong>Reason for Outage:</strong>{" "}
                    {selectedUnmatchedRow.reason || "Empty"}
                  </p>
                  <p>
                    <strong>Closing Accuracy:</strong>{" "}
                    {individualAccuracy[selectedUnmatchedRow.resolvedBy] ||
                      "N/A"}
                    %
                  </p>
                </div>
              )}
            </div>
          </div>

          <AccuracyByPersonTable
            accuracyData={individualAccuracy}
            title="Completion Accuracy per Assigned Person"
          />
        </>
      )}
    </div>
  );
};

export default Reports;
