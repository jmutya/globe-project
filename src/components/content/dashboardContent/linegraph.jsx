import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import supabase from "../../../backend/supabase/supabase"; // Import Supabase client

const AlarmTypeLineGraph = () => {
  const [chartData, setChartData] = useState([]);
  const [alarmTypes, setAlarmTypes] = useState([]);

  useEffect(() => {
    fetchAndProcessFiles();
  }, []);

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
          console.log("Detected Headers:", sheet[0]);
          const headers = sheet[0];
          const timestampIndex = headers.indexOf("Timestamp");
          const alarmTypeIndex = headers.indexOf("Alarm Type");

          if (timestampIndex === -1 || alarmTypeIndex === -1) {
            console.warn("Timestamp or Alarm Type column not found in the file.");
            continue;
          }

          sheet.slice(1).forEach(row => {
            const timestamp = row[timestampIndex];
            const alarmType = row[alarmTypeIndex]?.trim();

            if (timestamp && alarmType) {
              const date = new Date(timestamp).toISOString().split("T")[0]; // Extract date only

              if (!alarmData[date]) {
                alarmData[date] = {};
              }
              alarmData[date][alarmType] = (alarmData[date][alarmType] || 0) + 1;
            }
          });
        }
      }

      console.log("Alarm Data:", alarmData);

      // Extract all unique alarm types
      const allAlarmTypes = new Set();
      Object.values(alarmData).forEach(types => {
        Object.keys(types).forEach(type => allAlarmTypes.add(type));
      });

      // Convert to array format for Recharts
      const formattedData = Object.entries(alarmData).map(([date, alarms]) => {
        let entry = { date };
        allAlarmTypes.forEach(type => {
          entry[type] = alarms[type] || 0; // Ensure all alarm types exist even if 0
        });
        return entry;
      });

      formattedData.sort((a, b) => new Date(a.date) - new Date(b.date));

      setChartData(formattedData);
      setAlarmTypes([...allAlarmTypes]); // Store all unique alarm types
    } catch (error) {
      console.error("Error fetching or processing files:", error);
    }
  };

  const colors = ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40", "#8b0000", "#008000"];

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg">
      <h2 className="text-lg font-semibold mb-2">Alarm Type Trend Over Time</h2>
      {chartData.length > 0 ? (
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
        <p className="text-gray-600">No alarm data available</p>
      )}
    </div>
  );
};

export default AlarmTypeLineGraph;
