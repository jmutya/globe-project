import React, { useEffect, useState, useRef } from "react"; // Import useRef
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import supabase from "../../../backend/supabase/supabase";
import jsPDF from "jspdf"; // Import jsPDF
import html2canvas from "html2canvas"; // Import html2canvas

const FilterData = () => {
  const [selectTerritory, setSelectTerritory] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [structuredData, setStructuredData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [reasonSummary, setReasonSummary] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [uniqueReasonTableData, setUniqueReasonTableData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [parsingErrors, setParsingErrors] = useState([]);

  // Create a ref for the content you want to export
  const contentRef = useRef(null);

  const convertExcelDate = (value) => {
    const formatDate = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`;

    if (typeof value === "number") {
      const millisecondsPerDay = 86400000;
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + value * millisecondsPerDay);
      return formatDate(date);
    } else if (typeof value === "string") {
      const date = new Date(value);
      if (!isNaN(date)) return formatDate(date);
    }
    return "";
  };

  const processExcelData = async (fileUrl) => {
    const response = await fetch(fileUrl);
    const blob = await response.arrayBuffer();
    const workbook = XLSX.read(blob, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
  };

  const fetchAndProcessFiles = async () => {
    const { data: files, error } = await supabase.storage
      .from("uploads")
      .list("excels");

    if (error) return console.error("Supabase error:", error);

    let allData = [];
    for (const file of files) {
      const { data: fileUrl } = supabase.storage
        .from("uploads")
        .getPublicUrl(`excels/${file.name}`);
      const sheet = await processExcelData(fileUrl.publicUrl);
      allData = [...allData, ...sheet];
    }

    const errors = [];
    const parsed = allData
      .map((row, idx) => {
        const desc = row["Short description"];
        const cleanDesc = desc?.replace(/^[\s']+/, "");
        const match = cleanDesc?.match(/\(([^)]+)\)/);
        const date = convertExcelDate(row["Opened"]);
        const reason = row["Reason For Outage"] || "Empty";
        const number = row["Number"] || "";

        if (!desc) {
          errors.push(`Row ${idx + 1}: Missing Short description (Ticket Number: ${number || 'N/A'})`);
          return null;
        }
        if (!match) {
          errors.push(`Row ${idx + 1}: Could not match pattern in "${desc}" (Ticket Number: ${number || 'N/A'})`);
          return null;
        }
        const parts = match[1].split("-");
        if (parts.length < 5) {
          errors.push(`Row ${idx + 1}: Not enough parts in "${match[1]}" (Ticket Number: ${number || 'N/A'})`);
          return null;
        }

        return {
          region: parts[0],
          area: parts[2],
          territory: parts[3],
          province: parts[4],
          reason,
          date,
          number,
        };
      })
      .filter(Boolean);

    setParsingErrors(errors);
    setStructuredData(parsed);
  };

  useEffect(() => {
    fetchAndProcessFiles();
  }, []);

  useEffect(() => {
    setSelectedArea("");
    setSelectedProvince("");
  }, [selectTerritory]);

  useEffect(() => {
    setSelectedProvince("");
  }, [selectedArea]);

  const territoryOptions = [
    ...new Set(structuredData.map((item) => item.territory)),
  ];

  const areaOptions = selectTerritory
    ? [
        ...new Set(
          structuredData
            .filter((item) => item.territory === selectTerritory)
            .map((item) => item.area)
        ),
      ]
    : [];

  const provinceOptions = selectedArea
    ? [
        ...new Set(
          structuredData
            .filter((item) => item.area === selectedArea)
            .map((item) => item.province)
        ),
      ]
    : [];

  const monthOptions = [
    ...new Set(
      structuredData
        .map((item) => item.date?.slice(0, 7))
        .filter(Boolean)
    ),
  ].sort();

  const handleGenerateChart = () => {
    let filtered = [...structuredData];

    if (selectTerritory)
      filtered = filtered.filter((item) => item.territory === selectTerritory);
    if (selectedArea)
      filtered = filtered.filter((item) => item.area === selectedArea);
    if (selectedProvince)
      filtered = filtered.filter((item) => item.province === selectedProvince);
    if (selectedMonth)
      filtered = filtered.filter((item) => item.date?.startsWith(selectedMonth));

    setTableData(filtered);

    if (selectedProvince) {
      const groupedByDate = {};
      const reasonCount = {};
      const uniqueReasons = {};

      filtered.forEach((item) => {
        const date = item.date || "Unknown";
        const reason = item.reason?.split("-")[0]?.trim() || "Unknown";
        const fullReason = item.reason || "Empty";

        if (!groupedByDate[date]) groupedByDate[date] = {};
        groupedByDate[date][reason] = (groupedByDate[date][reason] || 0) + 1;
        reasonCount[reason] = (reasonCount[reason] || 0) + 1;
        uniqueReasons[fullReason] = (uniqueReasons[fullReason] || 0) + 1;
      });

      const allDates = Object.keys(groupedByDate).sort();
      const allReasons = Object.keys(reasonCount);

      const chart = allDates.map((date) => {
        const entry = { date };
        allReasons.forEach((reason) => {
          entry[reason] = groupedByDate[date][reason] || 0;
        });
        return entry;
      });

      const summary = allReasons.map((reason) => ({
        reason,
        count: reasonCount[reason],
      }));

      const uniqueReasonTableData = Object.entries(uniqueReasons)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

      setChartData(chart);
      setReasonSummary(summary);
      setUniqueReasonTableData(uniqueReasonTableData);
      return;
    }

    let groupKey = "territory";
    if (selectTerritory && !selectedArea) groupKey = "area";
    else if (selectTerritory && selectedArea && !selectedProvince)
      groupKey = "province";

    let grouped = {};
    let reasonCount = {};

    filtered.forEach((item) => {
      const keyGroup = item[groupKey] || "Unknown";
      const keyDate = item.date || "Unknown";
      const reason = item.reason?.split("-")[0]?.trim() || "Empty";

      if (!grouped[keyGroup]) grouped[keyGroup] = {};
      grouped[keyGroup][keyDate] = (grouped[keyGroup][keyDate] || 0) + 1;

      reasonCount[reason] = (reasonCount[reason] || 0) + 1;
    });

    const dates = Array.from(
      new Set(filtered.map((item) => item.date).filter(Boolean))
    ).sort();

    const finalChartData = dates.map((date) => {
      const entry = { date };
      for (const key in grouped) {
        entry[key] = grouped[key][date] || 0;
      }
      return entry;
    });

    const summary = Object.entries(reasonCount).map(([reason, count]) => ({
      reason,
      count,
    }));

    setChartData(finalChartData);
    setReasonSummary(summary);
  };

  const handleExportPdf = async () => {
    if (contentRef.current) {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // Increase scale for better resolution
        useCORS: true, // If your images are from a different origin
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4"); // 'p' for portrait, 'mm' for millimeters, 'a4' for size
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
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

        {selectTerritory && (
          <div className="ml-auto flex gap-2"> {/* Added flex and gap */}
            <button
              onClick={handleGenerateChart}
              className="px-4 py-2 bg-blue-500 text-white rounded-md shadow hover:bg-blue-600 transition"
            >
              Generate Graph
            </button>
            {/* New PDF Export Button */}
            {(chartData.length > 0 || reasonSummary.length > 0 || uniqueReasonTableData.length > 0) && (
              <button
                onClick={handleExportPdf}
                className="px-4 py-2 bg-red-500 text-white rounded-md shadow hover:bg-red-600 transition"
              >
                Export to PDF
              </button>
            )}
          </div>
        )}
      </div>

      {/* Wrap the content you want to export in the ref */}
      <div ref={contentRef}>
        {/* Line Chart */}
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

        {/* Combined Tables Container */}
        <div className="flex flex-wrap gap-4 mt-6">
          {/* Reason Summary Table */}
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

          {/* Unique Reasons Table */}
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
      </div> {/* End of contentRef div */}

      {/* Error Messages */}
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