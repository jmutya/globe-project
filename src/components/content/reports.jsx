import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";
import "react-loading-skeleton/dist/skeleton.css";

const Reports = () => {
  const [chartData, setChartData] = useState([]);
  const [alarmTypes, setAlarmTypes] = useState([]);
  const [analysis, setAnalysis] = useState("");  // State for storing the analysis
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [timeRange, setTimeRange] = useState("daily"); // Default to daily range

  const colors = [
    "#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40", "#8b0000", "#008000"
  ]; // Defining the colors array

  // Function to handle fetching and processing files
  useEffect(() => {
    fetchAndProcessFiles();
  }, [timeRange]); // Re-fetch data when timeRange changes

  const fetchAndProcessFiles = async () => {
    try {
      const { data: files, error } = await supabase.storage.from("uploads").list("excels");
      if (error) throw error;

      let alarmData = {};

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

          sheet.slice(1).forEach((row) => {
            let timestamp = row[timestampIndex];
            const alarmType = row[alarmTypeIndex]?.trim();

            if (timestamp && alarmType) {
              let date = "";

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

      // Group data based on selected time range
      formattedData = groupByTimeRange(formattedData);

      formattedData.sort((a, b) => new Date(a.date) - new Date(b.date));

      setChartData(formattedData);
      setAlarmTypes([...allAlarmTypes]);
      setIsLoading(false); // Set loading to false after data is fetched

      // Fetch analysis after data is processed
      fetchAnalysis(formattedData, [...allAlarmTypes]);

    } catch (error) {
      console.error("Error fetching or processing files:", error);
      setIsLoading(false); // Stop loading even if there is an error
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
          chartData: data, // Pass the chart data
          alarmTypes: alarmTypes, // Pass the alarm types
        }),
      });

      const result = await response.json();
      setAnalysis(result.analysis); // Set the analysis to the state
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
      const startOfWeek = new Date(date.setDate(date.getDate() - date.getDay())); // Get start of week (Sunday)
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
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

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

      <div className="mb-4">
        <label className="mr-4">Time Range: </label>
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
        <h3 className="text-lg font-semibold">Analysis:</h3>
        <p>{analysis}</p>
      </div>
    </div>
  );
};

export default Reports;
