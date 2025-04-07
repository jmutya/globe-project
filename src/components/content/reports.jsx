import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";
import "react-loading-skeleton/dist/skeleton.css";
import { MinusSmallIcon } from "@heroicons/react/20/solid";

const Reports = () => {
  const [chartData, setChartData] = useState([]);
  const [alarmTypes, setAlarmTypes] = useState([]);
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("daily");
  const [hasCompleteRows, setHasCompleteRows] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [sortBy, setSortBy] = useState("date");
  const [incompleteRows, setIncompleteRows] = useState([]);

  const colors = [
    "#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40", "#8b0000", "#008000"
  ];

  useEffect(() => {
    fetchAndProcessFiles();
  }, [timeRange, selectedMonth, selectedYear]);

  const getIncompleteRows = (sheet) => {
    const headers = sheet[0];
    const rows = sheet.slice(1);

    const requiredColumns = ["Failure Category", "Cause", "AOR001", "AOR002"];
    const requiredIndices = requiredColumns.map(col => headers.indexOf(col));
    const assignedToIndex = headers.indexOf("Assigned to");

    if (requiredIndices.some(idx => idx === -1)) {
      console.warn("One or more required columns not found in the sheet.");
      return [];
    }

    const incompleteRows = [];

    rows.forEach((row, i) => {
      const isComplete = requiredIndices.every(idx => {
        return row[idx] !== undefined && String(row[idx]).trim() !== "";
      });

      if (!isComplete) {
        const assignedTo = assignedToIndex !== -1 ? row[assignedToIndex] : "";
        incompleteRows.push({
          rowNumber: i + 2,
          assignedTo,
          rowData: row,
        });
      }
    });

    return incompleteRows;
  };

  const fetchAndProcessFiles = async () => {
    try {
      const { data: files, error } = await supabase.storage.from("uploads").list("excels");
      if (error) throw error;

      let alarmData = {};
      let allRequiredFieldsComplete = true;
      const detectedYears = new Set();
      const allIncompleteRows = [];

      for (const file of files) {
        const { data: fileUrl } = supabase.storage.from("uploads").getPublicUrl(`excels/${file.name}`);
        const response = await fetch(fileUrl.publicUrl);
        const blob = await response.arrayBuffer();
        const workbook = XLSX.read(blob, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        if (sheet.length > 1) {
          const headers = sheet[0];
          const timestampIndex = headers.indexOf("Opened");
          const alarmTypeIndex = headers.indexOf("AOR002");

          if (timestampIndex === -1 || alarmTypeIndex === -1) return;

          const incompleteRows = getIncompleteRows(sheet);
          if (incompleteRows.length > 0) {
            allIncompleteRows.push(...incompleteRows);
            allRequiredFieldsComplete = false;
          }

          sheet.slice(1).forEach((row) => {
            const timestamp = row[timestampIndex];
            const alarmType = row[alarmTypeIndex]?.trim();

            let date = "";
            if (timestamp && alarmType) {
              if (typeof timestamp === "number") {
                const excelEpoch = new Date(1899, 11, 30);
                date = new Date(excelEpoch.getTime() + timestamp * 86400000)
                  .toISOString()
                  .split("T")[0];
              } else if (typeof timestamp === "string") {
                const parts = timestamp.split(" ")[0].split("/");
                if (parts.length === 3) {
                  const [month, day, year] = parts;
                  date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
                }
              }

              if (!date) return;

              const dateObj = new Date(date);
              const year = dateObj.getFullYear();
              const month = dateObj.getMonth() + 1;

              if (
                (timeRange === "monthly" && (year !== selectedYear || month !== selectedMonth)) ||
                (timeRange === "yearly" && year !== selectedYear)
              ) {
                return;
              }

              detectedYears.add(year);

              if (!alarmData[date]) {
                alarmData[date] = {};
              }
              alarmData[date][alarmType] = (alarmData[date][alarmType] || 0) + 1;
            }
          });
        }
      }

      const allAlarmTypes = new Set();
      Object.values(alarmData).forEach((types) => {
        Object.keys(types).forEach((type) => allAlarmTypes.add(type));
      });

      let formattedData = Object.entries(alarmData).map(([date, alarms]) => {
        let entry = { date };
        allAlarmTypes.forEach((type) => {
          entry[type] = alarms[type] || 0;
        });
        return entry;
      });

      formattedData = groupByTimeRange(formattedData);

      formattedData.sort((a, b) => {
        if (sortBy === "total") {
          const totalA = Object.keys(a).filter(k => k !== "date").reduce((sum, key) => sum + a[key], 0);
          const totalB = Object.keys(b).filter(k => k !== "date").reduce((sum, key) => sum + b[key], 0);
          return totalB - totalA;
        }
        return new Date(a.date) - new Date(b.date);
      });

      setChartData(formattedData);
      setAlarmTypes([...allAlarmTypes]);
      setIsLoading(false);
      setHasCompleteRows(allRequiredFieldsComplete);
      setAvailableYears(Array.from(detectedYears).sort());
      setIncompleteRows(allIncompleteRows);

      fetchAnalysis(formattedData, [...allAlarmTypes]);
    } catch (error) {
      console.error("Error fetching or processing files:", error);
      setIsLoading(false);
    }
  };

  const fetchAnalysis = async (data, alarmTypes) => {
    try {
      const response = await fetch("/api/analyze-graph", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chartData: data,
          alarmTypes: alarmTypes,
        }),
      });

      const result = await response.json();
      setAnalysis(result.analysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
    }
  };

  const groupByTimeRange = (data) => {
    switch (timeRange) {
      case "weekly":
        return groupDataByWeek(data);
      case "monthly":
        return groupDataByMonth(data);
      case "yearly":
        return groupDataByYear(data);
      default:
        return data;
    }
  };

  const groupDataByWeek = (data) => {
    const groupedData = {};
    data.forEach((entry) => {
      const date = new Date(entry.date);
      const startOfWeek = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = `${startOfWeek.getFullYear()}-${startOfWeek.getMonth() + 1}-${startOfWeek.getDate()}`;
      if (!groupedData[weekKey]) {
        groupedData[weekKey] = { date: weekKey };
      }
      Object.keys(entry).forEach((key) => {
        if (key !== "date") {
          groupedData[weekKey][key] = (groupedData[weekKey][key] || 0) + entry[key];
        }
      });
    });
    return Object.values(groupedData);
  };

  const groupDataByMonth = (data) => {
    const groupedData = {};
    data.forEach((entry) => {
      const date = new Date(entry.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const monthKey = `${year}-${month.toString().padStart(2, "0")}`;
      if (!groupedData[monthKey]) {
        groupedData[monthKey] = { date: monthKey };
      }
      Object.keys(entry).forEach((key) => {
        if (key !== "date") {
          groupedData[monthKey][key] = (groupedData[monthKey][key] || 0) + entry[key];
        }
      });
    });
    return Object.values(groupedData);
  };

  const groupDataByYear = (data) => {
    const groupedData = {};
    data.forEach((entry) => {
      const date = new Date(entry.date);
      const yearKey = `${date.getFullYear()}`;
      if (!groupedData[yearKey]) {
        groupedData[yearKey] = { date: yearKey };
      }
      Object.keys(entry).forEach((key) => {
        if (key !== "date") {
          groupedData[yearKey][key] = (groupedData[yearKey][key] || 0) + entry[key];
        }
      });
    });
    return Object.values(groupedData);
  };

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg">
      <h2 className="text-lg font-semibold mb-2">Alarm Distribution by Area</h2>

      <div className="mb-4 flex gap-4 items-center flex-wrap">
        <label>Time Range:</label>
        <select className="p-2 border rounded-md" value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
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
                  <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>
                ))}
              </select>
            )}

            <select
              className="p-2 border rounded-md"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </>
        )}

        <label>Sort By:</label>
        <select className="p-2 border rounded-md" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="date">Date</option>
          <option value="total">Total Alarms</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-indigo-500"></div>
          <p className="ml-3 text-gray-600">Generating Graph</p>
        </div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            {alarmTypes.map((type, index) => (
              <Line key={type} type="monotone" dataKey={type} stroke={colors[index % colors.length]} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600 text-center mt-4">No data available</p>
      )}

      <div className="mt-4">
        <h3 className="text-lg font-semibold">Ticket Issuance Accuracy:</h3>
        <p>{analysis}</p>
      </div>


      {hasCompleteRows && (
        <div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
          ✅ All required fields are complete in the uploaded Excel files.
        </div>
      )}

      {!hasCompleteRows && incompleteRows.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded">
          <h4 className="font-semibold mb-2">⚠️ Incomplete Rows Found:</h4>
          <ul className="list-disc list-inside space-y-1">
            {incompleteRows.map((row, idx) => (
              <li key={idx}>
                Row {row.rowNumber} — Assigned To: {row.assignedTo || "Not Assigned"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Reports;
