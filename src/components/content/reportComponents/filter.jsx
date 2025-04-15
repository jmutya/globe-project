import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import supabase from "../../../backend/supabase/supabase";

const FilterData = () => {
  const [selectRegion, setSelectRegion] = useState("");
  const [selectTerritory, setSelectTerritory] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [structuredData, setStructuredData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [reasonSummary, setReasonSummary] = useState([]);
  const [tableData, setTableData] = useState([]);

  const convertExcelDate = (value) => {
    if (typeof value === "number") {
      const millisecondsPerDay = 86400000;
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + value * millisecondsPerDay);
      return date.toISOString().split("T")[0];
    } else if (typeof value === "string") {
      const date = new Date(value);
      if (!isNaN(date)) return date.toISOString().split("T")[0];
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

    const parsed = allData
      .map((row) => {
        const desc = row["Short description"];
        const match = desc?.match(/\(([^)]+)\)/);
        const date = convertExcelDate(row["Opened"]);
        const reason = row["Reason For Outage"] || "Unknown";
        const number = row["Number"] || "";

        if (match) {
          const parts = match[1].split("-");
          if (parts.length >= 5) {
            return {
              region: parts[0],
              area: parts[2],
              territory: parts[3],
              province: parts[4],
              reason,
              date,
              number,
            };
          }
        }
        return null;
      })
      .filter(Boolean);

    setStructuredData(parsed);
  };

  useEffect(() => {
    fetchAndProcessFiles();
  }, []);

  useEffect(() => {
    setSelectTerritory("");
    setSelectedArea("");
    setSelectedProvince("");
  }, [selectRegion]);

  useEffect(() => {
    setSelectedArea("");
    setSelectedProvince("");
  }, [selectTerritory]);

  useEffect(() => {
    setSelectedProvince("");
  }, [selectedArea]);

  const regionOptions = [...new Set(structuredData.map((item) => item.region))];
  const territoryOptions = selectRegion
    ? [...new Set(structuredData.filter((item) => item.region === selectRegion).map((item) => item.territory))]
    : [];
  const areaOptions = selectTerritory
    ? [...new Set(structuredData.filter((item) => item.territory === selectTerritory).map((item) => item.area))]
    : [];
  const provinceOptions = selectedArea
    ? [...new Set(structuredData.filter((item) => item.area === selectedArea).map((item) => item.province))]
    : [];

  const handleGenerateChart = () => {
    let filtered = [...structuredData];

    if (selectRegion) filtered = filtered.filter((item) => item.region === selectRegion);
    if (selectTerritory) filtered = filtered.filter((item) => item.territory === selectTerritory);
    if (selectedArea) filtered = filtered.filter((item) => item.area === selectedArea);
    if (selectedProvince) filtered = filtered.filter((item) => item.province === selectedProvince);

    setTableData(filtered); // Save for summary table

    let groupKey = "territory";
    if (selectTerritory && !selectedArea) groupKey = "area";
    else if (selectTerritory && selectedArea && !selectedProvince) groupKey = "province";
    else if (selectedProvince) groupKey = "reason";

    let grouped = {};

    filtered.forEach((item) => {
      const keyGroup = item[groupKey] || "Unknown";
      const keyDate = item.date || "Unknown";
      if (!grouped[keyGroup]) grouped[keyGroup] = {};
      grouped[keyGroup][keyDate] = (grouped[keyGroup][keyDate] || 0) + 1;
    });

    const dates = Array.from(new Set(filtered.map((item) => item.date).filter(Boolean))).sort();

    const finalChartData = dates.map((date) => {
      const entry = { date };
      for (const key in grouped) {
        entry[key] = grouped[key][date] || 0;
      }
      return entry;
    });

    setChartData(finalChartData);

    // Summarize reason counts based on the first word only
    const reasonCount = {};
    filtered.forEach((item) => {
      const mainReason = item.reason.split("-")[0]?.trim() || "Unknown";
      reasonCount[mainReason] = (reasonCount[mainReason] || 0) + 1;
    });

    const summary = Object.entries(reasonCount).map(([reason, count]) => ({
      reason,
      count,
    }));
    setReasonSummary(summary);
  };

  return (
    <div>
      {/* Dropdown Filters */}
      <div className="mb-4 flex gap-4 items-center flex-wrap">
        <div>
          <label>Region: </label>
          <select className="p-2 border rounded-md ml-3" value={selectRegion} onChange={(e) => setSelectRegion(e.target.value)}>
            <option value="">Select Region</option>
            {regionOptions.map((region, idx) => (
              <option key={idx} value={region}>{region}</option>
            ))}
          </select>
        </div>

        {selectRegion && (
          <div>
            <label>Territory: </label>
            <select className="p-2 border rounded-md ml-3" value={selectTerritory} onChange={(e) => setSelectTerritory(e.target.value)}>
              <option value="">Select Territory</option>
              {territoryOptions.map((territory, idx) => (
                <option key={idx} value={territory}>{territory}</option>
              ))}
            </select>
          </div>
        )}

        {selectTerritory && (
          <div>
            <label>Area: </label>
            <select className="p-2 border rounded-md ml-3" value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}>
              <option value="">Select Area</option>
              {areaOptions.map((area, idx) => (
                <option key={idx} value={area}>{area}</option>
              ))}
            </select>
          </div>
        )}

        {selectedArea && (
          <div>
            <label>Province: </label>
            <select className="p-2 border rounded-md ml-3" value={selectedProvince} onChange={(e) => setSelectedProvince(e.target.value)}>
              <option value="">Select Province</option>
              {provinceOptions.map((province, idx) => (
                <option key={idx} value={province}>{province}</option>
              ))}
            </select>
          </div>
        )}

        {selectRegion && (
          <div className="ml-auto">
            <button
              onClick={handleGenerateChart}
              className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-md shadow hover:bg-blue-600 transition"
            >
              Generate Graph
            </button>
          </div>
        )}
      </div>

      {/* Line Chart */}
      {chartData.length > 0 && (
        <div className="mt-8 overflow-x-auto">
          <LineChart width={1400} height={500} data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                  stroke={["#8884d8", "#82ca9d", "#ff7300", "#ff4f81", "#0088FE"][index % 5]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                >
                  <LabelList dataKey={key} position="top" />
                </Line>
              ))}
          </LineChart>
        </div>
      )}

      {/* Reason Summary Table */}
      {reasonSummary.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Reason for Outage Summary</h3>
          <table className="min-w-[300px] table-auto border-collapse border border-gray-300">
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

      
    </div>
  );
};

export default FilterData;
