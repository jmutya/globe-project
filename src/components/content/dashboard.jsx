import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import * as XLSX from "xlsx";
import supabase from "../../backend/supabase/supabase";
import AlarmTypeLineGraph from "./dashboardContent/linegraph"; 
const SeverityPieChart = () => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchAndProcessFiles();
  }, []);

  const fetchAndProcessFiles = async () => {
    try {
      const { data: files, error } = await supabase.storage.from("uploads").list("excels");
      if (error) throw error;

      let severityCounts = {};

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
          const severityIndex = headers.indexOf("Severity");

          if (severityIndex === -1) {
            console.warn("Severity column not found in the file.");
            continue;
          }

          sheet.slice(1).forEach(row => {
            const severity = row[severityIndex]?.trim();
            if (severity) {
              severityCounts[severity] = (severityCounts[severity] || 0) + 1;
            }
          });
        }
      }

      console.log("Severity Counts:", severityCounts);

      const total = Object.values(severityCounts).reduce((sum, count) => sum + count, 0);
      const formattedData = Object.entries(severityCounts).map(([severity, count]) => ({
        name: severity,
        value: count,
        percentage: ((count / total) * 100).toFixed(2),
      }));

      console.log("Formatted Data for Pie Chart:", formattedData);
      setChartData(formattedData);
    } catch (error) {
      console.error("Error fetching or processing files:", error);
    }
  };

  const colors = ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40"];

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg">
      <h2 className="text-lg font-semibold mb-2">Severity Distribution</h2>
      {chartData.length > 0 ? (
        <PieChart width={400} height={300}>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percentage }) => `${name} (${percentage}%)`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name, props) => [`${value} occurrences (${props.payload.percentage}%)`, name]} />
          <Legend />
        </PieChart>
      ) : (
        <p className="text-gray-600">No severity data available</p>
      )}

      {/* 🔥 Include the line graph here */}
      <div className="mt-6">
        <AlarmTypeLineGraph />
      </div>
    </div>
  );
};

export default SeverityPieChart;
