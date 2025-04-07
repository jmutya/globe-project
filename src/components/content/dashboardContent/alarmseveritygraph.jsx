import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer
} from "recharts";
import * as XLSX from "xlsx";
import supabase from "../../../backend/supabase/supabase";

const AlarmsSeverity = () => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: 1,
        });

        if (sheet.length > 1) {
          const headers = sheet[0];
          const severityIndex = headers.indexOf("Severity");

          if (severityIndex === -1) continue;

          sheet.slice(1).forEach((row) => {
            const severity = String(row[severityIndex] || "").trim();
            if (severity) {
              severityCounts[severity] = (severityCounts[severity] || 0) + 1;
            }
          });
        }
      }

      const formattedData = Object.entries(severityCounts).map(([name, value], index) => ({
        name,
        value,
        fill: colors[index % colors.length],
      }));

      setChartData(formattedData);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching or processing files:", error);
      setIsLoading(false);
    }
  };

  const colors = ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40", "#8b0000", "#008000"];

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg flex flex-col items-center">
      <h2 className="text-lg font-semibold mb-4 text-center">Alarm Severity Distribution </h2>

      {isLoading ? (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="ml-3 text-gray-600">Generating Graph...</p>
        </div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70} // Donut hole effect
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={5} // Small gaps between segments
              cornerRadius={4} // Rounded edges
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => {
                          const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return [`${value} ( ${percentage}% )`, name];
                        }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-600 text-center">No data available</p>
      )}
    </div>
  );
};

export default AlarmsSeverity;
