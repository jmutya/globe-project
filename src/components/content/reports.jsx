import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css"; // Required for styling
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
  const [totalRows, setTotalRows] = useState(0); // Total rows
  const [accuracyPercentage, setAccuracyPercentage] = useState(0); // Accuracy percentage
  const [selectedRow, setSelectedRow] = useState(null);

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

  useEffect(() => {
    fetchAndProcessFiles();
  }, [timeRange, selectedMonth, selectedYear]);

  
  const getIncompleteRows = (sheet) => {
    const headers = sheet[0];
    const rows = sheet.slice(1);

    const requiredColumns = [
      "Failure Category",
      "Cause",
      "AOR001",
      "AOR002",
      "Number",
    ];
    const requiredIndices = requiredColumns.map((col) => headers.indexOf(col));
    const assignedToIndex = headers.indexOf("Assigned to");

    if (requiredIndices.some((idx) => idx === -1)) {
      console.warn("One or more required columns not found in the sheet.");
      return [];
    }

    const incompleteRows = [];

    rows.forEach((row, i) => {
      const missingColumns = [];

      requiredIndices.forEach((idx, idxRow) => {
        if (row[idx] === undefined || String(row[idx]).trim() === "") {
          missingColumns.push(requiredColumns[idxRow]); // Track which columns are missing
        }
      });

      if (missingColumns.length > 0) {
        const assignedTo = assignedToIndex !== -1 ? row[assignedToIndex] : "";
        const number = row[headers.indexOf("Number")] || "Not Provided"; // Get the "Number" column value
        incompleteRows.push({
          number: number, // Use the "Number" column instead of row number
          assignedTo,
          missingColumns, // Add the missing columns
          rowData: row,
        });
      }
    });

    return incompleteRows;
  };

  

  const fetchAndProcessFiles = async () => {
    try {
      const { data: files, error } = await supabase.storage
        .from("uploads")
        .list("excels");
      if (error) throw error;

      let alarmData = {};
      let allRequiredFieldsComplete = true;
      const detectedYears = new Set();
      const allIncompleteRows = [];
      let totalRowCount = 0; // To track the total rows

      for (const file of files) {
        const { data: fileUrl } = supabase.storage
          .from("uploads")
          .getPublicUrl(`excels/${file.name}`);
        const response = await fetch(fileUrl.publicUrl);
        const blob = await response.arrayBuffer();
        const workbook = XLSX.read(blob, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: 1,
        });

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

          totalRowCount += sheet.length - 1; // Add the rows count excluding header

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
                  date = `${year}-${month.padStart(2, "0")}-${day.padStart(
                    2,
                    "0"
                  )}`;
                }
              }

              if (!date) return;

              const dateObj = new Date(date);
              const year = dateObj.getFullYear();
              const month = dateObj.getMonth() + 1;

              if (
                (timeRange === "monthly" &&
                  (year !== selectedYear || month !== selectedMonth)) ||
                (timeRange === "yearly" && year !== selectedYear)
              ) {
                return;
              }

              detectedYears.add(year);

              if (!alarmData[date]) {
                alarmData[date] = {};
              }
              alarmData[date][alarmType] =
                (alarmData[date][alarmType] || 0) + 1;
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
          const totalA = Object.keys(a)
            .filter((k) => k !== "date")
            .reduce((sum, key) => sum + a[key], 0);
          const totalB = Object.keys(b)
            .filter((k) => k !== "date")
            .reduce((sum, key) => sum + b[key], 0);
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
      setTotalRows(totalRowCount); // Set the total rows
      calculateAccuracy(totalRowCount, allIncompleteRows.length); // Calculate accuracy
      fetchAnalysis(formattedData, [...allAlarmTypes]);
    } catch (error) {
      console.error("Error fetching or processing files:", error);
      setIsLoading(false);
    }
  };

  const calculateAccuracy = (totalRows, incompleteRows) => {
    const accuracy =
      totalRows > 0 ? ((totalRows - incompleteRows) / totalRows) * 100 : 0;
    setAccuracyPercentage(accuracy.toFixed(2)); // Set accuracy with 2 decimal places
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
      const startOfWeek = new Date(
        date.setDate(date.getDate() - date.getDay())
      );
      const weekKey = `${startOfWeek.getFullYear()}-${
        startOfWeek.getMonth() + 1
      }-${startOfWeek.getDate()}`;
      if (!groupedData[weekKey]) {
        groupedData[weekKey] = { date: weekKey };
      }
      Object.keys(entry).forEach((key) => {
        if (key !== "date") {
          groupedData[weekKey][key] =
            (groupedData[weekKey][key] || 0) + entry[key];
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
          groupedData[monthKey][key] =
            (groupedData[monthKey][key] || 0) + entry[key];
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
          groupedData[yearKey][key] =
            (groupedData[yearKey][key] || 0) + entry[key];
        }
      });
    });
    return Object.values(groupedData);
  };

  

  return (
    <div
      className="p-4 bg-white shadow-lg rounded-lg overflow-y-auto"
      style={{ maxHeight: "88vh", height: "auto" }}
    >
      <h2 className="text-lg font-semibold mb-2">Alarm Distribution by Area</h2>

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
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              tickFormatter={(date) => new Date(date).toLocaleDateString()}
            />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            {alarmTypes.map((type, index) => (
              <Line
                key={type}
                type="monotone"
                dataKey={type}
                stroke={colors[index % colors.length]}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600 text-center mt-4">No data available</p>
      )}

      {/* Circular Progress Bar */}
      <div className="mb-4 flex space-x-4">
        {/* Overall Ticket Issuance Accuracy */}
        <div className="w-1/4">
          <h3 className="text-lg font-semibold mr-4 ml-6 mt-4">
            Overall Ticket Issuance Accuracy:
          </h3>
          <div className="w-60 h-60 mt-8 ml-12">
            <CircularProgressbar
              value={parseFloat(accuracyPercentage)}
              text={`${accuracyPercentage}%`}
              styles={buildStyles({
                pathColor: "#4caf50", // Customize color of the progress
                textColor: "#333", // Text color
                trailColor: "#f4f4f4", // Trail color (background)
                strokeWidth: 10, // Width of the circular path
                textSize: "16px", // Size of the percentage text
              })}
            />
          </div>
          {selectedRow && (
            <div className="mt-10 p-4 bg-gray-100 text-gray-800 rounded">
              <h3 className="text-lg font-semibold">Selected Row Details</h3>
              <p>
                <strong>Ticket Number:</strong> {selectedRow.number}
              </p>
              <p>
                <strong>Assigned To:</strong>{" "}
                {selectedRow.assignedTo || "Not Assigned"}
              </p>
              <p>
                <strong>Missing Columns:</strong>{" "}
                {selectedRow.missingColumns.join(", ")}
              </p>
              <p>
                <strong>Accuracy Percentage:</strong> {accuracyPercentage}%
              </p>
            </div>
          )}
        </div>

        {/* Incomplete Rows */}
        <div className="w-3/4">
          {/* <div className="mt-4">
            <h2 className="text-lg font-semibold">Incomplete Rows:</h2>
          </div> */}

          {hasCompleteRows && (
            <div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
              ✅ All required fields are complete in the uploaded Excel files.
            </div>
          )}

          {!hasCompleteRows && incompleteRows.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded">
              <h4 className="font-semibold mb-2">⚠️ Incomplete Rows Found:</h4>
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">Ticket Number</th>
                    <th className="px-4 py-2 text-left">Assigned To</th>
                    <th className="px-4 py-2 text-left">Missing Columns</th>
                  </tr>
                </thead>
                <tbody>
                  {incompleteRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b cursor-pointer hover:bg-gray-100"
                      onClick={() => setSelectedRow(row)} // Set the clicked row's details
                    >
                      <td className="px-4 py-2">{row.number}</td>
                      <td className="px-4 py-2">
                        {row.assignedTo || "Not Assigned"}
                      </td>
                      <td className="px-4 py-2">
                        {row.missingColumns.length > 0
                          ? row.missingColumns.join(", ")
                          : "None"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Conditionally render selected row details */}
          
        </div>
      </div>

      {/* Add here */}
{!hasCompleteRows && incompleteRows.length > 0 && (
  <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded">
    <h4 className="font-semibold mb-2">⚠️ Incomplete Rows Found:</h4>
    <table className="min-w-full table-auto">
      <thead>
        <tr className="border-b">
          <th className="px-4 py-2 text-left">Row Number</th>
          <th className="px-4 py-2 text-left">Assigned To</th>
        
          <th className="px-4 py-2 text-left">Accuracy Percentage</th>
        </tr>
      </thead>
      <tbody>
        {incompleteRows.map((row, idx) => (
          <tr key={idx} className="border-b">
            <td className="px-4 py-2">{row.rowNumber}</td>
            <td className="px-4 py-2">{row.assignedTo || "Not Assigned"}</td>
           
            <td className="px-4 py-2">{accuracyPercentage}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

    </div>
  );
};

export default Reports;