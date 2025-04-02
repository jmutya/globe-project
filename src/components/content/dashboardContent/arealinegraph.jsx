import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import supabase from "../../../backend/supabase/supabase"; // Import Supabase client
import Skeleton from 'react-loading-skeleton'; // Correct import
import 'react-loading-skeleton/dist/skeleton.css';

const AreaLineGraph = () => {
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
          const headers = sheet[0];
          const timestampIndex = headers.indexOf("Opened");
          const alarmTypeIndex = headers.indexOf("AOR002");
        
          if (timestampIndex === -1 || alarmTypeIndex === -1) {
            return;
          }
        
          sheet.slice(1).forEach(row => {
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
        
              if (!date) {
                return;
              }
        
              if (!alarmData[date]) {
                alarmData[date] = {};
              }
              alarmData[date][alarmType] = (alarmData[date][alarmType] || 0) + 1;
            }
          });
        }
      }

      const allAlarmTypes = new Set();
      Object.values(alarmData).forEach(types => {
        Object.keys(types).forEach(type => allAlarmTypes.add(type));
      });

      const formattedData = Object.entries(alarmData).map(([date, alarms]) => {
        let entry = { date };
        allAlarmTypes.forEach(type => {
          entry[type] = alarms[type] || 0;
        });
        return entry;
      });

      formattedData.sort((a, b) => new Date(a.date) - new Date(b.date));

      setChartData(formattedData);
      setAlarmTypes([...allAlarmTypes]);
    } catch (error) {
    }
  };

  const colors = ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40", "#8b0000", "#008000"];

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg">
      <h2 className="text-lg font-semibold mb-2">Alarm Distribution by Area</h2>
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
        <div className="text-center">
          <Skeleton height={300} />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      )}
    </div>
  );
};

export default AreaLineGraph;
