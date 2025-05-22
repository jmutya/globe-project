import React, { useState } from "react";
import useReportData from "./InsightsContent/useReportData";
import AlarmLineChart from "./InsightsContent/AlarmLineChart";
import AccuracyProgress from "./InsightsContent/AccuracyProgress";
import IncompleteRowsTable from "./InsightsContent/IncompleteRowsTable";
import UnmatchedRowsTable from "./InsightsContent/UnmatchedRowsTable";
import AccuracyByPersonTable from "./InsightsContent/AccuracyByPersonTable";
import FilterData from "./InsightsContent/filter";
import PercentageByPersonTable from "./InsightsContent/PercentageBypersonTable";

const Insights = () => {
  const [timeRange, setTimeRange] = useState("daily");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy] = useState("date");
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedUnmatchedRow, setSelectedUnmatchedRow] = useState(null);
  const [selectedAccuracyView, setSelectedAccuracyView] =
    useState("ticketIssuance");
  const [showAccuracyTable, setShowAccuracyTable] = useState(false);
  const [showAccuracyByPersonTable, setShowAccuracyByPersonTable] =
    useState(false);

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

  return (
    <div
      className="p-6 bg-white shadow-md rounded-lg overflow-y-auto"
      style={{ maxHeight: "88vh" }}
    >

      {/* === Custom Filters === */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <div className="flex items-center mb-4">
          {/* Filter Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-gray-600 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M3 4a1 1 0 011-1h12a1 1 0 01.8 1.6l-4.6 6.13v3.27a1 1 0 01-.55.89l-2 1A1 1 0 018 15.9v-5.17L3.2 4.6A1 1 0 013 4z" />
          </svg>
          {/* Heading */}
          <h2 className="text-lg font-semibold text-gray-800">
            Advanced Filter Area
          </h2>
        </div>
        <FilterData />
      </div>

      {/* === Accuracy View Switcher === */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <div className="flex items-center mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-gray-600 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M3 4a1 1 0 011-1h12a1 1 0 01.8 1.6l-4.6 6.13v3.27a1 1 0 01-.55.89l-2 1A1 1 0 018 15.9v-5.17L3.2 4.6A1 1 0 013 4z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-800">
            Select Accuracy View
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Accuracy View:
            </label>
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
            {/* accuracy progress is here-------------------------------------- */}
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

            <div className="flex items-center mt-6 mb-4 space-x-4">
              {/* Toggle switch */}
              <label
                htmlFor="toggleAccuracyTable"
                className="relative inline-flex items-center cursor-pointer"
              >
                <input
                  type="checkbox"
                  id="toggleAccuracyTable"
                  className="sr-only peer"
                  checked={showAccuracyTable}
                  onChange={() => setShowAccuracyTable(!showAccuracyTable)}
                />
                <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-colors duration-300"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-5 transition-transform duration-300"></div>
              </label>

              {/* Label text */}
              <label
                htmlFor="toggleAccuracyTable"
                className="text-sm text-gray-700 font-medium"
              >
                Show Accuracy per Assigned Person
              </label>
            </div>

            {showAccuracyTable && (
              <div className="mt-6">
                <PercentageByPersonTable
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
                  individualAccuracy={individualAccuracy}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center space-x-4">
              {/* Toggle Switch */}
              <label
                htmlFor="toggleAccuracyByPerson"
                className="relative inline-flex items-center cursor-pointer"
              >
                <input
                  type="checkbox"
                  id="toggleAccuracyByPerson"
                  className="sr-only peer"
                  checked={showAccuracyByPersonTable}
                  onChange={() =>
                    setShowAccuracyByPersonTable(!showAccuracyByPersonTable)
                  }
                />
                <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-colors duration-300"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-5 transition-transform duration-300"></div>
              </label>

              {/* Label */}
              <label
                htmlFor="toggleAccuracyByPerson"
                className="text-sm text-gray-700 font-medium"
              >
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
    </div>
  );
};

export default Insights;
