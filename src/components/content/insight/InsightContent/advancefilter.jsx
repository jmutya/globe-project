
// components/FilterData.jsx
import React, { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx"; // Still needed for client-side Excel export
import { saveAs } from 'file-saver';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
// import supabase from "../../../backend/supabase/supabase"; // No longer needed here
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Import functions from the new backend service
import {
  fetchAndProcessAllExcelData,
  generateFilteredData,
} from "../../../../backend/insightfunctions/advancefilterfunction"; // Adjust path as needed

const FilterData = () => {
  const [selectTerritory, setSelectTerritory] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [structuredData, setStructuredData] = useState([]); // This will hold the full parsed data from all files
  const [chartData, setChartData] = useState([]);
  const [reasonSummary, setReasonSummary] = useState([]);
  const [tableData, setTableData] = useState([]); // Raw filtered data for Excel export
  const [uniqueReasonTableData, setUniqueReasonTableData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [parsingErrors, setParsingErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const contentRef = useRef(null);

  // Initial data load on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const { structuredData, parsingErrors, monthOptions } = await fetchAndProcessAllExcelData();
        setStructuredData(structuredData);
        setParsingErrors(parsingErrors);
        // Set month options here directly from the service response
        // This is if monthOptions is only derived from the initial load
        // If it needs to be filtered by territory/area/province, keep that logic below
        // For simplicity, assuming monthOptions is derived from all data initially.
        setMonthOptions(monthOptions);
      } catch (err) {
        console.error("Failed to load initial data:", err);
        setParsingErrors((prev) => [...prev, `Initial data load failed: ${err.message}`]);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // State to hold month options from the backend service
  const [monthOptions, setMonthOptions] = useState([]);

  // Effects for cascading dropdowns
  useEffect(() => {
    setSelectedArea("");
    setSelectedProvince("");
  }, [selectTerritory]);

  useEffect(() => {
    setSelectedProvince("");
  }, [selectedArea]);

  // Derived state for filter options (now based on `structuredData`)
  const territoryOptions = [
    ...new Set(structuredData.map((item) => item.territory)),
  ].sort();

  const areaOptions = selectTerritory
    ? [
        ...new Set(
          structuredData
            .filter((item) => item.territory === selectTerritory)
            .map((item) => item.area)
        ),
      ].sort()
    : [];

  const provinceOptions = selectedArea
    ? [
        ...new Set(
          structuredData
            .filter((item) => item.area === selectedArea)
            .map((item) => item.province)
        ),
      ].sort()
    : [];


  const handleGenerateChart = () => {
    // Pass the full structured data and current filters to the service function
    const { chartData, reasonSummary, uniqueReasonTableData, tableData } = generateFilteredData(structuredData, {
      selectedMonth,
      selectTerritory,
      selectedArea,
      selectedProvince,
    });

    setChartData(chartData);
    setReasonSummary(reasonSummary);
    setUniqueReasonTableData(uniqueReasonTableData);
    setTableData(tableData); // Update the detailed table data
  };

  const handleExportPdf = async () => {
    if (contentRef.current) {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save("filtered_data.pdf");
    }
  };

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    // 1. Add Chart Data
    if (chartData.length > 0) {
      const chartSheet = XLSX.utils.json_to_sheet(chartData);
      XLSX.utils.book_append_sheet(workbook, chartSheet, "Chart Data");
    }

    // 2. Add Reason Summary Table Data
    if (reasonSummary.length > 0) {
      const reasonSummarySheet = XLSX.utils.json_to_sheet(reasonSummary);
      XLSX.utils.book_append_sheet(workbook, reasonSummarySheet, "Reason Summary");
    }

    // 3. Add Unique Reasons Table Data (if applicable)
    if (selectedProvince && uniqueReasonTableData.length > 0) {
      const uniqueReasonSheet = XLSX.utils.json_to_sheet(uniqueReasonTableData);
      XLSX.utils.book_append_sheet(workbook, uniqueReasonSheet, "Unique Reasons");
    }

    // 4. Add Raw Filtered Data (tableData) - This is the complete filtered dataset
    if (tableData.length > 0) {
      const simplifiedTableData = tableData.map(item => ({
        Region: item.region,
        Area: item.area,
        Territory: item.territory,
        Province: item.province,
        Date: item.date,
        Reason: item.reason,
        Number: item.number,
      }));
      const rawDataSheet = XLSX.utils.json_to_sheet(simplifiedTableData);
      XLSX.utils.book_append_sheet(workbook, rawDataSheet, "Filtered Raw Data");
    }

    // Generate and download the Excel file
    XLSX.writeFile(workbook, "filtered_data.xlsx");
  };

  return (
    <div>
      <div className="mb-4 flex gap-4 items-center flex-wrap">
        <div>
          <label>Month: </label>
          <select
            className="p-2 border rounded-md ml-3"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="">All Months</option>
            {monthOptions.map((month, idx) => (
              <option key={idx} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Territory: </label>
          <select
            className="p-2 border rounded-md ml-3"
            value={selectTerritory}
            onChange={(e) => setSelectTerritory(e.target.value)}
          >
            <option value="">Select Territory</option>
            {territoryOptions.map((territory, idx) => (
              <option key={idx} value={territory}>
                {territory}
              </option>
            ))}
          </select>
        </div>

        {selectTerritory && (
          <div>
            <label>Area: </label>
            <select
              className="p-2 border rounded-md ml-3"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              <option value="">Select Area</option>
              {areaOptions.map((area, idx) => (
                <option key={idx} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedArea && (
          <div>
            <label>Province: </label>
            <select
              className="p-2 border rounded-md ml-3"
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
            >
              <option value="">Select Province</option>
              {provinceOptions.map((province, idx) => (
                <option key={idx} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="ml-auto flex gap-2">
            <button
              onClick={handleGenerateChart}
              className="px-4 py-2 bg-blue-500 text-white rounded-md shadow hover:bg-blue-600 transition"
              disabled={isLoading} // Disable button while loading
            >
              {isLoading ? "Loading..." : "Generate Graph"}
            </button>
            {(!isLoading && chartData.length > 0 || reasonSummary.length > 0 || uniqueReasonTableData.length > 0 || tableData.length > 0) && (
              <>
                <button
                  onClick={handleExportPdf}
                  className="px-4 py-2 bg-red-500 text-white rounded-md shadow hover:bg-red-600 transition"
                >
                  Export to PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-4 py-2 bg-green-500 text-white rounded-md shadow hover:bg-green-600 transition"
                >
                  Export to Excel
                </button>
              </>
            )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10">
          <p className="text-xl font-semibold text-blue-600">Loading and Processing Data...</p>
          <p className="text-gray-500">This may take a moment to fetch and parse Excel files.</p>
        </div>
      ) : (
        <div ref={contentRef}>
          {chartData.length > 0 && (
            <div className="mt-8 overflow-x-auto">
              <LineChart
                width={1400}
                height={500}
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(chartData[0])
                  .filter((key) => key !== "date")
                  .map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={
                        ["#8884d8", "#82ca9d", "#ff7300", "#ff4f81", "#0088FE"][
                          index % 5
                        ]
                      }
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    ></Line>
                  ))}
              </LineChart>
            </div>
          )}

          <div className="flex flex-wrap gap-4 mt-6">
            {reasonSummary.length > 0 && (
              <div className="flex-1 min-w-[300px]">
                <h3 className="text-lg font-semibold mb-2">
                  Reason for Outage Summary
                </h3>
                <table className="w-full table-auto border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2">Reason</th>
                      <th className="border px-4 py-2">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reasonSummary.map(({ reason, count }, idx) => (
                      <tr key={idx}>
                        <td className="border px-4 py-2">{reason}</td>
                        <td className="border px-4 py-2">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedProvince && uniqueReasonTableData.length > 0 && (
              <div className="flex-1 min-w-[300px]">
                <h3 className="text-lg font-semibold mb-2">
                  Unique Reasons for Outage in {selectedProvince}
                </h3>
                <table className="w-full table-auto border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2">Reason for Outage</th>
                      <th className="border px-4 py-2">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueReasonTableData.map((item, index) => (
                      <tr key={index}>
                        <td className="border px-4 py-2">{item.reason}</td>
                        <td className="border px-4 py-2">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {parsingErrors.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-h-60 overflow-auto mt-10">
          <strong className="font-bold">Parsing Issues:</strong>
          <ul className="mt-2 list-disc list-inside">
            {parsingErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FilterData;