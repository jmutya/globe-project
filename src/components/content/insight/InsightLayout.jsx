
import React, { useState } from "react";
import FilterData from "../InsightsContent/filter";
import TicketIssuance from "./TicketIssuance";
import ClosingAccuracy from "./ClosingAccuracy";

const InsightLayout = () => {
  const [selectedAccuracyView, setSelectedAccuracyView] =
    useState("ticketIssuance");

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
            <TicketIssuance />
          </div>
        )}
        {/* === Closing Accuracy View === */}
        {selectedAccuracyView === "closingAccuracy" && (
          <div className="mb-10">
            <ClosingAccuracy />
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightLayout;
